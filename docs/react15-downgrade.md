# React 15 ダウングレード改修ドキュメント

## 1. 概要

学習目的で、React 16 / Next.js 10 の構成を React 15 / Next.js 3 にダウングレードした。
前回の React 17 → 16 が **JSX 変換方式とエコシステム互換性** が中心のより限定的な変更だったのに対し、今回は **アーキテクチャ・言語・ランタイム全般にわたる大規模な書き換え** となった。

99 ファイル変更、+9,783 / -7,541 行。

主な変更軸：
- **TypeScript → JavaScript**：全ファイルから型定義を除去し `.ts`/`.tsx` → `.js` に変換
- **React Hooks → クラスコンポーネント**：React 15 には Hooks がないため、`useState`/`useEffect`/`useRef`/`useContext` 等を全てクラスコンポーネントのライフサイクルメソッド・state・callback ref に置換
- **新 Context API → レガシー Context API**：`createContext`/`useContext` → `childContextTypes`/`getChildContext`/`contextTypes`（prop-types 使用）
- **forwardRef → dialogRef プロップパターン**：React 15 に `forwardRef` がないため、`ref` の代わりに `dialogRef` プロップで DOM 参照を受け渡す
- **Next.js API Routes → Express カスタムサーバー**：Next.js 3 には API Routes がないため、Express で API + 動的ルーティングを実装
- **getServerSideProps → getInitialProps**：Next.js 3 は `getServerSideProps` をサポートしない
- **lucide-react → インライン SVG アイコン**：lucide-react が React 15 非互換のため、SVG を直接コンポーネント化
- **use-sound → howler.js**：use-sound は Hooks ベースのため使用不可、howler.js で代替
- **ESM → CommonJS**：サーバーサイドコードを `require`/`module.exports` に変換
- **CSS 配信方法の変更**：`_app.tsx` での `import` → Tailwind CSS を事前ビルドして `static/styles.css` として配信
- **webpack 設定の大幅変更**：Next.js 3 の webpack 2 環境で Firebase 等のモダン JS パッケージをトランスパイルするための設定追加

このドキュメントでは、ダウングレードに伴い **何を・なぜ・どのように** 変更したかを記録する。

---

## 2. 依存パッケージの変更

`web/package.json` で以下のパッケージバージョンを変更した。

| パッケージ | 変更前（React 16 / Next.js 10） | 変更後（React 15 / Next.js 3） |
|---|---|---|
| `next` | `^10.2.3` | `^3.2.3` |
| `react` | `^16.14.0` | `^15.6.2` |
| `react-dom` | `^16.14.0` | `^15.6.2` |
| `nanoid` | `^3.3.8` | `^3.3.8`（変更なし） |
| `cookie` | `^0.6.0` | `^0.6.0`（変更なし） |
| `firebase` | `^11.1.0` | `^11.1.0`（変更なし） |

**追加パッケージ：**

| パッケージ | バージョン | 追加理由 |
|---|---|---|
| `express` | `^4.18.2` | カスタムサーバー（API Routes 代替 + 動的ルーティング） |
| `cookie-parser` | `^1.4.6` | Express で Cookie を解析 |
| `dotenv` | `^17.3.1` | 環境変数の読み込み（Next.js 3 は `.env.local` の自動読み込みをサポートしない） |
| `prop-types` | `^15.8.1` | レガシー Context API に必要 |
| `howler` | `^2.2.4` | use-sound の代替（効果音再生） |
| `babel-preset-env` | `^1.7.0` | webpack 2 で Firebase 等をトランスパイル |
| `babel-plugin-transform-object-rest-spread` | `^6.26.0` | スプレッド構文のトランスパイル |
| `babel-plugin-transform-class-properties` | `^6.24.1` | クラスプロパティのトランスパイル |
| `babel-plugin-module-resolver` | `^3.2.0` | `@/` パスエイリアスの解決 |
| `autoprefixer` | `^9.8.8` | Tailwind CSS の事前ビルド用 |

**削除パッケージ：**

| パッケージ | 削除理由 |
|---|---|
| `lucide-react` | React 15 非互換。インライン SVG アイコンで代替 |
| `use-sound` | React Hooks ベースのため React 15 で使用不可。howler.js で代替 |
| `react-tooltip` | React 15 非互換。`title` 属性で代替 |
| `@types/cookie` | TypeScript 削除に伴い不要 |
| `@types/node` | TypeScript 削除に伴い不要 |
| `@types/react` | TypeScript 削除に伴い不要 |
| `@types/react-dom` | TypeScript 削除に伴い不要 |
| `typescript` | JavaScript 化に伴い不要 |
| `eslint` / `eslint-config-next` | Next.js 3 対応の ESLint 設定がないため削除 |

**npm scripts の変更：**

```diff
- "dev": "NODE_OPTIONS=--openssl-legacy-provider next dev",
- "build": "NODE_OPTIONS=--openssl-legacy-provider next build",
- "start": "NODE_OPTIONS=--openssl-legacy-provider next start",
- "lint": "next lint"
+ "build:css": "tailwindcss -i ./styles/globals.css -o ./static/styles.css --minify",
+ "dev": "npm run build:css && node server.js",
+ "build": "npm run build:css && next build",
+ "start": "NODE_ENV=production node server.js"
```

- `dev` / `start` は Express カスタムサーバー（`server.js`）で起動するように変更
- `build:css` スクリプトを追加し、Tailwind CSS を `static/styles.css` に事前ビルド
- `NODE_OPTIONS=--openssl-legacy-provider` は不要に（Next.js 3 の webpack 2 は OpenSSL レガシーAPI を必要としない）
- `lint` は削除（ESLint 設定ごと削除）

---

## 3. 改修パターン一覧

### 3.1 TypeScript → JavaScript 変換（全ファイル）

| 項目 | 内容 |
|---|---|
| **変更内容** | 全 `.tsx`/`.ts` ファイルを `.js` に変換し、型注釈・インターフェース・ジェネリクス等を除去 |
| **変更理由** | Next.js 3 の TypeScript サポートが限定的であり、React 15 の型定義（`@types/react@16` 以前）も充実していないため、JavaScript に統一 |

#### React 16（変更前） — `components/buttons/Button.tsx`

```tsx
import React from "react";

import { ReactNode } from "react";

type ButtonProps = {
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  children: ReactNode;
  textColor?: string;
  bgColor?: string;
  styles?: string;
  disabled?: boolean;
};

export function Button({
  type = "submit",
  onClick,
  children,
  textColor = "text-white",
  bgColor = "bg-red-500",
  styles = "",
  disabled = false,
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex h-10 w-full justify-center items-center rounded-full ${bgColor} ${textColor} font-bold text-sm ${styles}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
```

#### React 15（変更後） — `components/buttons/Button.js`

```js
import React from 'react';

export function Button(props) {
  var type = props.type || 'submit';
  var textColor = props.textColor || 'text-white';
  var bgColor = props.bgColor || 'bg-red-500';
  var styles = props.styles || '';
  var disabled = props.disabled || false;

  return (
    <button
      type={type}
      className={'inline-flex h-10 w-full justify-center items-center rounded-full ' + bgColor + ' ' + textColor + ' font-bold text-sm ' + styles}
      onClick={props.onClick}
      disabled={disabled}
    >
      {props.children}
    </button>
  );
}
```

