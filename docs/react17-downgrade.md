# React 17 ダウングレード改修ドキュメント

## 1. 概要

学習目的で、React 18 / Next.js 15 の構成を React 17 / Next.js 12 にダウングレードした。
前回の React 19 → 18 が React API レベルの変更（`useActionState`、`ref` as prop 等）だったのに対し、今回は**アーキテクチャレベル**の大きな変更を伴う。

主な変更軸：
- **App Router → Pages Router**：ルーティングの仕組み自体が変わる
- **Server Actions → API Routes + クライアント API 層**：サーバーサイドロジックの呼び出し方が根本的に変わる
- **Server Components → getServerSideProps**：サーバーサイドデータ取得の手法が変わる
- **TS/ESM 設定ファイル → JS/CommonJS**：Next.js 12 は ESM 設定ファイルを標準サポートしない

このドキュメントでは、ダウングレードに伴い **何を・なぜ・どのように** 変更したかを記録する。

---

## 2. 依存パッケージの変更

`web/package.json` で以下のパッケージバージョンを変更した。

| パッケージ | 変更前（React 18 / Next.js 15） | 変更後（React 17 / Next.js 12） |
|---|---|---|
| `next` | `^15.3.3` | `^12.3.4` |
| `react` | `^18.3.1` | `^17.0.2` |
| `react-dom` | `^18.3.1` | `^17.0.2` |
| `@types/react` | `^18` | `^17` |
| `@types/react-dom` | `^18` | `^17` |
| `eslint` | `^9` | `^8` |
| `eslint-config-next` | `^15.3.3` | `^12.3.4` |
| `react-tooltip` | `^5.28.0` | `^4.5.1` |
| `lucide-react` | `^0.469.0` | `^0.263.1` |

**新規追加：**

| パッケージ | バージョン | 用途 |
|---|---|---|
| `cookie` | `^0.6.0` | API Routes での Cookie シリアライズ |
| `@types/cookie` | `^0.6.0` | `cookie` パッケージの型定義 |

**削除：**

| パッケージ | 理由 |
|---|---|
| `@eslint/eslintrc` | ESLint Flat Config（v9）用。ESLint v8 では不要 |

**dev スクリプトの変更：**

```diff
- "dev": "next dev --turbopack",
+ "dev": "next dev",
```

Next.js 12 には Turbopack が存在しないため、`--turbopack` フラグを削除。

---

## 3. 改修パターン一覧

### 3.1 App Router → Pages Router

| 項目 | 内容 |
|---|---|
| **変更元** | `app/layout.tsx`（App Router のルートレイアウト） |
| **変更先** | `pages/_app.tsx` + `pages/_document.tsx`（Pages Router の共通レイアウト） |
| **変更理由** | Next.js 12 には App Router が存在せず、Pages Router を使用する必要がある |
| **対象ファイル** | `app/layout.tsx`（削除）, `pages/_app.tsx`（新規）, `pages/_document.tsx`（新規） |

#### React 18 / Next.js 15（変更前） — `app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/utils/toast/ToastProvider";
import { Toast } from "@/utils/toast/Toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "電気椅子ゲーム",
  description: "座ったりビリッとしたり",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased overscroll-none`}>
        <ToastProvider>
          <div className="w-full grid place-items-center bg-gray-900">
            <div className="w-full max-w-screen-md">{children}</div>
            <Toast />
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
```

#### React 17 / Next.js 12（変更後） — `pages/_app.tsx`

