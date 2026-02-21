# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

電気椅子ゲーム — 2人対戦ターン制心理戦ゲームのWebアプリ。学習目的で開発。
UIは全て日本語。

## 開発コマンド

すべてのコマンドは `web/` ディレクトリで実行する。

```bash
cd web/
npm install        # 依存関係のインストール
npm run dev        # 開発サーバー起動（Turbopack使用）
npm run build      # プロダクションビルド
npm run lint       # ESLintチェック
```

テストフレームワークは未導入。

## 技術スタック

- **Next.js 15** (App Router / Server Components / Server Actions)
- **React 18** + **TypeScript**（strict mode）
- **Tailwind CSS** — カスタムアニメーション定義あり（感電振動、フリップ等）
- **Firebase Firestore** — リアルタイムDB、`onSnapshot`でゲーム状態を同期
- **use-sound** — 効果音再生
- **nanoid** — ルームID生成

## アーキテクチャ

### ディレクトリ構造（`web/`配下）

```
app/                    Next.js App Routerのルーティング
  room/[roomId]/        ゲームルームページ（middleware.tsで認証保護）
features/               機能単位のモジュール
  room/                 ゲームルーム機能
    action.ts           Server Actions（ルーム作成・参加・椅子選択・ターン進行等）
    hooks/              ルーム固有のカスタムフック群
    components/         ルーム固有のUIコンポーネント
    types/              ルーム固有の型定義
  top/                  トップページ機能
components/             共有UIコンポーネント（ボタン、ダイアログ等）
hooks/                  グローバルカスタムフック
libs/firestore/         Firebase初期化・Firestore操作関数
types/room.ts           ゲームの中核型定義（GameRoom, Player, Round）
utils/                  ユーティリティ（toast通知等）
middleware.ts           Cookie（userId, roomId）によるルームアクセス制御
```

### ゲームの状態管理パターン

- **Firestoreがシングルソース・オブ・トゥルース**：ゲーム状態は全てFirestoreに保存
- **Server Actions**でFirestoreを更新（`features/room/action.ts`）
- **`useRoomWatcher`**フックで`onSnapshot`リスナーを設定し、クライアント側にリアルタイム反映
- **`useRoomEffect`**がphase変更を検知して適切なUI処理（ダイアログ表示・効果音再生）をトリガー
- 同時操作の安全性はFirestoreトランザクション（`changeTurnAction`）で担保

### ゲームフェーズの遷移

`Round.phase`が以下の順に遷移し、各フェーズ専用のフック・UIロジックが動作する：

```
setting → sitting → activating → result → (次ラウンドのsetting)
```

- **setting**: 仕掛ける側が電気椅子を選択
- **sitting**: 座る側が座る椅子を選択
- **activating**: 感電判定
- **result**: 結果表示（両プレイヤーが確認後に次ラウンドへ）

### 椅子UIの配置

12脚の椅子は円形に配置。`Chair.tsx`で三角関数（`Math.sin`/`Math.cos`）を使い、`angle = ((index - 2) / 12) * 2 * Math.PI`で角度計算。

## 環境変数

Firebase設定用の`NEXT_PUBLIC_FIREBASE_*`環境変数が必要（`libs/firestore/config.ts`参照）。

## Gitコミット規約

Conventional Commits形式を使用：
- `feat:` 新機能
- `fix:` バグ修正
- `ref:` リファクタリング
- `chore:` メンテナンス
- `doc:` ドキュメント
