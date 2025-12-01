import { Alert } from 'react-native';
// ★修正: 最新版Expoでは 'legacy' からインポートする必要があります
import { uploadAsync } from 'expo-file-system/legacy'; 

// ★重要: API URL
const BASE_URL = "https://27mw9llwy9.execute-api.ap-northeast-1.amazonaws.com/Prod";
// export const TEST_USER_ID = "test-user-001";

// 共通クライアント
const client = async (path: string, method: string = 'GET', body?: any) => {
  try {
    const config: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) config.body = JSON.stringify(body);

    console.log(`API Request: ${method} ${path}`);
    const response = await fetch(`${BASE_URL}${path}`, config);
    const data = await response.json();

    if (!response.ok) throw new Error(data.message || 'API Error');
    return data;
  } catch (error: any) {
    console.error(`API Error [${path}]:`, error);
    throw error;
  }
};

export const api = {
  getUser: (userId: string) => client(`/users?userId=${userId}`),
  registerUser: (data: any) => client('/users', 'POST', data),
  getWeather: (userId: string, city: string) => client('/weather', 'POST', { userId, city }),
  getClothes: (userId: string, category?: string) => {
    const query = category ? `&category=${encodeURIComponent(category)}` : '';
    return client(`/clothes?userId=${userId}${query}`);
  },
  registerCloth: (data: any) => client('/clothes', 'POST', data),
  updateCloth: (data: any) => client('/clothes', 'PUT', data),
  deleteCloth: (userId: string, clothId: number) => 
    client('/clothes', 'DELETE', { userId, clothId }),
  analyzeCloth: (imageUrl: string, userId: string) => client('/analyze', 'POST', { imageUrl }),
  getUploadUrl: (fileType: string = 'jpg') => client('/upload-url', 'POST', { fileType }),
  createCoordinate: (userId: string) => client('/coordinates', 'POST', { userId }),
  getHistory: (userId: string) => client(`/coordinates?userId=${userId}`),
};

// ★修正: LegacyのuploadAsyncを使用
export const uploadToS3 = async (uploadUrl: string, localUri: string) => {
  try {
    console.log("Starting upload via Legacy FileSystem...");

    // uploadAsyncを使用
    const response = await uploadAsync(uploadUrl, localUri, {
      httpMethod: 'PUT',
      uploadType: 0, // 0 = Binary (型定義エラー回避のため数値指定)
      headers: {
        'Content-Type': 'image/jpeg',
      },
    });

    console.log("Upload Status:", response.status);

    if (response.status !== 200) {
      throw new Error(`S3 Upload Failed: ${response.status} - ${response.body}`);
    }
  } catch (error: any) {
    console.error("Upload Error:", error);
    throw error;
  }
};