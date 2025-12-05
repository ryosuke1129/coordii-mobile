import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, ActivityIndicator, Alert } from 'react-native';
import LottieView from 'lottie-react-native';
import tw from 'twrnc';
import { api } from '../utils/api';
import { getUserId } from '../utils/user';

type Props = {
  visible: boolean;
  onClose: () => void;
  anchorClothId?: number; // 指定があれば渡す
  onComplete: (data: any) => void; // 完了時のコールバック
};

export default function CoordLoadingModal({ visible, onClose, anchorClothId, onComplete }: Props) {
  const [status, setStatus] = useState('PROCESSING');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      startGeneration();
    } else {
      stopPolling();
    }
  }, [visible]);

  useEffect(() => {
    return () => stopPolling();
  }, []);

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startGeneration = async () => {
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("User ID missing");

      // 1. 開始リクエスト
      const res = await api.startCreateCoordinate(userId, anchorClothId);
      const coordId = res.coordinateId; // IDは日時文字列

      // 2. ポーリング開始
      startPolling(userId, coordId);

    } catch (e: any) {
      console.error(e);
      Alert.alert("エラー", "コーデ生成を開始できませんでした");
      onClose();
    }
  };

  const startPolling = (userId: string, coordId: string) => {
    stopPolling();
    intervalRef.current = setInterval(async () => {
      try {
        const res = await api.checkCoordinateStatus(userId, coordId);
        console.log("Coord Polling:", res.status);

        if (res.status === 'COMPLETED') {
          stopPolling();
          onComplete(res.data); // 完了データを親に渡す
        } else if (res.status === 'FAILED') {
          stopPolling();
          Alert.alert("失敗", "コーデの生成に失敗しました");
          onClose();
        }
      } catch (e) {
        console.warn("Polling error", e);
      }
    }, 2000); // 2秒おき
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={tw`flex-1 bg-black/60 items-center justify-center`}>
        <View style={tw`bg-white p-8 rounded-3xl items-center w-72 shadow-xl`}>
          <View style={{ width: 120, height: 120 }}>
            {/* 起動画面と同じアニメを使い回し */}
            <LottieView
              source={require('../../assets/splash.json')} 
              autoPlay
              loop
              style={{ width: '100%', height: '100%' }}
            />
          </View>
          <Text style={tw`text-lg font-bold text-[#00255C] mt-4`}>AIがコーデを作成中...</Text>
          <Text style={tw`text-gray-400 mt-2 text-xs`}>天気や予定を考慮しています</Text>
        </View>
      </View>
    </Modal>
  );
}