**ポイント:**

- `type ButtonProps` 型定義を削除し、引数を `props` オブジェクトとして受け取る
- 分割代入（destructuring）+ デフォルト値 → `props.xxx || 'default'` パターンに変更
- テンプレートリテラル → 文字列連結に変更（3.17 参照）
- `tsconfig.json` も削除

---

### 3.2 React Hooks → クラスコンポーネント

| 項目 | 内容 |
|---|---|
| **変更内容** | `useState`/`useEffect`/`useRef`/`useCallback`/`useMemo`/`useContext` を使用した関数コンポーネントを `React.Component` を継承したクラスコンポーネントに変換 |
| **変更理由** | React 15 には Hooks API が存在しない（Hooks は React 16.8 で導入） |
| **主な対象** | `Room.js`、`Top.js`、`ToastProvider.js`、`Toast.js` |

#### React 16（変更前） — `features/top/page/Top.tsx`（抜粋）

```tsx
export function Top() {
  const router = useRouter();
  const toast = useToast();
  const {
    dialogRef: joinDialogRef,
    isShow: isShowJoinDialog,
    showModal: showJoinModal,
    closeModal: closeJoinModal,
  } = useDialog();

  const [isCreating, setIsCreating] = useState(false);
  const [createState, setCreateState] = useState<{ error?: string }>({ error: "" });
  const createAction = async () => {
    setIsCreating(true);
    try {
      const result = await createRoomApi();
      setCreateState({ error: result.error });
      if (result.roomId) {
        router.push(`/room/${result.roomId}`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  // ...

  useEffect(() => {
    if (createState.error) {
      toast.open(createState.error);
    }
  }, [createState.error, toast]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 grid place-items-center">
      {/* ... */}
    </div>
  );
}
```

#### React 15（変更後） — `features/top/page/Top.js`（抜粋）

```js
class Top extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isCreating: false,
      createError: '',
      isJoining: false,
      joinError: '',
      isShowJoinDialog: false,
    };
    this.joinDialogRef = null;
    this.setJoinDialogRef = this.setJoinDialogRef.bind(this);
    this.createAction = this.createAction.bind(this);
    // ...
  }

  setJoinDialogRef(el) {
    this.joinDialogRef = el;
  }

  async createAction() {
    this.setState({ isCreating: true });
    try {
      var result = await createRoomApi();
      this.setState({ createError: result.error || '' });
      if (result.roomId) {
        Router.push('/room/' + result.roomId);
      }
    } finally {
      this.setState({ isCreating: false });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    // useEffect(() => { ... }, [createState.error]) の代替
    if (this.state.createError && this.state.createError !== prevState.createError) {
      var toast = this.context.toast;
      if (toast) {
        toast.open(this.state.createError);
      }
    }
  }

  render() {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 grid place-items-center">
        {/* ... */}
      </div>
    );
  }
}

Top.contextTypes = {
  toast: toastShape,
};
```

**ポイント:**

- `useState` → `this.state` + `this.setState()`
- `useEffect` → `componentDidUpdate`（依存配列の条件を `prevState` との比較で再現）
- `useRef` → `this.xxxRef` インスタンス変数 + callback ref（`this.setXxxRef = this.setXxxRef.bind(this)`）
- `useRouter` → `import Router from 'next/router'` + `Router.push()`
- `useToast` / `useContext` → レガシー Context API（`this.context.toast`、3.4 参照）
- 全メソッドをコンストラクタで `bind(this)` する必要がある

---

### 3.3 `_app.tsx` の削除 → Layout コンポーネント + 各ページでラップ

| 項目 | 内容 |
|---|---|
| **変更内容** | `pages/_app.tsx` を削除し、`components/Layout.js` を新規作成。各ページコンポーネントで `<Layout>` でラップ |
| **変更理由** | Next.js 3 にはカスタム `_app` が存在しない（`_app.js` は Next.js 7 で導入）。グローバルレイアウトは各ページで明示的にラップする必要がある |

#### React 16（変更前） — `pages/_app.tsx`

```tsx
import React from "react";
import type { AppProps } from "next/app";
import { ToastProvider } from "@/utils/toast/ToastProvider";
import { Toast } from "@/utils/toast/Toast";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ToastProvider>
      <div className="w-full grid place-items-center bg-gray-900">
        <div className="w-full max-w-screen-md">
          <Component {...pageProps} />
        </div>
        <Toast />
      </div>
    </ToastProvider>
  );
}
```

#### React 15（変更後） — `components/Layout.js`

```js
import React from 'react';
import { ToastProvider } from '@/utils/toast/ToastProvider';
import { Toast } from '@/utils/toast/Toast';

export function Layout(props) {
  return (
    <ToastProvider>
      <div className="w-full grid place-items-center bg-gray-900">
        <div className="w-full max-w-screen-md">
          {props.children}
        </div>
        <Toast />
      </div>
    </ToastProvider>
  );
}
```

#### React 15（変更後） — `pages/index.js`

```js
import React from 'react';
import { Layout } from '@/components/Layout';
import { Top } from '@/features/top/page/Top';

export default function HomePage() {
  return (
    <Layout>
      <Top />
    </Layout>
  );
}
```

**ポイント:**

- `_app.tsx` が担っていた役割（グローバルレイアウト、`ToastProvider`、CSS import）を分離
- レイアウト構造 → `Layout.js` に移動
- CSS import → `_document.js` で `<link>` タグとして読み込み（3.13 参照）
- 各ページ（`index.js`、`room.js`）で `<Layout>` を明示的にラップ

---

### 3.4 新 Context API → レガシー Context API（Toast）

| 項目 | 内容 |
|---|---|
| **変更内容** | `createContext`/`useContext` ベースの Toast システムを `childContextTypes`/`getChildContext`/`contextTypes`（prop-types）ベースに変換 |
| **変更理由** | 新しい Context API（`createContext`）は React 16.3 で導入されたもので、React 15 では使用不可 |
| **対象ファイル** | `ToastProvider.js`、`Toast.js`、`Room.js`、`Top.js`（消費側）、`toastContext.ts`/`useToast.ts`（削除） |

#### React 16（変更前） — `utils/toast/toastContext.ts`

```ts
import { createContext, ReactNode } from "react";

export const ToastContext = createContext<
  | {
      isOpen: boolean;
      message: string | ReactNode;
      open: (message: string | ReactNode) => void;
    }
  | undefined
>(undefined);
```

#### React 16（変更前） — `utils/toast/ToastProvider.tsx`

```tsx
import { ToastContext } from "@/utils/toast/toastContext";
import React, { useState } from "react";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<string | React.ReactNode>("");

  const open = (message: string | React.ReactNode, milliseconds: number = 3000) => {
    setIsOpen(true);
    setMessage(message);
    setTimeout(() => { close(); }, milliseconds);
  };

  const close = () => { setIsOpen(false); setMessage(""); };

  return (
    <ToastContext.Provider value={{ isOpen, message, open }}>
      {children}
    </ToastContext.Provider>
  );
}
```

