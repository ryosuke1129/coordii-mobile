import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, Image, ActivityIndicator, Alert, SafeAreaView, ScrollView, DeviceEventEmitter } from 'react-native'; // ★DeviceEventEmitter追加
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import tw from 'twrnc';
import { api } from '../utils/api';
import { getUserId } from '../utils/user';

type Props = {
  visible: boolean;
  onClose: () => void;
  coordinateId: string;
};

export default function TryOnModal({ visible, onClose, coordinateId }: Props) {
  const navigation = useNavigation<any>();
  const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'COMPLETED' | 'FAILED'>('IDLE');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible && coordinateId) {
      setErrorMsg("");
      setResultImage(null);
      startProcess();
    } else {
      stopPolling();
      setStatus('IDLE');
    }
  }, [visible, coordinateId]);

  useEffect(() => {
    return () => stopPolling();
  }, []);

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startProcess = async () => {
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("User ID missing");

      // 顔写真チェック
      const user = await api.getUser(userId);
      if (!user.imageLink) {
        Alert.alert(
          "顔写真が必要です",
          "バーチャル試着を行うには、設定画面でプロフィール画像（顔写真）を登録してください。",
          [
            { text: "キャンセル", onPress: onClose, style: "cancel" },
            { 
              text: "設定へ移動", 
              onPress: () => {
                onClose();
                navigation.navigate('Settings');
              } 
            }
          ]
        );
        return;
      }

      // 状況確認
      const current = await api.checkTryOn(userId, coordinateId);
      
      if (current.status === 'COMPLETED' && current.imageUrl) {
        setResultImage(current.imageUrl);
        setStatus('COMPLETED');
        // ★追加: 完了済みならホーム更新通知
        DeviceEventEmitter.emit('REFRESH_HOME');
        return;
      }

      if (current.status === 'FAILED') {
        setStatus('FAILED');
        setErrorMsg(current.failReason || "前回の生成に失敗しました");
        return;
      }

      if (current.status === 'PROCESSING') {
        setStatus('PROCESSING');
        startPolling(userId);
        return;
      }

      // 生成開始
      setStatus('PROCESSING');
      await api.startTryOn(userId, coordinateId);
      startPolling(userId);

    } catch (e: any) {
      console.error(e);
      setStatus('FAILED');
      setErrorMsg("開始エラー: " + e.message);
    }
  };

  const startPolling = (userId: string) => {
    stopPolling();
    intervalRef.current = setInterval(async () => {
      try {
        const res = await api.checkTryOn(userId, coordinateId);
        console.log("Polling status:", res.status);

        if (res.status === 'COMPLETED' && res.imageUrl) {
          setResultImage(res.imageUrl);
          setStatus('COMPLETED');
          stopPolling();
          
          // ★追加: 生成完了時にホーム画面へ更新通知を送る！
          // これにより、モーダルを閉じた後にホームのリストが最新化され、画像が表示されます。
          DeviceEventEmitter.emit('REFRESH_HOME');

        } else if (res.status === 'FAILED') {
          setStatus('FAILED');
          stopPolling();
          const reason = res.failReason || "画像の生成に失敗しました";
          setErrorMsg(reason);
          Alert.alert("失敗", reason);
        }
      } catch (e: any) {
        console.warn("Polling error", e);
      }
    }, 3000);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={tw`flex-1 bg-white`}>
        <SafeAreaView style={tw`bg-gray-50`}>
          <View style={tw`px-4 py-4 flex-row justify-between items-center border-b border-gray-100`}>
            <Text style={tw`text-lg font-bold text-gray-800`}>バーチャル試着</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={30} color="#ccc" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <View style={tw`flex-1 items-center justify-center p-6`}>
          {status === 'PROCESSING' && (
            <View style={tw`items-center`}>
              <View style={{ width: 200, height: 200 }}>
                <LottieView source={require('../../assets/loading.json')} autoPlay loop style={{ width: '100%', height: '100%' }} />
              </View>
              <Text style={tw`text-xl font-bold text-[#00255C] mt-4`}>着替えています...</Text>
              <Text style={tw`text-gray-400 mt-2 text-sm`}>これには10〜30秒ほどかかります</Text>
            </View>
          )}

          {status === 'COMPLETED' && resultImage && (
            <View style={tw`w-full h-full`}>
              <Image source={{ uri: resultImage }} style={[tw`w-full h-4/5 rounded-xl bg-gray-100`, { resizeMode: 'contain' }]} />
              <View style={tw`mt-6`}>
                <Text style={tw`text-center text-gray-800 font-bold text-lg`}>お似合いです！✨</Text>
              </View>
            </View>
          )}

          {status === 'FAILED' && (
            <View style={tw`items-center px-4`}>
              <Ionicons name="alert-circle" size={60} color="#ef4444" />
              <Text style={tw`text-gray-800 font-bold mt-4 text-lg`}>生成に失敗しました</Text>
              <ScrollView style={tw`mt-4 max-h-40 bg-red-50 p-4 rounded-lg w-full`}>
                <Text style={tw`text-red-600 text-xs font-mono`}>{errorMsg || "不明なエラーが発生しました"}</Text>
              </ScrollView>
              <TouchableOpacity onPress={() => startProcess()} style={tw`mt-8 bg-[#00255C] py-3 px-8 rounded-full`}>
                <Text style={tw`text-white font-bold`}>再試行する</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}