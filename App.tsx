import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator, Alert, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import tw from 'twrnc';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 各スクリーンのインポート
import SetupScreen from './src/screens/SetupScreen';
import HomeScreen from './src/screens/HomeScreen';
import ClothListScreen from './src/screens/ClothListScreen';
import ResultScreen from './src/screens/ResultScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ClothDetailScreen from './src/screens/ClothDetailScreen';
import SplashScreen from './src/screens/SplashScreen';
import Header from './src/components/Header';
import { api } from './src/utils/api';
import { getUserId } from './src/utils/user';
import OnboardingTooltip from './src/components/OnboardingTooltip';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// --- MainTabs ---
function MainTabs({ route }: any) {
  const params = route.params || {};
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  
  // ガイド表示用のステート
  const [showClosetGuide, setShowClosetGuide] = useState(false); // ①
  const [showCoordGuide, setShowCoordGuide] = useState(false);   // ③

  // ガイド表示チェック
  useEffect(() => {
    checkGuides();

    // アップロード完了イベントを受け取ったら「コーデ開始ガイド」を出す準備
    const uploadSub = DeviceEventEmitter.addListener('FIRST_UPLOAD_DONE', async () => {
      // まだコーデガイドを見ていない場合のみ表示
      const hasSeen = await AsyncStorage.getItem('HAS_SEEN_COORD_GUIDE');
      if (!hasSeen) {
        setShowCoordGuide(true);
      }
    });

    return () => uploadSub.remove();
  }, []);

  const checkGuides = async () => {
    // ① クローゼット誘導: まだ見てなければ表示
    const hasSeenCloset = await AsyncStorage.getItem('HAS_SEEN_CLOSET_GUIDE');
    if (!hasSeenCloset) {
      setShowClosetGuide(true);
    }
  };

  // ① ガイドを閉じる処理 (クローゼットへ移動したとみなす)
  const dismissClosetGuide = async () => {
    setShowClosetGuide(false);
    await AsyncStorage.setItem('HAS_SEEN_CLOSET_GUIDE', 'true');
  };

  // ③ ガイドを閉じる処理
  const dismissCoordGuide = async () => {
    setShowCoordGuide(false);
    await AsyncStorage.setItem('HAS_SEEN_COORD_GUIDE', 'true');
  };

  const handleCoordStart = async () => {
    const currentUserId = await getUserId();
    if (!currentUserId) {
      Alert.alert("エラー", "ユーザーIDが見つかりません。再起動してください。");
      return;
    }
    setLoading(true);
    try {
      const data = await api.createCoordinate(currentUserId);
      setResult(data);
      setShowResult(true);
      DeviceEventEmitter.emit('REFRESH_HOME');
    } catch (e: any) {
      Alert.alert("エラー", "コーデの作成に失敗しました: " + e.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      <Tab.Navigator
        screenOptions={{
          header: () => <Header />,
          tabBarActiveTintColor: '#00255C',
          tabBarInactiveTintColor: '#9ca3af',
          tabBarLabelStyle: tw`text-xs font-bold pb-1`,
          tabBarStyle: [
            tw`bg-white border-t border-gray-200 h-24`, 
            { shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, elevation: 5 }
          ],
        }}
      >
        <Tab.Screen 
          name="HomeTab" 
          component={HomeScreen} 
          initialParams={params}
          options={{
            tabBarLabel: 'コーデ',
            tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
          }}
        />
        <Tab.Screen 
          name="CoordiiTab" 
          component={HomeScreen}
          listeners={() => ({
            tabPress: (e) => {
              e.preventDefault();
              dismissCoordGuide();
              Alert.alert(
                "確認",
                "コーデを開始しますか？\n（※生成には10〜20秒程度かかります）",
                [
                  { text: "戻る", style: "cancel" },
                  { text: "開始", onPress: () => handleCoordStart() }
                ]
              );
            },
          })}
          options={{
            tabBarLabel: '', 
            tabBarIcon: () => (
              <View style={[
                tw`bg-[#00255C] w-20 h-20 rounded-full items-center justify-center border-4 border-white`,
                { position: 'absolute', top: -30, shadowColor: "#00255C", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, elevation: 5 }
              ]}>
                <Ionicons name="play" size={28} color="white" style={{ marginLeft: 4, marginBottom: -2 }} />
                <Text style={tw`text-white text-[9px] font-bold mt-1`}>コーデ開始</Text>
              </View>
            ),
          }}
        />
        <Tab.Screen 
          name="ClothListTab" 
          component={ClothListScreen}
          // ★修正: ここにスペースを追加しました
          listeners={() => ({
            tabPress: () => {
              dismissClosetGuide();
            }
          })}
          options={{
            tabBarLabel: 'クローゼット',
            tabBarIcon: ({ color }) => <Ionicons name="shirt" size={28} color={color} />,
          }}
        />
      </Tab.Navigator>

      {loading && (
        <View style={tw`absolute inset-0 bg-black/50 items-center justify-center z-50 w-full h-full`}>
          <View style={tw`bg-white p-8 rounded-2xl items-center`}>
            <ActivityIndicator size="large" color="#00255C" />
            <Text style={tw`mt-4 font-bold text-gray-700`}>AIがコーデを考え中...</Text>
          </View>
        </View>
      )}

      {/* ① 初回ホーム訪問時: クローゼットへ誘導 */}
      {showClosetGuide && !loading && (
        <OnboardingTooltip 
          text="まずは「クローゼット」で洋服を登録しましょう！"
          position="bottom-right"
          onPress={dismissClosetGuide}
        />
      )}

      {/* ③ 洋服登録後: コーデ開始へ誘導 */}
      {showCoordGuide && !loading && !showClosetGuide && (
        <OnboardingTooltip 
          text="トップスとボトムスを登録したらAIコーデを始めましょう！"
          position="bottom-center"
          onPress={dismissCoordGuide}
        />
      )}

      <ResultScreen visible={showResult} onClose={() => setShowResult(false)} resultData={result} />
    </>
  );
}

// --- App Component ---
export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Splash">
          <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Setup" component={SetupScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="ClothDetail" component={ClothDetailScreen} options={{ headerShown: false, presentation: 'modal' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}