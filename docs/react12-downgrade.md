# React 0.12 ダウングレード改修ドキュメント

## 1. 概要

学習目的で、React 0.13 の構成を React 0.12 にダウングレードした。
前回（React 0.14 → 0.13）が関数コンポーネント廃止や `react-dom` 廃止対応だったのに対し、今回は **ES6 class ベースのコンポーネント定義を `React.createClass` に戻す対応** と **ref 参照方式の変更** が中心の改修となった。

37 ファイル変更、+367 / -304 行。

主な変更軸：
- **`React.Component` クラス → `React.createClass`**：React 0.12 は ES6 class コンポーネントを前提としないため、全コンポーネントを createClass 定義へ統一
- **`constructor` / 手動 `bind` → `getInitialState` + 自動 bind**：インスタンス初期化とメソッド定義を createClass の流儀に移行
- **callback ref + `React.findDOMNode()` → string ref + `getDOMNode()`**：ダイアログ DOM 参照の取得方式を React 0.12 互換に変更
- **`contextTypes` / `propTypes` の配置変更**：クラス外代入ではなく createClass spec 内へ移動
- **依存バージョン更新**：`react` を `^0.13.3` から `^0.12.2` に変更

このドキュメントでは、ダウングレードに伴い **何を・なぜ・どのように** 変更したかを記録する。

---

## 2. 依存パッケージの変更

`web/package.json` で以下のパッケージバージョンを変更した。

| パッケージ | 変更前（React 0.13） | 変更後（React 0.12） |
|---|---|---|
| `react` | `^0.13.3` | `^0.12.2` |

**追加パッケージ：** なし

**削除パッケージ：** なし

**npm scripts の変更：** なし

`web/package-lock.json` では `node_modules/react` が `0.13.3` から `0.12.2` に再解決されている。

---

## 3. 改修パターン一覧

### 3.1 `class extends React.Component` → `React.createClass`（34 ファイル）

| 項目 | 内容 |
|---|---|
| **変更内容** | ES6 class コンポーネント定義を `React.createClass({ ... })` に置換 |
| **変更理由** | React 0.12 では ES6 class を前提とした書き方より createClass 形式が互換性の高いパターン |
| **対象ファイル** | 34 ファイル（主要な UI コンポーネント + `Room.js` + `Top.js` + Toast 周辺） |

#### React 0.13（変更前） — `web/components/buttons/Button.js`

```js
export class Button extends React.Component {
  render() {
    var props = this.props;
    // ...
  }
}
```

#### React 0.12（変更後） — `web/components/buttons/Button.js`

```js
var Button = React.createClass({
  render: function() {
    var props = this.props;
    // ...
  }
});

export { Button };
```

**変換パターン：**
- `export class X extends React.Component` → `var X = React.createClass({ ... })`
- `render() { ... }` → `render: function() { ... }`
- 末尾を `export { X };` 形式に統一

---

### 3.2 `constructor` 初期化 + 手動 `bind` の除去（`Room.js`、`Top.js`、`ToastProvider.js`）

| 項目 | 内容 |
|---|---|
| **変更内容** | `constructor` を廃止し、`getInitialState` へ state 初期化を移行。メソッドは createClass の自動 bind を利用 |
| **変更理由** | React 0.12 の createClass では `getInitialState` と spec 内メソッド定義が標準パターン |
| **対象ファイル** | `web/features/room/page/Room.js`, `web/features/top/page/Top.js`, `web/utils/toast/ToastProvider.js` |

#### React 0.13（変更前） — `web/features/top/page/Top.js`

```js
class Top extends React.Component {
  constructor(props) {
    super(props);
    this.state = { ... };
    this.showJoinModal = this.showJoinModal.bind(this);
    this.closeJoinModal = this.closeJoinModal.bind(this);
  }
}
```

#### React 0.12（変更後） — `web/features/top/page/Top.js`

```js
var Top = React.createClass({
  getInitialState: function() {
    return { ... };
  },

  showJoinModal: function() {
    // ...
  },

  closeJoinModal: function() {
    // ...
  }
});
```

