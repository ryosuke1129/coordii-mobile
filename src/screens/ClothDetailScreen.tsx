import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  ActivityIndicator, 
  TextInput, 
  SafeAreaView, 
  Platform, 
  StatusBar, 
  KeyboardAvoidingView, 
  DeviceEventEmitter,
  Modal 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { api } from '../utils/api';
import { getUserId } from '../utils/user';
import ResultScreen from './ResultScreen'; // ★MVP2追加: 結果表示用

export default function ClothDetailScreen({ route, navigation }: any) {
  const { cloth } = route.params;
  
  // --- 既存ステート ---
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(cloth);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- ★MVP2追加ステート: コーデ生成用 ---
  const [isGenerating, setIsGenerating] = useState(false);
  const [coordResult, setCoordResult] = useState(null);
  const [showResult, setShowResult] = useState(false);

  // --- 既存機能: 削除 ---
  const handleDelete = () => {
    Alert.alert(
      "確認",
      "この服を削除しますか？\n（履歴には残ります）",
      [
        { text: "キャンセル", style: "cancel" },
        { 
          text: "削除", 
          style: "destructive",
          onPress: async () => {
            setIsProcessing(true);
            try {
              const userId = await getUserId();
              if (!userId) throw new Error("User ID not found");

              await api.deleteCloth(userId, cloth.clothId);
              
              DeviceEventEmitter.emit('CLOTHES_UPDATED');
              Alert.alert("完了", "削除しました", [
                { text: "OK", onPress: () => navigation.goBack() }
              ]);
            } catch (e) {
              Alert.alert("エラー", "削除に失敗しました");
              setIsProcessing(false);
            }
          }
        }
      ]
    );
  };

  // --- 既存機能: 更新 ---
  const handleUpdate = async () => {
    setIsProcessing(true);
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("User ID not found");

      await api.updateCloth({
        userId: userId,
        clothId: cloth.clothId,
        ...editData
      });
      
      DeviceEventEmitter.emit('CLOTHES_UPDATED');

      Alert.alert("完了", "情報を更新しました", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert("エラー", "更新に失敗しました");
      setIsProcessing(false);
    }
  };

  // --- ★MVP2追加機能: この服を使ってコーデを作成 ---
  const handleCreateCoord = () => {
    const currentHour = new Date().getHours();
    const dayLabel = currentHour >= 19 ? "明日" : "今日";

    Alert.alert(
      "コーデ作成",
      `この「${cloth.category}」を使って\n${dayLabel}のコーデを提案しますか？`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "開始",
          onPress: async () => {
            setIsGenerating(true);
            try {
              const userId = await getUserId();
              if (!userId) throw new Error("User ID not found");

              const result = await api.createCoordinate(userId, cloth.clothId);
              
              setCoordResult(result);
              setShowResult(true);
              
              DeviceEventEmitter.emit('REFRESH_HOME');
            } catch (e: any) {
              Alert.alert("エラー", "コーデ作成に失敗しました: " + e.message);
            } finally {
              setIsGenerating(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={tw`flex-1 bg-white`}>
      {/* ヘッダー */}
      <View style={tw`bg-[#00255C]`}>
        <SafeAreaView>
          <View style={[
            tw`flex-row items-center justify-between px-4 pb-4`,
            Platform.OS === 'android' ? { paddingTop: StatusBar.currentHeight || 24 } : { paddingTop: 10 }
          ]}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={28} color="white" />
            </TouchableOpacity>
            <Text style={tw`text-white text-xl font-bold`}>
              {isEditing ? "編集" : "アイテム詳細"}
            </Text>
            <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
              <Text style={tw`text-white font-bold`}>{isEditing ? "キャンセル" : "編集"}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={tw`flex-1`}>
        <ScrollView contentContainerStyle={tw`p-6 pb-40`}>
          
          {/* 画像表示エリア */}
          <View style={tw`items-center mb-8`}>
            <Image 
              source={{ uri: cloth.imageUrl }} 
              style={[tw`w-full h-80 rounded-2xl bg-gray-100`, { resizeMode: 'contain' }]} 
            />
          </View>

          {/* ★MVP2追加: コーデ作成ボタン (閲覧モード時のみ表示) */}
          {!isEditing && (
            <TouchableOpacity
              onPress={handleCreateCoord}
              style={tw`mb-8 bg-white border-2 border-[#00255C] py-4 rounded-xl flex-row justify-center items-center shadow-sm`}
            >
              <Ionicons name="sparkles" size={20} color="#00255C" style={{ marginRight: 8 }} />
              <Text style={tw`text-[#00255C] text-center text-lg font-bold`}>この服でコーデを作る</Text>
            </TouchableOpacity>
          )}

          {/* 詳細情報 / 編集フォーム */}
          {isEditing ? (
            <View style={tw`gap-4`}>
              <EditRow label="カテゴリ" value={editData.category} onChange={(t:string) => setEditData({...editData, category: t})} />
              <EditRow label="ブランド" value={editData.brand || ''} onChange={(t: string) => setEditData({...editData, brand: t})} placeholder="例: UNIQLO" />
              <EditRow label="サイズ" value={editData.size || ''} onChange={(t: string) => setEditData({...editData, size: t})} placeholder="例: L" />
              <EditRow label="色" value={editData.color} onChange={(t:string) => setEditData({...editData, color: t})} />
              <EditRow label="素材" value={editData.material} onChange={(t:string) => setEditData({...editData, material: t})} />
              <EditRow label="季節" value={Array.isArray(editData.seasons) ? editData.seasons.join(',') : editData.seasons} onChange={(t:string) => setEditData({...editData, seasons: t.split(',')})} />
              <EditRow label="スタイル" value={editData.style} onChange={(t:string) => setEditData({...editData, style: t})} />
              <View style={tw`flex-row gap-4`}>
                <View style={tw`flex-1`}><EditRow label="最低気温" value={String(editData.suitableMinTemp)} onChange={(t:string) => setEditData({...editData, suitableMinTemp: parseInt(t) || 0})} keyboardType="numeric" /></View>
                <View style={tw`flex-1`}><EditRow label="最高気温" value={String(editData.suitableMaxTemp)} onChange={(t:string) => setEditData({...editData, suitableMaxTemp: parseInt(t) || 0})} keyboardType="numeric" /></View>
              </View>
              <View>
                <Text style={tw`text-xs font-bold text-gray-500 mb-1`}>説明</Text>
                <TextInput
                  value={editData.description}
                  onChangeText={(t) => setEditData({...editData, description: t})}
                  multiline
                  style={tw`bg-gray-50 border border-gray-200 rounded-lg p-3 text-base h-24`}
                />
              </View>
            </View>
          ) : (
            <View style={tw`gap-4`}>
              <DetailRow label="カテゴリ" value={cloth.category} />
              <DetailRow label="ブランド" value={cloth.brand} />
              <DetailRow label="サイズ" value={cloth.size} />
              <DetailRow label="色" value={cloth.color} />
              <DetailRow label="素材" value={cloth.material} />
              <DetailRow label="季節" value={Array.isArray(cloth.seasons) ? cloth.seasons.join('・') : cloth.seasons} />
              <DetailRow label="スタイル" value={cloth.style} />
              <DetailRow label="気温目安" value={`${cloth.suitableMinTemp}℃ 〜 ${cloth.suitableMaxTemp}℃`} />
              <View style={tw`mt-2`}>
                <Text style={tw`text-xs text-gray-400 font-bold mb-1`}>説明</Text>
                <View style={tw`bg-gray-50 p-4 rounded-xl`}>
                  <Text style={tw`text-gray-700 leading-5`}>{cloth.description || "説明なし"}</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* フッターボタン (更新/削除) */}
      <View style={tw`absolute bottom-0 w-full p-6 bg-white border-t border-gray-100 flex-row gap-4`}>
        {isEditing ? (
          <TouchableOpacity 
            onPress={handleUpdate} 
            disabled={isProcessing}
            style={tw`flex-1 bg-[#00255C] py-4 rounded-full flex-row justify-center items-center shadow-lg`}
          >
            {isProcessing ? <ActivityIndicator color="white" /> : <Text style={tw`text-white text-center text-lg font-bold`}>更新する</Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            onPress={handleDelete} 
            disabled={isProcessing}
            style={tw`flex-1 bg-red-50 py-4 rounded-full flex-row justify-center items-center border border-red-100`}
          >
            {isProcessing ? (
              <ActivityIndicator color="#ef4444" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={20} color="#ef4444" style={{ marginRight: 8 }} />
                <Text style={tw`text-red-500 text-center text-lg font-bold`}>削除する</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* ★MVP2追加: 生成中ローディングオーバーレイ */}
      <Modal visible={isGenerating} transparent animationType="fade">
        <View style={[
          tw`absolute inset-0 bg-black/50 items-center justify-center z-50`,
          { width: '100%', height: '100%' }
        ]}>
          <View style={tw`bg-white p-8 rounded-2xl items-center`}>
            <ActivityIndicator size="large" color="#00255C" />
            <Text style={tw`mt-4 font-bold text-gray-700 text-center`}>
              この服に合わせて{'\n'}AIがコーデを考え中...
            </Text>
          </View>
        </View>
      </Modal>

      {/* ★MVP2追加: 結果表示画面 */}
      <ResultScreen 
        visible={showResult} 
        onClose={() => setShowResult(false)} 
        resultData={coordResult} 
      />

    </View>
  );
}

// サブコンポーネント (変更なし)
const DetailRow = ({ label, value }: { label: string, value: string }) => (
  <View style={tw`flex-row justify-between items-center py-3 border-b border-gray-100`}>
    <Text style={tw`text-gray-400 font-bold text-sm`}>{label}</Text>
    <Text style={tw`text-gray-800 font-bold text-base`}>{value || "-"}</Text>
  </View>
);

const EditRow = ({ label, value, onChange, placeholder, keyboardType = 'default' }: any) => (
  <View>
    <Text style={tw`text-xs font-bold text-gray-500 mb-1`}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      keyboardType={keyboardType}
      style={tw`bg-gray-50 border border-gray-200 rounded-lg p-3 text-base text-gray-800`}
    />
  </View>
);