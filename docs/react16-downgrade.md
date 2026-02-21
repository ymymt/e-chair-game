# React 16 ダウングレード改修ドキュメント

## 1. 概要

学習目的で、React 17 / Next.js 12 の構成を React 16 / Next.js 10 にダウングレードした。
前回の React 18 → 17 が**アーキテクチャレベル**の大きな変更（App Router → Pages Router、Server Actions → API Routes 等）だったのに対し、今回は**JSX 変換方式とエコシステム互換性**が中心のより限定的な変更。

主な変更軸：
- **JSX 変換方式の違い**：React 17 の新しい JSX 変換（自動 import）が使えないため、全 JSX ファイルに `import React from "react"` を追加
- **Next.js Middleware の削除**：Next.js 10 には Middleware 機能が存在しない
- **`_document.tsx` のクラスコンポーネント化**：Next.js 10 では `Document` をクラスベースで定義する必要がある
- **パッケージの互換性対応**：nanoid v5（ESM-only）→ v3、TypeScript 5 → 4.3.5 等

このドキュメントでは、ダウングレードに伴い **何を・なぜ・どのように** 変更したかを記録する。

---

## 2. 依存パッケージの変更

`web/package.json` で以下のパッケージバージョンを変更した。

| パッケージ | 変更前（React 17 / Next.js 12） | 変更後（React 16 / Next.js 10） |
|---|---|---|
| `next` | `^12.3.4` | `^10.2.3` |
| `react` | `^17.0.2` | `^16.14.0` |
| `react-dom` | `^17.0.2` | `^16.14.0` |
| `nanoid` | `^5.0.9` | `^3.3.8` |
| `@types/node` | `^20` | `14.18.63` |
| `@types/react` | `^17` | `16.9.56` |
| `@types/react-dom` | `^17` | `16.9.14` |
| `eslint` | `^8` | `^7.32.0` |
| `eslint-config-next` | `^12.3.4` | `^10.2.3` |
| `typescript` | `^5` | `4.3.5` |

**dev スクリプトの変更：**

```diff
- "dev": "next dev",
- "build": "next build",
- "start": "next start",
+ "dev": "NODE_OPTIONS=--openssl-legacy-provider next dev",
+ "build": "NODE_OPTIONS=--openssl-legacy-provider next build",
+ "start": "NODE_OPTIONS=--openssl-legacy-provider next start",
```

`dev`・`build`・`start` の全スクリプトに `NODE_OPTIONS=--openssl-legacy-provider` を追加。Next.js 10 は古い OpenSSL API を使用しており、Node.js 17+ の新しい OpenSSL 3.0 と互換性がないため、レガシープロバイダーを有効にする必要がある。

---

## 3. 改修パターン一覧

### 3.1 JSX ファイルへの `import React from "react"` 追加（28 ファイル）

| 項目 | 内容 |
|---|---|
| **変更内容** | 全 JSX/TSX ファイルの先頭に `import React from "react"` を追加 |
| **変更理由** | React 17 で導入された新しい JSX 変換（`react/jsx-runtime` による自動 import）が React 16 にはない。React 16 では JSX を `React.createElement()` に変換するため、`React` がスコープ内に存在する必要がある |

#### React 17（変更前）

```tsx
export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1000]">
```

#### React 16（変更後）

```tsx
import React from "react";

export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1000]">
```

**対象ファイル一覧（28 ファイル）：**

