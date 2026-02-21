# React 0.14 ダウングレード改修ドキュメント

## 1. 概要

学習目的で、React 15 / Next.js 3 の構成を React 0.14 / Next.js 3 にダウングレードした。
前回の React 16 → 15 が **99 ファイル変更・+9,783 / -7,541 行** のアーキテクチャ全面書き換え（TypeScript → JavaScript、Hooks → クラスコンポーネント、Next.js 10 → 3 等）だったのに対し、今回は **5 ファイル変更・+53 / -4 行**（package-lock.json・CLAUDE.md・docs 除く）の小規模な変更。

React 0.14 と React 15 はコンポーネント API レベルではほぼ互換であり、アプリケーションロジックの変更は不要だった。差異は **React の内部モジュール構造** と **SFC（Stateless Functional Component）の制約** のみであり、変更の中心は **ビルド設定の調整** と **postinstall パッチ** となった。

主な変更軸：
- **SFC の `return null` 制限への対応**：React 0.14 では関数コンポーネントが `null` を返せないため、`<noscript />` に置換
- **webpack alias の追加**：React 0.14 の内部モジュール構造（`react-dom/lib/` → `react/lib/`）への対応
- **postinstall パッチの追加**：Next.js 3 の CommonsChunkPlugin が React 0.14 の react-dom を検出できない問題への対応
- **`--legacy-peer-deps` の必須化**：Next.js 3 が peer dependency として React 15 を要求するため

---

## 2. 依存パッケージの変更

`web/package.json` で以下のパッケージバージョンを変更した。

| パッケージ | 変更前（React 15） | 変更後（React 0.14） |
|---|---|---|
| `react` | `^15.6.2` | `^0.14.10` |
| `react-dom` | `^15.6.2` | `^0.14.10` |

その他の依存パッケージ（`next`、`firebase`、`prop-types`、`howler` 等）は全て変更なし。

**`prop-types@^15.8.1`** はそのまま維持。`prop-types` は React 15.5 で React 本体から分離されたスタンドアロンパッケージであり、React 0.14 環境でも問題なく動作する。

**npm scripts の変更：**

```diff
+ "postinstall": "node patches/apply-patches.js",
  "build:css": "tailwindcss -i ./styles/globals.css -o ./static/styles.css --minify",
  "dev": "npm run build:css && node server.js",
  "build": "npm run build:css && next build",
  "start": "NODE_ENV=production node server.js"
```

- `postinstall` スクリプトを追加。`npm install` 完了後に `patches/apply-patches.js` を自動実行し、Next.js 3 の内部ファイルにパッチを適用する（3.3 参照）

**`npm install` に `--legacy-peer-deps` が必須：**

Next.js 3 は `package.json` で `react@^15.4.2` を peer dependency として宣言している。React 0.14 をインストールすると peer dependency の要件を満たさないため、npm 7+ ではインストールがエラーになる。`--legacy-peer-deps` フラグで peer dependency チェックをスキップする必要がある。

```bash
npm install --legacy-peer-deps
```

---

## 3. 改修パターン一覧

### 3.1 SFC の `return null` → `return <noscript />`

| 項目 | 内容 |
|---|---|
| **変更内容** | 関数コンポーネントの `return null` を `return <noscript />` に変更 |
| **変更理由** | React 0.14 では Stateless Functional Component（SFC）が `null` を返すことができない。`null` を返すと `Invariant Violation` エラーが発生する。この制限は React 15 で修正された |
| **対象ファイル** | `ActivateEffect.js`、`pages/room.js` |

#### React 15（変更前） — `features/room/components/ActivateEffect.js`

```js
export function ActivateEffect(props) {
  if (props.result === 'shock') {
    return ( /* ... */ );
  }
  if (props.result === 'safe') {
    return ( /* ... */ );
  }
  return null;
}
```

#### React 0.14（変更後） — `features/room/components/ActivateEffect.js`

```js
export function ActivateEffect(props) {
  if (props.result === 'shock') {
    return ( /* ... */ );
  }
  if (props.result === 'safe') {
    return ( /* ... */ );
  }
  return <noscript />;
}
```

#### React 15（変更前） — `pages/room.js`

```js
function RoomPage(props) {
  if (!props.initialData || !props.initialData.room) {
    return null;
  }
  return ( /* ... */ );
}
```

