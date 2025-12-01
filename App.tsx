import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Alert, DeviceEventEmitter } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import tw from 'twrnc';

import SetupScreen from './src/screens/SetupScreen';
import HomeScreen from './src/screens/HomeScreen';
import ClothListScreen from './src/screens/ClothListScreen';
import ResultScreen from './src/screens/ResultScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ClothDetailScreen from './src/screens/ClothDetailScreen';
import Header from './src/components/Header';
import { api } from './src/utils/api';
import { getUserId } from './src/utils/user';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs({ route }: any) {
  const params = route.params || {};

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const handleCoordStart = async () => {
    const currentUserId = await getUserId();
    if (!currentUserId) {
      Alert.alert("エラー", "ユーザーIDが見つかりません。再起動してください。");
      return;
    }

    setLoading(true);
    try {
      const data = await api.createCoordinate(currentUserId);
      setResult(data);
      setShowResult(true);
      DeviceEventEmitter.emit('REFRESH_HOME');
    } catch (e: any) {
      Alert.alert("エラー", "コーデの作成に失敗しました: " + e.message);
    } finally {
      setLoading(false);
    }
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
          initialParams={params}
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
              Alert.alert(
                "確認",
                "コーデを開始しますか？\n（※生成には10〜20秒程度かかります）",
                [
                  { text: "戻る", style: "cancel" },
                  { 
                    text: "開始", 
                    onPress: () => handleCoordStart() 
                  }
                ]
              );
            },
          })}
          options={{
            tabBarLabel: '', 
            tabBarIcon: () => (
              <View style={[
                tw`bg-[#00255C] w-20 h-20 rounded-full items-center justify-center border-4 border-white`,
                { 
                  position: 'absolute', 
                  top: -30, 
                  shadowColor: "#00255C",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 4,
                  elevation: 5
                }
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
          options={{
            tabBarLabel: 'クローゼット',
            tabBarIcon: ({ color }) => <Ionicons name="shirt" size={28} color={color} />,
          }}
        />
      </Tab.Navigator>

      {loading && (
        <View style={[
          tw`absolute inset-0 bg-black/50 items-center justify-center z-50`,
          { width: '100%', height: '100%' }
        ]}>
          <View style={tw`bg-white p-8 rounded-2xl items-center`}>
            <ActivityIndicator size="large" color="#00255C" />
            <Text style={tw`mt-4 font-bold text-gray-700`}>AIがコーデを考え中...</Text>
          </View>
        </View>
      )}

      <ResultScreen 
        visible={showResult} 
        onClose={() => setShowResult(false)} 
        resultData={result} 
      />
    </>
  );
}

export default function App() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const userId = await getUserId();
        
        if (userId) {
          // IDがある場合、DBに存在するか確認
          try {
            await api.getUser(userId);
            // 存在すればメインへ
            setInitialRoute("Main");
          } catch (e: any) {
            // "User not found" なら初期設定へ (DBから消えている場合)
            if (e.message === "User not found") {
              setInitialRoute("Setup");
            } else {
              // ネットワークエラー等の場合は、オフライン動作を期待してMainへ通す
              // (またはエラー画面を出す設計もアリですが、今回は利便性重視)
              setInitialRoute("Main");
            }
          }
        } else {
          // ID自体がないなら初期設定へ
          setInitialRoute("Setup");
        }
      } catch (e) {
        setInitialRoute("Setup");
      }
    };
    checkUser();
  }, []);

  if (!initialRoute) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator size="large" color="#00255C" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator initialRouteName={initialRoute}>
          <Stack.Screen name="Setup" component={SetupScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false, presentation: 'modal' }} />
          
          <Stack.Screen 
            name="ClothDetail" 
            component={ClothDetailScreen} 
            options={{ 
              headerShown: false,
              presentation: 'modal'
            }} 
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}