#### React 16（変更前） — `utils/toast/Toast.tsx`（消費側）

```tsx
import { ToastContext } from "@/utils/toast/toastContext";
import { useContext } from "react";

export function Toast() {
  const context = useContext(ToastContext);
  // ...
}
```

#### React 15（変更後） — `utils/toast/ToastProvider.js`

```js
import React from 'react';
import PropTypes from 'prop-types';

var toastShape = PropTypes.shape({
  isOpen: PropTypes.bool.isRequired,
  message: PropTypes.node,
  open: PropTypes.func.isRequired,
});

class ToastProvider extends React.Component {
  constructor(props) {
    super(props);
    this.state = { isOpen: false, message: '' };
    this._timerId = null;
    this.open = this.open.bind(this);
    this.close = this.close.bind(this);
  }

  getChildContext() {
    return {
      toast: {
        isOpen: this.state.isOpen,
        message: this.state.message,
        open: this.open,
      },
    };
  }

  open(message, milliseconds) {
    var self = this;
    var ms = milliseconds || 3000;
    if (self._timerId) { clearTimeout(self._timerId); }
    self.setState({ isOpen: true, message: message });
    self._timerId = setTimeout(function() { self.close(); }, ms);
  }

  close() {
    this.setState({ isOpen: false, message: '' });
    this._timerId = null;
  }

  render() { return this.props.children; }
}

ToastProvider.childContextTypes = {
  toast: toastShape,
};

export { ToastProvider, toastShape };
```

#### React 15（変更後） — `utils/toast/Toast.js`（消費側）

```js
import React from 'react';
import { toastShape } from '@/utils/toast/ToastProvider';

class Toast extends React.Component {
  render() {
    var toast = this.context.toast;
    if (!toast || !toast.isOpen) { return null; }
    return (
      <div className="fixed p-4 mx-1 bg-gray-800 border-2 text-white rounded-lg shadow-lg">
        {toast.message}
      </div>
    );
  }
}

Toast.contextTypes = {
  toast: toastShape,
};
```

**ポイント:**

- `createContext` + `useContext` → Provider 側は `getChildContext()` + `childContextTypes`、Consumer 側は `this.context.xxx` + `contextTypes`
- `toastContext.ts` と `useToast.ts` は削除（レガシー Context API では専用ファイルが不要）
- `toastShape`（PropTypes の型定義）を `ToastProvider.js` からエクスポートし、消費側の `contextTypes` で再利用
- `ToastContext.Provider` によるラップが不要に（`getChildContext` が自動で子孫に伝播）
- Provider の `render()` は単に `this.props.children` を返すだけ

---

### 3.5 `forwardRef` → `dialogRef` プロップパターン

| 項目 | 内容 |
|---|---|
| **変更内容** | `forwardRef` で `ref` を転送していたダイアログコンポーネントを、`dialogRef` プロップで DOM 参照を受け渡すパターンに変更 |
| **変更理由** | `forwardRef` は React 16.3 で導入された API であり、React 15 では使用不可 |
| **対象ファイル** | `InfoDialog`、`TurnResultDialog`、`GameResultDialog`、`NoticeDialog`、`JoinDialog`、`CreaterWaitingStartDialog`、`StartTurnDialog` |

#### React 16（変更前） — `components/dialogs/InfoDialog.tsx`

```tsx
import React from "react";
import { forwardRef } from "react";

type InfoDialogProps = {
  children: React.ReactNode;
  borderColor?: string | undefined;
};

export const InfoDialog = forwardRef<HTMLDialogElement, InfoDialogProps>(
  function InfoDialog({ children, borderColor }, ref) {
    const border = borderColor ? borderColor : "border-red-500";
    return (
      <dialog
        className="min-w-fit max-w-lg top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-transparent backdrop:bg-black/80 shadow-sm w-full"
        ref={ref}
      >
        {/* ... */}
      </dialog>
    );
  }
);
```

#### React 15（変更後） — `components/dialogs/InfoDialog.js`

```js
import React from 'react';

export function InfoDialog(props) {
  var border = props.borderColor ? props.borderColor : 'border-red-500';
  return (
    <dialog
      className="min-w-fit max-w-lg top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-transparent backdrop:bg-black/80 shadow-sm w-full"
      ref={props.dialogRef}
    >
      {/* ... */}
    </dialog>
  );
}
```

#### React 16（変更前） — 親コンポーネントでの使用（`JoinDialog.tsx`）

```tsx
<InfoDialog ref={dialogRef}>
  {/* ... */}
</InfoDialog>
```

#### React 15（変更後） — 親コンポーネントでの使用（`JoinDialog.js`）

```js
<InfoDialog dialogRef={props.dialogRef}>
  {/* ... */}
</InfoDialog>
```

**ポイント:**

- `forwardRef` でラップしたコンポーネント → 通常の関数コンポーネントに変更し、`ref` の代わりに `dialogRef` プロップで受け取り
- `ref={ref}` → `ref={props.dialogRef}` に変更
- 親コンポーネントでも `ref={xxx}` → `dialogRef={xxx}` に変更
- `forwardRef` を使っていた `TurnResultDialog`/`GameResultDialog` も同様に `dialogRef` プロップパターンに変更し、`forwardRef` のラップを除去
- `useRef` で作成していた ref は callback ref（`this.setXxxRef = function(el) { this.xxxRef = el; }`）に置き換え（3.2 参照）

---

### 3.6 カスタム Hooks の統合（Room ページ）

| 項目 | 内容 |
|---|---|
| **変更内容** | 6 つのカスタム Hooks を削除し、ロジックを `Room` クラスコンポーネントのメソッドとして統合 |
| **変更理由** | React 15 に Hooks がないため、カスタム Hooks として分離していたロジックをクラスコンポーネント内に取り込む必要がある |

**削除されたカスタム Hooks：**

| # | ファイル | 役割 |
|---|---|---|
| 1 | `hooks/useDialog.ts` | ダイアログの `showModal`/`close` 管理 |
| 2 | `components/dialogs/notice/useNoticeDialog.ts` | 通知ダイアログの状態 + `showModal`/`close` |
| 3 | `features/room/hooks/useRoomDialogs.ts` | Room 内の全ダイアログの ref と操作を集約 |
| 4 | `features/room/hooks/useRoomWatcher.ts` | Firestore `onSnapshot` リスナー管理 |
| 5 | `features/room/hooks/useRoomActions.ts` | 椅子選択・activate・changeTurn 等の API 操作 |
| 6 | `features/room/hooks/useRoomEffect.ts` | roomData 変更時の副作用（ダイアログ表示・効果音） |
| 7 | `features/room/hooks/usePlayerOperation.ts` | 現在のプレイヤーの操作状態を計算 |

#### React 16（変更前） — `Room.tsx`（Hooks 使用）

