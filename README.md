# Coordii Mobile App

AIファッションコーディネートアプリ「Coordii」のモバイルフロントエンドです。
React Native (Expo SDK 52) で構築されており、AWS Serverless バックエンドと連携して、AIによるスタイリング提案やバーチャル試着体験を提供します。

## 📱 アプリ概要

ユーザーは自身の服をアプリに登録し、「明日何を着よう？」という悩みをAIに相談できます。

### 主な機能

  * **スマートクローゼット**: 手持ちの服を写真で管理。AIによる自動タグ付け（カテゴリ・気温・季節）。
  * **AIコーデ生成**: 天気・気温・TPOを考慮したコーディネート提案。
      * *UX*: バックエンドの非同期処理に合わせ、生成中はLottieアニメーションによる待機画面を表示。
  * **バーチャル試着**: 自分の写真にコーディネートを合成。
      * *UX*: 生成完了をポーリングで監視し、結果を自動表示。
  * **履歴・ログ**: 過去のコーディネートと試着画像の閲覧。
  * **ユーザー設定**: 曜日ごとのファッションスタイル設定（オフィスカジュアル、ラフなど）。

## 🎨 UI/UX デザイン

  * **コンセプト**: ミニマル & モダン
  * **カラーパレット**:
      * ベース: モノクローム（白・黒・グレー）
      * アクセント: ディープブルー (`#00255C`)
  * **インタラクション**:
      * 直感的なタブナビゲーション。
      * ローディング状態の可視化による体感待ち時間の軽減。

## 🛠 技術スタック

  * **Framework**: React Native (Expo SDK 52)
  * **Language**: TypeScript
  * **Styling**: Tailwind CSS (`twrnc`)
  * **Navigation**: React Navigation (Native Stack, Bottom Tabs)
  * **State & Storage**:
      * React Hooks (`useState`, `useEffect`, `useContext`)
      * Async Storage (画像キャッシュ, ユーザー設定, ガイド表示フラグ)
  * **Networking**: Fetch API (Custom wrapper)
  * **Assets**: Lottie (Animations), Expo Image Picker

## 🏗 ディレクトリ構成

```
coordii-mobile/
├── App.tsx                 # エントリーポイント・ルーティング設定
├── assets/                 # 画像・Lottieファイル
├── src/
│   ├── components/         # 再利用可能なUIコンポーネント
│   │   ├── Header.tsx
│   │   ├── CoordLoadingModal.tsx  # コーデ生成中のポーリング制御
│   │   └── ...
│   ├── screens/            # 各画面の実装
│   │   ├── HomeScreen.tsx         # メイン画面（コーデ開始・履歴）
│   │   ├── ClothListScreen.tsx    # クローゼット一覧
│   │   ├── ClothDetailScreen.tsx  # 服詳細・編集
│   │   ├── ResultScreen.tsx       # コーデ結果表示
│   │   ├── SettingsScreen.tsx     # ユーザー設定・画像アップロード
│   │   └── ...
│   └── utils/              # ユーティリティ
│       ├── api.ts          # APIクライアント・エンドポイント定義
│       ├── user.ts         # ユーザーID管理
│       └── helpers.py      
└── tailwind.config.js      # (twrnc設定)
```

## 🔌 バックエンド連携仕様

### 非同期処理のハンドリング

画像生成やAI解析などの長時間処理（数秒〜数十秒）に対して、以下のフローを実装しています。

1.  **Request**: `POST /coordinates` 等でジョブを開始し、`Job ID` を受け取る。
2.  **Polling**: `CoordLoadingModal` が `GET /coordinates/status` を一定間隔（例: 2秒）で叩き、ステータスを監視。
3.  **Completion**: ステータスが `COMPLETED` になると、結果画面へ遷移。

### 画像キャッシュ戦略

S3の署名付きURL（Presigned URL）には有効期限があるため、以下のロジックを実装しています。

  * `AsyncStorage` に画像URLリストと\*\*取得時刻（Timestamp）\*\*を保存。
  * データ読み込み時、現在時刻と保存時刻を比較。
  * 一定時間（例: 50分）経過している場合は、キャッシュを破棄しバックエンドから最新のURLを再取得する。

## 🚀 セットアップ & 実行

### 前提条件

  * Node.js (LTS) がインストールされていること
  * Expo Go アプリ（実機確認用）または iOS Simulator / Android Emulator

### 1\. リポジトリのクローン

```bash
git clone https://github.com/ryosuke1129/coordii-mobile.git
cd coordii-mobile
```

### 2\. 依存関係のインストール

```bash
npm install
```

### 3\. APIエンドポイントの設定

`src/utils/api.ts` 内の `API_BASE_URL` を、デプロイ済みのAPI GatewayのURLに変更してください。

```typescript
// src/utils/api.ts
const API_BASE_URL = "https://your-api-gateway-id.execute-api.ap-northeast-1.amazonaws.com/Prod";
```

### 4\. アプリの起動

```bash
npx expo start
```

表示されるQRコードを実機のExpo Goアプリで読み込むか、`i` キーを押してiOSシミュレータで起動します。

## 📦 ビルド (EAS Build)

プロダクション用のビルドを行う場合（要 EASアカウント）:

```bash
npm install -g eas-cli
eas build --profile production --platform all
```