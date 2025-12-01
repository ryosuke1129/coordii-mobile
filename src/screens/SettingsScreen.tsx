import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Image, ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, StatusBar, TouchableWithoutFeedback, Keyboard, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import tw from 'twrnc';
import { api, uploadToS3 } from '../utils/api';
import { getUserId } from '../utils/user'; // ★追加

export default function SettingsScreen({ navigation }: any) {
  const [gender, setGender] = useState('男性');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [height, setHeight] = useState('');
  const [region, setRegion] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userId = await getUserId();
        if (!userId) return;

        // ★修正: userIdを使用
        const data = await api.getUser(userId);
        
        if (data.gender) setGender(data.gender);
        if (data.birthDay) setBirthDate(new Date(data.birthDay));
        if (data.height) setHeight(String(data.height));
        if (data.address) setRegion(data.address);
        if (data.imageLink) setProfileImage(data.imageLink);

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

  const handleSave = async () => {
    if (!region) return Alert.alert("エラー", "地域は必須です");

    setIsSaving(true);
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("ユーザーIDが見つかりません");

      const birthDateString = birthDate ? birthDate.toISOString().split('T')[0] : "";

      // ★修正: userIdを使用
      await api.registerUser({
        userId,
        gender,
        birthDay: birthDateString,
        height: parseInt(height) || 0,
        address: region,
        imageLink: profileImage
      });

      DeviceEventEmitter.emit('REGION_CHANGED', region);

      Alert.alert("完了", "設定を保存しました", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);

    } catch (e: any) {
      Alert.alert("エラー", e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={tw`flex-1 bg-gray-50`}>
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
            <ScrollView contentContainerStyle={tw`p-6 pb-40`}>
              <View style={tw`items-center mb-8`}>
                <TouchableOpacity onPress={handleImagePick} style={tw`relative`}>
                  <View style={tw`w-28 h-28 rounded-full bg-gray-200 border-4 border-white shadow-sm items-center justify-center overflow-hidden`}>
                    {profileImage ? <Image source={{ uri: profileImage }} style={tw`w-full h-full`} /> : <Ionicons name="person" size={60} color="#9ca3af" />}
                  </View>
                  <View style={tw`absolute bottom-0 right-0 bg-[#00255C] p-2 rounded-full border-2 border-white`}><Ionicons name="camera" size={16} color="white" /></View>
                </TouchableOpacity>
              </View>

              <View style={tw`gap-5`}>
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
    </TouchableWithoutFeedback>
  );
}