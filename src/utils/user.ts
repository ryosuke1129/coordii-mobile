import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const USER_ID_KEY = 'COORDII_USER_ID';

// IDを取得（なければ null）
export const getUserId = async () => {
  try {
    return await AsyncStorage.getItem(USER_ID_KEY);
  } catch (e) {
    console.error("Failed to load user ID", e);
    return null;
  }
};

// 新しいIDを発行して保存
export const createUserId = async () => {
  try {
    const newId = Crypto.randomUUID(); // UUID v4を生成
    await AsyncStorage.setItem(USER_ID_KEY, newId);
    return newId;
  } catch (e) {
    console.error("Failed to save user ID", e);
    throw e;
  }
};

// IDを削除（デバッグ用など）
export const clearUserId = async () => {
  try {
    await AsyncStorage.removeItem(USER_ID_KEY);
  } catch (e) {
    console.error("Failed to clear user ID", e);
  }
};