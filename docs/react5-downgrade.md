# React 0.5.0 ダウングレード改修ドキュメント

## 1. 概要

学習目的で、React 0.8 の構成を React 0.5.0 にダウングレードした。
前回（React 0.9 → 0.8）が Context API の廃止や `React.DOM.polygon` → `React.DOM.path` の変換が中心だったのに対し、今回は **npm → CDN への配信方式の切り替え** が本質的な変更点となった。

React 0.5.0 の npm パッケージ名 `react` は Facebook の React ではなく、Jeff Barczewski 氏による別プロジェクト（[react on npm](https://www.npmjs.com/package/react/v/0.5.0)）が占有していたため、npm 経由でのインストールが不可能。そのため CDN から直接読み込み、webpack の `externals` でバンドルから除外する方式に移行した。

コンポーネントファイルの変更は不要（React 0.8 → 0.5.0 間で API 互換）。

3 ファイル変更 + `package-lock.json`。

主な変更軸：
- **npm → CDN + webpack externals**：`react` パッケージを npm 依存から削除し、CDN `<script>` タグで React 0.5.0 を読み込み、webpack `externals` で `require('react')` をグローバル変数 `React` にマッピング
- **未使用依存の削除**：`babel-preset-react` は `.babelrc` で使用されていなかったため、この機会に削除

このドキュメントでは、ダウングレードに伴い **何を・なぜ・どのように** 変更したかを記録する。

---

## 2. 依存パッケージの変更

`web/package.json` で以下のパッケージを変更した。

| パッケージ | 変更前（React 0.8） | 変更後（React 0.5.0） |
|---|---|---|
| `react` | `^0.8.0` | **削除**（CDN に移行） |
| `babel-preset-react` | `^6.24.1` | **削除**（未使用） |

**追加パッケージ：** なし

**削除パッケージ：**
- `react`（`^0.8.0`）— CDN 配信に移行したため npm 依存から削除
- `babel-preset-react`（`^6.24.1`）— `.babelrc` の `presets` に含まれておらず未使用だったため削除

**npm scripts の変更：** なし

`web/package-lock.json` では `react` と `babel-preset-react` およびその依存ツリーが削除されている。

---

## 3. 改修パターン一覧

### 3.1 npm → CDN + webpack externals（2 ファイル）

| 項目 | 内容 |
|---|---|
| **変更内容** | React を npm パッケージから CDN スクリプトに切り替え、webpack `externals` で `require('react')` をグローバル変数 `React` にマッピング |
| **変更理由** | npm レジストリにおいて `react@0.5.0` は Facebook の React ではなく Jeff Barczewski 氏の別プロジェクトが占有しているため、npm 経由でインストールできない。cdnjs には Facebook React 0.5.0 が公開されているため、CDN から読み込む方式に変更 |
| **対象ファイル** | `web/index.html`、`web/webpack.config.js` |

#### React 0.8（変更前） — `web/index.html`

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

#### React 0.5.0（変更後） — `web/index.html`

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
    <script src="https://cdnjs.cloudflare.com/ajax/libs/react/0.5.0/react.js"></script>
    <script src="/static/bundle.js"></script>
  </body>
</html>
```

**変換のポイント：**
- `bundle.js` の前に CDN スクリプトを配置し、`React` がグローバル変数として利用可能な状態で bundle が実行されるようにする
- cdnjs の URL パターン：`https://cdnjs.cloudflare.com/ajax/libs/react/{version}/react.js`

#### React 0.8（変更前） — `web/webpack.config.js`（抜粋）

```js
module.exports = {
  entry: ['babel-polyfill', './client.js'],
  output: {
    // ...
  },
  // ...
};
```

#### React 0.5.0（変更後） — `web/webpack.config.js`（抜粋）

```js
module.exports = {
  externals: {
    'react': 'React',
  },
  entry: ['babel-polyfill', './client.js'],
  output: {
    // ...
  },
  // ...
};
```

**変換のポイント：**
- `externals` により、ソースコード内の `import React from 'react'` や `var React = require('react')` は、webpack バンドル時にグローバル変数 `window.React` への参照に変換される
- これにより、既存のコンポーネントファイルは一切変更不要で CDN 版の React を利用できる

**解決フロー：**

```
1. ブラウザが index.html を読み込み
2. CDN <script> が React 0.5.0 を読み込み → window.React が定義される
3. bundle.js が読み込まれる
4. bundle 内の require('react') → externals 設定により window.React を返す
5. 全コンポーネントが CDN 版 React 0.5.0 を使用して動作
```

---

### 3.2 未使用依存の削除（1 ファイル）

| 項目 | 内容 |
|---|---|
| **変更内容** | `babel-preset-react`（`^6.24.1`）を `package.json` から削除 |
| **変更理由** | `.babelrc` の `presets` に `"react"` が含まれておらず、実際には使用されていなかった。React ダウングレードの機会に不要な依存を整理 |
| **対象ファイル** | `web/package.json` |

#### `.babelrc` の確認

```json
{
  "presets": ["env"],
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

`presets` に含まれているのは `"env"` のみで `"react"` は含まれていない。このプロジェクトでは JSX を使用せず `React.createClass` + `React.DOM.*` で記述しているため、JSX トランスパイル用の `babel-preset-react` は不要だった。

---

## 4. 変更ファイル一覧

### 変更ファイル（3 ファイル + 1 自動生成ファイル）

| # | ファイル | 主な変更内容 |
|---|---|---|
| 1 | `web/package.json` | `react`（`^0.8.0`）と `babel-preset-react`（`^6.24.1`）を削除 |
| 2 | `web/index.html` | CDN `<script>` タグ追加（`react/0.5.0/react.js`） |
| 3 | `web/webpack.config.js` | `externals: { 'react': 'React' }` を追加 |
| 4 | `web/package-lock.json` | `react` と `babel-preset-react` の依存ツリーを削除 |
