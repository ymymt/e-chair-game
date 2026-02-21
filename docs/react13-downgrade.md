# React 0.13 ダウングレード改修ドキュメント

## 1. 概要

学習目的で、React 0.14 の構成を React 0.13 にダウングレードした。
前回（React 15 → 0.14）が Next.js 除去と Express + webpack CSR 化という大規模なアーキテクチャ変更だったのに対し、今回は **React 0.14 → 0.13 の API 差分への対応** が中心の改修となった。

38 ファイル変更、+1,201 / -1,261 行。

主な変更軸：
- **関数コンポーネント → クラスコンポーネント**：React 0.13 は Stateless Functional Component（SFC）をサポートしない（0.14 で導入された機能）
- **`ReactDOM.render()` → `React.render()`**：`react-dom` パッケージは React 0.14 で分離されたもので、0.13 では `React` オブジェクトのメソッド
- **`ReactDOM.findDOMNode()` → `React.findDOMNode()`**：同様に `react-dom` から `React` に戻す
- **`prop-types` → `React.PropTypes`**：React 0.13 では PropTypes が React コアに内蔵
- **`react-dom`・`prop-types` パッケージ削除**：React 0.13 では不要

このドキュメントでは、ダウングレードに伴い **何を・なぜ・どのように** 変更したかを記録する。

---

## 2. 依存パッケージの変更

`web/package.json` で以下のパッケージバージョンを変更した。

| パッケージ | 変更前（React 0.14） | 変更後（React 0.13） |
|---|---|---|
| `react` | `^0.14.10` | `^0.13.3` |

**追加パッケージ：**

| パッケージ | バージョン | 追加理由 |
|---|---|---|
| `babel-core` | `^6.26.3` | Babel トランスパイルのコアモジュール |

**削除パッケージ：**

| パッケージ | 削除理由 |
|---|---|
| `react-dom` | React 0.13 では `render` / `findDOMNode` は `React` オブジェクトのメソッド。`react-dom` は 0.14 で分離されたパッケージ |
| `prop-types` | React 0.13 では `PropTypes` が `React` コアに内蔵。外部パッケージは不要 |

**npm scripts の変更：** なし

---

## 3. 改修パターン一覧

### 3.1 関数コンポーネント → クラスコンポーネント（30 ファイル）

| 項目 | 内容 |
|---|---|
| **変更内容** | すべての関数コンポーネント（SFC）をクラスコンポーネントに変換 |
| **変更理由** | React 0.13 は Stateless Functional Component をサポートしない。SFC は React 0.14 で導入された機能 |
| **対象ファイル** | 30 ファイル（下記一覧参照） |

#### React 0.14（変更前） — `Layout.js`

