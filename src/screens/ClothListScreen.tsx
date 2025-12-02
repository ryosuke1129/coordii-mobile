import React, { useState, useEffect } from 'react';
import { 
  View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, 
  LayoutAnimation, Platform, UIManager, Alert, Modal, TextInput, 
  KeyboardAvoidingView, SafeAreaView, StatusBar, DeviceEventEmitter, 
  RefreshControl 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import tw from 'twrnc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, uploadToS3 } from '../utils/api';
import { getUserId } from '../utils/user';
import OnboardingTooltip from '../components/OnboardingTooltip';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CATEGORIES = ["アウター", "トップス", "ボトムス", "ワンピース", "シューズ", "小物"];
const CLOTHES_CACHE_KEY = 'CLOTHES_CACHE';

export default function ClothListScreen({ navigation }: any) {
  const [loadedData, setLoadedData] = useState<{ [key: string]: any[] }>({});
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processMessage, setProcessMessage] = useState("");

  const [showConfirm, setShowConfirm] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [tempImageUrl, setTempImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  
  // ガイド表示用ステート
  const [showCameraGuide, setShowCameraGuide] = useState(false);

  // --- 初期化ロジック (統合版) ---
  useEffect(() => {
    // 1. 初回データロード
    fetchAllClothes(false);
    
    // 2. ガイド表示チェック
    checkCameraGuide();

    // 3. 更新イベントの購読 (詳細画面や削除時の反映)
    const updateSub = DeviceEventEmitter.addListener('CLOTHES_UPDATED', () => {
      fetchAllClothes(true);
    });

    return () => updateSub.remove();
  }, []);

  // --- ガイド表示チェック ---
  const checkCameraGuide = async () => {
    const hasSeen = await AsyncStorage.getItem('HAS_SEEN_CAMERA_GUIDE');
    if (!hasSeen) {
      setTimeout(() => setShowCameraGuide(true), 500);
    }
  };

  const dismissCameraGuide = async () => {
    setShowCameraGuide(false);
    await AsyncStorage.setItem('HAS_SEEN_CAMERA_GUIDE', 'true');
  };

  // --- データ取得 ---
  const fetchAllClothes = async (forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        const cached = await AsyncStorage.getItem(CLOTHES_CACHE_KEY);
        if (cached) {
          setLoadedData(JSON.parse(cached));
          setIsLoading(false);
          // キャッシュがあっても裏で更新するかは要件次第ですが、通信削減のためここではreturn
          return;
        }
      }

      const userId = await getUserId();
      if (!userId) return;

      const data = await api.getClothes(userId);
      
      const grouped: { [key: string]: any[] } = {};
      CATEGORIES.forEach(cat => grouped[cat] = []);
      
      data.forEach((item: any) => {
        if (CATEGORIES.includes(item.category)) {
          grouped[item.category].push(item);
        }
      });
      
      setLoadedData(grouped);
      await AsyncStorage.setItem(CLOTHES_CACHE_KEY, JSON.stringify(grouped));

    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 引っ張って更新 ---
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllClothes(true);
    setRefreshing(false);
  };

  const toggleCategory = (category: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => ({ ...prev, [category]: !prev[category] }));
  };

  // --- 1. アップロード & AI解析 ---
  const uploadAndAnalyze = async (uri: string) => {
    setIsProcessing(true);
    setProcessMessage("画像をアップロードして\nAI解析中...");
    
    try {
      const response = await api.getUploadUrl('jpg');
      const { uploadUrl, imageUrl, downloadUrl } = response;
      setTempImageUrl(imageUrl);
      setPreviewUrl(downloadUrl);
      await uploadToS3(uploadUrl, uri);
      
      const userId = await getUserId();
      if (!userId) throw new Error("User ID not found");

      const analyzeResult = await api.analyzeCloth(imageUrl, userId);
      setEditData(analyzeResult.data);
      setIsProcessing(false);
      setTimeout(() => setShowConfirm(true), 500);
    } catch (e: any) {
      setIsProcessing(false);
      setTimeout(() => Alert.alert("エラー", e.message), 500);
    }
  };

  // --- 2. 最終登録 ---
  const handleFinalRegister = async () => {
    if (!tempImageUrl || !editData || !editData.category) {
      Alert.alert("エラー", "登録データが不足しています");
      return;
    }
    setShowConfirm(false);
    
    // 少し待ってから処理開始 (モーダル閉じアニメーション待ち)
    setTimeout(async () => {
      setIsProcessing(true);
      setProcessMessage("登録しています...");
      try {
        const userId = await getUserId();
        if (!userId) throw new Error("User ID not found");

        const registerData = await api.registerCloth({
          userId,
          imageUrl: tempImageUrl,
          ...editData 
        });
        
        await fetchAllClothes(true);
        setIsProcessing(false);
        
        // 初回アップロード完了を通知 (App.tsxで検知してガイドを表示)
        const hasSeenCoordGuide = await AsyncStorage.getItem('HAS_SEEN_COORD_GUIDE');
        if (!hasSeenCoordGuide) {
            DeviceEventEmitter.emit('FIRST_UPLOAD_DONE');
        }

        setTimeout(() => {
          Alert.alert("完了", "洋服を登録しました！", [
            {
              text: "OK",
              onPress: () => {
                const addedCategory = registerData.data.category;
                if (addedCategory) setExpanded(prev => ({ ...prev, [addedCategory]: true }));
              }
            }
          ]);
        }, 500);
      } catch (e: any) {
        setIsProcessing(false);
        setTimeout(() => Alert.alert("登録エラー", e.message, [{ text: "戻る", onPress: () => setShowConfirm(true) }]), 500);
      }
    }, 500);
  };

  // --- カメラ/アルバム選択 ---
  const handleAddCloth = () => {
    dismissCameraGuide();
    Alert.alert(
      "洋服を追加",
      "写真の追加方法を選択してください",
      [
        {
          text: "カメラで撮影",
          onPress: async () => {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) return Alert.alert("許可が必要です", "カメラの使用を許可してください");
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: false, quality: 0.5,
            });
            if (!result.canceled) uploadAndAnalyze(result.assets[0].uri);
          }
        },
        {
          text: "アルバムから選択",
          onPress: async () => {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) return Alert.alert("許可が必要です", "写真へのアクセスを許可してください");
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: false, quality: 0.5,
            });
            if (!result.canceled) uploadAndAnalyze(result.assets[0].uri);
          }
        },
        { text: "キャンセル", style: "cancel" }
      ]
    );
  };

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <ScrollView 
        contentContainerStyle={tw`pb-32 pt-4 px-4`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00255C']} tintColor={'#00255C'} />
        }
      >
        {isLoading ? (
          <View style={tw`mt-20`}><ActivityIndicator size="large" color="#00255C" /></View>
        ) : (
          CATEGORIES.map((category) => {
            const isOpen = expanded[category];
            const items = loadedData[category] || [];

            return (
              <View key={category} style={tw`mb-4 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden`}>
                <TouchableOpacity onPress={() => toggleCategory(category)} activeOpacity={0.7} style={tw`flex-row items-center justify-between p-4 bg-white`}>
                  <View style={tw`flex-row items-center`}>
                    <Text style={tw`text-lg font-bold text-gray-700`}>{category}</Text>
                    {items.length > 0 && <View style={tw`bg-gray-100 px-2 py-0.5 rounded-full ml-2`}><Text style={tw`text-xs text-gray-600 font-bold`}>{items.length}</Text></View>}
                  </View>
                  <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={20} color="#9ca3af" />
                </TouchableOpacity>

                {isOpen && (
                  <View style={tw`px-3 pb-4`}>
                    {items.length === 0 ? (
                      <Text style={tw`text-gray-400 text-center py-2 text-sm`}>登録なし</Text>
                    ) : (
                      <View style={tw`flex-row flex-wrap gap-2`}>
                        {items.map((item) => (
                          <TouchableOpacity 
                            key={item.clothId} 
                            style={[tw`bg-gray-50 rounded-lg border border-gray-100 overflow-hidden`, { width: '31%', aspectRatio: 1 }]}
                            onPress={() => navigation.navigate('ClothDetail', { cloth: item })}
                          >
                            <Image source={{ uri: item.imageUrl }} style={[tw`w-full h-full`, { resizeMode: 'cover' }]} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
        <View style={tw`h-10`} />
      </ScrollView>

      {/* フローティングアクションボタン (FAB) */}
      <View style={tw`absolute bottom-6 right-6`}>
        <TouchableOpacity onPress={handleAddCloth} style={[tw`bg-[#00255C] w-14 h-14 rounded-full items-center justify-center`, { shadowColor: "#00255C", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 5 }]}>
          <Ionicons name="camera" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* オンボーディングツールチップ */}
      {showCameraGuide && !isLoading && (
        <OnboardingTooltip 
          text="ここからあなたの洋服を追加できます！📷"
          position="bottom-right-fab"
          onPress={dismissCameraGuide}
        />
      )}

      {/* ロード中モーダル */}
      <Modal visible={isProcessing} transparent animationType="fade">
        <View style={tw`flex-1 bg-black/50 items-center justify-center`}>
          <View style={tw`bg-white p-6 rounded-2xl items-center w-64`}>
            <ActivityIndicator size="large" color="#00255C" />
            <Text style={tw`mt-4 font-bold text-gray-700 text-center`}>{processMessage}</Text>
          </View>
        </View>
      </Modal>

      {/* 登録確認モーダル */}
      <Modal visible={showConfirm} animationType="slide">
        <View style={tw`flex-1 bg-white`}>
          <View style={tw`bg-[#00255C]`}>
            <SafeAreaView>
              <View style={[tw`flex-row items-center justify-between px-4 pb-4`, Platform.OS === 'android' ? { paddingTop: StatusBar.currentHeight || 24 } : { paddingTop: 10 }]}>
                <View style={tw`w-8`} />
                <Text style={tw`text-white text-xl font-bold`}>Coordii</Text>
                <TouchableOpacity onPress={() => setShowConfirm(false)}><Ionicons name="close" size={32} color="white" /></TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={tw`flex-1`}>
            <ScrollView contentContainerStyle={tw`p-6 pb-40`}>
              <Text style={tw`text-center font-bold text-gray-700 mb-6`}>これで登録しますか？</Text>
              <View style={tw`items-center mb-8`}>
                {tempImageUrl ? <Image source={{ uri: previewUrl }} style={[tw`w-40 h-40 rounded-xl bg-gray-100`, { resizeMode: 'cover' }]} /> : <View style={tw`items-center mb-8 h-40 justify-center`}><ActivityIndicator color="#00255C" /></View>}
              </View>
              {editData && (
                <View style={tw`gap-4`}>
                  <EditRow label="種類" value={editData.category || ''} onChange={(t: string) => setEditData({...editData, category: t})} />
                  <EditRow label="ブランド" value={editData.brand || ''} onChange={(t: string) => setEditData({...editData, brand: t})} placeholder="例: UNIQLO" />
                  <EditRow label="サイズ" value={editData.size || ''} onChange={(t: string) => setEditData({...editData, size: t})} placeholder="例: L" />
                  <EditRow label="色" value={editData.color || ''} onChange={(t: string) => setEditData({...editData, color: t})} />
                  <EditRow label="素材" value={editData.material || ''} onChange={(t: string) => setEditData({...editData, material: t})} />
                  <EditRow label="季節" value={Array.isArray(editData.seasons) ? editData.seasons.join(',') : (editData.seasons || '')} onChange={(t: string) => setEditData({...editData, seasons: t.split(',')})} placeholder="春,夏" />
                  <EditRow label="スタイル" value={editData.style || ''} onChange={(t: string) => setEditData({...editData, style: t})} />
                  <View style={tw`flex-row gap-4`}>
                    <View style={tw`flex-1`}><EditRow label="最低気温" value={String(editData.suitableMinTemp || '')} onChange={(t: string) => setEditData({...editData, suitableMinTemp: parseInt(t) || 0})} keyboardType="numeric" /></View>
                    <View style={tw`flex-1`}><EditRow label="最高気温" value={String(editData.suitableMaxTemp || '')} onChange={(t: string) => setEditData({...editData, suitableMaxTemp: parseInt(t) || 0})} keyboardType="numeric" /></View>
                  </View>
                  <View><Text style={tw`text-xs font-bold text-gray-500 mb-1`}>説明</Text><TextInput value={editData.description || ''} onChangeText={(t) => setEditData({...editData, description: t})} multiline style={tw`bg-gray-50 border border-gray-200 rounded-lg p-3 text-base h-24`} /></View>
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
          <View style={tw`absolute bottom-0 w-full p-6 bg-white border-t border-gray-100`}>
            <TouchableOpacity onPress={handleFinalRegister} style={tw`w-full bg-[#00255C] py-4 rounded-full shadow-lg`}><Text style={tw`text-white text-center text-lg font-bold`}>登録する</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const EditRow = ({ label, value, onChange, placeholder, keyboardType = 'default' }: any) => (
  <View>
    <Text style={tw`text-xs font-bold text-gray-500 mb-1`}>{label}</Text>
    <TextInput value={value} onChangeText={onChange} placeholder={placeholder} keyboardType={keyboardType} style={tw`bg-gray-50 border border-gray-200 rounded-lg p-3 text-base text-gray-800`} />
  </View>
);