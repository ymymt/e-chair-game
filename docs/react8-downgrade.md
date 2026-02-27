# React 0.8 ダウングレード改修ドキュメント

## 1. 概要

学習目的で、React 0.9 の構成を React 0.8 にダウングレードした。
前回（React 0.10 → 0.9）が `return null` の廃止と `<dialog>` 要素の手動実装が中心だったのに対し、今回は **Context API の廃止とグローバル toastStore への移行、`React.DOM.polygon` → `React.DOM.path` への変換** が中心の改修となった。

7 ファイル変更（うち新規 1 + `package-lock.json`）。

主な変更軸：
- **Context API → グローバル toastStore**：`childContextTypes`/`getChildContext`/`contextTypes` によるレガシー Context API を廃止し、モジュールスコープのグローバルストア（pub/sub パターン）に移行
- **`React.PropTypes.shape` / `.renderable` の削除**：Context API 廃止に伴い、`toastShape` の型定義や `propTypes` の `renderable` バリデータが不要に
- **`React.DOM.polygon` → `React.DOM.path`**：`React.DOM.polygon` は React 0.9 で追加されたため、0.8 では `React.DOM.path` で同等の図形を描画

このドキュメントでは、ダウングレードに伴い **何を・なぜ・どのように** 変更したかを記録する。

---

## 2. 依存パッケージの変更

`web/package.json` で以下のパッケージバージョンを変更した。

| パッケージ | 変更前（React 0.9） | 変更後（React 0.8） |
|---|---|---|
| `react` | `^0.9.0` | `^0.8.0` |

**追加パッケージ：** なし

**削除パッケージ：** なし

**npm scripts の変更：** なし

`web/package-lock.json` では `node_modules/react` が `0.9.0` から `0.8.0` に再解決されている。

---

## 3. 改修パターン一覧

### 3.1 Context API → グローバル toastStore（4 ファイル + 新規 1 ファイル）

| 項目 | 内容 |
|---|---|
| **変更内容** | レガシー Context API（`childContextTypes`/`getChildContext`/`contextTypes`）によるトースト通知の仕組みを廃止し、モジュールスコープのグローバルストア `toastStore` に移行 |
| **変更理由** | Context API（`childContextTypes`/`getChildContext`/`contextTypes`）は React 0.9 で追加された機能。React 0.8 にはこの仕組みが存在しないため、コンポーネントツリー外のグローバルストアで代替する必要がある |
| **対象ファイル** | `web/utils/toast/toastStore.js`（新規）、`web/utils/toast/Toast.js`、`web/utils/toast/ToastProvider.js`、`web/features/room/page/Room.js`、`web/features/top/page/Top.js` |

#### 新規作成 — `web/utils/toast/toastStore.js`

Context API の代替として、pub/sub パターンのグローバルストアを新規作成した。

```js
var listeners = [];
var state = { isOpen: false, message: '' };
var timerId = null;

function getState() {
  return state;
}

function notify() {
  for (var i = 0; i < listeners.length; i++) {
    listeners[i](state);
  }
}

function open(message, milliseconds) {
  var ms = milliseconds || 3000;
  if (timerId) {
    clearTimeout(timerId);
  }
  state = { isOpen: true, message: message };
  notify();
  timerId = setTimeout(function() {
    close();
  }, ms);
}

function close() {
  state = { isOpen: false, message: '' };
  timerId = null;
  notify();
}

function subscribe(listener) {
  listeners.push(listener);
  return function unsubscribe() {
    listeners = listeners.filter(function(l) { return l !== listener; });
  };
}

module.exports = {
  getState: getState,
  open: open,
  close: close,
  subscribe: subscribe,
};
```

**ポイント：**
- `ToastProvider.getChildContext()` が提供していた `{ isOpen, message, open }` と同等のインターフェース
- `subscribe()` で登録したリスナーに状態変更を通知する pub/sub パターン
- タイマー管理（自動クローズ）のロジックは `ToastProvider` からそのまま移植

#### React 0.9（変更前） — `web/utils/toast/Toast.js`

```js
import React from 'react';
import { toastShape } from '@/utils/toast/ToastProvider';

var Toast = React.createClass({
  contextTypes: {
    toast: toastShape,
  },

  render: function() {
    var toast = this.context.toast;
    if (!toast || !toast.isOpen) {
      return React.DOM.span(null);
    }
    return React.DOM.div({className: 'fixed p-4 mx-1 bg-gray-800 border-2 text-white rounded-lg shadow-lg'},
      toast.message
    );
  }
});

export { Toast };
```

#### React 0.8（変更後） — `web/utils/toast/Toast.js`