```js
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

#### React 0.13（変更後） — `Layout.js`

```js
export class Layout extends React.Component {
  render() {
    var props = this.props;
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
}
```

**変換パターン：**

- `export function X(props)` → `export class X extends React.Component { render() { var props = this.props; ... } }`
- 関数本体をそのまま `render()` メソッド内に移動し、`props` は `this.props` から取得

**副次効果 — `ActivateEffect.js`：**

- React 0.14 では関数コンポーネントが `null` を返せないため `return React.createElement('noscript', null)` というワークアラウンドを使っていた
- クラスコンポーネントに変換したことで、`render()` メソッドから `return null` が使えるようになり、ワークアラウンドが不要になった

---

### 3.2 `ReactDOM.render()` → `React.render()`（`client.js`）

| 項目 | 内容 |
|---|---|
| **変更内容** | `ReactDOM.render()` を `React.render()` に変更し、`require('react-dom')` を削除 |
| **変更理由** | React 0.13 では `render()` が `React` オブジェクトのメソッド。`react-dom` は React 0.14 で分離されたパッケージ |
| **対象ファイル** | `client.js` |

#### React 0.14（変更前） — `client.js`

```js
var React = require('react');
var ReactDOM = require('react-dom');

// ...

ReactDOM.render(
  React.createElement(Layout, null,
    React.createElement(Room, { initialData: json.data })
  ),
  rootEl
);
```

#### React 0.13（変更後） — `client.js`

```js
var React = require('react');

// ...

React.render(
  React.createElement(Layout, null,
    React.createElement(Room, { initialData: json.data })
  ),
  rootEl
);
```

**ポイント:**

- `require('react-dom')` を削除し、`ReactDOM.render()` → `React.render()` に変更（2 箇所）
- `React.createElement` の使用方法に変更なし

---

### 3.3 `ReactDOM.findDOMNode()` → `React.findDOMNode()`（`Room.js`、`Top.js`）

| 項目 | 内容 |
|---|---|
| **変更内容** | callback ref 内で `React.findDOMNode()` を使い、コンポーネントインスタンスから DOM 要素を取得するように変更 |
| **変更理由** | React 0.13 の callback ref はコンポーネントインスタンスを返す（DOM 要素ではない）。`<dialog>` 要素の操作（`showModal()` / `close()`）には DOM 要素が必要なため、`React.findDOMNode()` で変換する |
| **対象ファイル** | `Room.js`（5 箇所）、`Top.js`（1 箇所） |

#### React 0.14（変更前） — `Room.js`

```js
setNoticeDialogRef(el) { this.noticeDialogRef = el; }
setWaitingCreaterStartDialogRef(el) { this.waitingCreaterStartDialogRef = el; }
setStartTurnDialogRef(el) { this.startTurnDialogRef = el; }
setTurnResultDialogRef(el) { this.turnResultDialogRef = el; }
setGameResultDialogRef(el) { this.gameResultDialogRef = el; }
```

#### React 0.13（変更後） — `Room.js`

```js
setNoticeDialogRef(el) { this.noticeDialogRef = el ? React.findDOMNode(el) : null; }
setWaitingCreaterStartDialogRef(el) { this.waitingCreaterStartDialogRef = el ? React.findDOMNode(el) : null; }
setStartTurnDialogRef(el) { this.startTurnDialogRef = el ? React.findDOMNode(el) : null; }
setTurnResultDialogRef(el) { this.turnResultDialogRef = el ? React.findDOMNode(el) : null; }
setGameResultDialogRef(el) { this.gameResultDialogRef = el ? React.findDOMNode(el) : null; }
```

#### React 0.14（変更前） — `Top.js`

```js
setJoinDialogRef(el) {
  this.joinDialogRef = el;
}
```

#### React 0.13（変更後） — `Top.js`

```js
setJoinDialogRef(el) {
  this.joinDialogRef = el ? React.findDOMNode(el) : null;
}
```

**ポイント:**

- `el ? React.findDOMNode(el) : null` のガードパターンで、`el` が `null`（アンマウント時）の場合を安全に処理
- React 0.14 では callback ref が DOM 要素を直接返すため不要だったが、0.13 ではコンポーネントインスタンスが返されるため `findDOMNode()` での変換が必要
- このパターンは `dialogRef` プロップで渡している `<dialog>` 要素の参照取得に使用（`showModal()` / `close()` の呼び出しに必要）

---

### 3.4 `prop-types` → `React.PropTypes`（`ToastProvider.js`）

| 項目 | 内容 |
|---|---|
| **変更内容** | `import PropTypes from 'prop-types'` を削除し、`PropTypes.xxx` を `React.PropTypes.xxx` に変更 |
| **変更理由** | React 0.13 では `PropTypes` が `React` コアに組み込まれている。外部の `prop-types` パッケージは React 15.5 で PropTypes が非推奨になった際に代替として作られたもの |
| **対象ファイル** | `ToastProvider.js` |

#### React 0.14（変更前） — `ToastProvider.js`

```js
import React from 'react';
import PropTypes from 'prop-types';

var toastShape = PropTypes.shape({
  isOpen: PropTypes.bool.isRequired,
  message: PropTypes.node,
  open: PropTypes.func.isRequired,
});

// ...

ToastProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
```

#### React 0.13（変更後） — `ToastProvider.js`

```js
import React from 'react';

var toastShape = React.PropTypes.shape({
  isOpen: React.PropTypes.bool.isRequired,
  message: React.PropTypes.node,
  open: React.PropTypes.func.isRequired,
});

// ...

ToastProvider.propTypes = {
  children: React.PropTypes.node.isRequired,
};
```

**ポイント:**

- `import PropTypes from 'prop-types'` を削除
- `PropTypes.xxx` → `React.PropTypes.xxx` に一括置換（5 箇所）
- レガシー Context API（`childContextTypes` / `getChildContext` / `contextTypes`）での PropTypes 使用パターンは変更なし

---

### 3.5 CLAUDE.md の更新

| 項目 | 内容 |
|---|---|
| **変更内容** | プロジェクトの技術ドキュメントを React 0.13 の実態に合わせて更新 |
| **対象ファイル** | `CLAUDE.md` |

主な変更点：

- 技術スタック: `React 0.14` → `React 0.13`
- 技術スタック: `prop-types` → `React.PropTypes`（React 組み込み）
- `npm install` のコメントから `prop-typesのpeerDep警告回避` の注釈を削除
- React 固有パターン: `React 0.14固有のパターン` → `React 0.13固有のパターン`
- 「全コンポーネントがクラスコンポーネントまたは関数コンポーネント」→「全コンポーネントがクラスコンポーネント（React 0.13は関数コンポーネント未サポート）」
- 「関数コンポーネントはnullを返せない」の記述を削除（クラスコンポーネントでは `return null` が可能なため不要に）

---

## 4. 変更ファイル一覧

### 変更ファイル（38 ファイル）

| # | ファイル | 主な変更内容 |
|---|---|---|
| 1 | `CLAUDE.md` | React 0.14 → 0.13、prop-types → React.PropTypes 等の記述更新 |
| 2 | `web/.gitignore` | `web/static/bundle.js` → `static/bundle.js`（パス修正） |
| 3 | `web/client.js` | `require('react-dom')` 削除、`ReactDOM.render` → `React.render` |
| 4 | `web/components/Layout.js` | 関数コンポーネント → クラスコンポーネント |
| 5 | `web/components/LoadingOverlay.js` | 関数コンポーネント → クラスコンポーネント |
| 6 | `web/components/buttons/Button.js` | 関数コンポーネント → クラスコンポーネント |
| 7 | `web/components/dialogs/InfoDialog.js` | 関数コンポーネント → クラスコンポーネント |
| 8 | `web/components/dialogs/notice/NoticeDailog.js` | 関数コンポーネント → クラスコンポーネント |
| 9 | `web/components/icons/Armchair.js` | 関数コンポーネント → クラスコンポーネント |
| 10 | `web/components/icons/ChevronRight.js` | 関数コンポーネント → クラスコンポーネント |
| 11 | `web/components/icons/Copy.js` | 関数コンポーネント → クラスコンポーネント |
| 12 | `web/components/icons/Meh.js` | 関数コンポーネント → クラスコンポーネント |
| 13 | `web/components/icons/Skull.js` | 関数コンポーネント → クラスコンポーネント |
| 14 | `web/components/icons/Trophy.js` | 関数コンポーネント → クラスコンポーネント |
| 15 | `web/components/icons/Zap.js` | 関数コンポーネント → クラスコンポーネント |
| 16 | `web/features/room/components/ActivateEffect.js` | 関数コンポーネント → クラスコンポーネント、`<noscript />` → `return null` に復帰 |
| 17 | `web/features/room/components/Chair.js` | 関数コンポーネント → クラスコンポーネント |
| 18 | `web/features/room/components/ChairContainer.js` | 関数コンポーネント → クラスコンポーネント |
| 19 | `web/features/room/components/GameStatusContainer.js` | 関数コンポーネント → クラスコンポーネント |
| 20 | `web/features/room/components/InstructionContainer.js` | 関数コンポーネント → クラスコンポーネント |
| 21 | `web/features/room/components/InstructionMessage.js` | 関数コンポーネント → クラスコンポーネント |
| 22 | `web/features/room/components/PlayerStatus.js` | 関数コンポーネント → クラスコンポーネント |
| 23 | `web/features/room/components/PlayerStatusContainer.js` | 関数コンポーネント → クラスコンポーネント |
| 24 | `web/features/room/components/RoomContainer.js` | 関数コンポーネント → クラスコンポーネント |
| 25 | `web/features/room/components/RoundStatus.js` | 関数コンポーネント → クラスコンポーネント |
| 26 | `web/features/room/components/dialogs/CreaterWaitingStartDialog.js` | 関数コンポーネント → クラスコンポーネント |
| 27 | `web/features/room/components/dialogs/GameResultDialog.js` | 関数コンポーネント → クラスコンポーネント |
| 28 | `web/features/room/components/dialogs/StartTurnDialog.js` | 関数コンポーネント → クラスコンポーネント |
| 29 | `web/features/room/components/dialogs/TurnResultDialog.js` | 関数コンポーネント → クラスコンポーネント |
| 30 | `web/features/room/page/Room.js` | callback ref に `React.findDOMNode()` ガード追加（5 箇所） |
| 31 | `web/features/top/components/TopMenu.js` | 関数コンポーネント → クラスコンポーネント |
| 32 | `web/features/top/components/TopOperations.js` | 関数コンポーネント → クラスコンポーネント |
| 33 | `web/features/top/components/TopTitle.js` | 関数コンポーネント → クラスコンポーネント |
| 34 | `web/features/top/components/dialogs/JoinDialog.js` | 関数コンポーネント → クラスコンポーネント |
| 35 | `web/features/top/page/Top.js` | callback ref に `React.findDOMNode()` ガード追加（1 箇所） |
| 36 | `web/package.json` | react `^0.14.10` → `^0.13.3`、react-dom・prop-types 削除、babel-core 追加 |
| 37 | `web/package-lock.json` | 依存関係の再解決 |
| 38 | `web/utils/toast/ToastProvider.js` | `import PropTypes` 削除、`PropTypes.xxx` → `React.PropTypes.xxx` |
