import React from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Modal, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

type ResultProps = {
  visible: boolean;
  onClose: () => void;
  resultData: any;
};

export default function ResultScreen({ visible, onClose, resultData }: ResultProps) {
  if (!resultData) return null;

  return (
    <Modal animationType="slide" transparent={false} visible={visible}>
      <View style={tw`flex-1 bg-white`}>
        
        {/* --- 修正1: ヘッダーを共通仕様に合わせる --- */}
        <View style={tw`bg-[#00255C]`}>
          <SafeAreaView>
            <View style={[
              tw`flex-row items-center justify-between px-4 pb-4`,
              Platform.OS === 'android' ? { paddingTop: StatusBar.currentHeight || 24 } : { paddingTop: 10 }
            ]}>
              {/* 左側のダミー (レイアウト調整用) */}
              <View style={tw`w-8`} />

              {/* 中央タイトル */}
              <Text style={tw`text-white text-xl font-bold`}>Coordii</Text>

              {/* 右側 閉じるボタン */}
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={32} color="white" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {/* --- 修正3: 下部の余白(pb)を増やしてボタン被りを防ぐ (pb-20 -> pb-40) --- */}
        <ScrollView contentContainerStyle={tw`p-6 pb-40`}>
          <Text style={tw`text-xl font-bold text-center text-gray-800 mb-6`}>
            コーデが完了しました！
          </Text>

          {/* AIのコメント */}
          <View style={tw`bg-blue-50 p-4 rounded-xl mb-8`}>
            <Text style={tw`text-gray-700 leading-6`}>
              {resultData.reason}
            </Text>
          </View>

          {/* アイテムリスト表示 */}
          <View style={tw`gap-6`}>
            
            {/* アウター */}
            <ItemRow label="アウター" imageUrl={resultData.outer_image} />
            
            {/* --- 修正2: トップスも右寄せレイアウトに統一 --- */}
            <View style={tw`flex-row items-start justify-between`}>
              <Text style={tw`font-bold text-gray-500 mt-4 w-20`}>トップス</Text>
              <View style={tw`flex-1 items-end gap-2`}>
                {resultData.tops_images && resultData.tops_images.length > 0 ? (
                  resultData.tops_images.map((img: string, idx: number) => (
                    <ItemImage key={idx} uri={img} />
                  ))
                ) : (
                  <Text style={tw`text-gray-400 mt-4`}>なし</Text>
                )}
              </View>
            </View>

            {/* ボトムス */}
            <ItemRow label="ボトムス" imageUrl={resultData.bottoms_image} />
            
            {/* シューズ */}
            <ItemRow label="シューズ" imageUrl={resultData.shoes_image} />
          
          </View>
        </ScrollView>

        {/* 下部ボタン */}
        <View style={tw`absolute bottom-0 w-full p-6 bg-white border-t border-gray-100`}>
          <TouchableOpacity 
            onPress={onClose}
            style={tw`w-full bg-[#00255C] py-4 rounded-full shadow-lg`}
          >
            <Text style={tw`text-white text-center text-lg font-bold`}>閉じる</Text>
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
}

// サブコンポーネント: アイテム行 (アウター・ボトムス・シューズ用)
const ItemRow = ({ label, imageUrl }: { label: string, imageUrl?: string }) => (
  <View style={tw`flex-row items-start justify-between`}>
    <Text style={tw`font-bold text-gray-500 mt-4 w-20`}>{label}</Text>
    <View style={tw`flex-1 items-end`}>
      {imageUrl ? (
        <ItemImage uri={imageUrl} />
      ) : (
        <Text style={tw`text-gray-400 mt-4`}>なし</Text>
      )}
    </View>
  </View>
);

// サブコンポーネント: 画像表示
const ItemImage = ({ uri }: { uri: string }) => (
  <Image 
    source={{ uri }} 
    style={[
      tw`w-32 h-32 rounded-xl bg-gray-100 border border-gray-200`,
      { resizeMode: 'contain' } // 画像全体が見えるようにcontain
    ]} 
  />
);