```js
import React from 'react';
var toastStore = require('@/utils/toast/toastStore');

var Toast = React.createClass({
  getInitialState: function() {
    return toastStore.getState();
  },

  componentDidMount: function() {
    var self = this;
    this._unsubscribe = toastStore.subscribe(function(newState) {
      self.setState(newState);
    });
  },

  componentWillUnmount: function() {
    if (this._unsubscribe) {
      this._unsubscribe();
    }
  },

  render: function() {
    if (!this.state.isOpen) {
      return React.DOM.span(null);
    }
    return React.DOM.div({className: 'fixed p-4 mx-1 bg-gray-800 border-2 text-white rounded-lg shadow-lg'},
      this.state.message
    );
  }
});

export { Toast };
```

**変換のポイント：**
- `contextTypes` + `this.context.toast` → `toastStore.subscribe()` + `this.state` による状態管理
- `componentDidMount` で購読開始、`componentWillUnmount` で購読解除
- `getInitialState` で `toastStore.getState()` から初期値を取得

#### React 0.9（変更前） — `web/utils/toast/ToastProvider.js`

```js
import React from 'react';
var toastShape = React.PropTypes.shape({
  isOpen: React.PropTypes.bool.isRequired,
  message: React.PropTypes.renderable,
  open: React.PropTypes.func.isRequired,
});

var ToastProvider = React.createClass({
  childContextTypes: {
    toast: toastShape,
  },

  propTypes: {
    children: React.PropTypes.renderable.isRequired,
  },

  getInitialState: function() {
    this._timerId = null;
    return {
      isOpen: false,
      message: '',
    };
  },

  getChildContext: function() {
    return {
      toast: {
        isOpen: this.state.isOpen,
        message: this.state.message,
        open: this.open,
      },
    };
  },

  open: function(message, milliseconds) {
    var self = this;
    var ms = milliseconds || 3000;
    if (self._timerId) {
      clearTimeout(self._timerId);
    }
    self.setState({ isOpen: true, message: message });
    self._timerId = setTimeout(function() {
      self.close();
    }, ms);
  },

  close: function() {
    this.setState({ isOpen: false, message: '' });
    this._timerId = null;
  },

  render: function() {
    return this.props.children;
  }
});

export { ToastProvider, toastShape };
```

#### React 0.8（変更後） — `web/utils/toast/ToastProvider.js`

```js
import React from 'react';

var ToastProvider = React.createClass({
  render: function() {
    return this.props.children;
  }
});

export { ToastProvider };
```

**変換のポイント：**
- 状態管理・タイマーロジックは `toastStore.js` に移植済みのため、`ToastProvider` は `children` を素通しするだけのラッパーに簡素化
- `toastShape` のエクスポートを削除（消費側が不要になったため）
- `childContextTypes`、`getChildContext`、`propTypes`、`getInitialState`、`open`、`close` を全て削除

#### React 0.9（変更前） — `web/features/room/page/Room.js`（抜粋）

```js
import { toastShape } from '@/utils/toast/ToastProvider';

var Room = React.createClass({
  contextTypes: {
    toast: toastShape,
  },

  // ... componentDidUpdate 内 ...
  var toast = this.context.toast;
  if (toast) {
    var message = this.state.selectState.status === 200
      ? '番の椅子を選択しました。'
      : '椅子の選択に失敗しました。';
    toast.open(
      React.DOM.span(null,
        React.DOM.span(
          {style: {color: 'red', fontWeight: 'bold', fontSize: '1.2rem'}},
          this.state.selectedChair
        ),
        message
      )
    );
  }
```

#### React 0.8（変更後） — `web/features/room/page/Room.js`（抜粋）

```js
var toastStore = require('@/utils/toast/toastStore');

var Room = React.createClass({
  // contextTypes 削除

  // ... componentDidUpdate 内 ...
  var message = this.state.selectState.status === 200
    ? '番の椅子を選択しました。'
    : '椅子の選択に失敗しました。';
  toastStore.open(
    React.DOM.span(null,
      React.DOM.span(
        {style: {color: 'red', fontWeight: 'bold', fontSize: '1.2rem'}},
        this.state.selectedChair
      ),
      message
    )
  );
```

#### React 0.9（変更前） — `web/features/top/page/Top.js`（抜粋）

```js
import { toastShape } from '@/utils/toast/ToastProvider';

var Top = React.createClass({
  contextTypes: {
    toast: toastShape,
  },

  // ... componentDidUpdate 内 ...
  var toast = this.context.toast;
  if (toast) {
    toast.open(this.state.createError);
  }
```

#### React 0.8（変更後） — `web/features/top/page/Top.js`（抜粋）

```js
var toastStore = require('@/utils/toast/toastStore');

var Top = React.createClass({
  // contextTypes 削除

  // ... componentDidUpdate 内 ...
  toastStore.open(this.state.createError);
```

**消費側の変換ルール表：**

| React 0.9（Context API） | React 0.8（toastStore） | 備考 |
|---|---|---|
| `import { toastShape } from '...'` | `var toastStore = require('...')` | インポート変更 |
| `contextTypes: { toast: toastShape }` | （削除） | Context 宣言不要 |
| `this.context.toast.open(msg)` | `toastStore.open(msg)` | 直接呼び出し |
| `if (toast) { toast.open(...) }` | `toastStore.open(...)` | null チェック不要 |

