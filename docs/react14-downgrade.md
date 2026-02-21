# React 0.14 ダウングレード改修ドキュメント

## 1. 概要

学習目的で、React 15 / Next.js 3 の構成を React 0.14（Next.js 完全除去）にダウングレードした。
前回（React 16 → 15）がアーキテクチャ・言語・ランタイム全般にわたる大規模な書き換えだったのに対し、今回は **Next.js の完全除去と Express + webpack による CSR 化** が中心の改修となった。

17 ファイル変更、+1,124 / -2,147 行。

主な変更軸：
- **Next.js 除去 → Express + webpack CSR**：Next.js を完全に削除し、Express で静的ファイル配信 + webpack でクライアントバンドルを生成する構成に移行
- **SSR → CSR**：`getInitialProps`（サーバーサイドデータ取得）を廃止し、クライアントサイドで `fetch` によるデータ取得に変更
- **Next.js Router → `window.location.href`**：`Router.push()` を通常のページ遷移に置き換え
- **`return null` → `<noscript />`**：React 0.14 の関数コンポーネントは `null` を返せないため `<noscript />` で代替
- **`const`/アロー関数 → `var`/`function`**：server.js 内の構文を ES5 互換に統一
- **`.babelrc` の変更**：`next/babel` プリセット → `env` + `react` プリセット

このドキュメントでは、ダウングレードに伴い **何を・なぜ・どのように** 変更したかを記録する。

---

## 2. 依存パッケージの変更

`web/package.json` で以下のパッケージバージョンを変更した。

| パッケージ | 変更前（React 15 / Next.js 3） | 変更後（React 0.14） |
|---|---|---|
| `react` | `^15.6.2` | `^0.14.10` |
| `react-dom` | `^15.6.2` | `^0.14.10` |

**追加パッケージ：**

| パッケージ | バージョン | 追加理由 |
|---|---|---|
| `babel-polyfill` | `^6.26.0` | webpack エントリポイントに polyfill を追加（古いブラウザ互換） |
| `babel-loader` | `^7.1.5` | webpack でソースコードを Babel トランスパイル |
| `babel-preset-react` | `^6.24.1` | JSX のトランスパイル（`next/babel` の代替） |
| `webpack` | `^3.12.0` | クライアントバンドルの生成（Next.js の内蔵 webpack の代替） |
| `webpack-dev-middleware` | `^1.12.2`（devDependencies） | 開発時のホットリロード対応 |

**削除パッケージ：**

| パッケージ | 削除理由 |
|---|---|
| `next` | Next.js を完全に除去し、Express + webpack 構成に移行 |

**npm scripts の変更：**

```diff
- "build": "npm run build:css && next build",
+ "build": "npm run build:css && webpack -p",
```

- `build` スクリプトの `next build` を `webpack -p`（プロダクションモードの webpack ビルド）に変更
- `dev` / `start` スクリプトは変更なし（既に `node server.js` で起動する構成）

---

## 3. 改修パターン一覧

### 3.1 Next.js の完全除去 — アーキテクチャ概要

| 項目 | 内容 |
|---|---|
| **変更内容** | Next.js を完全に除去し、Express + webpack による CSR（クライアントサイドレンダリング）構成に移行 |
| **変更理由** | React 0.14 に対応する Next.js バージョンが存在しない。Next.js 3 は React 15+ を前提としている |

**変更前（React 15 / Next.js 3）のアーキテクチャ：**

```
ブラウザ → Express カスタムサーバー → Next.js（SSR + webpack 2）
                                        ├── pages/_document.js（HTML テンプレート）
                                        ├── pages/index.js（トップページ）
                                        └── pages/room.js（ルームページ + getInitialProps）
```

**変更後（React 0.14）のアーキテクチャ：**

```
ブラウザ → Express サーバー → index.html（静的 HTML）
              │                   └── bundle.js（webpack ビルド）
              │                         └── client.js（CSR ルーティング）
              └── API Routes（/api/room/*）
```

**ポイント:**

- Next.js の SSR・ルーティング・webpack 統合をすべて自前実装に置き換え
- 4 つの新規ファイル（`client.js`、`index.html`、`webpack.config.js`、`.babelrc` 変更）で Next.js の機能を代替
- 4 つのファイル（`next.config.js`、`pages/_document.js`、`pages/index.js`、`pages/room.js`）を削除

