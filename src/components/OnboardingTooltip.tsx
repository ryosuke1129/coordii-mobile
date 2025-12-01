import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing } from 'react-native';
import tw from 'twrnc';

type Props = {
  text: string;
  onPress: () => void;
  position: 'bottom-left' | 'bottom-right' | 'bottom-center' | 'bottom-right-fab';
};

export default function OnboardingTooltip({ text, onPress, position }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -5, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
      ])
    ).start();
  }, []);

  // --- スタイル定義 ---
  let containerStyle: any = {};
  
  // 共通の矢印スタイル（透明な三角形のベース）
  const baseArrowStyle: any = {
    width: 0, 
    height: 0, 
    backgroundColor: 'transparent', 
    borderStyle: 'solid', 
    borderLeftColor: 'transparent', 
    borderRightColor: 'transparent',
    position: 'absolute',
  };

  // 外側（白枠用）と内側（青塗りつぶし用）の位置調整
  let outerArrowPos: any = {};
  let innerArrowPos: any = {};

  switch (position) {
    case 'bottom-right': // クローゼットタブ用
      containerStyle = { position: 'absolute', bottom: 90, right: 20 };
      // 白枠は少し大きいので、中心を合わせるために右位置を微調整
      outerArrowPos = { bottom: -10, right: 28 }; 
      innerArrowPos = { bottom: -7, right: 30 };
      break;

    case 'bottom-center': // コーデ開始ボタン用
      containerStyle = { position: 'absolute', bottom: 100, alignSelf: 'center' };
      outerArrowPos = { bottom: -10, alignSelf: 'center' };
      innerArrowPos = { bottom: -7, alignSelf: 'center' };
      break;

    case 'bottom-right-fab': // クローゼットのカメラボタン用
      containerStyle = { position: 'absolute', bottom: 90, right: 20 };
      outerArrowPos = { bottom: -10, right: 24 };
      innerArrowPos = { bottom: -7, right: 26 };
      break;
      
    default:
      break;
  }

  return (
    <Animated.View 
      style={[
        containerStyle, 
        { opacity: fadeAnim, transform: [{ translateY: bounceAnim }], zIndex: 100 }
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        
        {/* 1. 吹き出し本体 (白枠付き) */}
        <View style={tw`bg-[#00255C] px-4 py-3 rounded-xl shadow-lg max-w-60 border-2 border-white z-10`}>
          <Text style={tw`text-white font-bold text-sm leading-5`}>{text}</Text>
        </View>
        
        {/* 2. 外側の三角形 (白枠) - 少し大きい */}
        <View style={[
          baseArrowStyle,
          { 
            borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 10, // サイズ大きめ
            borderTopColor: 'white', // 白色
            zIndex: 9 // 本体の後ろへ
          },
          outerArrowPos
        ]} />

        {/* 3. 内側の三角形 (青色) - 本体と同じ色で上書き */}
        <View style={[
          baseArrowStyle,
          { 
            borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 8, // サイズ標準
            borderTopColor: '#00255C', // 本体色
            zIndex: 11 // 枠線の上から重ねて、本体と一体化させる
          },
          innerArrowPos
        ]} />

      </TouchableOpacity>
    </Animated.View>
  );
}