```tsx
export default function Room({ initialData }) {
  const [playShockEffect] = useSound("/sounds/shock.mp3");
  const [playSafeEffect] = useSound("/sounds/safe.mp3");
  const router = useRouter();
  const toast = useToast();
  const [roomData, setRoomData] = useState(initialData.room);
  const [showShock, setShowShock] = useState("");
  const previousRoomDataRef = useRef(null);

  const { NoticeDialogRef, showNoticeModal, closeNoticeModal, /* ... */ } = useRoomDialogs();
  const playerOperation = usePlayerOperation(roomData, userId);

  useRoomWatcher({ roomId, setRoomData, previousRoomDataRef });

  const { selectedChair, selectChair, copyRoomId, /* ... */ } = useRoomActions({
    roomId, userId, roomData, playerOperation,
  });

  useRoomEffect({ roomData, userId, /* ... */ });

  return ( /* JSX */ );
}
```

#### React 15（変更後） — `Room.js`（クラスコンポーネント、抜粋）

```js
class Room extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      roomData: props.initialData.room,
      selectedChair: null,
      selectState: { status: 0, error: '' },
      copyTooltip: 'クリックしてコピー',
      showShock: '',
      noticeDialogState: { title: '', message: '', button: { label: '', action: function() {} } },
    };
    this.userId = props.initialData.userId;
    this.roomId = props.initialData.roomId;
    this.previousRoomData = null;

    // Howl instances (use-sound → howler.js)
    this.shockSound = new Howl({ src: ['/static/sounds/shock.mp3'] });
    this.safeSound = new Howl({ src: ['/static/sounds/safe.mp3'] });

    // Dialog refs (useRef → instance variables)
    this.noticeDialogRef = null;
    this.waitingCreaterStartDialogRef = null;
    // ...

    // Bind methods
    this.setNoticeDialogRef = this.setNoticeDialogRef.bind(this);
    this.showNoticeModal = this.showNoticeModal.bind(this);
    // ... (20+ binds)
  }

  // usePlayerOperation → method
  getPlayerOperation() { /* ... */ }

  // useRoomActions → methods
  async selectChair() { /* ... */ }
  async copyRoomId() { /* ... */ }
  async handleSubmitActivate() { /* ... */ }
  async handleChangeTurn() { /* ... */ }

  // useRoomWatcher → componentDidMount
  componentDidMount() {
    var self = this;
    this.unsubscribePromise = (async function() {
      var db = await firestoreConfig.getFirestoreApp();
      var docRef = firestoreLib.doc(db, 'rooms', self.roomId);
      var unsubscribe = firestoreLib.onSnapshot(docRef, function(docSnap) {
        var data = docSnap.data();
        self.setState(function(prevState) {
          if (data.round.phase === 'activating') {
            self.previousRoomData = prevState.roomData;
          }
          return { roomData: data };
        });
      });
      return unsubscribe;
    })();
  }

  componentWillUnmount() {
    if (this.unsubscribePromise) {
      this.unsubscribePromise.then(function(unsubscribe) {
        if (typeof unsubscribe === 'function') { unsubscribe(); }
      });
    }
  }

  // useRoomEffect → componentDidUpdate
  componentDidUpdate(prevProps, prevState) {
    var roomData = this.state.roomData;
    if (roomData !== prevState.roomData && roomData) {
      // Phase-based UI handling...
    }
  }

  render() { return ( /* JSX */ ); }
}
```

**ポイント:**

- Hooks で分離していた 7 つのモジュールのロジックが 1 つのクラスコンポーネント（約 510 行）に統合
- `useState` → `this.state` + `this.setState()`
- `useEffect(fn, [roomData])` → `componentDidUpdate` で `prevState.roomData` と比較
- `useEffect(fn, [])` → `componentDidMount`
- クリーンアップ関数（`return () => { ... }`） → `componentWillUnmount`
- `useMemo` → 通常のメソッド（`getPlayerOperation()`）として呼び出し
- `useRoomPhaseHandlers.ts` は Hooks に依存していなかったため、`roomPhaseHandlers.js` としてほぼそのまま残存（CommonJS 化のみ）

---

### 3.7 Next.js API Routes → Express カスタムサーバー

| 項目 | 内容 |
|---|---|
| **変更内容** | `pages/api/room/` 配下の 5 つの API Routes を `server.js` 内の Express ルートハンドラに移行 |
| **変更理由** | Next.js 3 には API Routes 機能がない（API Routes は Next.js 9 で導入） |

**削除されたファイル（5 ファイル）：**

| # | ファイル |
|---|---|
| 1 | `pages/api/room/create.ts` |
| 2 | `pages/api/room/join.ts` |
| 3 | `pages/api/room/select-chair.ts` |
| 4 | `pages/api/room/activate.ts` |
| 5 | `pages/api/room/change-turn.ts` |

#### React 16（変更前） — `pages/api/room/create.ts`

```ts
import type { NextApiRequest, NextApiResponse } from "next";
import { serialize } from "cookie";
import { createRoom } from "@/libs/firestore";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const result = await createRoom();
  if (result.status !== 200) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.setHeader("Set-Cookie", [
    serialize("roomId", result.roomId as string, {
      httpOnly: true, sameSite: "strict",
      secure: process.env.NODE_ENV === "production", path: "/",
    }),
    serialize("userId", result.userId as string, {
      httpOnly: true, sameSite: "strict",
      secure: process.env.NODE_ENV === "production", path: "/",
    }),
  ]);

  res.status(200).json({ roomId: result.roomId, userId: result.userId });
}
```

#### React 15（変更後） — `server.js`（対応部分抜粋）

```js
const express = require('express');
const cookieParser = require('cookie-parser');
const { serialize } = require('cookie');

// ...

server.use(express.json());
server.use(cookieParser());

server.post('/api/room/create', async (req, res) => {
  try {
    const firestore = await getFirestore();
    const result = await firestore.createRoom();
    if (result.status !== 200) {
      return res.status(result.status).json({ error: result.error });
    }

    res.setHeader('Set-Cookie', [
      serialize('roomId', result.roomId, {
        httpOnly: true, sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production', path: '/',
      }),
      serialize('userId', result.userId, {
        httpOnly: true, sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production', path: '/',
      }),
    ]);

    res.status(200).json({ roomId: result.roomId, userId: result.userId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
```

**ポイント:**

- API のエンドポイント URL（`/api/room/create` 等）は変更なし → クライアント側の `libs/api.js` の URL もそのまま
- `NextApiRequest`/`NextApiResponse` → Express の `req`/`res`
- `req.method !== "POST"` のチェックは Express の `server.post()` で暗黙的に制約されるため不要
- `cookie-parser` ミドルウェアを追加して `req.cookies` を利用可能に（Next.js の組み込み Cookie パースの代替）
- 各 API ハンドラに `try/catch` を追加してエラーハンドリングを強化
- Firestore モジュールは遅延ロード（`getFirestore()` ヘルパー関数）で初回使用時に読み込み

---

### 3.8 動的ルーティング `[roomId]` → Express パラメータルーティング

| 項目 | 内容 |
|---|---|
| **変更内容** | `pages/room/[roomId].tsx` → `pages/room.js` + `server.js` 内の Express ルートで動的パラメータを処理 |
| **変更理由** | Next.js 3 にはファイルベースの動的ルーティング（`[param]`）が存在しない（Next.js 9 で導入） |

#### React 16（変更前） — ファイル構造

```
pages/
  room/
    [roomId].tsx    ← /room/abc123 にマッチ
```

#### React 15（変更後） — ファイル構造