---

### 3.2 `React.PropTypes.shape` / `.renderable` の削除（3.1 に含む）

| 項目 | 内容 |
|---|---|
| **変更内容** | `React.PropTypes.shape` による `toastShape` 定義と `React.PropTypes.renderable` によるバリデーションを削除 |
| **変更理由** | Context API 廃止に伴い `toastShape` が不要になった。また `React.PropTypes.renderable` は React 0.9 で追加された PropTypes バリデータであり、React 0.8 には存在しない |
| **対象ファイル** | `web/utils/toast/ToastProvider.js`（3.1 の変更に含む） |

#### React 0.9（変更前） — `web/utils/toast/ToastProvider.js`

```js
var toastShape = React.PropTypes.shape({
  isOpen: React.PropTypes.bool.isRequired,
  message: React.PropTypes.renderable,
  open: React.PropTypes.func.isRequired,
});

var ToastProvider = React.createClass({
  propTypes: {
    children: React.PropTypes.renderable.isRequired,
  },
  // ...
});

export { ToastProvider, toastShape };
```

#### React 0.8（変更後） — `web/utils/toast/ToastProvider.js`

```js
var ToastProvider = React.createClass({
  render: function() {
    return this.props.children;
  }
});

export { ToastProvider };
```

**削除された PropTypes API：**

| API | 用途 | 備考 |
|---|---|---|
| `React.PropTypes.shape({...})` | オブジェクトの構造を定義 | `toastShape` の定義に使用 |
| `React.PropTypes.renderable` | React 要素として描画可能な値を検証 | `message` と `children` の型に使用 |

---

### 3.3 `React.DOM.polygon` → `React.DOM.path`（1 ファイル）

| 項目 | 内容 |
|---|---|
| **変更内容** | SVG アイコンで使用していた `React.DOM.polygon` を `React.DOM.path` に変更 |
| **変更理由** | `React.DOM.polygon` は React 0.9 で追加された SVG 要素ファクトリ。React 0.8 の `React.DOM` には `polygon` が存在しないため、`React.DOM.path` で同等の図形を描画する |
| **対象ファイル** | `web/components/icons/Zap.js` |

#### React 0.9（変更前） — `web/components/icons/Zap.js`

```js
var Zap = React.createClass({
  render: function() {
    var props = this.props;
    return React.DOM.svg({
      xmlns: 'http://www.w3.org/2000/svg',
      width: '24',
      height: '24',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      className: props.className || ''
    },
      React.DOM.polygon({points: '13 2 3 14 12 14 11 22 21 10 12 10 13 2'})
    );
  }
});
```

#### React 0.8（変更後） — `web/components/icons/Zap.js`

```js
var Zap = React.createClass({
  render: function() {
    var props = this.props;
    return React.DOM.svg({
      xmlns: 'http://www.w3.org/2000/svg',
      width: '24',
      height: '24',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      className: props.className || ''
    },
      React.DOM.path({d: 'M13 2 L3 14 L12 14 L11 22 L21 10 L12 10 Z'})
    );
  }
});
```

**変換ルール：**

| React 0.9 | React 0.8 | 備考 |
|---|---|---|
| `React.DOM.polygon({points: '...'})` | `React.DOM.path({d: '...'})` | `points` 座標を `M`/`L`/`Z` コマンドに変換 |

**座標変換の詳細：**

```
polygon points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2"
  ↓
path d: "M13 2 L3 14 L12 14 L11 22 L21 10 L12 10 Z"
```

- 最初の座標ペア → `M`（moveTo）コマンド
- 以降の座標ペア → `L`（lineTo）コマンド
- 末尾の `Z` → パスを閉じる（`polygon` は自動的に閉じるため同等）
- 最後の `13 2`（開始点の繰り返し）は `Z` で代替されるため省略

---

## 4. 変更ファイル一覧

### 変更ファイル（7 ファイル + 1 自動生成ファイル）

| # | ファイル | 主な変更内容 |
|---|---|---|
| 1 | `web/package.json` | `react` を `^0.9.0` → `^0.8.0` に変更 |
| 2 | `web/utils/toast/toastStore.js` | **新規作成** — グローバル toastStore（pub/sub パターン） |
| 3 | `web/utils/toast/Toast.js` | Context API → toastStore.subscribe() による状態管理 |
| 4 | `web/utils/toast/ToastProvider.js` | Context API・PropTypes・状態管理ロジックを全削除、children 素通しのみに簡素化 |
| 5 | `web/features/room/page/Room.js` | `contextTypes` 削除、`this.context.toast.open()` → `toastStore.open()` |
| 6 | `web/features/top/page/Top.js` | `contextTypes` 削除、`this.context.toast.open()` → `toastStore.open()` |
| 7 | `web/components/icons/Zap.js` | `React.DOM.polygon` → `React.DOM.path` |
| 8 | `web/package-lock.json` | `react@0.8.0` へロック更新 |
