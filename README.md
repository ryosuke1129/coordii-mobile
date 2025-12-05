# Coordii Mobile App

AIファッションコーディネートアプリ「Coordii」のモバイルフロントエンドです。
**React Native (Expo SDK 52)** で構築されており、AWS Serverless バックエンドと連携して、AIによるスタイリング提案やバーチャル試着体験を提供します。

## 📱 プロジェクト概要

ユーザーの手持ち服を管理し、毎日の天気や予定に合わせてAIがコーディネートを提案するアプリです。
UXを損なわないよう、バックエンドの長時間処理（AI生成）に対して、**ポーリングによる待機制御** や **独自キャッシュ戦略** を実装しています。

### 主な機能

  * **スマートクローゼット**:
      * 洋服の写真撮影・登録。
      * **S3署名付きURLの有効期限管理**: 取得から50分経過したキャッシュを自動破棄し、再取得するロジックを実装。
  * **AIコーデ生成 (非同期)**:
      * 天気・気温・TPOを考慮したコーディネート提案。
      * **ポーリング制御**: 生成リクエスト後、`CoordLoadingModal` がバックグラウンドでステータスを監視し、完了次第結果画面を表示。
  * **バーチャル試着 (Virtual Mirror)**:
      * ユーザーの全身写真と、選ばれた服を合成。
      * 生成状況をリアルタイムで確認し、完了後に画像を表示。
  * **ユーザー設定**:
      * 曜日ごとのファッションスタイル設定（オフィスカジュアル、ラフなど）。
      * プロフィール（身長、性別、地域）の管理。

## 🛠 技術スタック

### Core

  * **Framework**: React Native (Expo SDK 52)
  * **Language**: TypeScript
  * **Runtime**: Expo Go / EAS Build

### UI & Styling

  * **Styling**: Tailwind CSS (`twrnc`)
  * **Navigation**: React Navigation (Native Stack, Bottom Tabs)
  * **Animations**: Lottie React Native (`lottie-react-native`)
  * **Components**: Custom Modals, Safe Area Context

### State & Storage

  * **Local Storage**: `@react-native-async-storage/async-storage`
      * 用途: ユーザーID、画像キャッシュ（URL + Timestamp）、初回ガイド表示フラグ
  * **State Management**: React Hooks (`useState`, `useEffect`, `useCallback`)

### Networking

  * **Client**: Fetch API (Custom wrapper in `src/utils/api.ts`)
  * **Features**: Timeout handling, Query param serialization

## 🏗 ディレクトリ構成

```text
coordii-mobile/
├── App.tsx                 # アプリのエントリーポイント・ナビゲーション設定
├── app.json                # Expo設定 (Deep Link, Splash, Permissions)
├── babel.config.js
├── tailwind.config.js      # twrnc設定
├── assets/                 # 静的リソース (Splash, Icons, Lottie JSON)
└── src/
    ├── components/         # 再利用可能なUIコンポーネント
    │   ├── CoordLoadingModal.tsx  # [重要] コーデ生成中のポーリング・待機アニメーション
    │   ├── Header.tsx             # 共通ヘッダー
    │   ├── OnboardingTooltip.tsx  # 初回ユーザー向けガイド
    │   └── ...
    ├── screens/            # 画面コンポーネント
    │   ├── SplashScreen.tsx       # 起動画面 (Lottieアニメーション)
    │   ├── SetupScreen.tsx        # 初回セットアップ (性別・地域・身長)
    │   ├── HomeScreen.tsx         # ホーム (コーデ開始・履歴・試着)
    │   ├── ClothListScreen.tsx    # クローゼット (グリッド表示・キャッシュ制御)
    │   ├── ClothDetailScreen.tsx  # 服詳細・編集・削除
    │   ├── ResultScreen.tsx       # コーデ結果表示
    │   └── SettingsScreen.tsx     # 設定 (プロフィール・曜日別スタイル)
    └── utils/              # ユーティリティ
        ├── api.ts          # APIクライアント・エンドポイント定義
        ├── user.ts         # UUID生成・管理
        └── helpers.ts      # 日付フォーマット等のヘルパー
```