```
pages/
  room.js           ← Next.js のページコンポーネント
server.js           ← Express で /room/:roomId → pages/room にルーティング
```

#### React 15（変更後） — `server.js`（ルーティング部分）

```js
// Dynamic room route: /room/:roomId
server.get('/room/:roomId', (req, res) => {
  const actualPage = '/room';
  const queryParams = { roomId: req.params.roomId };
  app.render(req, res, actualPage, queryParams);
});

// All other routes handled by Next.js
server.get('*', (req, res) => {
  return handle(req, res);
});
```

**ポイント:**

- Express の `:roomId` パラメータを `req.params.roomId` で取得し、`app.render()` の `queryParams` として Next.js に渡す
- `pages/room.js` 側では `context.query.roomId` で受け取り可能
- ワイルドカードルート（`*`）を最後に配置し、マッチしない URL は Next.js のデフォルトハンドラに委譲

---

### 3.9 `getServerSideProps` → `getInitialProps`

| 項目 | 内容 |
|---|---|
| **変更内容** | `getServerSideProps` を `getInitialProps` に変換 |
| **変更理由** | Next.js 3 には `getServerSideProps` が存在しない（Next.js 9.3 で導入）。`getInitialProps` はサーバー・クライアント両方で実行される |
| **対象ファイル** | `pages/room.js`（旧 `pages/room/[roomId].tsx`） |

#### React 16（変更前） — `pages/room/[roomId].tsx`

```tsx
export const getServerSideProps: GetServerSideProps<RoomPageProps> = async (
  context: GetServerSidePropsContext
) => {
  const userId = context.req.cookies.userId;
  const roomId = context.req.cookies.roomId;
  const pathRoomId = context.params?.roomId;

  if (!userId || !roomId || !pathRoomId || pathRoomId !== roomId) {
    return {
      redirect: { destination: "/", permanent: false },
    };
  }

  const room = await getRoom(roomId);
  // ...

  return {
    props: {
      initialData: { room: updateRes.data as GameRoom, userId, roomId },
    },
  };
};
```

#### React 15（変更後） — `pages/room.js`

```js
RoomPage.getInitialProps = async function(context) {
  var req = context.req;
  var query = context.query;

  // クライアントサイドでは Cookie に直接アクセスできない
  if (!req) {
    return { initialData: { room: null, userId: null, roomId: null } };
  }

  var cookies = req.cookies || {};
  var userId = cookies.userId;
  var roomId = cookies.roomId;
  var pathRoomId = query.roomId;

  if (!userId || !roomId || !pathRoomId || pathRoomId !== roomId) {
    if (context.res) {
      context.res.writeHead(302, { Location: '/' });
      context.res.end();
    }
    return { initialData: { room: null, userId: null, roomId: null } };
  }

  var room = await firestoreModule.getRoom(roomId);
  // ...

  return {
    initialData: { room: updateRes.data, userId: userId, roomId: roomId },
  };
};
```

**ポイント:**

- `getServerSideProps` はサーバー専用で戻り値が `{ props: { ... } }` 形式 → `getInitialProps` はサーバー・クライアント両方で実行され、戻り値がそのまま props になる
- `context.params?.roomId` → `context.query.roomId`（Express の `queryParams` 経由で渡される）
- リダイレクトの `return { redirect: { ... } }` → `context.res.writeHead(302, { Location: '/' }); context.res.end();`
- クライアントサイドナビゲーション時は `req` が `undefined` になるため、`if (!req)` のガード処理を追加
- `context.req.cookies` は `cookie-parser` ミドルウェアによって解析済み

---

### 3.10 `lucide-react` → インライン SVG アイコン

| 項目 | 内容 |
|---|---|
| **変更内容** | `lucide-react` からのインポートを、`components/icons/` 配下の自作 SVG コンポーネントに置き換え |
| **変更理由** | `lucide-react` は React 16+ を前提としており、React 15 では動作しない |

**作成されたアイコンコンポーネント（7 ファイル）：**

| # | ファイル | 元の `lucide-react` アイコン |
|---|---|---|
| 1 | `components/icons/Zap.js` | `Zap`（雷マーク — 感電エフェクト） |
| 2 | `components/icons/ChevronRight.js` | `ChevronRight`（右矢印 — スコア変化表示） |
| 3 | `components/icons/Copy.js` | `Copy`（コピーアイコン — ルーム ID コピー） |
| 4 | `components/icons/Skull.js` | `Skull`（ドクロ — 感電表示/敗北） |
| 5 | `components/icons/Trophy.js` | `Trophy`（トロフィー — 勝利） |
| 6 | `components/icons/Meh.js` | `Meh`（顔 — 引き分け） |
| 7 | `components/icons/Armchair.js` | `Armchair`（椅子 — タイトル表示） |

#### React 16（変更前） — `ActivateEffect.tsx`

```tsx
import { Zap } from "lucide-react";

export function ActivateEffect({ result }: ActivateEffextProps) {
  if (result === "shock") {
    return (
      <div className="fixed inset-0 bg-yellow-300 bg-opacity-70 flex items-center justify-center z-50">
        <Zap className="animate-shock-vibrate text-red-700 w-48 h-48 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
      </div>
    );
  }
  // ...
}
```

#### React 15（変更後） — `ActivateEffect.js`

```js
import { Zap } from '@/components/icons/Zap';

export function ActivateEffect(props) {
  if (props.result === 'shock') {
    return (
      <div className="fixed inset-0 bg-yellow-300 bg-opacity-70 flex items-center justify-center z-50">
        <Zap className="animate-shock-vibrate text-red-700 w-48 h-48 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
      </div>
    );
  }
  // ...
}
```

#### React 15（変更後） — `components/icons/Zap.js`

```js
import React from 'react';

export function Zap(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className || ''}
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
```

**ポイント:**

- lucide-react の SVG パスデータをそのまま使用し、インライン SVG コンポーネントとして再実装
- `className` プロップを受け取り、`<svg>` 要素に適用（lucide-react と同じインターフェース）
- lucide-react の `width`/`height` デフォルト値（24）をハードコードし、CSS でサイズを制御（`w-48 h-48` 等）

---

### 3.11 `use-sound` → `howler.js`

| 項目 | 内容 |
|---|---|
| **変更内容** | `use-sound` ライブラリを `howler.js` に置き換え |
| **変更理由** | `use-sound` は React Hooks（`useSound`）ベースのため、React 15 では使用不可 |
| **対象ファイル** | `features/room/page/Room.js` |

#### React 16（変更前） — `Room.tsx`

```tsx
import useSound from "use-sound";

export default function Room({ initialData }) {
  const [playShockEffect] = useSound("/sounds/shock.mp3");
  const [playSafeEffect] = useSound("/sounds/safe.mp3");

  // 使用箇所
  playShockEffect({ playbackRate: 0.7 });
  playSafeEffect();
  // ...
}
```

#### React 15（変更後） — `Room.js`