| # | ファイル |
|---|---|
| 1 | `components/LoadingOverlay.tsx` |
| 2 | `components/buttons/Button.tsx` |
| 3 | `components/dialogs/InfoDialog.tsx` |
| 4 | `components/dialogs/notice/NoticeDailog.tsx` |
| 5 | `features/room/components/ActivateEffect.tsx` |
| 6 | `features/room/components/Chair.tsx` |
| 7 | `features/room/components/ChairContainer.tsx` |
| 8 | `features/room/components/GameStatusContainer.tsx` |
| 9 | `features/room/components/InstructionContainer.tsx` |
| 10 | `features/room/components/InstructionMessage.tsx` |
| 11 | `features/room/components/PlayerStatus.tsx` |
| 12 | `features/room/components/PlayerStatusContainer.tsx` |
| 13 | `features/room/components/RoomContainer.tsx` |
| 14 | `features/room/components/RoundStatus.tsx` |
| 15 | `features/room/components/dialogs/CreaterWaitingStartDialog.tsx` |
| 16 | `features/room/components/dialogs/GameResultDialog.tsx` |
| 17 | `features/room/components/dialogs/StartTurnDialog.tsx` |
| 18 | `features/room/components/dialogs/TurnResultDialog.tsx` |
| 19 | `features/room/page/Room.tsx` |
| 20 | `features/top/components/TopMenu.tsx` |
| 21 | `features/top/components/TopOperations.tsx` |
| 22 | `features/top/components/TopTitle.tsx` |
| 23 | `features/top/components/dialogs/JoinDialog.tsx` |
| 24 | `features/top/page/Top.tsx` |
| 25 | `pages/_app.tsx` |
| 26 | `pages/index.tsx` |
| 27 | `pages/room/[roomId].tsx` |
| 28 | `utils/toast/Toast.tsx` |

**ポイント:**

- これら 28 ファイルは `import React from "react"` の追加のみで、他のコード変更はなし
- `pages/_document.tsx` も `import React` が必要だが、クラスコンポーネント化（3.2）と合わせて変更
- `utils/toast/ToastProvider.tsx` は既に `import React` があったため対象外（ただし `ReactNode` の参照方法を変更、3.4 参照）

---

### 3.2 `_document.tsx` — 関数コンポーネント → クラスコンポーネント

| 項目 | 内容 |
|---|---|
| **変更元** | 関数コンポーネントとして定義された `Document` |
| **変更先** | `Document` クラスを継承したクラスコンポーネント |
| **変更理由** | Next.js 10 では `Document` をクラスベースで定義する必要がある。関数コンポーネントとしての `Document` エクスポートは Next.js 11 以降でサポートされた |
| **対象ファイル** | `pages/_document.tsx` |

#### React 17 / Next.js 12（変更前）

```tsx
import { Head, Html, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="ja">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body className="antialiased overscroll-none">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

#### React 16 / Next.js 10（変更後）

```tsx
import React from "react";
import Document, { Head, Html, Main, NextScript } from "next/document";

