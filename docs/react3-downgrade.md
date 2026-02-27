# React 0.3 ダウングレード改修ドキュメント

## 1. 概要

学習目的で、React 0.4 の構成を React 0.3 にダウングレードした。
前回（React 0.5 → 0.4）が npm → CDN への配信方式切り替えが中心だったのに対し、今回は **React 内部の自動バインド廃止・children の渡し方の変更** への対応がほぼ全てのコンポーネントに影響する大規模な改修となった。

20 ファイル変更、+165 / -158 行。

主な変更軸：
- **`React.autoBind()` による明示的メソッドバインド**：`createClass` 内のメソッドが自動バインドされなくなったため、コールバックとして渡すメソッドを `React.autoBind()` でラップ
- **複数 children → 配列ラップ**：`React.DOM.div(null, child1, child2)` が動作しなくなり、`React.DOM.div(null, [child1, child2])` に変更
- **`componentDidUpdate` 内の `setState` → `setTimeout` 遅延**：更新サイクル中の `setState` が "Invariant Violation" を引き起こすため、`setTimeout(fn, 0)` で遅延実行
- **`e.currentTarget` → `e.target`**：`currentTarget` プロパティが未サポートのため `e.target` に変更

このドキュメントでは、ダウングレードに伴い **何を・なぜ・どのように** 変更したかを記録する。

---

## 2. 依存パッケージの変更

`web/index.html` で CDN の URL を変更した。

| 項目 | 変更前（React 0.4） | 変更後（React 0.3） |
|---|---|---|
| CDN URL | `react/0.4.0/react.js` | `react/0.3.0/react.js` |

**追加パッケージ：** なし

**削除パッケージ：** なし

**npm scripts の変更：** なし

---

## 3. 改修パターン一覧

### 3.1 `React.autoBind()` による明示的メソッドバインド（2 ファイル、16 メソッド）

| 項目 | 内容 |
|---|---|
| **変更内容** | `createClass` 内でコールバックとして渡されるメソッドを `React.autoBind()` でラップ |
| **変更理由** | React 0.3 では `createClass` のメソッドが自動的に `this` バインドされない。イベントハンドラや子コンポーネントへの props として渡すメソッドは、明示的にバインドしないと `this` が `undefined` になる |
| **対象ファイル** | `web/features/room/page/Room.js`（12 メソッド）、`web/features/top/page/Top.js`（4 メソッド） |

#### 対象メソッド一覧

**Room.js（12 メソッド）：**
`showNoticeModal`、`closeNoticeModal`、`showTurnResultModal`、`showGameResultModal`、`playShockEffect`、`playSafeEffect`、`setSelectedChair`、`setShowShock`、`copyRoomId`、`handleSubmitActivate`、`handleChangeTurn`、`handleFormSubmit`

**Top.js（4 メソッド）：**
`showJoinModal`、`closeJoinModal`、`createAction`、`joinAction`

#### React 0.4（変更前）

```js
var Room = React.createClass({
  showNoticeModal: function(data, miliseconds) {
    var node = this.getNoticeDialogNode();
    // ...
  },

  closeNoticeModal: function() {
    var node = this.getNoticeDialogNode();
    // ...
  },
});
```

#### React 0.3（変更後）

```js
var Room = React.createClass({
  showNoticeModal: React.autoBind(function(data, miliseconds) {
    var node = this.getNoticeDialogNode();
    // ...
  }),

  closeNoticeModal: React.autoBind(function() {
    var node = this.getNoticeDialogNode();
    // ...
  }),
});
```

**変換のポイント：**
- `methodName: function(...) { ... },` → `methodName: React.autoBind(function(...) { ... }),`
- 全てのメソッドに適用する必要はなく、**コールバックとして渡されるメソッド** のみが対象（`getInitialState`、`render`、`componentDidMount` 等のライフサイクルメソッドや、内部でのみ呼ばれるメソッドは不要）
- `async function` にも適用可能：`React.autoBind(async function() { ... })`

---

### 3.2 複数 children → 配列ラップ（19 ファイル）

| 項目 | 内容 |
|---|---|
| **変更内容** | コンポーネントや `React.DOM.*` に複数の children を渡す際、可変長引数ではなく配列で渡すように変更 |
| **変更理由** | React 0.3 では、コンポーネントファクトリの第 2 引数以降に複数の children を展開して渡す記法がサポートされていない。children は単一要素か配列で渡す必要がある |
| **対象ファイル** | 全 19 JS ファイル（`index.html` を除く全ての変更ファイル） |