```js
import { Howl } from 'howler';

class Room extends React.Component {
  constructor(props) {
    super(props);
    this.shockSound = new Howl({ src: ['/static/sounds/shock.mp3'] });
    this.safeSound = new Howl({ src: ['/static/sounds/safe.mp3'] });
  }

  playShockEffect(options) {
    if (options && options.playbackRate) {
      this.shockSound.rate(options.playbackRate);
    }
    this.shockSound.play();
  }

  playSafeEffect() {
    this.safeSound.play();
  }
  // ...
}
```

**ポイント:**

- `use-sound` の `[play]` 配列パターン → `new Howl()` でインスタンスを作成し、メソッドで再生
- 音声ファイルのパスが `/sounds/xxx.mp3` → `/static/sounds/xxx.mp3` に変更（Next.js 3 の静的ファイル配信ディレクトリが `static/`）
- `playbackRate` オプションは `Howl.rate()` メソッドで設定

---

### 3.12 ESM → CommonJS（サーバーサイド）

| 項目 | 内容 |
|---|---|
| **変更内容** | `import`/`export` 構文を `require`/`module.exports` に変換（サーバーサイドで実行されるファイル） |
| **変更理由** | Next.js 3 のサーバーサイドは CommonJS を使用。クライアントサイドは webpack 経由で ESM を処理できるが、`require()` で動的に読み込むファイルは CommonJS が必要 |
| **対象ファイル** | `libs/firestore/config.js`、`libs/firestore/index.js`、`libs/api.js`、`utils/room.js`、`features/room/hooks/roomPhaseHandlers.js` |

#### React 16（変更前） — `libs/firestore/config.ts`

```ts
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = { /* ... */ };

export const getFirestoreApp = async () => {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getFirestore(app);
};
```

#### React 15（変更後） — `libs/firestore/config.js`

```js
var firebase = require('firebase/app');
var firestore = require('firebase/firestore');

var firebaseConfig = { /* ... */ };

var getFirestoreApp = async function() {
  var app = firebase.getApps().length ? firebase.getApp() : firebase.initializeApp(firebaseConfig);
  return firestore.getFirestore(app);
};

module.exports = { getFirestoreApp: getFirestoreApp };
```

**ポイント:**

- `import { xxx } from 'yyy'` → `var yyy = require('yyy')` + `yyy.xxx` で参照
- `export const xxx` / `export function xxx` → `module.exports = { xxx: xxx }`
- Firebase SDK は `require('firebase/app')` でモジュール全体を読み込み、`firebase.getApps()` のように名前空間経由でアクセス
- クライアントサイドのコンポーネント（`.js` ファイルで `import`/`export` 構文）は webpack が処理するため ESM のまま

---

### 3.13 CSS の配信方法変更（Tailwind 事前ビルド）

| 項目 | 内容 |
|---|---|
| **変更内容** | `_app.tsx` での `import "@/styles/globals.css"` を廃止し、Tailwind CSS を事前ビルドして `static/styles.css` として `_document.js` の `<link>` タグで読み込み |
| **変更理由** | Next.js 3 にはカスタム `_app` がなく、CSS のモジュール import もサポートされていない（CSS import は Next.js 9.2 で導入）|

#### React 16（変更前） — `pages/_app.tsx`

```tsx
import "@/styles/globals.css";  // CSS をモジュールとして import
```

#### React 15（変更後） — `package.json`（ビルドスクリプト）

```json
{
  "build:css": "tailwindcss -i ./styles/globals.css -o ./static/styles.css --minify"
}
```

#### React 15（変更後） — `pages/_document.js`

```js
export default class MyDocument extends Document {
  render() {
    return (
      <html lang="ja">
        <Head>
          {/* ... */}
          <link rel="stylesheet" href="/static/styles.css" />
        </Head>
        {/* ... */}
      </html>
    );
  }
}
```

**ポイント:**

- Tailwind CSS のビルドを `npm run build:css` スクリプトとして分離し、`static/styles.css` に出力
- `dev` スクリプトでは `npm run build:css && node server.js` の順で先に CSS をビルドしてからサーバーを起動
- Next.js 3 では `static/` ディレクトリ配下のファイルが `/static/xxx` パスで配信される
- `_document.js` の `<Head>` 内に `<link rel="stylesheet">` タグを追加

---

### 3.14 `next.config.js` — webpack 設定の大幅変更

| 項目 | 内容 |
|---|---|
| **変更内容** | 3 行のシンプルな設定 → webpack エイリアス・トランスパイル・Node.js モジュールモック等を含む約 80 行の設定に拡張 |
| **変更理由** | Next.js 3（webpack 2）は ES2017+ 構文（スプレッド演算子、optional chaining 等）を解析できない。Firebase SDK 等のモダンパッケージを Babel でトランスパイルし、Node.js 専用モジュールをモックする必要がある |

#### React 16（変更前） — `next.config.js`

```js
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
```

#### React 15（変更後） — `next.config.js`

```js
const path = require('path');
const webpack = require('webpack');
require('dotenv').config({ path: '.env.local' });

// NEXT_PUBLIC_* 環境変数を DefinePlugin でクライアントに公開
const envKeys = Object.keys(process.env)
  .filter(function(key) { return key.startsWith('NEXT_PUBLIC_'); })
  .reduce(function(acc, key) {
    acc['process.env.' + key] = JSON.stringify(process.env[key]);
    return acc;
  }, {});

module.exports = {
  webpack: (config) => {
    // DefinePlugin で環境変数をクライアントバンドルに注入
    config.plugins.push(new webpack.DefinePlugin(envKeys));

    // @ パスエイリアス
    config.resolve.alias['@'] = path.resolve(__dirname);

    // browser ビルドを優先（gRPC, tls, net 等の回避）
    config.resolve.mainFields = ['browser', 'module', 'main'];

    // .cjs 拡張子の解決
    if (config.resolve.extensions.indexOf('.cjs') === -1) {
      config.resolve.extensions.push('.cjs');
    }

    // Firebase / idb / undici / nanoid をトランスパイル
    config.module.rules.push({
      test: /\.(js|cjs|mjs)$/,
      include: [
        /node_modules\/firebase/,
        /node_modules\/@firebase/,
        /node_modules\/idb/,
        /node_modules\/undici/,
        /node_modules\/nanoid/,
      ],
      use: {
        loader: 'babel-loader',
        options: {
          presets: [['env', { targets: { browsers: ['> 1%', 'last 2 versions'] }, modules: false }]],
          plugins: ['transform-object-rest-spread', 'transform-class-properties'],
        },
      },
    });

    // Node.js モジュールのモック
    config.node.tls = 'empty';
    config.node.net = 'empty';
    config.node.dns = 'empty';
    config.node.child_process = 'empty';

    return config;
  },
};
```

**ポイント:**

- **環境変数の注入**: Next.js 3 は `NEXT_PUBLIC_*` の自動公開をサポートしないため、`dotenv` で読み込み + `DefinePlugin` で注入
- **パスエイリアス**: `@/` エイリアスを `resolve.alias` で手動設定
- **Firebase トランスパイル**: Firebase SDK v11 は ES2017+ 構文を使用しており、webpack 2 のパーサーでは解析不可。`babel-loader` + `babel-preset-env` でダウンレベルコンパイル
- **Node.js モジュールモック**: Firebase SDK が内部的に参照する `tls`/`net`/`dns`/`child_process` はブラウザ環境に存在しないため、`'empty'` でモック
- **mainFields 設定**: `['browser', 'module', 'main']` でブラウザ向けビルドを優先し、gRPC 等の Node.js 専用依存を回避