**ポイント：**
- `this.xxx = this.xxx.bind(this)` を削除
- state の初期値は `getInitialState` の戻り値に集約
- インスタンス変数（`this.userId`、`this.roomId`、`this._timerId` など）は `getInitialState` 内で初期化

---

### 3.3 ダイアログ参照方式の変更（`dialogRef` 廃止）

| 項目 | 内容 |
|---|---|
| **変更内容** | `dialogRef` props + callback ref パターンを廃止し、`ref="..."` + `getDialogNode()` + `getDOMNode()` の参照チェーンへ変更 |
| **変更理由** | React 0.12 互換の ref 運用に統一し、`React.findDOMNode()` 依存を除去するため |
| **対象ファイル** | `InfoDialog.js`, `NoticeDailog.js`, `CreaterWaitingStartDialog.js`, `StartTurnDialog.js`, `JoinDialog.js`, `GameResultDialog.js`, `TurnResultDialog.js`, `Top.js`, `Room.js` |

#### React 0.13（変更前） — `web/components/dialogs/InfoDialog.js`

```js
<dialog ref={props.dialogRef}>
```

#### React 0.12（変更後） — `web/components/dialogs/InfoDialog.js`

```js
getDialogNode: function() {
  return this.refs.dialog.getDOMNode();
},

<dialog ref="dialog">
```

#### React 0.13（変更前） — `web/features/top/page/Top.js`

```js
setJoinDialogRef(el) {
  this.joinDialogRef = el ? React.findDOMNode(el) : null;
}
```

#### React 0.12（変更後） — `web/features/top/page/Top.js`

```js
getJoinDialogNode: function() {
  return this.refs.joinDialog.getDialogNode();
}
```

**ポイント：**
- 親コンポーネントは子に `dialogRef` を渡さず、`ref="joinDialog"` / `ref="noticeDialog"` 等でコンポーネント参照を保持
- DOM 要素が必要な箇所では `this.refs.xxx.getDialogNode()` で取得
- `React.findDOMNode()` 呼び出しを削除

---

### 3.4 `setState(function(prevState){...})` の調整（`Room.js`）

| 項目 | 内容 |
|---|---|
| **変更内容** | Firestore snapshot 更新時の state 更新を updater 関数から通常オブジェクト更新へ変更 |
| **変更理由** | `previousRoomData` を state updater 内で参照する実装から、インスタンス変数で明示的に管理する形へ整理 |
| **対象ファイル** | `web/features/room/page/Room.js` |

#### React 0.13（変更前）

```js
self.setState(function(prevState) {
  if (data.round.phase === 'activating') {
    self.previousRoomData = prevState.roomData;
  }
  return { roomData: data };
});
```

#### React 0.12（変更後）

```js
if (data.round.phase === 'activating') {
  self.previousRoomData = self.state.roomData;
}
self.setState({ roomData: data });
```

---

### 3.5 `contextTypes` / `propTypes` を createClass spec 内へ移動

| 項目 | 内容 |
|---|---|
| **変更内容** | クラス定義の外側で行っていた `contextTypes` / `childContextTypes` / `propTypes` の代入を createClass オブジェクト内定義に移行 |
| **変更理由** | createClass の定義パターンに合わせ、関連定義をコンポーネント宣言へ集約 |
| **対象ファイル** | `web/features/room/page/Room.js`, `web/features/top/page/Top.js`, `web/utils/toast/Toast.js`, `web/utils/toast/ToastProvider.js` |

#### React 0.13（変更前） — `web/utils/toast/Toast.js`

```js
class Toast extends React.Component {
  // ...
}

Toast.contextTypes = {
  toast: toastShape,
};
```

#### React 0.12（変更後） — `web/utils/toast/Toast.js`

```js
var Toast = React.createClass({
  contextTypes: {
    toast: toastShape,
  },
  // ...
});
```

---

### 3.6 CLAUDE.md の更新

| 項目 | 内容 |
|---|---|
| **変更内容** | 技術スタック説明を React 0.12 実装に合わせて更新 |
| **対象ファイル** | `CLAUDE.md` |

