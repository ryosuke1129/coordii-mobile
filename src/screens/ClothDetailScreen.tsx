import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput, SafeAreaView, Platform, StatusBar, KeyboardAvoidingView, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { api } from '../utils/api';
import { getUserId } from '../utils/user'; // ★追加

export default function ClothDetailScreen({ route, navigation }: any) {
  const { cloth } = route.params;
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(cloth);
  const [isProcessing, setIsProcessing] = useState(false);

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

              // ★修正: userIdを使用
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

  const handleUpdate = async () => {
    setIsProcessing(true);
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("User ID not found");

      // ★修正: userIdを使用
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

  return (
    <View style={tw`flex-1 bg-white`}>
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
          <View style={tw`items-center mb-8`}>
            <Image 
              source={{ uri: cloth.imageUrl }} 
              style={[tw`w-full h-80 rounded-2xl bg-gray-100`, { resizeMode: 'contain' }]} 
            />
          </View>

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
    </View>
  );
}

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