#### React 0.14（変更後） — `pages/room.js`

```js
function RoomPage(props) {
  if (!props.initialData || !props.initialData.room) {
    return <noscript />;
  }
  return ( /* ... */ );
}
```

**ポイント:**

- `<noscript />` は DOM に描画されるが視覚的に不可視であるため、`null` の代替として適切
- クラスコンポーネントの `render()` メソッドでは React 0.14 でも `null` を返せる。この制限は SFC のみに適用される
- 対象は 2 ファイルのみ。他の関数コンポーネントは必ず JSX を返すため変更不要

---

### 3.2 webpack alias — `react-dom/lib/ReactReconciler`

| 項目 | 内容 |
|---|---|
| **変更内容** | `next.config.js` に webpack alias を追加し、`react-dom/lib/ReactReconciler` を `react/lib/ReactReconciler` にリマップ |
| **変更理由** | Next.js 3 の開発サーバー（`next-dev.js`）が `react-dom/lib/ReactReconciler` を `require` するが、React 0.14 では内部モジュールが `react/lib/` に配置されているため解決できない |
| **対象ファイル** | `next.config.js` |

#### React 15 → React 0.14 の内部モジュール構造の違い

React 15 では `react-dom` パッケージが独自の `lib/` ディレクトリを持ち、`ReactReconciler` 等の内部モジュールが配置されている：

```
node_modules/react-dom/
  lib/
    ReactReconciler.js    ← Next.js 3 がここを require
    ReactMount.js
    ...
```

React 0.14 では `react-dom` はフラット構造であり、内部モジュールは全て `react/lib/` に配置されている：

```
node_modules/react-dom/
  index.js                ← lib/ サブディレクトリなし
node_modules/react/
  lib/
    ReactReconciler.js    ← 内部モジュールはここにある
    ReactMount.js
    ...
```

#### 変更箇所 — `next.config.js`（diff）

```diff
     config.resolve.alias['@'] = path.resolve(__dirname);

+    // React 0.14: internal modules are in react/lib/ instead of react-dom/lib/
+    config.resolve.alias['react-dom/lib/ReactReconciler'] = 'react/lib/ReactReconciler';
+
     // Prefer browser builds to avoid Node.js-only modules (gRPC, tls, net, http2)
     config.resolve.mainFields = ['browser', 'module', 'main'];
```

**ポイント:**

- webpack の `resolve.alias` で `react-dom/lib/ReactReconciler` → `react/lib/ReactReconciler` にリマップすることで、Next.js 3 が React 0.14 環境でも正しく内部モジュールを参照できるようになる
- この alias は webpack（クライアントサイドビルド）にのみ影響する。サーバーサイドでは Next.js 3 が直接 `require` するが、開発サーバーでは webpack の Hot Module Replacement 経由でこの alias が有効になる

---

### 3.3 postinstall パッチ — CommonsChunkPlugin の react-dom 検出修正

| 項目 | 内容 |
|---|---|
| **変更内容** | `patches/apply-patches.js` を新規作成し、`npm install` 時に Next.js 3 の内部ファイル（`node_modules/next/dist/server/build/webpack.js`）にパッチを適用 |
| **変更理由** | Next.js 3 の `CommonsChunkPlugin` 設定が React 0.14 の `react-dom` モジュールを検出できないため、ビルドに失敗する |
| **対象ファイル** | `patches/apply-patches.js`（新規）、`package.json`（`postinstall` スクリプト追加） |

#### 問題の詳細

Next.js 3 は webpack の `CommonsChunkPlugin` を使い、`react-dom` 関連のモジュールを共通チャンクに抽出する。その際、以下のコードでモジュールが `react-dom` パッケージに属するかを判定する：

```js
// node_modules/next/dist/server/build/webpack.js（元のコード）
if (module.context && module.context.indexOf(_path.sep + 'react-dom' + _path.sep) >= 0) {
```

この判定は **`module.context`（モジュールが存在するディレクトリパス）** に `/react-dom/`（前後にパスセパレータ付き）が含まれるかをチェックしている。

- **React 15**: `react-dom` パッケージに `lib/` サブディレクトリが存在するため、`module.context` は `/node_modules/react-dom/lib` のような値になる → `/react-dom/` にマッチする ✓
- **React 0.14**: `react-dom` パッケージはフラット構造のため、`module.context` は `/node_modules/react-dom` で終わる → `/react-dom/` にマッチしない ✗