---

### 3.2 CSR エントリポイント（`client.js` 新規作成）

| 項目 | 内容 |
|---|---|
| **変更内容** | `client.js` を新規作成し、`window.location.pathname` ベースのクライアントサイドルーティングを実装。`pages/index.js` と `pages/room.js` を削除 |
| **変更理由** | Next.js のページルーティング（`pages/` ディレクトリ）と `getInitialProps` を代替する仕組みが必要 |
| **対象ファイル** | `client.js`（新規）、`pages/index.js`（削除）、`pages/room.js`（削除） |

#### React 15（変更前） — `pages/index.js`

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

#### React 15（変更前） — `pages/room.js`（抜粋）

```js
RoomPage.getInitialProps = async function(context) {
  var req = context.req;
  var query = context.query;

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
  // ... 認証チェック・プレイヤーデータ更新 ...

  return {
    initialData: { room: updateRes.data, userId: userId, roomId: roomId },
  };
};
```

#### React 0.14（変更後） — `client.js`

```js
var React = require('react');
var ReactDOM = require('react-dom');
var Layout = require('@/components/Layout').Layout;
var Top = require('@/features/top/page/Top').Top;
var Room = require('@/features/room/page/Room').default;

var pathname = window.location.pathname;
var rootEl = document.getElementById('__next');

var roomMatch = pathname.match(/^\/room\/(.+)$/);

if (roomMatch) {
  var roomId = roomMatch[1];
  fetch('/api/room/' + roomId + '/init', { credentials: 'same-origin' })
    .then(function(res) { return res.json(); })
    .then(function(json) {
      if (json.status !== 200) {
        window.location.href = '/';
        return;
      }
      ReactDOM.render(
        React.createElement(Layout, null,
          React.createElement(Room, { initialData: json.data })
        ),
        rootEl
      );
    })
    .catch(function() {
      window.location.href = '/';
    });
} else {
  ReactDOM.render(
    React.createElement(Layout, null,
      React.createElement(Top, null)
    ),
    rootEl
  );
}
```

**ポイント:**

- Next.js のファイルベースルーティング → `window.location.pathname` の正規表現マッチで手動ルーティング
- `getInitialProps`（サーバーサイドデータ取得） → クライアントサイドの `fetch('/api/room/:roomId/init')` に変更
- `pages/room.js` の認証チェック・プレイヤーデータ更新ロジックは `server.js` の新 API エンドポイント（`GET /api/room/:roomId/init`）に移動
- JSX ではなく `React.createElement` を使用（エントリポイントは webpack の Babel を通るが、CommonJS スタイルで統一）
- 認証失敗時やエラー時は `window.location.href = '/'` でリダイレクト

---

### 3.3 HTML テンプレート（`index.html` 新規、`_document.js` 削除）

| 項目 | 内容 |
|---|---|
| **変更内容** | `pages/_document.js`（Next.js の HTML テンプレート）を削除し、静的な `index.html` を新規作成 |
| **変更理由** | Next.js を除去したため、HTML テンプレートを自前で用意する必要がある |
| **対象ファイル** | `index.html`（新規）、`pages/_document.js`（削除） |

#### React 15（変更前） — `pages/_document.js`

```js
import React from 'react';
import Document, { Head, Main, NextScript } from 'next/document';

export default class MyDocument extends Document {
  render() {
    return (
      <html lang="ja">
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
          <link rel="stylesheet" href="/static/styles.css" />
        </Head>
        <body className="antialiased overscroll-none">
          <Main />
          <NextScript />
        </body>
      </html>
    );
  }
}
```

#### React 0.14（変更後） — `index.html`

```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/static/styles.css" />
  </head>
  <body class="antialiased overscroll-none">
    <div id="__next"></div>
    <script src="/static/bundle.js"></script>
  </body>
</html>
```

**ポイント:**

- Next.js の `<Head>`/`<Main>`/`<NextScript>` コンポーネント → 標準の HTML タグに置き換え
- JSX の `className` → HTML の `class` 属性に変更
- JSX の `crossOrigin` → HTML の `crossorigin` 属性に変更
- `<Main />` → `<div id="__next"></div>`（`client.js` の `ReactDOM.render` のマウントポイント）
- `<NextScript />` → `<script src="/static/bundle.js"></script>`（webpack ビルドの出力ファイル）
- `<meta charset>` と `<meta viewport>` を追加（`_document.js` では Next.js が自動挿入していた）

