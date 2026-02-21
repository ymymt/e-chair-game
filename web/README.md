# 電気椅子ゲーム（web）

2人対戦ターン制心理戦ゲームのWebアプリです。

## 前提条件

- Node.js v18 以上
- npm
- Firebase プロジェクト（Firestore 有効化済み）

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` を作成し、Firebase の認証情報を設定します。

```bash
cp .env.local.example .env.local  # テンプレートがある場合
```

または手動で `.env.local` を作成し、以下の環境変数を設定してください。

```env
NEXT_PUBLIC_FIREBASE_API_KEYY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

これらの値は [Firebase コンソール](https://console.firebase.google.com/) → プロジェクト設定 → 全般 → 「マイアプリ」セクションから取得できます。

> **注意:** `NEXT_PUBLIC_FIREBASE_API_KEYY` は `KEY` の末尾が `Y` 二つになっています。これは既存コードの命名に合わせたものです。

### 3. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアプリが起動します。

## その他のコマンド

| コマンド | 説明 |
|---|---|
| `npm run build` | プロダクションビルド |
| `npm run start` | プロダクションサーバー起動 |
| `npm run lint` | ESLint によるコードチェック |

## プロジェクト構成

```
app/                    Next.js App Router のルーティング
  room/[roomId]/        ゲームルームページ
features/               機能単位のモジュール
  room/                 ゲームルーム機能（Server Actions, hooks, components）
  top/                  トップページ機能
components/             共有UIコンポーネント
hooks/                  グローバルカスタムフック
libs/firestore/         Firebase 初期化・Firestore 操作関数
types/                  型定義
utils/                  ユーティリティ
middleware.ts           Cookie によるルームアクセス制御
```

## 注意事項

- Firebase Emulator は未設定のため、リモートの Firestore に直接接続します。開発時は専用の Firebase プロジェクトを使用することを推奨します。