#### React 0.4（変更前）

```js
// Layout.js
React.DOM.div({className: 'w-full grid place-items-center bg-gray-900'},
  React.DOM.div({className: 'w-full max-w-screen-md'},
    props.children
  ),
  Toast(null)
)
```

#### React 0.3（変更後）

```js
// Layout.js
React.DOM.div({className: 'w-full grid place-items-center bg-gray-900'},
  [React.DOM.div({className: 'w-full max-w-screen-md'},
    props.children
  ),
  Toast(null)]
)
```

**変換のポイント：**
- `Component(props, child1, child2)` → `Component(props, [child1, child2])`
- 第 2 引数以降に 2 つ以上の children がある場合のみ配列化が必要（children が 1 つの場合はそのまま）
- ネストが深い場合は内側から外側へ順に対応する
- `React.DOM.span(null, textChild1, textChild2)` のようなテキストノードの混在も同様に配列化

#### 典型的なネストパターン（JoinDialog.js）

```js
// React 0.4（変更前）
React.DOM.div({className: 'grid gap-4 grid-cols-2'},
  Button({type: 'button', onClick: close}, 'キャンセル'),
  Button(null, '入室')
)

// React 0.3（変更後）
React.DOM.div({className: 'grid gap-4 grid-cols-2'},
  [Button({type: 'button', onClick: close}, 'キャンセル'),
  Button(null, '入室')]
)
```

---

### 3.3 `componentDidUpdate` 内の `setState` → `setTimeout` 遅延（2 ファイル）

| 項目 | 内容 |
|---|---|
| **変更内容** | `componentDidUpdate` 内の `setState` 呼び出しや副作用を `setTimeout(fn, 0)` でラップ |
| **変更理由** | React 0.3 では、更新サイクル（`componentDidUpdate`）中に `setState` を直接呼ぶと "Invariant Violation: replaceState(...): Cannot update during an existing state transition" エラーが発生する。`setTimeout` で次のイベントループに遅延させることで回避 |
| **対象ファイル** | `web/features/room/page/Room.js`、`web/features/top/page/Top.js` |

#### React 0.4（変更前） — Room.js `componentDidUpdate`（抜粋）

```js
componentDidUpdate: function(prevProps, prevState) {
    var roomData = this.state.roomData;
    // ...

    if (roomData.round.phase === 'sitting' && isAttacker) {
      RoomPhaseHandlers.handleSittingPhase(this.showNoticeModal, this.closeNoticeModal);
    }

    if (roomData.round.phase === 'result' && !roomData.round.result.shownResult) {
      RoomPhaseHandlers.handleResultPhase(
        roomData,
        this.showGameResultModal,
        this.showTurnResultModal,
        this.setShowShock,
        this.playShockEffect,
        this.playSafeEffect
      );
    }
  },
```

#### React 0.3（変更後） — Room.js `componentDidUpdate`（抜粋）

```js
componentDidUpdate: function(prevProps, prevState) {
    var self = this;
    var roomData = this.state.roomData;
    // ...

    if (roomData.round.phase === 'sitting' && isAttacker) {
      setTimeout(function() {
        RoomPhaseHandlers.handleSittingPhase(self.showNoticeModal, self.closeNoticeModal);
      }, 0);
    }

    if (roomData.round.phase === 'result' && !roomData.round.result.shownResult) {
      setTimeout(function() {
        RoomPhaseHandlers.handleResultPhase(
          roomData,
          self.showGameResultModal,
          self.showTurnResultModal,
          self.setShowShock,
          self.playShockEffect,
          self.playSafeEffect
        );
      }, 0);
    }
  },
```

#### React 0.4（変更前） — Top.js `componentDidUpdate`

```js
componentDidUpdate: function(prevProps, prevState) {
    if (
      (this.state.isJoining && !prevState.isJoining) ||
      (!this.state.isShowJoinDialog && prevState.isShowJoinDialog)
    ) {
      this.setState({ joinError: '' });
    }

    if (this.state.createError && this.state.createError !== prevState.createError) {
      toastStore.open(this.state.createError);
    }
  },
```