---

### 3.4 `next.config.js` → `webpack.config.js`

| 項目 | 内容 |
|---|---|
| **変更内容** | `next.config.js` を削除し、独立した `webpack.config.js` を新規作成 |
| **変更理由** | Next.js を除去したため、webpack 設定を Next.js の `webpack` コールバック内ではなく独立ファイルとして定義する必要がある |
| **対象ファイル** | `webpack.config.js`（新規）、`next.config.js`（削除） |

#### React 15（変更前） — `next.config.js`（抜粋）

```js
const path = require('path');
const webpack = require('webpack');
require('dotenv').config({ path: '.env.local' });

const envKeys = Object.keys(process.env)
  .filter(function(key) { return key.startsWith('NEXT_PUBLIC_'); })
  .reduce(function(acc, key) {
    acc['process.env.' + key] = JSON.stringify(process.env[key]);
    return acc;
  }, {});

module.exports = {
  webpack: (config) => {
    config.plugins.push(new webpack.DefinePlugin(envKeys));
    config.resolve.alias['@'] = path.resolve(__dirname);
    config.resolve.mainFields = ['browser', 'module', 'main'];
    // ... Firebase トランスパイル、Node.js モジュールモック ...
    return config;
  },
};
```

#### React 0.14（変更後） — `webpack.config.js`

```js
var path = require('path');
var webpack = require('webpack');
require('dotenv').config({ path: '.env.local' });

var envKeys = Object.keys(process.env)
  .filter(function(key) { return key.startsWith('NEXT_PUBLIC_'); })
  .reduce(function(acc, key) {
    acc['process.env.' + key] = JSON.stringify(process.env[key]);
    return acc;
  }, {});

module.exports = {
  entry: ['babel-polyfill', './client.js'],
  output: {
    path: path.resolve(__dirname, 'static'),
    filename: 'bundle.js',
  },
  resolve: {
    alias: {
      '@': __dirname,
    },
    mainFields: ['browser', 'module', 'main'],
    extensions: ['.js', '.json', '.cjs'],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
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
            presets: [
              ['env', {
                targets: { browsers: ['> 1%', 'last 2 versions'] },
                modules: false,
              }],
            ],
            plugins: [
              'transform-object-rest-spread',
              'transform-class-properties',
            ],
          },
        },
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin(envKeys),
  ],
  node: {
    tls: 'empty',
    net: 'empty',
    dns: 'empty',
    child_process: 'empty',
  },
};
```

**ポイント:**

- Next.js の `webpack` コールバック（既存の config を受け取って拡張）→ 完全に独立した webpack 設定
- `entry` を新規定義：`babel-polyfill` と `client.js` をエントリポイントに指定
- `output` を新規定義：`static/bundle.js` に出力（`index.html` の `<script>` タグで読み込み）
- ソースコード用の `babel-loader` ルールを追加（Next.js が内蔵していた機能の代替）
- Firebase 等のトランスパイル設定・Node.js モジュールモック・パスエイリアス・`mainFields` 設定は `next.config.js` から引き継ぎ
- `const` → `var` に変更（server.js と同じく ES5 構文で統一）

---

### 3.5 `server.js` の大幅書き換え

| 項目 | 内容 |
|---|---|
| **変更内容** | Next.js 連携コードを除去し、静的ファイル配信・webpack-dev-middleware・新 API エンドポイントを追加 |
| **変更理由** | Next.js の `app.prepare()`/`app.render()`/`handle()` が不要になり、代わりに Express 単体で全てのルーティングを処理する必要がある |
| **対象ファイル** | `server.js` |

#### React 15（変更前） — `server.js`（構造）

```js
const next = require('next');
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();

  // API Routes
  server.post('/api/room/create', async (req, res) => { /* ... */ });
  // ...

  // Dynamic room route
  server.get('/room/:roomId', (req, res) => {
    app.render(req, res, '/room', { roomId: req.params.roomId });
  });

  // All other routes handled by Next.js
  server.get('*', (req, res) => {
    return handle(req, res);
  });

  server.listen(port);
});
```

