import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import tw from 'twrnc';
import { api } from '../utils/api'; // TEST_USER_IDは削除
import { createUserId } from '../utils/user'; // ★追加: ID生成用

export default function SetupScreen({ navigation }: any) {
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [height, setHeight] = useState('');
  const [region, setRegion] = useState('');
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ローカル時間を維持して "YYYY-MM-DD" を作る関数
  const formatDateLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleStart = async () => {
    if (!gender || !birthDate || !height || !region) {
      Alert.alert("エラー", "すべての項目を入力してください");
      return;
    }

    setIsLoading(true);
    try {
      // ★修正: 新しいユーザーIDを発行・保存
      const newUserId = await createUserId();
      
      const birthDateString = formatDateLocal(birthDate);

      // 発行したIDを使って登録
      await api.registerUser({
        userId: newUserId,
        gender,
        birthDay: birthDateString,
        height: parseInt(height) || 0,
        address: region
      });

      // メイン画面へ遷移
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main', params: { region } }],
      });

    } catch (e: any) {
      Alert.alert("エラー", e.message || "通信エラー");
    } finally {
      setIsLoading(false);
    }
  };

  const onChangeDate = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setBirthDate(selectedDate);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={tw`flex-1 bg-white px-8`}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          style={tw`flex-1 justify-center`}
        >
          <View style={tw`items-center mb-10`}>
            <Text style={tw`text-lg font-bold text-gray-800`}>ようこそ！</Text>
            <Text style={tw`text-3xl font-extrabold text-[#00255C] mt-1`}>Coordii</Text>
          </View>

          <Text style={tw`text-base font-bold text-gray-700 mb-6 border-b border-gray-200 pb-1`}>
            初期設定
          </Text>

          {/* 1. 性別 */}
          <View style={tw`mb-5`}>
            <Text style={tw`text-gray-500 text-xs font-bold mb-1`}>性別</Text>
            <View style={tw`flex-row justify-between`}>
              {['男性', '女性', 'その他'].map((item) => (
                <TouchableOpacity 
                  key={item} 
                  onPress={() => setGender(item)} 
                  style={tw`w-[30%] py-2 rounded border ${gender === item ? 'bg-[#00255C] border-[#00255C]' : 'bg-white border-gray-300'}`}
                >
                  <Text style={tw`text-center font-bold text-sm ${gender === item ? 'text-white' : 'text-gray-400'}`}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 2. 生年月日 */}
          <View style={tw`mb-5`}>
            <Text style={tw`text-gray-500 text-xs font-bold mb-1`}>生年月日</Text>
            
            <TouchableOpacity 
              onPress={() => setShowDatePicker(!showDatePicker)}
              style={tw`w-full p-3 bg-gray-50 border border-gray-300 rounded justify-center`}
            >
              <Text style={[tw`text-base`, !birthDate ? tw`text-gray-400` : tw`text-gray-800`]}>
                {birthDate ? formatDateLocal(birthDate) : "YYYY-MM-DD"}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <View style={tw`mt-2 bg-gray-50 rounded-lg overflow-hidden`}>
                <DateTimePicker
                  value={birthDate || new Date(2000, 0, 1)}
                  mode="date"
                  display="spinner"
                  onChange={onChangeDate}
                  locale="ja-JP"
                  style={{ height: 120 }}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity 
                    onPress={() => setShowDatePicker(false)}
                    style={tw`bg-gray-200 py-2 items-center`}
                  >
                    <Text style={tw`text-blue-600 font-bold`}>完了</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* 3. 身長 */}
          <View style={tw`mb-5`}>
            <Text style={tw`text-gray-500 text-xs font-bold mb-1`}>身長 (cm)</Text>
            <TextInput 
              value={height} 
              onChangeText={setHeight} 
              keyboardType="numeric" 
              placeholder="例: 170" 
              placeholderTextColor="#9ca3af"
              style={tw`w-full p-3 bg-gray-50 border border-gray-300 rounded text-base text-gray-800`} 
            />
          </View>

          {/* 4. 地域 */}
          <View style={tw`mb-10`}>
            <Text style={tw`text-gray-500 text-xs font-bold mb-1`}>地域</Text>
            <TextInput 
              value={region} 
              onChangeText={setRegion} 
              placeholder="例: 福岡市博多区" 
              placeholderTextColor="#9ca3af"
              style={tw`w-full p-3 bg-gray-50 border border-gray-300 rounded text-base text-gray-800`} 
            />
            <Text style={tw`text-[10px] text-gray-400 mt-1`}>
              ※入力された地名から天気を取得します
            </Text>
          </View>

          <TouchableOpacity 
            onPress={handleStart} 
            disabled={isLoading}
            style={tw`w-full bg-[#00255C] py-3 rounded-full shadow-md flex-row justify-center items-center`}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={tw`text-white text-center text-lg font-bold`}>Coordiiを始める</Text>
            )}
          </TouchableOpacity>

        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}