---

### 3.15 `.babelrc` の追加（パスエイリアス解決）

| 項目 | 内容 |
|---|---|
| **変更内容** | `.babelrc` を新規追加 |
| **変更理由** | サーバーサイドの `require('@/xxx')` を正しく解決するために `babel-plugin-module-resolver` でパスエイリアスを設定 |
| **対象ファイル** | `.babelrc`（新規作成） |

#### React 15（変更後） — `.babelrc`

```json
{
  "presets": ["next/babel"],
  "plugins": [
    ["module-resolver", {
      "root": ["."],
      "alias": {
        "@": "."
      }
    }]
  ]
}
```

**ポイント:**

- `next.config.js` の `resolve.alias` は webpack（クライアントサイド）のみ有効
- サーバーサイドで実行されるコード（`getInitialProps` 等）では webpack を通らないため、Babel プラグインでエイリアスを解決する必要がある
- `next/babel` プリセットを継承し、`module-resolver` を追加
- `"root": ["."]` + `"alias": { "@": "." }` で `@/libs/xxx` → `./libs/xxx` に変換

---

### 3.16 TypeScript 型定義の削除

| 項目 | 内容 |
|---|---|
| **変更内容** | TypeScript 型定義ファイルを削除 |
| **変更理由** | JavaScript 化に伴い、独立した型定義ファイルが不要 |

**削除されたファイル：**

| # | ファイル | 内容 |
|---|---|---|
| 1 | `types/room.ts` | `Player`、`Round`、`GameRoom`、`RoomResponse` 型 |
| 2 | `features/room/types/dialog.ts` | `ShowNoticeModalFn` 型 |
| 3 | `tsconfig.json` | TypeScript コンパイラ設定 |
| 4 | `.eslintrc.json` | ESLint 設定（TypeScript 連携含む） |

**ポイント:**

- `types/room.ts` に定義されていた型は JavaScript では不要だが、コメントとしてオブジェクト構造の知識は `CLAUDE.md` やこのドキュメントに記録
- `tsconfig.json` の `paths` エイリアス設定は `.babelrc`（3.15）と `next.config.js`（3.14）で代替

---

### 3.17 ES6+ 構文のダウングレード

| 項目 | 内容 |
|---|---|
| **変更内容** | テンプレートリテラル、分割代入、アロー関数、`const`/`let`、optional chaining、スプレッド構文 等を ES5 互換構文に変換 |
| **変更理由** | Next.js 3 の webpack 2 + Babel 環境での安定動作を優先。一部の構文は webpack 2 が直接パースできない |

#### テンプレートリテラル → 文字列連結

```tsx
// React 16
className={`inline-flex ${bgColor} ${textColor} font-bold ${styles}`}
style={{ left: `${left}%`, top: `${top}%` }}
router.push(`/room/${result.roomId}`);
```

```js
// React 15
className={'inline-flex ' + bgColor + ' ' + textColor + ' font-bold ' + styles}
style={{ left: left + '%', top: top + '%' }}
Router.push('/room/' + result.roomId);
```

#### 分割代入 → `props.xxx` / `var xxx = obj.xxx`

```tsx
// React 16
export function Chair({ chair, setSelectedChair, wait, selected }: ChairProps) {
  // ...
}
```

```js
// React 15
export function Chair(props) {
  var chair = props.chair;
  // ...
}
```

#### アロー関数 → `function` 式

```tsx
// React 16
const createAction = async () => { /* ... */ };
players.find((player) => player.id === userId);
setTimeout(() => { close(); }, milliseconds);
```

```js
// React 15
async createAction() { /* class method */ }
players.find(function(player) { return player.id === userId; });
setTimeout(function() { close(); }, milliseconds);
```

#### `const`/`let` → `var`

```tsx
// React 16
const isWinner = roomData?.winnerId === userId;
let winnerId = null;
```

```js
// React 15
var isWinner = roomData && roomData.winnerId === userId;
var winnerId = null;
```

#### optional chaining → 論理 AND

```tsx
// React 16
roomData?.round?.attackerId === userId
myStatus?.point
onBeforeActivate?.();
```

```js
// React 15
roomData && roomData.round && roomData.round.attackerId === userId
myStatus && myStatus.point
if (onBeforeActivate) { onBeforeActivate(); }
```

#### スプレッド構文 → 手動マージ / プロパティ列挙

```tsx
// React 16
return { ...round, phase: "sitting", electricChair: selectedChair } as Round;
const data: Partial<GameRoom> = { ...room.data, players: updatedPlayers };
```

```js
// React 15
return {
  count: round.count,
  turn: round.turn,
  attackerId: round.attackerId,
  phase: 'sitting',
  electricChair: selectedChair,
  seatedChair: round.seatedChair,
  result: round.result,
};
```

#### `Array.includes` → `indexOf`

```tsx
// React 16
round.result.confirmedIds.includes(userId)
```

```js
// React 15
round.result.confirmedIds.indexOf(userId) !== -1
```

**ポイント:**

- クライアントサイドコンポーネントでは JSX 内の `import`/`export` は webpack が処理するため使用可能
- ただし webpack 2 が直接パースできない構文（optional chaining `?.`、nullish coalescing `??` 等）は事前に手動で ES5 互換に変換
- `var` の使用は一貫性のため全ファイルで統一（`const`/`let` は使用せず）

---

## 4. 変更ファイル一覧

### 新規作成ファイル（19 ファイル）

| # | ファイル | 内容 |
|---|---|---|
| 1 | `web/server.js` | Express カスタムサーバー（API Routes + 動的ルーティング） |
| 2 | `web/.babelrc` | Babel 設定（パスエイリアス解決） |
| 3 | `web/components/Layout.js` | 共通レイアウト（`_app.tsx` 代替） |
| 4 | `web/components/icons/Armchair.js` | インライン SVG アイコン |
| 5 | `web/components/icons/ChevronRight.js` | インライン SVG アイコン |
| 6 | `web/components/icons/Copy.js` | インライン SVG アイコン |
| 7 | `web/components/icons/Meh.js` | インライン SVG アイコン |
| 8 | `web/components/icons/Skull.js` | インライン SVG アイコン |
| 9 | `web/components/icons/Trophy.js` | インライン SVG アイコン |
| 10 | `web/components/icons/Zap.js` | インライン SVG アイコン |
| 11 | `web/static/styles.css` | Tailwind CSS 事前ビルド出力 |
| 12 | `web/static/sounds/safe.mp3` | 効果音（`public/` → `static/`） |
| 13 | `web/static/sounds/shock.mp3` | 効果音（`public/` → `static/`） |
| 14 | `docs/react16-downgrade.md` | 前回のダウングレードドキュメント |
| 15 | `prompt_memo.md` | メモ |
| 16 | `web/pages/index.js` | トップページ（JS 版） |
| 17 | `web/pages/room.js` | ルームページ（JS 版 + `getInitialProps`） |
| 18 | `web/features/room/hooks/roomPhaseHandlers.js` | フェーズハンドラ（CommonJS 版） |
| 19 | `web/utils/room.js` | ルームユーティリティ（CommonJS 版） |