#### React 0.14（変更後） — `server.js`（構造）

```js
var express = require('express');
var path = require('path');
// next は不要

var server = express();

// Dev: webpack-dev-middleware
if (dev) {
  var webpack = require('webpack');
  var webpackDevMiddleware = require('webpack-dev-middleware');
  var webpackConfig = require('./webpack.config');
  var compiler = webpack(webpackConfig);
  server.use(webpackDevMiddleware(compiler, {
    publicPath: '/static/',
    stats: { colors: true },
  }));
}

// Static files
server.use('/static', express.static(path.join(__dirname, 'static')));

// API Routes（既存 + 新規 init エンドポイント）
server.post('/api/room/create', async function(req, res) { /* ... */ });
// ...
server.get('/api/room/:roomId/init', async function(req, res) { /* ... */ });

// Page Routes — すべて index.html を返す
server.get('/room/:roomId', function(req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});
server.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(port);
```

**主な変更点：**

1. **Next.js 関連の削除**：`require('next')`、`app.prepare()`、`app.render()`、`handle()` をすべて除去
2. **`app.prepare().then()` のネスト解除**：全コードがトップレベルに移動（コールバックのネストが 1 段浅くなる）
3. **webpack-dev-middleware の追加**：開発時に `webpack-dev-middleware` でインメモリバンドルを配信（`express.static` の前に配置して優先）
4. **静的ファイル配信**：`express.static` で `static/` ディレクトリを `/static` パスで配信
5. **新 API エンドポイント `GET /api/room/:roomId/init`**：`pages/room.js` の `getInitialProps` ロジック（認証チェック・プレイヤーデータ更新）を移植
6. **ページルーティング**：`app.render()` → `res.sendFile('index.html')`。クライアントサイドの `client.js` がルーティングを担当
7. **構文の変更**：`const` → `var`、アロー関数 → `function`、分割代入 → 直接参照

---

### 3.6 Next.js Router 除去（`Router.push` → `window.location.href`）

| 項目 | 内容 |
|---|---|
| **変更内容** | `import Router from 'next/router'` を削除し、`Router.push()` を `window.location.href` による通常のページ遷移に置き換え |
| **変更理由** | Next.js を除去したため、Next.js Router が利用不可 |
| **対象ファイル** | `Room.js`、`Top.js` |

#### React 15（変更前） — `Room.js`

```js
import Router from 'next/router';

// GameResultDialog の close ハンドラ
close={function() { Router.push('/'); }}
```

#### React 0.14（変更後） — `Room.js`

```js
// import Router 削除

close={function() { window.location.href = '/'; }}
```

#### React 15（変更前） — `Top.js`

```js
import Router from 'next/router';

// ルーム作成後
if (result.roomId) {
  Router.push('/room/' + result.roomId);
}

// ルーム参加後
if (result.roomId) {
  Router.push('/room/' + result.roomId);
}
```

#### React 0.14（変更後） — `Top.js`

```js
// import Router 削除

if (result.roomId) {
  window.location.href = '/room/' + result.roomId;
}

if (result.roomId) {
  window.location.href = '/room/' + result.roomId;
}
```

**ポイント:**

- `Router.push()` はクライアントサイドナビゲーション（SPA 遷移、ページリロードなし）→ `window.location.href` は通常のページ遷移（フルリロード）
- このアプリでは SPA 遷移は不要（トップページ → ルームページの遷移のみで、状態はすべて Firestore で管理）のため、フルリロードでも問題なし

---

### 3.7 関数コンポーネント `return null` → `<noscript />`

| 項目 | 内容 |
|---|---|
| **変更内容** | 関数コンポーネントの `return null` を `return React.createElement('noscript', null)` に変更 |
| **変更理由** | React 0.14 の関数コンポーネント（Stateless Functional Component）は `null` を返すとエラーになる。React 15 以降で `null` 返却が許可された |
| **対象ファイル** | `ActivateEffect.js` |

#### React 15（変更前） — `ActivateEffect.js`

```js
export function ActivateEffect(props) {
  if (props.result === 'shock') {
    return (
      <div className="fixed inset-0 bg-yellow-300 bg-opacity-70 flex items-center justify-center z-50">
        {/* ... */}
      </div>
    );
  }
  return null;
}
```

#### React 0.14（変更後） — `ActivateEffect.js`

