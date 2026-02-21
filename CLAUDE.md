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
npm run dev        # 開発サーバー起動（CSS build + Express server）
npm run build      # プロダクションビルド（CSS build + next build）
npm run build:css  # Tailwind CSSのみビルド
```

テストフレームワークは未導入。

## 技術スタック

- **Next.js 3** (Pages Router / getInitialProps / Expressカスタムサーバー)
- **React 15** + **JavaScript**（TypeScriptなし）
- **Tailwind CSS** — カスタムアニメーション定義あり（感電振動、フリップ等）、事前ビルドしてstatic/styles.cssとして配信
- **Firebase Firestore** — リアルタイムDB、`onSnapshot`でゲーム状態を同期
- **howler.js** — 効果音再生
- **nanoid** — ルームID生成
- **Express** — カスタムサーバー（API Routes代替 + 動的ルーティング）
- **prop-types** — レガシーContext API用

## アーキテクチャ

### ディレクトリ構造（`web/`配下）

```
server.js               Expressカスタムサーバー（API Routes + 動的ルーティング）
pages/                  Next.js Pages Routerのルーティング
  _document.js          HTMLドキュメント（CSS/フォント読み込み）
  index.js              トップページ
  room.js               ゲームルームページ（getInitialPropsで認証保護）
features/               機能単位のモジュール
  room/                 ゲームルーム機能
    hooks/              roomPhaseHandlers.js（フェーズ別ハンドラ）
    components/         ルーム固有のUIコンポーネント
    page/Room.js        ルームメインコンポーネント（クラスコンポーネント）
  top/                  トップページ機能
    page/Top.js         トップメインコンポーネント（クラスコンポーネント）
components/             共有UIコンポーネント（ボタン、ダイアログ、Layout等）
  icons/                インラインSVGアイコン（lucide-react代替）
libs/firestore/         Firebase初期化・Firestore操作関数（CommonJS）
libs/api.js             クライアントAPI層（Express APIへのfetchラッパー）
utils/                  ユーティリティ（toast通知等）
  toast/                レガシーContext APIによるToast（childContextTypes/getChildContext）
static/                 静的ファイル（CSS、効果音）
```

### ゲームの状態管理パターン

- **Firestoreがシングルソース・オブ・トゥルース**：ゲーム状態は全てFirestoreに保存
- **Express APIハンドラ**でFirestoreを更新（`server.js`内）、クライアントからは`libs/api.js`経由で呼び出し
- **Room.jsクラスコンポーネント**の`componentDidMount`で`onSnapshot`リスナーを設定し、リアルタイム反映
- **`componentDidUpdate`**がphase変更を検知して適切なUI処理（ダイアログ表示・効果音再生）をトリガー
- 同時操作の安全性はFirestoreトランザクション（`change-turn` API）で担保

### React 15固有のパターン

- **全コンポーネントがクラスコンポーネントまたは関数コンポーネント（hooks不使用）**
- **レガシーContext API**: `childContextTypes`/`getChildContext`/`contextTypes`でToast通知を提供
- **callback ref**: `useRef`の代わりに`ref={this.setDialogRef}`パターンでDOM参照を取得
- **dialogRefプロップ**: `forwardRef`が使えないため、`ref`の代わりに`dialogRef`プロップでダイアログ参照を渡す

### ゲームフェーズの遷移

`Round.phase`が以下の順に遷移：

```
setting → sitting → activating → result → (次ラウンドのsetting)
```

- **setting**: 仕掛ける側が電気椅子を選択
- **sitting**: 座る側が座る椅子を選択
- **activating**: 感電判定
- **result**: 結果表示（両プレイヤーが確認後に次ラウンドへ）

### 椅子UIの配置

12脚の椅子は円形に配置。`Chair.js`で三角関数（`Math.sin`/`Math.cos`）を使い、`angle = ((index - 2) / 12) * 2 * Math.PI`で角度計算。

## 環境変数

Firebase設定用の`NEXT_PUBLIC_FIREBASE_*`環境変数が必要（`libs/firestore/config.js`参照）。

## Gitコミット規約

Conventional Commits形式を使用：
- `feat:` 新機能
- `fix:` バグ修正
- `ref:` リファクタリング
- `chore:` メンテナンス
- `doc:` ドキュメント
