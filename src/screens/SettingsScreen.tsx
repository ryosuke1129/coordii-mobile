import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Image, 
  ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, 
  StatusBar, DeviceEventEmitter, LayoutAnimation, UIManager 
} from 'react-native';
// ★修正: TouchableWithoutFeedback, Keyboard は不要になったので削除してOK
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import tw from 'twrnc';
import * as Updates from 'expo-updates'; // ★追加: アプリリロード用
import AsyncStorage from '@react-native-async-storage/async-storage'; // ★追加: データ消去用
import { api, uploadToS3 } from '../utils/api';
import { getUserId } from '../utils/user';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const WEEKDAYS = [
  { key: 'Mon', label: '月曜日' },
  { key: 'Tue', label: '火曜日' },
  { key: 'Wed', label: '水曜日' },
  { key: 'Thu', label: '木曜日' },
  { key: 'Fri', label: '金曜日' },
  { key: 'Sat', label: '土曜日' },
  { key: 'Sun', label: '日曜日' },
];

const STYLES = ["指定なし", "オフィスカジュアル", "スーツ/ビジネス", "カジュアル", "ラフ/リラックス", "きれいめ", "デート", "アクティブ"];

export default function SettingsScreen({ navigation }: any) {
  // --- (ステート定義などは変更なし) ---
  const [gender, setGender] = useState('男性');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [height, setHeight] = useState('');
  const [region, setRegion] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [weeklySchedule, setWeeklySchedule] = useState<{ [key: string]: string }>({});
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userId = await getUserId();
        if (!userId) return;
        const data = await api.getUser(userId);
        if (data.gender) setGender(data.gender);
        if (data.birthDay) setBirthDate(new Date(data.birthDay));
        if (data.height) setHeight(String(data.height));
        if (data.address) setRegion(data.address);
        if (data.imageLink) setProfileImage(data.imageLink);
        if (data.weeklySchedule) setWeeklySchedule(data.weeklySchedule);
      } catch (e) {
        console.error("データ取得エラー:", e);
      } finally {
        setIsFetching(false);
      }
    };
    fetchUser();
  }, []);

  const onChangeDate = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setBirthDate(selectedDate);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return date.toISOString().split('T')[0];
  };

  const handleImagePick = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert("許可が必要です", "写真へのアクセスを許可してください");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled) uploadImage(result.assets[0].uri);
  };

  const uploadImage = async (uri: string) => {
    try {
      const { uploadUrl, imageUrl } = await api.getUploadUrl('jpg');
      await uploadToS3(uploadUrl, uri);
      setProfileImage(imageUrl);
    } catch (e) {
      Alert.alert("エラー", "画像のアップロードに失敗しました");
    }
  };

  const toggleAccordion = (dayKey: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedDay(prev => prev === dayKey ? null : dayKey);
  };

  const selectStyle = (dayKey: string, style: string) => {
    setWeeklySchedule(prev => ({ ...prev, [dayKey]: style }));
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedDay(null);
  };

  const handleSave = async () => {
    if (!region) return Alert.alert("エラー", "地域は必須です");
    setIsSaving(true);
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("ユーザーIDが見つかりません");
      const birthDateString = birthDate ? birthDate.toISOString().split('T')[0] : "";
      
      await api.registerUser({
        userId,
        gender,
        birthDay: birthDateString,
        height: parseInt(height) || 0,
        address: region,
        imageLink: profileImage,
        weeklySchedule: weeklySchedule
      });
      DeviceEventEmitter.emit('REGION_CHANGED', region);
      Alert.alert("完了", "設定を保存しました", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      Alert.alert("エラー", e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ★追加: デバッグ用リセット機能
  const handleReset = async () => {
    Alert.alert(
      "初期化（デバッグ用）",
      "端末内のデータを消去し、アプリを初期状態に戻しますか？\n（サーバー上のデータは残ります）",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "初期化する",
          style: "destructive",
          onPress: async () => {
            try {
              // ローカルストレージを全消去
              await AsyncStorage.clear();
              // アプリをリロード (Expo Go再起動)
              await Updates.reloadAsync();
            } catch (e) {
              Alert.alert("エラー", "リロードに失敗しました。手動でアプリを再起動してください。");
            }
          }
        }
      ]
    );
  };

  // ★修正: TouchableWithoutFeedback を削除し、Viewをルートにする
  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* ヘッダー */}
      <View style={tw`bg-[#00255C]`}>
        <SafeAreaView>
          <View style={[tw`flex-row items-center justify-between px-4 pb-4`, Platform.OS === 'android' ? { paddingTop: StatusBar.currentHeight || 24 } : { paddingTop: 10 }]}>
            <View style={tw`w-8`} />
            <Text style={tw`text-white text-lg font-bold`}>ユーザー設定</Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={tw`flex-1`}>
        {isFetching ? (
          <View style={tw`flex-1 items-center justify-center`}><ActivityIndicator size="large" color="#00255C" /></View>
        ) : (
          <ScrollView 
            contentContainerStyle={tw`p-6 pb-40`}
            // ★修正: キーボード制御のプロパティを追加
            keyboardShouldPersistTaps="handled" // ボタンタップなどを優先
            keyboardDismissMode="on-drag"       // スクロール開始でキーボードを閉じる
          >
            {/* プロフィール画像 */}
            <View style={tw`items-center mb-8`}>
              <TouchableOpacity onPress={handleImagePick} style={tw`relative`}>
                <View style={tw`w-28 h-28 rounded-full bg-gray-200 border-4 border-white shadow-sm items-center justify-center overflow-hidden`}>
                  {profileImage ? <Image source={{ uri: profileImage }} style={tw`w-full h-full`} /> : <Ionicons name="person" size={60} color="#9ca3af" />}
                </View>
                <View style={tw`absolute bottom-0 right-0 bg-[#00255C] p-2 rounded-full border-2 border-white`}><Ionicons name="camera" size={16} color="white" /></View>
              </TouchableOpacity>
            </View>

            <View style={tw`gap-5`}>
              {/* 性別・生年月日・身長・地域の入力フォーム (中身は変更なし) */}
              <View>
                <Text style={tw`text-gray-500 text-xs font-bold mb-2`}>性別</Text>
                <View style={tw`flex-row justify-between`}>
                  {['男性', '女性', 'その他'].map((item) => (
                    <TouchableOpacity key={item} onPress={() => setGender(item)} style={tw`w-[30%] py-2 rounded border ${gender === item ? 'bg-[#00255C] border-[#00255C]' : 'bg-white border-gray-300'}`}>
                      <Text style={tw`text-center font-bold text-sm ${gender === item ? 'text-white' : 'text-gray-500'}`}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View>
                <Text style={tw`text-gray-500 text-xs font-bold mb-1`}>生年月日</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(!showDatePicker)} style={tw`w-full p-3 bg-white border border-gray-300 rounded-lg justify-center`}>
                  <Text style={[tw`text-base`, !birthDate ? tw`text-gray-400` : tw`text-gray-800`]}>{birthDate ? formatDate(birthDate) : "YYYY-MM-DD"}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <View style={tw`mt-2 bg-white rounded-lg overflow-hidden border border-gray-200`}>
                    <DateTimePicker value={birthDate || new Date(2000, 0, 1)} mode="date" display="spinner" onChange={onChangeDate} locale="ja-JP" style={{ height: 120 }} />
                    {Platform.OS === 'ios' && (
                      <TouchableOpacity onPress={() => setShowDatePicker(false)} style={tw`bg-gray-100 py-2 items-center border-t border-gray-200`}><Text style={tw`text-blue-600 font-bold`}>完了</Text></TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              <View>
                <Text style={tw`text-gray-500 text-xs font-bold mb-1`}>身長 (cm)</Text>
                <TextInput value={height} onChangeText={setHeight} keyboardType="numeric" placeholder="170" style={tw`w-full p-3 bg-white border border-gray-300 rounded-lg text-base text-gray-800`} />
              </View>

              <View>
                <Text style={tw`text-gray-500 text-xs font-bold mb-1`}>地域</Text>
                <TextInput value={region} onChangeText={setRegion} placeholder="例: 福岡市博多区" style={tw`w-full p-3 bg-white border border-gray-300 rounded-lg text-base text-gray-800`} />
                <Text style={tw`text-[10px] text-gray-400 mt-1 ml-1`}>※変更すると天気予報の地域が変わります</Text>
              </View>

              {/* 曜日設定 (アコーディオン式) */}
              <View style={tw`mt-4 pt-6 border-t border-gray-200`}>
                <Text style={tw`text-gray-800 font-bold text-base mb-1`}>曜日ごとのスタイル設定</Text>
                <Text style={tw`text-gray-400 text-xs mb-4`}>
                  曜日をタップして、その日の予定に合わせたスタイルを選択してください。
                </Text>
                
                <View style={tw`gap-3`}>
                  {WEEKDAYS.map((day) => {
                    const currentStyle = weeklySchedule[day.key] || "指定なし";
                    const isExpanded = expandedDay === day.key;
                    const isActive = currentStyle !== "指定なし";
                    
                    return (
                      <View 
                        key={day.key} 
                        style={tw`bg-white rounded-xl border ${isActive || isExpanded ? 'border-[#00255C]' : 'border-gray-200'} overflow-hidden shadow-sm`}
                      >
                        <TouchableOpacity 
                          onPress={() => toggleAccordion(day.key)}
                          activeOpacity={0.7}
                          style={tw`p-4 flex-row justify-between items-center bg-white`}
                        >
                          <View style={tw`flex-row items-center gap-4`}>
                            <View style={tw`w-8 h-8 rounded-full bg-gray-100 items-center justify-center`}>
                              <Text style={tw`font-bold text-gray-600 text-xs`}>{day.label[0]}</Text>
                            </View>
                            <Text style={tw`font-bold text-gray-700 text-sm`}>{day.label}</Text>
                          </View>
                          <View style={tw`flex-row items-center gap-2`}>
                            <Text style={[tw`text-xs font-bold`, isActive ? tw`text-[#00255C]` : tw`text-gray-400`]}>
                              {currentStyle}
                            </Text>
                            <Ionicons 
                              name={isExpanded ? "chevron-up" : "chevron-down"} 
                              size={16} 
                              color={isActive || isExpanded ? "#00255C" : "#ccc"} 
                            />
                          </View>
                        </TouchableOpacity>

                        {isExpanded && (
                          <View style={tw`border-t border-gray-100 bg-gray-50 px-2 py-2`}>
                            {STYLES.map((style) => {
                              const isSelected = currentStyle === style;
                              return (
                                <TouchableOpacity
                                  key={style}
                                  onPress={() => selectStyle(day.key, style)}
                                  style={tw`p-3 rounded-lg flex-row justify-between items-center ${isSelected ? 'bg-white shadow-sm' : ''}`}
                                >
                                  <Text style={[tw`text-sm font-bold`, isSelected ? tw`text-[#00255C]` : tw`text-gray-500`]}>
                                    {style}
                                  </Text>
                                  {isSelected && <Ionicons name="checkmark-circle" size={20} color="#00255C" />}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* ★追加: デバッグ用リセットボタンエリア */}
              <View style={tw`mt-10 pt-6 border-t border-gray-200 items-center`}>
                 <TouchableOpacity 
                    onPress={handleReset}
                    style={tw`flex-row items-center gap-2 p-4`}
                 >
                   <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
                   <Text style={tw`text-red-500 font-bold`}>デバッグ: アプリを初期化</Text>
                 </TouchableOpacity>
              </View>

            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {!isFetching && (
        <View style={tw`absolute bottom-0 w-full p-6 bg-white border-t border-gray-100`}>
          <TouchableOpacity onPress={handleSave} disabled={isSaving} style={tw`w-full bg-[#00255C] py-4 rounded-full shadow-lg flex-row justify-center`}>
            {isSaving ? <ActivityIndicator color="white" /> : <Text style={tw`text-white text-center text-lg font-bold`}>設定を保存</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}