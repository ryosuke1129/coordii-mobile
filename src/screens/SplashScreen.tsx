import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import tw from 'twrnc';
import { api } from '../utils/api';
import { getUserId } from '../utils/user';

export default function SplashScreen({ navigation }: any) {

  useEffect(() => {
    const initApp = async () => {
      // 1. 最低でもアニメーションを見せる時間 (例: 2000ms = 2秒)
      const minDisplayTime = new Promise((resolve) => setTimeout(resolve, 2000));

      // 2. ユーザー認証チェック (裏で実行)
      const authCheck = new Promise(async (resolve) => {
        try {
          const userId = await getUserId();
          if (userId) {
            // IDがある場合、DBに存在するか確認
            try {
              await api.getUser(userId);
              resolve("Main"); // ユーザー有効 -> ホームへ
            } catch (e: any) {
              if (e.message === "User not found") {
                resolve("Setup"); // DBにいない -> 初期設定へ
              } else {
                // 通信エラー等は、一旦Mainに通してオフライン表示させるか判断
                resolve("Main"); 
              }
            }
          } else {
            resolve("Setup"); // IDなし -> 初期設定へ
          }
        } catch (e) {
          resolve("Setup");
        }
      });

      // 3. 「2秒経過」かつ「認証完了」するまで待つ
      const [_, nextRoute] = await Promise.all([minDisplayTime, authCheck]);

      // 4. 画面遷移 (replaceを使うことで、戻るボタンでスプラッシュに戻れないようにする)
      navigation.replace(nextRoute as string);
    };

    initApp();
  }, []);

  return (
    <View style={tw`flex-1 items-center justify-center bg-white`}>
      {/* Lottieアニメーション
        ※ assetsフォルダに splash.json を配置してください。
        ファイルがない場合は、<LottieView ... /> をコメントアウトし、
        下の <Text>Coordii</Text> だけ表示させてください。
      */}
      <View style={{ width: 200, height: 200 }}>
        <LottieView
          source={require('../../assets/splash.json')} // ★ここにJSONファイルを置く
          autoPlay
          loop={false} // 1回再生して終わり
          style={{ width: '100%', height: '100%' }}
        />
      </View>
      
      {/* アニメ素材がない場合のフォールバック用テキスト */}
      {/* <Text style={tw`text-4xl font-extrabold text-[#00255C]`}>Coordii</Text> */}
    </View>
  );
}