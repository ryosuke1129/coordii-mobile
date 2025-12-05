import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Modal, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ImageViewing from 'react-native-image-viewing'; // ★追加
import tw from 'twrnc';

type Props = {
  visible: boolean;
  onClose: () => void;
  coordData: any;
  navigation: any;
};

export default function CoordinateDetailScreen({ visible, onClose, coordData, navigation }: Props) {
  // ★追加: 拡大表示用のステート
  const [isZoomVisible, setIsZoomVisible] = useState(false);

  if (!coordData) return null;

  const handleClothPress = (cloth: any) => {
    if (!cloth) return;
    if (cloth.deleteFlag === 1) return;
    onClose();
    navigation.navigate('ClothDetail', { cloth });
  };

  const tryOnImage = coordData.tryOnImage || coordData.tryOnImageUrl;

  return (
    <Modal animationType="slide" transparent={false} visible={visible}>
      {/* ★修正: flex-1を追加してスクロール可能にする */}
      <View style={tw`flex-1 bg-white`}>
        
        {/* ヘッダー */}
        <View style={tw`bg-[#00255C]`}>
          <SafeAreaView>
            <View style={[
              tw`flex-row items-center justify-between px-4 pb-4`,
              Platform.OS === 'android' ? { paddingTop: StatusBar.currentHeight || 24 } : { paddingTop: 10 }
            ]}>
              <View style={tw`w-8`} />
              <Text style={tw`text-white text-xl font-bold`}>コーデ詳細</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={32} color="white" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        <ScrollView contentContainerStyle={tw`p-6 pb-40`}>
          <View style={tw`flex-row justify-between items-end mb-6`}>
            <Text style={tw`text-2xl font-bold text-gray-800`}>{coordData.targetDate}</Text>
            <Text style={tw`text-gray-500 mb-1`}>{coordData.weatherData?.weather}</Text>
          </View>

          {/* ★修正: 試着画像エリア (小さくし、タップで拡大) */}
          {tryOnImage && (
            <View style={tw`mb-8`}>
              <View style={tw`flex-row items-center gap-2 mb-2`}>
                <Ionicons name="sparkles" size={16} color="#00255C" />
                <Text style={tw`font-bold text-gray-600`}>バーチャル試着イメージ</Text>
              </View>
              
              <TouchableOpacity 
                activeOpacity={0.9} 
                onPress={() => setIsZoomVisible(true)} // ★拡大表示を開く
              >
                {/* ★修正: 高さを h-72 に制限し、contain で全体を表示 */}
                <View style={tw`w-full h-72 bg-gray-50 rounded-2xl overflow-hidden shadow-sm border border-gray-100`}>
                  <Image 
                    source={{ uri: tryOnImage }} 
                    style={[tw`w-full h-full`, { resizeMode: 'contain' }]} 
                  />
                  {/* 拡大アイコン追加 */}
                  <View style={tw`absolute bottom-2 right-2 bg-black/50 p-1.5 rounded-full`}>
                    <Ionicons name="expand-outline" size={20} color="white" />
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          )}

          <View style={tw`bg-blue-50 p-4 rounded-xl mb-8`}>
            <Text style={tw`text-gray-700 leading-6`}>{coordData.reason}</Text>
          </View>

          <View style={tw`gap-6`}>
            {/* ... (アイテムリスト: 変更なし) ... */}
            <ItemRow label="アウター" cloth={coordData.outer_cloth} onPress={handleClothPress} />
            <View style={tw`flex-row items-start justify-between`}>
              <Text style={tw`font-bold text-gray-500 mt-4 w-20`}>トップス</Text>
              <View style={tw`flex-1 items-end gap-2`}>
                {coordData.tops_clothes && coordData.tops_clothes.length > 0 ? (
                  coordData.tops_clothes.map((cloth: any, idx: number) => (
                    <TouchableOpacity key={idx} onPress={() => handleClothPress(cloth)} activeOpacity={cloth.deleteFlag === 1 ? 1 : 0.7}>
                      <ItemImage uri={cloth.imageUrl} isDeleted={cloth.deleteFlag === 1} />
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={tw`text-gray-400 mt-4`}>なし</Text>
                )}
              </View>
            </View>
            <ItemRow label="ボトムス" cloth={coordData.bottoms_cloth} onPress={handleClothPress} />
            <ItemRow label="シューズ" cloth={coordData.shoes_cloth} onPress={handleClothPress} />
          </View>
        </ScrollView>

        {/* ★追加: 拡大表示モーダル */}
        {tryOnImage && (
          <ImageViewing
            images={[{ uri: tryOnImage }]}
            imageIndex={0}
            visible={isZoomVisible}
            onRequestClose={() => setIsZoomVisible(false)}
            swipeToCloseEnabled={true}
            doubleTapToZoomEnabled={true}
          />
        )}

      </View>
    </Modal>
  );
}

// ... (ItemRow, ItemImage は変更なし) ...
const ItemRow = ({ label, cloth, onPress }: any) => (
  <View style={tw`flex-row items-start justify-between`}>
    <Text style={tw`font-bold text-gray-500 mt-4 w-20`}>{label}</Text>
    <View style={tw`flex-1 items-end`}>
      {cloth ? (
        <TouchableOpacity onPress={() => onPress(cloth)} activeOpacity={cloth.deleteFlag === 1 ? 1 : 0.7}>
          <ItemImage uri={cloth.imageUrl} isDeleted={cloth.deleteFlag === 1} />
        </TouchableOpacity>
      ) : (
        <Text style={tw`text-gray-400 mt-4`}>なし</Text>
      )}
    </View>
  </View>
);
const ItemImage = ({ uri, isDeleted }: { uri: string, isDeleted: boolean }) => (
  <View style={tw`relative`}>
    <Image source={{ uri }} style={[tw`w-32 h-32 rounded-xl bg-gray-100 border border-gray-200`, { resizeMode: 'contain', opacity: isDeleted ? 0.5 : 1 }]} />
    {isDeleted && (
      <View style={tw`absolute inset-0 items-center justify-center`}>
        <Text style={tw`text-gray-500 font-bold bg-white/80 px-2 py-1 rounded text-xs`}>削除済</Text>
      </View>
    )}
  </View>
);