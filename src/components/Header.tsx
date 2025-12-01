import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native'; // ★追加
import tw from 'twrnc';

export default function Header() {
  const navigation = useNavigation<any>(); // ★追加

  return (
    <View style={tw`bg-[#00255C]`}>
      <SafeAreaView>
        <View style={[
          tw`flex-row items-center justify-between px-4 pb-4`,
          Platform.OS === 'android' ? { paddingTop: StatusBar.currentHeight || 24 } : { paddingTop: 10 }
        ]}>
          
          <View style={tw`w-8`} />
          <Text style={tw`text-white text-xl font-bold`}>Coordii</Text>

          {/* ★修正: タップでSettingsへ遷移 */}
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="person-circle-outline" size={32} color="white" />
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    </View>
  );
}