## 🔌 実装の詳細仕様

### 1\. 非同期ポーリング処理 (`CoordLoadingModal.tsx`)

バックエンドのAI処理（数秒〜数十秒）を待機するため、以下のフローを実装しています。

1.  **Start**: `POST /coordinates` をコールし、`jobId` を取得。
2.  **Wait**: モーダルを表示し、Lottieアニメーションを再生。
3.  **Poll**: `setInterval` を使用し、2秒ごとに `GET /coordinates/status` をコール。
      * `status: "PROCESSING"` -\> 待機継続
      * `status: "COMPLETED"` -\> ポーリング停止、データを取得して `onComplete` コールバックを実行
      * `status: "FAILED"` -\> エラーアラートを表示して閉じる

### 2\. 画像キャッシュと有効期限 (`ClothListScreen.tsx`)

S3のPresigned URL（有効期限24時間）に対応するため、フロントエンド側で**50分ルール**によるキャッシュ更新を行っています。

  * **保存時**: データと共に `timestamp: Date.now()` を `AsyncStorage` に保存。
  * **読込時**: 現在時刻と `timestamp` を比較。
      * **差分 \< 50分**: キャッシュデータをそのまま使用（高速表示）。
      * **差分 \>= 50分**: キャッシュを破棄し、APIから最新の署名付きURLを取得して再保存。

### 3\. APIエンドポイント定義 (`api.ts`)

バックエンドAPIとの通信インターフェースです。

| 関数名 | メソッド | エンドポイント | 説明 |
| :--- | :--- | :--- | :--- |
| `startCreateCoordinate` | `POST` | `/coordinates` | コーデ生成ジョブ開始 |
| `checkCoordinateStatus` | `GET` | `/coordinates/status` | 生成状況確認 (Polling) |
| `startTryOn` | `POST` | `/try-on` | 試着生成ジョブ開始 |
| `checkTryOn` | `GET` | `/try-on` | 試着状況確認 (Polling) |
| `getClothes` | `GET` | `/clothes` | 洋服一覧取得 |
| `registerCloth` | `POST` | `/clothes` | 洋服登録 |
| `analyzeCloth` | `POST` | `/analyze` | 画像解析リクエスト |
| `getUploadUrl` | `POST` | `/upload-url` | S3アップロードURL発行 |

## 🚀 セットアップ & 実行手順

### 前提条件

  * Node.js (v18以上推奨)
  * Expo Go アプリ（実機デバッグ用）

### 1\. インストール

```bash
git clone https://github.com/ryosuke1129/coordii-mobile.git
cd coordii-mobile
npm install
```

### 2\. 環境設定

`src/utils/api.ts` を開き、デプロイ済みのバックエンドAPI Gatewayのエンドポイントを設定してください。

```typescript
// src/utils/api.ts
const API_BASE_URL = "https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/Prod";
```

### 3\. 開発サーバー起動

```bash
npx expo start
```

  * **実機**: 表示されたQRコードをカメラで読み取る（AndroidはExpoアプリからスキャン）。
  * **シミュレータ**: `i` (iOS) または `a` (Android) を押下。

## 📦 ビルド (EAS Build)

プロダクション用のビルドを行う場合:

```bash
npm install -g eas-cli
eas login
eas build --profile production --platform all
```

## ⚠️ 開発上の注意点

  * **Android実機でのHTTP通信**: デフォルトでは `http://` への通信がブロックされます。開発中は `https://` のAPI Gatewayを使用するか、`app.json` で `usesCleartextTraffic` を許可してください。
  * **画像アップロード**: `expo-image-picker` を使用していますが、シミュレータではカメラが起動しないため、画像ライブラリからの選択のみとなります。
  * **依存パッケージ**: スタイリングに `twrnc` を使用しています。通常のTailwind CSSクラス名がそのまま使えますが、React Native非対応のプロパティ（`grid`など）は使用できません。