#### パッチの内容 — `patches/apply-patches.js`

```js
var original = "if (module.context && module.context.indexOf(_path.sep + 'react-dom' + _path.sep) >= 0) {";

// 置換後: 元の中間一致チェックに加え、末尾一致チェックを追加
var replacement = "var _reactDomDir = _path.sep + 'react-dom';\n" +
  "                if (module.context && (module.context.indexOf(_reactDomDir + _path.sep) >= 0 || " +
  "module.context.slice(-_reactDomDir.length) === _reactDomDir)) {";
```

パッチ適用後の判定ロジック：

```js
var _reactDomDir = _path.sep + 'react-dom';
if (module.context && (
  module.context.indexOf(_reactDomDir + _path.sep) >= 0 ||  // 元の中間一致
  module.context.slice(-_reactDomDir.length) === _reactDomDir  // 追加: 末尾一致
)) {
```

#### パッチスクリプトの安全機構

```js
// 既にパッチ済みならスキップ（冪等性の保証）
if (content.indexOf("var _reactDomDir = _path.sep + 'react-dom'") >= 0) {
  console.log('[patches] Next.js webpack.js already patched, skipping.');
  process.exit(0);
}

// パッチ対象の文字列が見つからなければエラー（Next.js バージョン変更時の検出）
if (content.indexOf(original) < 0) {
  console.error('[patches] Could not find expected string in webpack.js. Patch may need updating.');
  process.exit(1);
}
```

**ポイント:**

- `postinstall` スクリプトで自動実行されるため、`npm install --legacy-peer-deps` を実行するだけでパッチが適用される
- パッチは冪等（何度実行しても同じ結果）であり、既にパッチ済みの場合はスキップする
- React 15 の `lib/` サブディレクトリ構造と React 0.14 のフラット構造の両方に対応する判定条件に変更

---

## 4. React 0.14 と React 15 の主な違い

| 項目 | React 0.14 | React 15 |
|---|---|---|
| **`data-reactid` 属性** | 全 DOM 要素に付与される | 廃止（React 15 で削除） |
| **不明な DOM 属性** | 警告のみ | 警告のみ（React 16 で許容に変更） |
| **SSR チェックサム** | `data-react-checksum` 属性でサーバー/クライアント一致を検証 | 同じ |
| **SVG サポート** | 限定的 | 大幅に改善 |
| **SFC の `null` 返却** | **不可**（`Invariant Violation` エラー） | **可能**（React 15 で修正） |
| **`react-dom` 内部構造** | フラット構造（`lib/` なし）、内部モジュールは `react/lib/` に配置 | `lib/` サブディレクトリあり（`react-dom/lib/ReactReconciler` 等） |
| **`ReactDOM.unstable_renderSubtreeIntoContainer`** | 利用可能 | 利用可能 |
| **コンポーネント API** | クラスコンポーネント + SFC（Hooks なし） | 同じ（Hooks は React 16.8 で導入） |

React 0.14 と 15 のコンポーネント API はほぼ同一であるため、前回（React 16 → 15）で行ったクラスコンポーネント化・レガシー Context API 化・callback ref 化等の変更はそのまま React 0.14 でも動作する。

---

## 5. 変更ファイル一覧

### 新規作成ファイル（1 ファイル）

| # | ファイル | 内容 |
|---|---|---|
| 1 | `web/patches/apply-patches.js` | postinstall パッチ（CommonsChunkPlugin の react-dom 検出修正） |

### 変更ファイル（6 ファイル）

| # | ファイル | 変更内容 |
|---|---|---|
| 1 | `web/package.json` | `react`/`react-dom` を `^0.14.10` に変更、`postinstall` スクリプト追加 |
| 2 | `web/package-lock.json` | 依存関係の再解決 |
| 3 | `web/next.config.js` | webpack alias 追加（`react-dom/lib/ReactReconciler` → `react/lib/ReactReconciler`） |
| 4 | `web/features/room/components/ActivateEffect.js` | `return null` → `return <noscript />` |
| 5 | `web/pages/room.js` | `return null` → `return <noscript />` |
| 6 | `CLAUDE.md` | React 0.14 固有のパターンを追記、`--legacy-peer-deps` の説明追加 |