主な変更点：
- `React 0.13` → `React 0.12` に更新
- 「React 0.13固有のパターン」→「React 0.12固有のパターン」に更新
- `callback ref` / `React.findDOMNode()` 前提の説明を削除し、`string ref + getDialogNode() + getDOMNode()` の記述へ差し替え
- `React.createClass` / `getInitialState` 前提の運用説明を追記

---

## 4. 変更ファイル一覧

### 変更ファイル（37 ファイル）

| # | ファイル | 主な変更内容 |
|---|---|---|
| 1 | `CLAUDE.md` | React 0.12 実装に合わせた技術説明へ更新 |
| 2 | `web/components/Layout.js` | class → `React.createClass` |
| 3 | `web/components/LoadingOverlay.js` | class → `React.createClass` |
| 4 | `web/components/buttons/Button.js` | class → `React.createClass` |
| 5 | `web/components/dialogs/InfoDialog.js` | class → createClass、`getDialogNode()` 追加、`ref="dialog"` 化 |
| 6 | `web/components/dialogs/notice/NoticeDailog.js` | class → createClass、`InfoDialog` 参照を `ref="infoDialog"` 化 |
| 7 | `web/components/icons/Armchair.js` | class → `React.createClass` |
| 8 | `web/components/icons/ChevronRight.js` | class → `React.createClass` |
| 9 | `web/components/icons/Copy.js` | class → `React.createClass` |
| 10 | `web/components/icons/Meh.js` | class → `React.createClass` |
| 11 | `web/components/icons/Skull.js` | class → `React.createClass` |
| 12 | `web/components/icons/Trophy.js` | class → `React.createClass` |
| 13 | `web/components/icons/Zap.js` | class → `React.createClass` |
| 14 | `web/features/room/components/ActivateEffect.js` | class → `React.createClass` |
| 15 | `web/features/room/components/Chair.js` | class → `React.createClass` |
| 16 | `web/features/room/components/ChairContainer.js` | class → `React.createClass` |
| 17 | `web/features/room/components/GameStatusContainer.js` | class → `React.createClass` |
| 18 | `web/features/room/components/InstructionContainer.js` | class → `React.createClass` |
| 19 | `web/features/room/components/InstructionMessage.js` | class → `React.createClass` |
| 20 | `web/features/room/components/PlayerStatus.js` | class → `React.createClass` |
| 21 | `web/features/room/components/PlayerStatusContainer.js` | class → `React.createClass` |
| 22 | `web/features/room/components/RoomContainer.js` | class → `React.createClass` |
| 23 | `web/features/room/components/RoundStatus.js` | class → `React.createClass` |
| 24 | `web/features/room/components/dialogs/CreaterWaitingStartDialog.js` | class → createClass、`getDialogNode()` 追加 |
| 25 | `web/features/room/components/dialogs/GameResultDialog.js` | class → createClass、`getDialogNode()` 追加 |
| 26 | `web/features/room/components/dialogs/StartTurnDialog.js` | class → createClass、`InfoDialog` 参照の `ref` 化 |
| 27 | `web/features/room/components/dialogs/TurnResultDialog.js` | class → createClass、`getDialogNode()` 追加 |
| 28 | `web/features/room/page/Room.js` | class → createClass、`constructor` 廃止、string ref 化、`React.findDOMNode` 削除 |
| 29 | `web/features/top/components/TopMenu.js` | class → `React.createClass` |
| 30 | `web/features/top/components/TopOperations.js` | class → `React.createClass` |
| 31 | `web/features/top/components/TopTitle.js` | class → `React.createClass` |
| 32 | `web/features/top/components/dialogs/JoinDialog.js` | class → createClass、`InfoDialog` 参照の `ref` 化 |
| 33 | `web/features/top/page/Top.js` | class → createClass、`constructor` 廃止、string ref 化、`React.findDOMNode` 削除 |
| 34 | `web/package-lock.json` | `react@0.12.2` へロック更新 |
| 35 | `web/package.json` | `react` を `^0.13.3` → `^0.12.2` に変更 |
| 36 | `web/utils/toast/Toast.js` | class → createClass、`contextTypes` を spec 内へ移動 |
| 37 | `web/utils/toast/ToastProvider.js` | class → createClass、`getInitialState` 化、`childContextTypes`/`propTypes` を spec 内へ移動 |

