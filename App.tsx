import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator, Alert, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import tw from 'twrnc';
import AsyncStorage from '@react-native-async-storage/async-storage';

import SetupScreen from './src/screens/SetupScreen';
import HomeScreen from './src/screens/HomeScreen';
import ClothListScreen from './src/screens/ClothListScreen';
import ResultScreen from './src/screens/ResultScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ClothDetailScreen from './src/screens/ClothDetailScreen';
import SplashScreen from './src/screens/SplashScreen';
import Header from './src/components/Header';
import OnboardingTooltip from './src/components/OnboardingTooltip';
import CoordLoadingModal from './src/components/CoordLoadingModal'; // ★追加

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  
  // ★追加: 生成中モーダルの表示管理
  const [showLoading, setShowLoading] = useState(false);

  // ガイド表示用
  const [showClosetGuide, setShowClosetGuide] = useState(false);
  const [showCoordGuide, setShowCoordGuide] = useState(false);

  useEffect(() => {
    checkGuides();
    const uploadSub = DeviceEventEmitter.addListener('FIRST_UPLOAD_DONE', async () => {
      const hasSeen = await AsyncStorage.getItem('HAS_SEEN_COORD_GUIDE');
      if (!hasSeen) setShowCoordGuide(true);
    });
    return () => uploadSub.remove();
  }, []);

  const checkGuides = async () => {
    const hasSeenCloset = await AsyncStorage.getItem('HAS_SEEN_CLOSET_GUIDE');
    if (!hasSeenCloset) setShowClosetGuide(true);
  };

  const dismissClosetGuide = async () => {
    setShowClosetGuide(false);
    await AsyncStorage.setItem('HAS_SEEN_CLOSET_GUIDE', 'true');
  };

  const dismissCoordGuide = async () => {
    setShowCoordGuide(false);
    await AsyncStorage.setItem('HAS_SEEN_COORD_GUIDE', 'true');
  };

  // ★修正: 生成完了時の処理
  const handleCoordComplete = (data: any) => {
    setShowLoading(false); // ロード閉じる
    setResult(data);
    setShowResult(true);   // 結果開く
    DeviceEventEmitter.emit('REFRESH_HOME');
  };

  // ★修正: 生成開始（アラート後にモーダルを開く）
  const startCoordProcess = () => {
    setShowLoading(true);
  };

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          header: () => <Header />,
          tabBarActiveTintColor: '#00255C',
          tabBarInactiveTintColor: '#9ca3af',
          tabBarLabelStyle: tw`text-xs font-bold pb-1`,
          tabBarStyle: [
            tw`bg-white border-t border-gray-200 h-24`, 
            { shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, elevation: 5 }
          ],
        }}
      >
        <Tab.Screen 
          name="HomeTab" 
          component={HomeScreen} 
          options={{
            tabBarLabel: 'コーデ',
            tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
          }}
        />
        <Tab.Screen 
          name="CoordiiTab" 
          component={HomeScreen}
          listeners={() => ({
            tabPress: (e) => {
              e.preventDefault();
              dismissCoordGuide();
              Alert.alert(
                "確認",
                "コーデを開始しますか？",
                [
                  { text: "戻る", style: "cancel" },
                  { text: "開始", onPress: startCoordProcess } // ★ここを変更
                ]
              );
            },
          })}
          options={{
            tabBarLabel: '', 
            tabBarIcon: () => (
              <View style={[
                tw`bg-[#00255C] w-20 h-20 rounded-full items-center justify-center border-4 border-white`,
                { position: 'absolute', top: -30, shadowColor: "#00255C", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, elevation: 5 }
              ]}>
                <Ionicons name="play" size={28} color="white" style={{ marginLeft: 4, marginBottom: -2 }} />
                <Text style={tw`text-white text-[9px] font-bold mt-1`}>コーデ開始</Text>
              </View>
            ),
          }}
        />
        <Tab.Screen 
          name="ClothListTab" 
          component={ClothListScreen}
          listeners={() => ({
            tabPress: () => { dismissClosetGuide(); }
          })}
          options={{
            tabBarLabel: 'クローゼット',
            tabBarIcon: ({ color }) => <Ionicons name="shirt" size={28} color={color} />,
          }}
        />
      </Tab.Navigator>

      {/* ガイド */}
      {showClosetGuide && <OnboardingTooltip text="まずは「クローゼット」で洋服を登録しましょう！" position="bottom-right" onPress={dismissClosetGuide} />}
      {showCoordGuide && !showClosetGuide && <OnboardingTooltip text="ここからAIコーデを始められます！" position="bottom-center" onPress={dismissCoordGuide} />}

      {/* ★追加: 生成中モーダル */}
      <CoordLoadingModal 
        visible={showLoading}
        onClose={() => setShowLoading(false)}
        onComplete={handleCoordComplete}
      />

      <ResultScreen visible={showResult} onClose={() => setShowResult(false)} resultData={result} />
    </>
  );
}

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Splash">
          <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Setup" component={SetupScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="ClothDetail" component={ClothDetailScreen} options={{ headerShown: false, presentation: 'modal' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}