```js
export function ActivateEffect(props) {
  if (props.result === 'shock') {
    return (
      <div className="fixed inset-0 bg-yellow-300 bg-opacity-70 flex items-center justify-center z-50">
        {/* ... */}
      </div>
    );
  }
  return React.createElement('noscript', null);
}
```

**ポイント:**

- `<noscript />` は DOM に何もレンダリングしないため、`null` と同等の振る舞い
- クラスコンポーネントの `render()` メソッドでは React 0.14 でも `return null` が可能なため、この変更は関数コンポーネントのみが対象
- 今回の改修で該当するのは `ActivateEffect.js` の 1 箇所のみ

---

### 3.8 `.babelrc` の変更（`next/babel` → `env` + `react`）

| 項目 | 内容 |
|---|---|
| **変更内容** | `.babelrc` のプリセットを `next/babel` から `env` + `react` に変更し、プラグインを追加 |
| **変更理由** | Next.js を除去したため `next/babel` プリセットが利用不可。webpack の `babel-loader` が参照する Babel 設定として、`env`（ES2015+ → ES5 変換）と `react`（JSX 変換）を明示的に指定する必要がある |
| **対象ファイル** | `.babelrc` |

#### React 15（変更前） — `.babelrc`

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

#### React 0.14（変更後） — `.babelrc`

```json
{
  "presets": ["env", "react"],
  "plugins": [
    "transform-class-properties",
    "transform-object-rest-spread",
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

- `next/babel` は Next.js が提供する統合プリセット（`env` + `react` + Next.js 固有の最適化を含む）→ 個別のプリセットに分解
- `babel-preset-env`：ES2015+ 構文を ES5 にダウンレベルコンパイル
- `babel-preset-react`：JSX を `React.createElement` に変換
- `transform-class-properties` と `transform-object-rest-spread` プラグインを追加（`next/babel` に内蔵されていたものを明示化）
- `module-resolver` プラグイン（`@/` パスエイリアス）は変更なし

---

## 4. 変更ファイル一覧

### 新規作成ファイル（3 ファイル）

| # | ファイル | 内容 |
|---|---|---|
| 1 | `web/client.js` | CSR エントリポイント（パスベースルーティング + `ReactDOM.render`） |
| 2 | `web/index.html` | HTML テンプレート（`_document.js` 代替） |
| 3 | `web/webpack.config.js` | webpack 設定（`next.config.js` 代替） |

### 削除ファイル（4 ファイル）

| # | ファイル | 削除理由 |
|---|---|---|
| 1 | `web/next.config.js` | Next.js 除去。`webpack.config.js` に移行 |
| 2 | `web/pages/_document.js` | Next.js 除去。`index.html` に移行 |
| 3 | `web/pages/index.js` | Next.js 除去。`client.js` に統合 |
| 4 | `web/pages/room.js` | Next.js 除去。`client.js` + `server.js`（`/api/room/:roomId/init`）に移行 |

### 変更ファイル（10 ファイル）

| # | ファイル | 主な変更内容 |
|---|---|---|
| 1 | `web/server.js` | Next.js 連携除去、webpack-dev-middleware 追加、静的ファイル配信、新 API エンドポイント追加、`const`/アロー関数 → `var`/`function` |
| 2 | `web/.babelrc` | `next/babel` → `env` + `react`、プラグイン追加 |
| 3 | `web/package.json` | react/react-dom ダウングレード、next 削除、webpack 等追加、build スクリプト変更 |
| 4 | `web/package-lock.json` | 依存関係の再解決 |
| 5 | `web/features/room/page/Room.js` | `import Router` 削除、`Router.push` → `window.location.href` |
| 6 | `web/features/top/page/Top.js` | `import Router` 削除、`Router.push` → `window.location.href`（2 箇所） |
| 7 | `web/features/room/components/ActivateEffect.js` | `return null` → `return React.createElement('noscript', null)` |
| 8 | `web/.gitignore` | `web/static/bundle.js` を追加（webpack ビルド成果物を無視） |
| 9 | `web/static/styles.css` | Tailwind CSS 再ビルド（内容はほぼ同一） |
| 10 | `CLAUDE.md` | プロジェクト説明の更新（技術スタック、アーキテクチャ、ディレクトリ構造等） |
