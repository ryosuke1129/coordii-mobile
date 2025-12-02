import React, { useState, useEffect } from 'react'; // useCallback, useRef, useFocusEffect は削除
import { Text, View, ScrollView, Image, ActivityIndicator, RefreshControl, DeviceEventEmitter, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import { api } from '../utils/api';
import { getUserId } from '../utils/user';
import CoordinateDetailScreen from './CoordinateDetailScreen';

export default function HomeScreen({ route, navigation }: any) {
  const { region } = route.params || { region: '福岡市博多区' };
  
  const [currentRegion, setCurrentRegion] = useState(region);
  const [weather, setWeather] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  const [selectedCoord, setSelectedCoord] = useState(null);
  const [showCoordDetail, setShowCoordDetail] = useState(false);
  
  const [dateLabel, setDateLabel] = useState(() => {
    return new Date().getHours() >= 19 ? '明日の天気' : '今日の天気';
  });

  const WEATHER_CACHE_KEY = 'WEATHER_CACHE';
  const HISTORY_CACHE_KEY = 'HISTORY_CACHE';

  // --- 1. アプリ起動時の初期化 (キャッシュ復元 -> API取得) ---
  useEffect(() => {
    const init = async () => {
      let activeRegion = currentRegion;

      // A. キャッシュから復元 (即時表示)
      try {
        // 天気・地域
        const weatherCache = await AsyncStorage.getItem(WEATHER_CACHE_KEY);
        if (weatherCache) {
          const { data, savedRegion, savedLabel } = JSON.parse(weatherCache);
          
          // キャッシュに地域があれば、それを正として採用
          if (savedRegion) {
            activeRegion = savedRegion;
            setCurrentRegion(savedRegion);
          }
          
          // 日付ラベルが合っていれば天気を表示
          const currentHour = new Date().getHours();
          const currentLabel = currentHour >= 19 ? '明日の天気' : '今日の天気';
          if (savedLabel === currentLabel) {
            setWeather(data);
          }
        }

        // 履歴
        const historyCache = await AsyncStorage.getItem(HISTORY_CACHE_KEY);
        if (historyCache) {
          setHistory(JSON.parse(historyCache));
        }
      } catch (e) {
        console.error("Cache restore error:", e);
      }

      // B. 最新データをAPIから取得 (裏で更新)
      // キャッシュ復元で確定した activeRegion を使う
      const uid = await getUserId();
      if (uid) {
        await loadData(uid, activeRegion, true);
      }
    };

    init();
  }, []); // 初回マウント時のみ実行

  // --- データ取得関数 ---
  const loadData = async (userId: string, city: string, forceRefresh = false) => {
    await Promise.all([
      fetchWeather(userId, city, forceRefresh), 
      fetchHistory(userId, forceRefresh)
    ]);
  };

  const fetchWeather = async (userId: string, city: string, forceRefresh = false) => {
    try {
      const currentHour = new Date().getHours();
      const newLabel = currentHour >= 19 ? '明日の天気' : '今日の天気';
      setDateLabel(newLabel);

      if (!forceRefresh) {
        const cached = await AsyncStorage.getItem(WEATHER_CACHE_KEY);
        if (cached) {
          const { data, savedRegion, savedLabel } = JSON.parse(cached);
          if (savedRegion === city && savedLabel === newLabel) {
            setWeather(data);
            return;
          }
        }
      }

      const data = await api.getWeather(userId, city);
      setWeather(data);
      
      await AsyncStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ 
        data, 
        savedRegion: city, 
        savedLabel: newLabel 
      }));

    } catch (e) {
      console.error("Fetch weather error:", e);
    }
  };

  const fetchHistory = async (userId: string, forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        const cached = await AsyncStorage.getItem(HISTORY_CACHE_KEY);
        if (cached) {
          setHistory(JSON.parse(cached));
          return;
        }
      }
      const data = await api.getHistory(userId);
      setHistory(data);
      await AsyncStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Fetch history error:", e);
    }
  };

  // --- イベント設定 ---
  useEffect(() => {
    const refreshSub = DeviceEventEmitter.addListener('REFRESH_HOME', async () => {
      const uid = await getUserId();
      if (uid) fetchHistory(uid, true);
    });
    
    // 設定画面で地域が変わった時の即時反映
    const regionSub = DeviceEventEmitter.addListener('REGION_CHANGED', (newRegion) => {
      setCurrentRegion(newRegion);
      // 即座にAPIリロード
      getUserId().then(uid => {
        if (uid) loadData(uid, newRegion, true);
      });
    });

    // 定期更新 (19時切り替え)
    const intervalId = setInterval(async () => {
      const now = new Date();
      const hour = now.getHours();
      const newLabel = hour >= 19 ? '明日の天気' : '今日の天気';
      
      if (newLabel !== dateLabel) {
        const uid = await getUserId();
        if (uid) loadData(uid, currentRegion, true);
      }
    }, 60000);

    return () => {
      refreshSub.remove();
      regionSub.remove();
      clearInterval(intervalId);
    };
  }, [dateLabel, currentRegion]); 

  // --- 引っ張って更新 ---
  const onRefresh = async () => {
    setRefreshing(true);
    const uid = await getUserId();
    if (uid) {
      // リフレッシュ時は、念のためサーバーの最新ユーザー情報から地域を確認する
      try {
        const user = await api.getUser(uid);
        const savedRegion = user.address || currentRegion;
        
        if (savedRegion !== currentRegion) {
          setCurrentRegion(savedRegion);
        }
        await loadData(uid, savedRegion, true);
      } catch {
        await loadData(uid, currentRegion, true);
      }
    }
    setRefreshing(false);
  };

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <View style={tw`flex-1 w-full max-w-md self-center bg-white h-full relative`}>
        
        <ScrollView 
          style={tw`flex-1 px-6`} 
          contentContainerStyle={tw`pt-6 pb-40`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00255C']} tintColor={'#00255C'} />}
        >
          
          <Text style={tw`font-bold text-gray-700 mb-2 ml-1 text-sm`}>{dateLabel} ({currentRegion})</Text>
          
          <View style={[tw`bg-white p-5 rounded-2xl mb-8 border border-gray-100`, { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 }]}>
            {!weather ? (
              <View style={tw`h-24 items-center justify-center`}><ActivityIndicator size="small" color="#00255C" /></View>
            ) : (
              <>
                <View style={tw`flex-row justify-between items-center`}>
                  <View style={tw`flex-row items-end gap-3`}>
                    <View>
                      <Text style={tw`text-gray-400 text-xs font-bold`}>最高</Text>
                      <Text style={tw`text-3xl font-extrabold text-gray-800 -mb-1`}>{Math.round(weather.max)}<Text style={tw`text-lg`}>°C</Text></Text>
                    </View>
                    <View style={tw`mb-1`}>
                      <Text style={tw`text-gray-400 text-[10px] font-bold`}>最低</Text>
                      <Text style={tw`text-xl font-bold text-gray-600`}>{Math.round(weather.min)}<Text style={tw`text-sm`}>°C</Text></Text>
                    </View>
                  </View>
                  <View style={tw`flex-row items-center gap-3`}>
                     <Text style={tw`text-gray-500 text-xs font-bold text-right w-16 leading-4`} numberOfLines={2}>{weather.weather}</Text>
                     <View style={tw`w-20 h-20 rounded-2xl border border-gray-200 items-center justify-center overflow-hidden bg-white`}>
                       {weather.iconUrl ? <Image source={{ uri: weather.iconUrl }} style={tw`w-24 h-24`} resizeMode="cover" /> : <Text style={tw`text-4xl`}>☁️</Text>}
                     </View>
                  </View>
                </View>
                <View style={tw`mt-3 pt-3 border-t border-gray-100 flex-row justify-between`}>
                   <View style={tw`items-center flex-1`}><Text style={tw`text-gray-400 text-[10px]`}>湿度</Text><Text style={tw`font-bold text-gray-800 text-sm`}>{Math.round(weather.humidity)}%</Text></View>
                   <View style={tw`w-[1px] h-full bg-gray-200`} />
                   <View style={tw`items-center flex-1`}><Text style={tw`text-gray-400 text-[10px]`}>降水確率</Text><Text style={tw`font-bold text-gray-800 text-sm`}>{Math.round(weather.pop)}%</Text></View>
                   <View style={tw`w-[1px] h-full bg-gray-200`} />
                   <View style={tw`items-center flex-1`}><Text style={tw`text-gray-400 text-[10px]`}>風</Text><Text style={tw`font-bold text-gray-800 text-xs mt-0.5`}>{weather.windDirection} {Math.round(weather.windSpeed)}m</Text></View>
                </View>
              </>
            )}
          </View>

          <Text style={tw`font-bold text-gray-700 mb-3 ml-1 text-lg`}>履歴</Text>

          {history.length === 0 ? (
            <View style={tw`items-center mt-4 bg-gray-50 p-6 rounded-xl`}>
              <Text style={tw`text-gray-400 font-bold mb-1 text-sm`}>まだ履歴がありません</Text>
              <Text style={tw`text-gray-500 text-xs`}>中央のボタンからコーデを作りましょう</Text>
            </View>
          ) : (
            <View style={tw`gap-4`}>
              {history.map((item, index) => (
                <TouchableOpacity 
                  key={index} 
                  activeOpacity={0.9}
                  onPress={() => { setSelectedCoord(item); setShowCoordDetail(true); }}
                >
                  <View style={tw`bg-white p-4 rounded-2xl border border-gray-100 shadow-sm`}>
                    <View style={tw`flex-row justify-between items-center mb-3 pb-2 border-b border-gray-50`}>
                      <Text style={tw`font-bold text-gray-800`}>{item.targetDate}</Text>
                      <Text style={tw`text-xs text-gray-400`}>{item.weatherData?.weather}</Text>
                    </View>
                    <View style={tw`flex-row gap-2`}>
                      {item.outer_image && <HistoryIcon uri={item.outer_image} />}
                      {item.tops_images && item.tops_images.map((img:string, i:number) => <HistoryIcon key={`top-${i}`} uri={img} />)}
                      {item.bottoms_image && <HistoryIcon uri={item.bottoms_image} />}
                      {item.shoes_image && <HistoryIcon uri={item.shoes_image} />}
                    </View>
                    <Text style={tw`text-xs text-gray-500 mt-3 line-clamp-2 text-gray-600`} numberOfLines={2}>{item.reason}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        <CoordinateDetailScreen visible={showCoordDetail} onClose={() => setShowCoordDetail(false)} coordData={selectedCoord} navigation={navigation} />
      </View>
    </View>
  );
}

const HistoryIcon = ({ uri }: { uri: string }) => (
  <View style={tw`w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden`}>
    <Image source={{ uri }} style={[tw`w-full h-full`, { resizeMode: 'cover' }]} />
  </View>
);