```tsx
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

#### React 17 / Next.js 12（変更後） — `pages/_document.tsx`

```tsx
import { Head, Html, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="ja">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
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

**ポイント:**

- `app/layout.tsx` の役割を `_app.tsx`（共通レイアウト・Provider）と `_document.tsx`（HTML 構造・`<head>`）に分割
- `next/font/google` は Next.js 12 にないため、Google Fonts の `<link>` タグで代替
- `export const metadata` は App Router 専用 API のため削除。`<title>` 等は `_document.tsx` の `<Head>` で設定可能
- CSS のインポートパスを `./globals.css` → `@/styles/globals.css` に変更

---

### 3.2 Server Components → getServerSideProps

| 項目 | 内容 |
|---|---|
| **変更元** | `app/room/[roomId]/page.tsx`（async Server Component） |
| **変更先** | `pages/room/[roomId].tsx`（`getServerSideProps` でデータ取得） |
| **変更理由** | Next.js 12 には Server Components が存在せず、サーバーサイドデータ取得には `getServerSideProps` を使う |
| **対象ファイル** | `app/room/[roomId]/page.tsx`（削除）, `pages/room/[roomId].tsx`（新規） |

#### React 18 / Next.js 15（変更前） — `app/room/[roomId]/page.tsx`

```tsx
import Room from "@/features/room/page/Room";
import { redirect } from "next/navigation";
import { getRoomContextFromCookie } from "@/libs/room";
import { entryRoomAction } from "@/features/room/action";

export default async function RoomPage() {
  try {
    const { userId, roomId } = await getRoomContextFromCookie();
    const { status, room, error } = await entryRoomAction({ roomId, userId });
    if (status !== 200 || !room) {
      throw new Error(error);
    }
    return <Room initialData={{ room, userId, roomId }} />;
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
      redirect("/");
    }
  }
}
```

#### React 17 / Next.js 12（変更後） — `pages/room/[roomId].tsx`

```tsx
import type { GetServerSideProps, GetServerSidePropsContext } from "next";
import Room from "@/features/room/page/Room";
import { getRoom, updateRoom } from "@/libs/firestore";
import { isSuccessfulGetRoomResponse } from "@/utils/room";
import type { GameRoom } from "@/types/room";

type RoomPageProps = {
  initialData: {
    room: GameRoom;
    userId: string;
    roomId: string;
  };
};

export default function RoomPage({ initialData }: RoomPageProps) {
  return <Room initialData={initialData} />;
}

export const getServerSideProps: GetServerSideProps<RoomPageProps> = async (
  context: GetServerSidePropsContext
) => {
  const userId = context.req.cookies.userId;
  const roomId = context.req.cookies.roomId;
  const pathRoomId = context.params?.roomId;

  if (!userId || !roomId || !pathRoomId || typeof pathRoomId !== "string" || pathRoomId !== roomId) {
    return { redirect: { destination: "/", permanent: false } };
  }

  const room = await getRoom(roomId);
  if (!isSuccessfulGetRoomResponse(room)) {
    return { redirect: { destination: "/", permanent: false } };
  }

  // ...（プレイヤーの ready フラグ更新ロジック）

  return {
    props: {
      initialData: { room: updateRes.data as GameRoom, userId, roomId },
    },
  };
};
```

**ポイント:**

- `async function RoomPage()` → 通常の関数コンポーネント + `getServerSideProps` に分離
- Cookie の取得: `cookies()` (next/headers) → `context.req.cookies`（Node.js の Request オブジェクト経由）
- エラー時のリダイレクト: `redirect("/")` → `return { redirect: { destination: "/", permanent: false } }`
- Server Action（`entryRoomAction`）を直接呼ぶ代わりに、`getServerSideProps` 内で Firestore 操作を直接実行
- `libs/room.ts`（`getRoomContextFromCookie`）は不要になったため削除

---

### 3.3 Server Actions → API Routes + クライアント API 層

| 項目 | 内容 |
|---|---|
| **変更元** | `features/room/action.ts`（`"use server"` ディレクティブ付きの Server Actions） |
| **変更先** | `pages/api/room/*.ts`（API Routes）+ `libs/api.ts`（クライアント API 層） |
| **変更理由** | Next.js 12 には Server Actions が存在しない。サーバーサイドロジックは API Routes として公開し、クライアントから `fetch` で呼び出す |
| **対象ファイル** | `features/room/action.ts`（削除）, `pages/api/room/create.ts`（新規）, `pages/api/room/join.ts`（新規）, `pages/api/room/select-chair.ts`（新規）, `pages/api/room/activate.ts`（新規）, `pages/api/room/change-turn.ts`（新規）, `libs/api.ts`（新規） |

#### React 18 / Next.js 15（変更前） — `features/room/action.ts`（抜粋：createRoomAction）

```tsx
"use server";

import { createRoom } from "@/libs/firestore";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function createRoomAction() {
  const res = await createRoom();
  if (res.status !== 200) {
    return { error: res.error };
  }

  await setCookies([
    { name: "roomId", value: res.roomId as string },
    { name: "userId", value: res.userId as string },
  ]);

  return redirect(`/room/${res.roomId}`);
}
```

#### React 17 / Next.js 12（変更後） — `pages/api/room/create.ts`

```tsx
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
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    }),
    serialize("userId", result.userId as string, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    }),
  ]);

  res.status(200).json({ roomId: result.roomId, userId: result.userId });
}
```

#### React 17 / Next.js 12（変更後） — `libs/api.ts`（クライアント API 層）

```tsx
import type { Round } from "@/types/room";

async function postJson<TResponse>(
  url: string,
  body?: Record<string, unknown>
): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await response.json()) as TResponse;
  return data;
}

export async function createRoomApi() { return postJson("/api/room/create"); }
export async function joinRoomApi(roomId: string) { return postJson("/api/room/join", { roomId }); }
export async function selectChairApi(data: { roomId: string | null; roundData: Round | undefined }) {
  return postJson("/api/room/select-chair", data);
}
export async function activateApi(roomId: string) { return postJson("/api/room/activate", { roomId }); }
export async function changeTurnApi(data: { roomId: string; userId: string }) {
  return postJson("/api/room/change-turn", data);
}
```

**ポイント:**

- 1 つの `action.ts` が **5 つの API Route** + **1 つのクライアント API 層** に分解される
- Server Action の `bind()` パターンは不要になり、リクエストボディで直接データを送る
- リダイレクトの主体がサーバー → クライアントに移動（API Route はデータを返し、クライアントが `router.push()` する）
- API Routes では `req.method` チェックによるメソッド制限を追加

---

### 3.4 Cookie 操作

| 項目 | 内容 |
|---|---|
| **変更元** | `cookies()` (next/headers) で Cookie を読み書き |
| **変更先** | `serialize()` (cookie パッケージ) で Set-Cookie ヘッダーを生成 |
| **変更理由** | `next/headers` の `cookies()` は App Router / Server Actions 専用 API であり、Pages Router では使用できない |
| **対象ファイル** | `features/room/action.ts`（削除）, `pages/api/room/create.ts`（新規）, `pages/api/room/join.ts`（新規） |

#### React 18 / Next.js 15（変更前）

```tsx
import { cookies } from "next/headers";

const setCookies = async (nameValues: Array<{ name: string; value: string }>) => {
  const cookieStore = await cookies();
  nameValues.forEach(({ name, value }) => {
    cookieStore.set({
      name,
      value: value || "",
      sameSite: "strict",
      secure: true,
      httpOnly: true,
    });
  });
};
```

#### React 17 / Next.js 12（変更後）

```tsx
import { serialize } from "cookie";

res.setHeader("Set-Cookie", [
  serialize("roomId", result.roomId as string, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  }),
  serialize("userId", result.userId as string, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  }),
]);
```

**ポイント:**

- `cookie` パッケージの `serialize()` を使い、Set-Cookie ヘッダー文字列を生成
- `res.setHeader("Set-Cookie", [...])` で複数 Cookie を一括設定
- `secure` オプションを `true` 固定 → `process.env.NODE_ENV === "production"` に変更（開発環境は HTTP のため）
- `path: "/"` を明示的に指定

---

### 3.5 クライアントサイドルーティング

| 項目 | 内容 |
|---|---|
| **変更元** | `next/navigation` の `useRouter` |
| **変更先** | `next/router` の `useRouter` |
| **変更理由** | `next/navigation` は App Router 用。Pages Router では `next/router` を使用する |
| **対象ファイル** | `Top.tsx`, `Room.tsx` |

#### React 18 / Next.js 15（変更前）

```tsx
import { useRouter } from "next/navigation";
```

#### React 17 / Next.js 12（変更後）

```tsx
import { useRouter } from "next/router";
```

**ポイント:**

- インポートパスの変更のみで、`router.push()` 等の使い方は同一
- ただし `Top.tsx` では Server Action が `redirect()` を内部で呼んでいたため `router.push()` が不要だったが、API Routes 化に伴いクライアント側で明示的に `router.push()` を呼ぶようになった

```tsx
// 変更前: createRoomAction() 内で redirect() が呼ばれていた
const result = await createRoomAction();

// 変更後: API からデータを受け取り、クライアント側で遷移
const result = await createRoomApi();
if (result.roomId) {
  router.push(`/room/${result.roomId}`);
}
```

---

### 3.6 ディレクティブ削除

| 項目 | 内容 |
|---|---|
| **変更内容** | `"use client"` / `"use server"` ディレクティブの削除 |
| **変更理由** | これらは App Router 固有のディレクティブ。Pages Router ではすべてのコンポーネントがクライアントコンポーネントとして扱われるため不要 |
| **対象ファイル** | `Room.tsx`, `Top.tsx`, `libs/firestore/index.ts`, `utils/toast/Toast.tsx`, `utils/toast/ToastProvider.tsx`, `utils/toast/toastContext.ts` |

#### React 18 / Next.js 15（変更前）

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
```

#### React 17 / Next.js 12（変更後）

```tsx
import { useEffect, useRef, useState } from "react";
```

**ポイント:**

- `"use client"` を削除するだけの単純な変更
- `"use server"` は `features/room/action.ts` にあったが、ファイルごと削除（API Routes に移行）

---

### 3.7 react-tooltip v5 → v4

| 項目 | 内容 |
|---|---|
| **変更元** | react-tooltip v5 の命令的 ref API（`tooltipRef.current.open()`） |
| **変更先** | react-tooltip v4 の宣言的 data 属性 API（`data-tip`, `data-for`） |
| **変更理由** | react-tooltip v5 は React 18+ を要求する。React 17 では v4 を使用する必要がある |
| **対象ファイル** | `CreaterWaitingStartDialog.tsx`, `useRoomActions.ts`, `Room.tsx` |

#### React 18 / Next.js 15（変更前） — `CreaterWaitingStartDialog.tsx`

```tsx
import { Tooltip, TooltipRefProps } from "react-tooltip";

type CreaterWaitingStartDialogProps = {
  roomId: string;
  dialogRef: Ref<HTMLDialogElement>;
  tooltipRef: Ref<TooltipRefProps>;
  copyId: () => void;
};

// JSX 内
<Tooltip ref={tooltipRef} style={{ fontSize: "16px" }} />
<a id="id-tooltip" className="cursor-pointer" onClick={copyId}>
  <Copy className="text-red-800" />
</a>
```

#### React 17 / Next.js 12（変更後） — `CreaterWaitingStartDialog.tsx`

```tsx
import ReactTooltip from "react-tooltip";

type CreaterWaitingStartDialogProps = {
  roomId: string;
  dialogRef: Ref<HTMLDialogElement>;
  copyMessage: string;
  copyId: () => Promise<void>;
};

// JSX 内
<ReactTooltip id="copy-tooltip" effect="solid" />
<button
  type="button"
  data-tip={copyMessage}
  data-for="copy-tooltip"
  className="cursor-pointer"
  onClick={copyId}
>
  <Copy className="text-red-800" />
</button>
```

#### React 18 / Next.js 15（変更前） — `useRoomActions.ts`

```tsx
tooltipRef?.current?.open({
  anchorSelect: "#id-tooltip",
  content: "IDをコピーしました",
});
```

#### React 17 / Next.js 12（変更後） — `useRoomActions.ts`

```tsx
const [copyTooltip, setCopyTooltip] = useState("クリックしてコピー");
setCopyTooltip("IDをコピーしました");
```

**ポイント:**

- v5 の `Tooltip` コンポーネント → v4 の `ReactTooltip`（デフォルトエクスポート）
- v5 の命令的 ref API → v4 の宣言的 `data-tip` / `data-for` 属性
- `tooltipRef` prop の廃止。代わりに `copyMessage` (string) を props で渡す
- `useRoomActions` から `tooltipRef` 依存を除去し、`useState` でメッセージを管理
- `<a>` タグ → `<button>` タグに変更（アクセシビリティ改善）

---

### 3.8 lucide-react アイコン変更

| 項目 | 内容 |
|---|---|
| **変更元** | `Bolt` アイコン |
| **変更先** | `Zap` アイコン |
| **変更理由** | lucide-react v0.263 には `Bolt` アイコンが存在しない。同等の雷アイコンとして `Zap` を使用 |
| **対象ファイル** | `TopTitle.tsx` |

#### React 18 / Next.js 15（変更前）

```tsx
import { Bolt } from "lucide-react";

<Bolt className="animate-pulse" />
```

#### React 17 / Next.js 12（変更後）

```tsx
import { Zap } from "lucide-react";

<Zap className="animate-pulse" />
```

**ポイント:**

- lucide-react のバージョン差異により利用可能なアイコン名が異なる
- `Bolt` と `Zap` は見た目がほぼ同じ雷アイコン

---

## 4. Middleware の変更

| 項目 | 内容 |
|---|---|
| **変更元** | `request.cookies.get("key")?.value`（Next.js 15 の Cookie API） |
| **変更先** | `request.cookies.get("key")`（Next.js 12 の Cookie API、文字列を直接返す） |
| **変更理由** | Next.js 15 と 12 で Middleware の Cookie API の戻り値型が異なる。また Next.js 12 では `NextResponse.next()` の明示的な return が必要 |
| **対象ファイル** | `web/middleware.ts` |

#### React 18 / Next.js 15（変更前）

```tsx
const userId = request.cookies.get("userId")?.value as string;
const roomId = request.cookies.get("roomId")?.value as string;
```

#### React 17 / Next.js 12（変更後）

```tsx
const userId = request.cookies.get("userId") as string | undefined;
const roomId = request.cookies.get("roomId") as string | undefined;
```

**ポイント:**

- Next.js 15 の `cookies.get()` は `{ name, value }` オブジェクトを返すため `.value` でアクセスしていた
- Next.js 12 の `cookies.get()` は文字列を直接返すため `.value` は不要
- 関数末尾に `return NextResponse.next()` を明示的に追加（Next.js 12 では暗黙の通過がないため）

---

## 5. 設定ファイルの変更

### 5.1 TS/ESM → JS/CommonJS

Next.js 12 は設定ファイルの ESM (`export default`) や TypeScript (`.ts`) を標準サポートしないため、CommonJS (`.js` + `module.exports`) に変換。

| 変更前 | 変更後 |
|---|---|
| `next.config.ts` | `next.config.js` |
| `tailwind.config.ts` | `tailwind.config.js` |
| `postcss.config.mjs` | `postcss.config.js` |
| `eslint.config.mjs` | `.eslintrc.json` |

#### next.config

```js
// 変更前: next.config.ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {};
export default nextConfig;

// 変更後: next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true };
module.exports = nextConfig;
```

#### tailwind.config

```js
// 変更前: tailwind.config.ts
import type { Config } from "tailwindcss";
export default { /* ... */ } satisfies Config;

// 変更後: tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = { /* ... */ };
```

また、`tailwind.config.js` の `content` から `"./app/**/*.{js,ts,jsx,tsx,mdx}"` を削除（`app/` ディレクトリがなくなったため）。

#### ESLint 設定

```js
// 変更前: eslint.config.mjs（Flat Config 形式）
import { FlatCompat } from "@eslint/eslintrc";
const eslintConfig = [...compat.extends("next/core-web-vitals", "next/typescript")];
export default eslintConfig;

// 変更後: .eslintrc.json（従来形式）
{ "extends": ["next/core-web-vitals"] }
```

**ポイント:**

- `import`/`export default` → `module.exports` に統一
- 型安全性は JSDoc の `@type` アノテーション（`/** @type {import('next').NextConfig} */`）で補う
- ESLint は Flat Config (v9) → 従来の `.eslintrc.json` 形式に変更。`@eslint/eslintrc` パッケージも不要になったため削除

---

### 5.2 tsconfig.json

| 設定 | 変更前 | 変更後 |
|---|---|---|
| `moduleResolution` | `"bundler"` | `"node"` |
| `plugins` | `[{ "name": "next" }]` | 削除 |
| `forceConsistentCasingInFileNames` | なし | `true` |
| `include` | `"next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"` | `"**/*.ts", "**/*.tsx", "next-env.d.ts"` |
| `exclude` | `["node_modules"]` | `["node_modules", ".next"]` |

**ポイント:**

- `moduleResolution: "bundler"` は TypeScript 5.x + 新しいバンドラー向け。Next.js 12 では `"node"` を使用
- `plugins: [{ "name": "next" }]` は Next.js 15+ の TypeScript プラグイン。Next.js 12 には不要
- `.next/types/**/*.ts`, `.next/dev/types/**/*.ts` は Next.js 15 が自動生成する型定義。Next.js 12 では生成されないため `include` から削除

---

## 6. その他の変更

### 6.1 globals.css の移動

```
app/globals.css → styles/globals.css
```

App Router では `app/` 配下に置いていた CSS を、Pages Router の慣習に従い `styles/` ディレクトリに移動。
また、`font-family` に `"Geist"` を追加（`next/font/google` が使えなくなったため、CSS で直接指定）。

```diff
- font-family: Arial, Helvetica, sans-serif;
+ font-family: "Geist", Arial, Helvetica, sans-serif;
```

### 6.2 favicon.ico の削除

`app/favicon.ico` を削除。App Router では `app/` 配下に置くだけで自動的に認識されたが、Pages Router では `public/` 配下に配置する方式のため。

### 6.3 libs/room.ts の削除

`cookies()` (next/headers) を使って Cookie を読み取る `getRoomContextFromCookie` 関数は、`getServerSideProps` の `context.req.cookies` に代替されたため削除。

### 6.4 ページファイルの移動

```
app/page.tsx → pages/index.tsx
```

内容に変更なし。ファイルの配置を App Router → Pages Router に合わせただけ。

---

## 7. 変更ファイル一覧

| # | ファイル | 変更内容 |
|---|---|---|
| 1 | `CLAUDE.md` | 技術スタック表記更新（React 19 → 18, Next.js 16 → 15） |
| 2 | `web/package.json` | React 17 / Next.js 12 へバージョンダウン、cookie パッケージ追加 |
| 3 | `web/package-lock.json` | 依存関係の再解決 |
| 4 | `web/app/layout.tsx` | **削除** → `pages/_app.tsx` + `pages/_document.tsx` に分割 |
| 5 | `web/app/room/[roomId]/page.tsx` | **削除** → `pages/room/[roomId].tsx` に移行 |
| 6 | `web/app/page.tsx` | **移動** → `pages/index.tsx` |
| 7 | `web/app/globals.css` | **移動** → `styles/globals.css`、font-family 変更 |
| 8 | `web/app/favicon.ico` | **削除** |
| 9 | `web/features/room/action.ts` | **削除** → API Routes + libs/api.ts に分解 |
| 10 | `web/libs/room.ts` | **削除**（getServerSideProps に代替） |
| 11 | `web/pages/_app.tsx` | **新規** — 共通レイアウト・Provider |
| 12 | `web/pages/_document.tsx` | **新規** — HTML 構造・フォント読み込み |
| 13 | `web/pages/index.tsx` | **移動**（app/page.tsx から、内容変更なし） |
| 14 | `web/pages/room/[roomId].tsx` | **新規** — getServerSideProps でデータ取得 |
| 15 | `web/pages/api/room/create.ts` | **新規** — ルーム作成 API Route |
| 16 | `web/pages/api/room/join.ts` | **新規** — ルーム参加 API Route |
| 17 | `web/pages/api/room/select-chair.ts` | **新規** — 椅子選択 API Route |
| 18 | `web/pages/api/room/activate.ts` | **新規** — 感電判定 API Route |
| 19 | `web/pages/api/room/change-turn.ts` | **新規** — ターン進行 API Route |
| 20 | `web/libs/api.ts` | **新規** — クライアント API 層（fetch ラッパー） |
| 21 | `web/features/top/page/Top.tsx` | `"use client"` 削除、Server Action → API 呼び出し、`next/router` に変更 |
| 22 | `web/features/room/page/Room.tsx` | `"use client"` 削除、`next/router` に変更、tooltipRef 削除 |
| 23 | `web/features/room/hooks/useRoomActions.ts` | Server Action → API 呼び出し、tooltipRef → useState に変更 |
| 24 | `web/features/room/components/dialogs/CreaterWaitingStartDialog.tsx` | react-tooltip v5 → v4（命令的 API → 宣言的 data 属性） |
| 25 | `web/features/top/components/TopTitle.tsx` | `Bolt` → `Zap`（lucide-react バージョン差異） |
| 26 | `web/libs/firestore/index.ts` | `"use server"` ディレクティブ削除 |
| 27 | `web/utils/toast/Toast.tsx` | `"use client"` ディレクティブ削除 |
| 28 | `web/utils/toast/ToastProvider.tsx` | `"use client"` ディレクティブ削除 |
| 29 | `web/utils/toast/toastContext.ts` | `"use client"` ディレクティブ削除 |
| 30 | `web/middleware.ts` | Cookie API 変更（`.get().value` → `.get()`）、`NextResponse.next()` 追加 |
| 31 | `web/next.config.ts` → `web/next.config.js` | TS/ESM → JS/CommonJS |
| 32 | `web/tailwind.config.ts` → `web/tailwind.config.js` | TS/ESM → JS/CommonJS、`app/` パス削除 |
| 33 | `web/postcss.config.mjs` → `web/postcss.config.js` | ESM → CommonJS |
| 34 | `web/eslint.config.mjs` → `web/.eslintrc.json` | Flat Config → 従来形式 |
| 35 | `web/tsconfig.json` | `moduleResolution`, `plugins`, `include`/`exclude` 等の変更 |