class MyDocument extends Document {
  render() {
    return (
      <Html lang="ja">
        <Head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap"
            rel="stylesheet"
          />
        </Head>
        <body className="antialiased overscroll-none">
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
```

**ポイント:**

- `export default function Document()` → `class MyDocument extends Document` + `render()` メソッド
- `Document` をデフォルトインポートに追加（`import Document, { Head, Html, Main, NextScript }`）
- JSX のために `import React from "react"` も追加
- レンダリング内容（HTML 構造・フォント読み込み）自体は変更なし

---

### 3.3 `middleware.ts` の削除

| 項目 | 内容 |
|---|---|
| **変更内容** | `web/middleware.ts` の完全削除 |
| **変更理由** | Next.js Middleware は Next.js 12 で導入された機能であり、Next.js 10 には存在しない |
| **対象ファイル** | `middleware.ts`（削除） |

認証ロジックは既に `getServerSideProps`（`pages/room/[roomId].tsx`）に実装済み（前回の React 17 ダウングレード時に移行）のため、middleware の削除のみで対応完了。

#### 削除されたコード — `middleware.ts`

```tsx
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const userId = request.cookies.get("userId") as string | undefined;
  const roomId = request.cookies.get("roomId") as string | undefined;
  const pathRoomId = request.nextUrl.pathname.split("/").pop();

  if (!userId || !roomId || roomId !== pathRoomId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/room/:roomId"],
};
```

**ポイント:**

- middleware が行っていた Cookie ベースの認証チェック（`userId`・`roomId` の存在確認、パス内の `roomId` との一致確認）は `getServerSideProps` 内で同等の処理が行われている
- Next.js 10 にダウングレードしたことで、middleware のランタイム自体が存在しなくなった

---

### 3.4 `ReactNode` → `React.ReactNode`（型参照の変更）

| 項目 | 内容 |
|---|---|
| **変更元** | `import { ReactNode } from "react"` で直接インポート |
| **変更先** | `React.ReactNode` として名前空間経由で参照 |
| **変更理由** | React 16 の型定義（`@types/react@16.9.56`）では `ReactNode` の直接インポートが一部文脈で問題になる |
| **対象ファイル** | `utils/toast/ToastProvider.tsx` |

#### React 17（変更前）

```tsx
import React, { ReactNode, useState } from "react";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | ReactNode>("");

  const open = (message: string | ReactNode, milliseconds: number = 3000) => {
```

#### React 16（変更後）

```tsx
import React, { useState } from "react";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | React.ReactNode>("");

  const open = (
    message: string | React.ReactNode,
    milliseconds: number = 3000
  ) => {
```

**ポイント:**

- `ReactNode` を名前付きインポートから削除し、代わりに `React.ReactNode` として参照
- `children` の型は元から `React.ReactNode` だったため変更なし
- `message` の型と `open` 関数の引数型で `ReactNode` → `React.ReactNode` に変更

---

### 3.5 `tsconfig.json` — `baseUrl: "."` 追加

| 項目 | 内容 |
|---|---|
| **変更内容** | `compilerOptions` に `"baseUrl": "."` を追加 |
| **変更理由** | TypeScript 4.3.5 + Next.js 10 環境でパスエイリアス（`@/`）を正しく解決するために必要 |
| **対象ファイル** | `tsconfig.json` |

#### diff

```diff
     "module": "esnext",
     "moduleResolution": "node",
+    "baseUrl": ".",
     "resolveJsonModule": true,
```

**ポイント:**

- `tsconfig.json` には既に `"paths": { "@/*": ["./*"] }` が定義されていたが、`baseUrl` がないと TypeScript 4.x ではパスエイリアスが解決できない
- TypeScript 5.x では `baseUrl` なしでも `paths` が機能するケースがあったが、4.x では明示的に指定が必要

---

### 3.6 明示的な戻り値型の追加

| 項目 | 内容 |
|---|---|
| **変更内容** | `createRoomId` 関数に `Promise<string>` 戻り値型を追加 |
| **変更理由** | TypeScript 4.3.5 では一部の型推論が TypeScript 5.x と異なり、明示的な型注釈が必要になるケースがある |
| **対象ファイル** | `libs/firestore/index.ts` |

#### React 17（変更前）

```tsx
const createRoomId = async () => {
  const db = await getFirestoreApp();
  const alphanumeric = "23456789abcdefghjklmnpqrstuvwxyz";
  const newId = customAlphabet(alphanumeric, 7)();
```

#### React 16（変更後）

```tsx
const createRoomId = async (): Promise<string> => {
  const db = await getFirestoreApp();
  const alphanumeric = "23456789abcdefghjklmnpqrstuvwxyz";
  const newId = customAlphabet(alphanumeric, 7)();
```

**ポイント:**

- `async () =>` → `async (): Promise<string> =>` の変更のみ
- TypeScript 4.3.5 では `nanoid` v3 の `customAlphabet` の戻り値型推論が不十分で、コンパイルエラーになる場合がある

---

### 3.7 `nanoid` v5 → v3

| 項目 | 内容 |
|---|---|
| **変更元** | `nanoid` `^5.0.9` |
| **変更先** | `nanoid` `^3.3.8` |
| **変更理由** | nanoid v5 は ESM-only パッケージであり、Next.js 10 の CommonJS 環境と互換性がない |

**ポイント:**

- nanoid v5 は `"type": "module"` を使用する ESM-only パッケージ
- Next.js 10 は CommonJS ベースのビルドシステムのため、ESM-only パッケージを直接 `require()` できない
- nanoid v3 は CommonJS / ESM 両方をサポートしており、Next.js 10 環境で問題なく動作する
- API（`customAlphabet` 関数）は v3 と v5 で互換性があり、コード変更は不要

---

### 3.8 `NODE_OPTIONS=--openssl-legacy-provider`

| 項目 | 内容 |
|---|---|
| **変更内容** | `dev`・`build`・`start` スクリプトに `NODE_OPTIONS=--openssl-legacy-provider` を追加 |
| **変更理由** | Next.js 10 は古い OpenSSL API（MD4 ハッシュ等）を使用しており、Node.js 17+ で導入された OpenSSL 3.0 と互換性がない |

```json
{
  "dev": "NODE_OPTIONS=--openssl-legacy-provider next dev",
  "build": "NODE_OPTIONS=--openssl-legacy-provider next build",
  "start": "NODE_OPTIONS=--openssl-legacy-provider next start"
}
```

**ポイント:**

- Node.js 17 以降、デフォルトで OpenSSL 3.0 が使われるようになり、古い暗号化アルゴリズム（MD4 等）が無効化された
- Next.js 10 内部の webpack 4 は MD4 ハッシュをモジュール ID の生成に使用しているため、`--openssl-legacy-provider` で旧 API を有効にする必要がある
- 前回の React 17 / Next.js 12 では不要だった（Next.js 12 は webpack 5 を使用し、MD4 に依存しない）

---

## 4. 変更ファイル一覧

| # | ファイル | 変更内容 |
|---|---|---|
| 1 | `web/package.json` | React 16 / Next.js 10 へバージョンダウン、nanoid v3、`--openssl-legacy-provider` 追加 |
| 2 | `web/package-lock.json` | 依存関係の再解決 |
| 3 | `web/pages/_document.tsx` | 関数コンポーネント → クラスコンポーネント、`import React` 追加 |
| 4 | `web/middleware.ts` | **削除**（Next.js 10 に Middleware 機能が存在しない） |
| 5 | `web/utils/toast/ToastProvider.tsx` | `ReactNode` → `React.ReactNode` に変更 |
| 6 | `web/libs/firestore/index.ts` | `createRoomId` に `Promise<string>` 戻り値型を追加 |
| 7 | `web/tsconfig.json` | `baseUrl: "."` を追加 |
| 8 | `web/components/LoadingOverlay.tsx` | `import React` 追加 |
| 9 | `web/components/buttons/Button.tsx` | `import React` 追加 |
| 10 | `web/components/dialogs/InfoDialog.tsx` | `import React` 追加 |
| 11 | `web/components/dialogs/notice/NoticeDailog.tsx` | `import React` 追加 |
| 12 | `web/features/room/components/ActivateEffect.tsx` | `import React` 追加 |
| 13 | `web/features/room/components/Chair.tsx` | `import React` 追加 |
| 14 | `web/features/room/components/ChairContainer.tsx` | `import React` 追加 |
| 15 | `web/features/room/components/GameStatusContainer.tsx` | `import React` 追加 |
| 16 | `web/features/room/components/InstructionContainer.tsx` | `import React` 追加 |
| 17 | `web/features/room/components/InstructionMessage.tsx` | `import React` 追加 |
| 18 | `web/features/room/components/PlayerStatus.tsx` | `import React` 追加 |
| 19 | `web/features/room/components/PlayerStatusContainer.tsx` | `import React` 追加 |
| 20 | `web/features/room/components/RoomContainer.tsx` | `import React` 追加 |
| 21 | `web/features/room/components/RoundStatus.tsx` | `import React` 追加 |
| 22 | `web/features/room/components/dialogs/CreaterWaitingStartDialog.tsx` | `import React` 追加 |
| 23 | `web/features/room/components/dialogs/GameResultDialog.tsx` | `import React` 追加 |
| 24 | `web/features/room/components/dialogs/StartTurnDialog.tsx` | `import React` 追加 |
| 25 | `web/features/room/components/dialogs/TurnResultDialog.tsx` | `import React` 追加 |
| 26 | `web/features/room/page/Room.tsx` | `import React` 追加 |
| 27 | `web/features/top/components/TopMenu.tsx` | `import React` 追加 |
| 28 | `web/features/top/components/TopOperations.tsx` | `import React` 追加 |
| 29 | `web/features/top/components/TopTitle.tsx` | `import React` 追加 |
| 30 | `web/features/top/components/dialogs/JoinDialog.tsx` | `import React` 追加 |
| 31 | `web/features/top/page/Top.tsx` | `import React` 追加 |
| 32 | `web/pages/_app.tsx` | `import React` 追加 |
| 33 | `web/pages/index.tsx` | `import React` 追加 |
| 34 | `web/pages/room/[roomId].tsx` | `import React` 追加 |
| 35 | `web/utils/toast/Toast.tsx` | `import React` 追加 |