### 削除ファイル（23 ファイル）

| # | ファイル | 削除理由 |
|---|---|---|
| 1 | `web/pages/_app.tsx` | Next.js 3 にカスタム `_app` なし |
| 2 | `web/pages/room/[roomId].tsx` | 動的ルーティング不可 |
| 3 | `web/pages/index.tsx` | JS 版に置き換え |
| 4 | `web/pages/api/room/create.ts` | Express に移行 |
| 5 | `web/pages/api/room/join.ts` | Express に移行 |
| 6 | `web/pages/api/room/select-chair.ts` | Express に移行 |
| 7 | `web/pages/api/room/activate.ts` | Express に移行 |
| 8 | `web/pages/api/room/change-turn.ts` | Express に移行 |
| 9 | `web/hooks/useDialog.ts` | Hooks 不可 |
| 10 | `web/components/dialogs/notice/useNoticeDialog.ts` | Hooks 不可 |
| 11 | `web/features/room/hooks/useRoomActions.ts` | Hooks 不可 |
| 12 | `web/features/room/hooks/useRoomDialogs.ts` | Hooks 不可 |
| 13 | `web/features/room/hooks/useRoomEffect.ts` | Hooks 不可 |
| 14 | `web/features/room/hooks/useRoomPhaseHandlers.ts` | CommonJS 版に置き換え |
| 15 | `web/features/room/hooks/useRoomWatcher.ts` | Hooks 不可 |
| 16 | `web/features/room/hooks/usePlayerOperation.ts` | Hooks 不可 |
| 17 | `web/types/room.ts` | TypeScript 削除 |
| 18 | `web/features/room/types/dialog.ts` | TypeScript 削除 |
| 19 | `web/utils/toast/toastContext.ts` | 新 Context API 削除 |
| 20 | `web/utils/toast/useToast.ts` | Hooks 不可 |
| 21 | `web/tsconfig.json` | TypeScript 削除 |
| 22 | `web/.eslintrc.json` | ESLint 設定削除 |
| 23 | `web/libs/api.ts` | JS 版に置き換え |

### リネーム（TypeScript → JavaScript）+ 内容変更（57 ファイル）

| # | 変更前 | 変更後 | 主な変更パターン |
|---|---|---|---|
| 1 | `pages/_document.tsx` | `pages/_document.js` | `Html` → `html` タグ直書き、CSS `<link>` 追加 |
| 2 | `components/LoadingOverlay.tsx` | `components/LoadingOverlay.js` | TS → JS |
| 3 | `components/buttons/Button.tsx` | `components/buttons/Button.js` | TS → JS、分割代入除去 |
| 4 | `components/dialogs/InfoDialog.tsx` | `components/dialogs/InfoDialog.js` | `forwardRef` → `dialogRef` プロップ |
| 5 | `components/dialogs/notice/NoticeDailog.tsx` | `components/dialogs/notice/NoticeDailog.js` | TS → JS |
| 6 | `features/room/components/ActivateEffect.tsx` | `features/room/components/ActivateEffect.js` | `lucide-react` → インライン SVG |
| 7 | `features/room/components/Chair.tsx` | `features/room/components/Chair.js` | TS → JS、ES5 構文化 |
| 8 | `features/room/components/ChairContainer.tsx` | `features/room/components/ChairContainer.js` | TS → JS |
| 9 | `features/room/components/GameStatusContainer.tsx` | `features/room/components/GameStatusContainer.js` | TS → JS |
| 10 | `features/room/components/InstructionContainer.tsx` | `features/room/components/InstructionContainer.js` | TS → JS |
| 11 | `features/room/components/InstructionMessage.tsx` | `features/room/components/InstructionMessage.js` | TS → JS |
| 12 | `features/room/components/PlayerStatus.tsx` | `features/room/components/PlayerStatus.js` | `lucide-react` → インライン SVG |
| 13 | `features/room/components/PlayerStatusContainer.tsx` | `features/room/components/PlayerStatusContainer.js` | TS → JS |
| 14 | `features/room/components/RoomContainer.tsx` | `features/room/components/RoomContainer.js` | TS → JS |
| 15 | `features/room/components/RoundStatus.tsx` | `features/room/components/RoundStatus.js` | TS → JS |
| 16 | `features/room/components/dialogs/CreaterWaitingStartDialog.tsx` | `features/room/components/dialogs/CreaterWaitingStartDialog.js` | `react-tooltip` 削除、`lucide-react` → インライン SVG |
| 17 | `features/room/components/dialogs/GameResultDialog.tsx` | `features/room/components/dialogs/GameResultDialog.js` | `forwardRef` → `dialogRef`、`lucide-react` → インライン SVG |
| 18 | `features/room/components/dialogs/StartTurnDialog.tsx` | `features/room/components/dialogs/StartTurnDialog.js` | `forwardRef` → `dialogRef` |
| 19 | `features/room/components/dialogs/TurnResultDialog.tsx` | `features/room/components/dialogs/TurnResultDialog.js` | `forwardRef` → `dialogRef`、`lucide-react` → インライン SVG |
| 20 | `features/room/page/Room.tsx` | `features/room/page/Room.js` | Hooks → クラスコンポーネント（全パターン適用） |
| 21 | `features/top/components/TopMenu.tsx` | `features/top/components/TopMenu.js` | TS → JS |
| 22 | `features/top/components/TopOperations.tsx` | `features/top/components/TopOperations.js` | TS → JS |
| 23 | `features/top/components/TopTitle.tsx` | `features/top/components/TopTitle.js` | `lucide-react` → インライン SVG |
| 24 | `features/top/components/dialogs/JoinDialog.tsx` | `features/top/components/dialogs/JoinDialog.js` | `forwardRef` 依存の `InfoDialog` への `ref` → `dialogRef` |
| 25 | `features/top/page/Top.tsx` | `features/top/page/Top.js` | Hooks → クラスコンポーネント |
| 26 | `libs/firestore/config.ts` | `libs/firestore/config.js` | ESM → CommonJS |
| 27 | `libs/firestore/index.ts` | `libs/firestore/index.js` | ESM → CommonJS、型除去 |
| 28 | `libs/api.ts` | `libs/api.js` | ESM → CommonJS、型除去 |
| 29 | `utils/toast/ToastProvider.tsx` | `utils/toast/ToastProvider.js` | 新 Context → レガシー Context |
| 30 | `utils/toast/Toast.tsx` | `utils/toast/Toast.js` | `useContext` → `contextTypes` |
| 31 | `utils/room.ts` | `utils/room.js` | ESM → CommonJS、型除去 |

### 設定ファイル変更

| # | ファイル | 変更内容 |
|---|---|---|
| 1 | `web/package.json` | 依存パッケージ・スクリプト変更 |
| 2 | `web/package-lock.json` | 依存関係の再解決 |
| 3 | `web/next.config.js` | webpack 設定の大幅拡張 |
| 4 | `web/tailwind.config.js` | `content` パターンから `.tsx`/`.ts` を除外 |
| 5 | `CLAUDE.md` | プロジェクト説明の更新 |