#### React 0.3（変更後） — Top.js `componentDidUpdate`

```js
componentDidUpdate: function(prevProps, prevState) {
    var self = this;
    if (
      (this.state.isJoining && !prevState.isJoining) ||
      (!this.state.isShowJoinDialog && prevState.isShowJoinDialog)
    ) {
      setTimeout(function() { self.setState({ joinError: '' }); }, 0);
    }

    if (this.state.createError && this.state.createError !== prevState.createError) {
      var error = this.state.createError;
      setTimeout(function() { toastStore.open(error); }, 0);
    }
  },
```

**変換のポイント：**
- `var self = this;` を `componentDidUpdate` の先頭に追加し、`setTimeout` 内で `self` 経由でメソッドを呼び出す
- `setTimeout(function() { ... }, 0)` はタイマー遅延ではなく、React の更新サイクル完了後に実行させるためのテクニック
- `toastStore.open()` も内部で状態更新を伴うため、同様に遅延が必要

---

### 3.4 `e.currentTarget` → `e.target`（1 ファイル）

| 項目 | 内容 |
|---|---|
| **変更内容** | フォームの `onSubmit` ハンドラ内で `e.currentTarget` を `e.target` に変更 |
| **変更理由** | React 0.3 の SyntheticEvent には `currentTarget` プロパティが存在しないため、`e.target` で代替 |
| **対象ファイル** | `web/features/top/components/dialogs/JoinDialog.js` |

#### React 0.4（変更前）

```js
React.DOM.form({
  onSubmit: function(e) {
    e.preventDefault();
    props.joinAction(new FormData(e.currentTarget));
  }
},
```

#### React 0.3（変更後）

```js
React.DOM.form({
  onSubmit: function(e) {
    e.preventDefault();
    props.joinAction(new FormData(e.target));
  }
},
```

**変換のポイント：**
- `form` の `onSubmit` では `e.target` と `e.currentTarget` は通常同じ要素を指すため、この変更による動作の違いはない
- ただし、イベントがバブリングで伝播した場合は `target`（イベント発生元）と `currentTarget`（ハンドラが設定された要素）が異なる可能性があるため、用途に注意が必要

---

## 4. 変更ファイル一覧

### 変更ファイル（20 ファイル）

| # | ファイル | 主な変更内容 |
|---|---|---|
| 1 | `web/index.html` | CDN URL を `react/0.4.0` → `react/0.3.0` に変更 |
| 2 | `web/components/Layout.js` | children 配列ラップ |
| 3 | `web/components/dialogs/InfoDialog.js` | children 配列ラップ |
| 4 | `web/components/dialogs/notice/NoticeDailog.js` | children 配列ラップ |
| 5 | `web/components/icons/Armchair.js` | children 配列ラップ |
| 6 | `web/components/icons/Copy.js` | children 配列ラップ |
| 7 | `web/components/icons/Meh.js` | children 配列ラップ |
| 8 | `web/components/icons/Skull.js` | children 配列ラップ |
| 9 | `web/components/icons/Trophy.js` | children 配列ラップ |
| 10 | `web/features/room/components/PlayerStatus.js` | children 配列ラップ |
| 11 | `web/features/room/components/RoundStatus.js` | children 配列ラップ |
| 12 | `web/features/room/components/dialogs/CreaterWaitingStartDialog.js` | children 配列ラップ |
| 13 | `web/features/room/components/dialogs/GameResultDialog.js` | children 配列ラップ |
| 14 | `web/features/room/components/dialogs/StartTurnDialog.js` | children 配列ラップ |
| 15 | `web/features/room/components/dialogs/TurnResultDialog.js` | children 配列ラップ |
| 16 | `web/features/top/components/TopOperations.js` | children 配列ラップ |
| 17 | `web/features/top/components/TopTitle.js` | children 配列ラップ |
| 18 | `web/features/top/components/dialogs/JoinDialog.js` | children 配列ラップ + `e.currentTarget` → `e.target` |
| 19 | `web/features/room/page/Room.js` | `React.autoBind`（12 メソッド）+ children 配列ラップ + `setTimeout` 遅延 |
| 20 | `web/features/top/page/Top.js` | `React.autoBind`（4 メソッド）+ children 配列ラップ + `setTimeout` 遅延 |
