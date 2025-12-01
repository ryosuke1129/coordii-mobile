import React from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Modal, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

type Props = {
  visible: boolean;
  onClose: () => void;
  coordData: any;
  navigation: any; // 遷移用
};

export default function CoordinateDetailScreen({ visible, onClose, coordData, navigation }: Props) {
  if (!coordData) return null;

  // ★修正: 服タップ時の処理
  // 削除フラグを見て、生きている場合のみ詳細画面へ遷移
  const handleClothPress = (cloth: any) => {
    if (!cloth) return;

    // deleteFlagが 1 (削除済み) なら何もしない
    if (cloth.deleteFlag === 1) {
      return; 
    }

    // 生きているなら詳細へ
    onClose(); // モーダルを閉じる
    navigation.navigate('ClothDetail', { cloth });
  };

  return (
    <Modal animationType="slide" transparent={false} visible={visible}>
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

          <View style={tw`bg-blue-50 p-4 rounded-xl mb-8`}>
            <Text style={tw`text-gray-700 leading-6`}>
              {coordData.reason}
            </Text>
          </View>

          <View style={tw`gap-6`}>
            
            {/* アウター: coordData.outer_cloth を渡す */}
            <ItemRow 
              label="アウター" 
              cloth={coordData.outer_cloth} 
              onPress={handleClothPress} 
            />
            
            {/* トップス (配列) */}
            <View style={tw`flex-row items-start justify-between`}>
              <Text style={tw`font-bold text-gray-500 mt-4 w-20`}>トップス</Text>
              <View style={tw`flex-1 items-end gap-2`}>
                {coordData.tops_clothes && coordData.tops_clothes.length > 0 ? (
                  coordData.tops_clothes.map((cloth: any, idx: number) => (
                    <TouchableOpacity 
                      key={idx} 
                      onPress={() => handleClothPress(cloth)}
                      activeOpacity={cloth.deleteFlag === 1 ? 1 : 0.7} // 削除済みならタップ感なし
                    >
                      <ItemImage uri={cloth.imageUrl} isDeleted={cloth.deleteFlag === 1} />
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={tw`text-gray-400 mt-4`}>なし</Text>
                )}
              </View>
            </View>

            {/* ボトムス */}
            <ItemRow 
              label="ボトムス" 
              cloth={coordData.bottoms_cloth} 
              onPress={handleClothPress} 
            />
            
            {/* シューズ */}
            <ItemRow 
              label="シューズ" 
              cloth={coordData.shoes_cloth} 
              onPress={handleClothPress} 
            />
          
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// サブコンポーネント: アイテム行
const ItemRow = ({ label, cloth, onPress }: any) => (
  <View style={tw`flex-row items-start justify-between`}>
    <Text style={tw`font-bold text-gray-500 mt-4 w-20`}>{label}</Text>
    <View style={tw`flex-1 items-end`}>
      {cloth ? (
        <TouchableOpacity 
          onPress={() => onPress(cloth)}
          activeOpacity={cloth.deleteFlag === 1 ? 1 : 0.7}
        >
          <ItemImage uri={cloth.imageUrl} isDeleted={cloth.deleteFlag === 1} />
        </TouchableOpacity>
      ) : (
        <Text style={tw`text-gray-400 mt-4`}>なし</Text>
      )}
    </View>
  </View>
);

// サブコンポーネント: 画像表示
// 削除済みなら少し薄くするなどの視覚効果を入れると親切ですが、今回は「何も起こらない」仕様に準拠
const ItemImage = ({ uri, isDeleted }: { uri: string, isDeleted: boolean }) => (
  <View style={tw`relative`}>
    <Image 
      source={{ uri }} 
      style={[
        tw`w-32 h-32 rounded-xl bg-gray-100 border border-gray-200`,
        { resizeMode: 'contain', opacity: isDeleted ? 0.5 : 1 } // ★削除済みは半透明に
      ]} 
    />
    {isDeleted && (
      <View style={tw`absolute inset-0 items-center justify-center`}>
        <Text style={tw`text-gray-500 font-bold bg-white/80 px-2 py-1 rounded text-xs`}>削除済</Text>
      </View>
    )}
  </View>
);