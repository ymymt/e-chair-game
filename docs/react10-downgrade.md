# React 0.10 ダウングレード改修ドキュメント

## 1. 概要

学習目的で、React 0.11 の構成を React 0.10 にダウングレードした。
前回（React 0.12 → 0.11）が JSX 全廃と `React.DOM.*` ファクトリ直接記述への移行が中心だったのに対し、今回は **`return null` の廃止と `<dialog>` 要素の手動実装への移行** が中心の改修となった。

7 ファイル変更（+ `package-lock.json`、`styles.css`）。

主な変更軸：
- **`return null` → `React.DOM.span(null)`**：render() から `null` を返す機能は React 0.11 で追加されたため、0.10 では空の `span` 要素を返す必要がある
- **`React.DOM.dialog` → `React.DOM.div` + backdrop 構造**：`<dialog>` 要素のサポートは React 0.11 で `React.DOM.dialog` として追加されたため、0.10 では `div` による手動実装に変更
- **`showModal()`/`close()` → `style.display` 操作**：`<dialog>` API が使えないため、CSS の `display` プロパティで表示/非表示を制御

このドキュメントでは、ダウングレードに伴い **何を・なぜ・どのように** 変更したかを記録する。

---

## 2. 依存パッケージの変更

`web/package.json` で以下のパッケージバージョンを変更した。

| パッケージ | 変更前（React 0.11） | 変更後（React 0.10） |
|---|---|---|
| `react` | `^0.11.2` | `^0.10.0` |

**追加パッケージ：** なし

**削除パッケージ：** なし

**npm scripts の変更：** なし

`web/package-lock.json` では `node_modules/react` が `0.11.2` から `0.10.0` に再解決されている。

---

## 3. 改修パターン一覧

### 3.1 `return null` → `React.DOM.span(null)`（2 ファイル）

| 項目 | 内容 |
|---|---|
| **変更内容** | render() で条件的に `null` を返していた箇所を `React.DOM.span(null)` に変更 |
| **変更理由** | React 0.11 で render() から `null` を返す機能が追加された。React 0.10 では `null` を返すとエラーになるため、空の `span` 要素を返す必要がある |
| **対象ファイル** | `web/utils/toast/Toast.js`、`web/features/room/components/ActivateEffect.js` |

#### React 0.11（変更前） — `web/utils/toast/Toast.js`

```js
render: function() {
  var toast = this.context.toast;
  if (!toast || !toast.isOpen) {
    return null;
  }
  return React.DOM.div({className: 'fixed p-4 mx-1 bg-gray-800 border-2 text-white rounded-lg shadow-lg'},
    toast.message
  );
}
```

#### React 0.10（変更後） — `web/utils/toast/Toast.js`

```js
render: function() {
  var toast = this.context.toast;
  if (!toast || !toast.isOpen) {
    return React.DOM.span(null);
  }
  return React.DOM.div({className: 'fixed p-4 mx-1 bg-gray-800 border-2 text-white rounded-lg shadow-lg'},
    toast.message
  );
}
```

#### React 0.11（変更前） — `web/features/room/components/ActivateEffect.js`

```js
render: function() {
  var props = this.props;
  if (props.result === 'shock') {
    return React.DOM.div({className: 'fixed inset-0 bg-yellow-300 bg-opacity-70 ...'},
      Zap({className: 'animate-shock-vibrate ...'})
    );
  }
  if (props.result === 'safe') {
    return React.DOM.div({className: 'fixed inset-0 bg-black/80 ...'},
      React.DOM.div({className: 'animate-pulse ...'},
        React.DOM.span({className: 'font-bold text-9xl'}, 'SAFE')
      )
    );
  }
  return null;
}
```

#### React 0.10（変更後） — `web/features/room/components/ActivateEffect.js`

```js
  // ... shock / safe の分岐は同一 ...
  return React.DOM.span(null);
```

**ポイント：**
- `return null` → `return React.DOM.span(null)` への機械的な置換
- 空の `<span>` 要素が DOM に挿入されるが、視覚的な影響はない

---

### 3.2 `React.DOM.dialog` → `React.DOM.div` + backdrop 構造（3 ファイル）

| 項目 | 内容 |
|---|---|
| **変更内容** | `React.DOM.dialog` を使用していたダイアログコンポーネントを、`React.DOM.div` + 手動 backdrop 構造に変更 |
| **変更理由** | `React.DOM.dialog` は React 0.11 で追加された。React 0.10 の `React.DOM` には `dialog` ファクトリが存在しない |
| **対象ファイル** | `web/components/dialogs/InfoDialog.js`、`web/features/room/components/dialogs/GameResultDialog.js`、`web/features/room/components/dialogs/TurnResultDialog.js` |

#### React 0.11（変更前） — `web/components/dialogs/InfoDialog.js`

```js
render: function() {
  var props = this.props;
  var border = props.borderColor ? props.borderColor : 'border-red-500';
  return React.DOM.dialog({
    className: 'min-w-fit max-w-lg top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-transparent backdrop:bg-black/80 shadow-sm w-full',
    ref: 'dialog'
  },
    React.DOM.div({
      className: 'animate-scale-in grid gap-4 backdrop:bg-black/80 p-6 text-card-foreground shadow-sm w-full bg-gray-800 border-2 ' + border
    },
      props.children
    )
  );
}
```

#### React 0.10（変更後） — `web/components/dialogs/InfoDialog.js`

```js
render: function() {
  var props = this.props;
  var border = props.borderColor ? props.borderColor : 'border-red-500';
  return React.DOM.div({ref: 'dialog', style: {display: 'none'}},
    React.DOM.div({className: 'fixed inset-0 bg-black/80 z-50'}),
    React.DOM.div({className: 'fixed min-w-fit max-w-lg top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full'},
      React.DOM.div({
        className: 'animate-scale-in grid gap-4 p-6 text-card-foreground shadow-sm w-full bg-gray-800 border-2 ' + border
      },
        props.children
      )
    )
  );
}
```

**構造変換図：**

```
React 0.11:
  dialog (ref="dialog")              ← showModal()/close() で表示制御
    └── div (コンテンツ)              ← backdrop:bg-black/80 で背景
        └── children

React 0.10:
  div (ref="dialog", display:none)   ← style.display で表示制御
    ├── div.fixed.inset-0.bg-black/80  ← 手動 backdrop（z-50）
    └── div.fixed (センタリング)       ← z-50 でbackdropの上に配置
        └── div (コンテンツ)
            └── children
```

**変換のポイント：**
- `dialog` → ラッパー `div`（`ref` と `style: {display: 'none'}` を保持）
- `backdrop:bg-black/80`（CSS `::backdrop` 疑似要素）→ 手動の `div.fixed.inset-0.bg-black/80`
- コンテンツを `fixed` + センタリングの `div` で囲み、`z-50` で backdrop の上に配置
- `bg-transparent` が不要になったため削除

---

### 3.3 `showModal()`/`close()` → `style.display` 操作（2 ファイル）

| 項目 | 内容 |
|---|---|
| **変更内容** | ダイアログの表示/非表示を `showModal()`/`close()` から `style.display` 操作に変更 |
| **変更理由** | `showModal()` と `close()` は `<dialog>` 要素の DOM API。`div` 要素にはこれらのメソッドが存在しないため、CSS の `display` プロパティで代替 |
| **対象ファイル** | `web/features/room/page/Room.js`、`web/features/top/page/Top.js` |

#### React 0.11（変更前） — `web/features/room/page/Room.js`

```js
showNoticeModal: function(data, miliseconds) {
  var node = this.getNoticeDialogNode();
  if (node) {
    node.showModal();
    this.setState({
      noticeDialogState: { title: data.title, message: data.message, button: data.button },
    });
  }
  // ...
},

closeNoticeModal: function() {
  var node = this.getNoticeDialogNode();
  if (node) {
    node.close();
  }
},
```

#### React 0.10（変更後） — `web/features/room/page/Room.js`

```js
showNoticeModal: function(data, miliseconds) {
  var node = this.getNoticeDialogNode();
  if (node) {
    node.style.display = '';
    this.setState({
      noticeDialogState: { title: data.title, message: data.message, button: data.button },
    });
  }
  // ...
},

closeNoticeModal: function() {
  var node = this.getNoticeDialogNode();
  if (node) {
    node.style.display = 'none';
  }
},
```

#### React 0.11（変更前） — `web/features/top/page/Top.js`

```js
showJoinModal: function() {
  var node = this.getJoinDialogNode();
  if (node) {
    node.showModal();
    this.setState({ isShowJoinDialog: true });
  }
},

closeJoinModal: function() {
  var node = this.getJoinDialogNode();
  if (node) {
    node.close();
    this.setState({ isShowJoinDialog: false });
  }
},
```

#### React 0.10（変更後） — `web/features/top/page/Top.js`

```js
showJoinModal: function() {
  var node = this.getJoinDialogNode();
  if (node) {
    node.style.display = '';
    this.setState({ isShowJoinDialog: true });
  }
},

closeJoinModal: function() {
  var node = this.getJoinDialogNode();
  if (node) {
    node.style.display = 'none';
    this.setState({ isShowJoinDialog: false });
  }
},
```

**変換ルール表：**

| `<dialog>` API | `style.display` 代替 | 備考 |
|---|---|---|
| `node.showModal()` | `node.style.display = ''` | 初期値 `display: none` を解除して表示 |
| `node.close()` | `node.style.display = 'none'` | 非表示に戻す |

**ポイント：**
- `Room.js` では 7 箇所の `showModal()`/`close()` を置換（5 つのダイアログ × show/close）
- `Top.js` では 2 箇所の `showModal()`/`close()` を置換（1 つのダイアログ × show/close）
- `style.display = ''` は空文字列を設定することで、インラインスタイルを除去し CSS のデフォルト（`block`）に戻す

---

## 4. 変更ファイル一覧

### 変更ファイル（7 ファイル + 2 自動生成ファイル）

| # | ファイル | 主な変更内容 |
|---|---|---|
| 1 | `web/package.json` | `react` を `^0.11.2` → `^0.10.0` に変更 |
| 2 | `web/utils/toast/Toast.js` | `return null` → `return React.DOM.span(null)` |
| 3 | `web/features/room/components/ActivateEffect.js` | `return null` → `return React.DOM.span(null)` |
| 4 | `web/components/dialogs/InfoDialog.js` | `React.DOM.dialog` → `React.DOM.div` + backdrop 構造 |
| 5 | `web/features/room/components/dialogs/GameResultDialog.js` | `React.DOM.dialog` → `React.DOM.div` + backdrop 構造 |
| 6 | `web/features/room/components/dialogs/TurnResultDialog.js` | `React.DOM.dialog` → `React.DOM.div` + backdrop 構造 |
| 7 | `web/features/room/page/Room.js` | `showModal()`/`close()` → `style.display` 操作（7 箇所） |
| 8 | `web/features/top/page/Top.js` | `showModal()`/`close()` → `style.display` 操作（2 箇所） |
| 9 | `web/package-lock.json` | `react@0.10.0` へロック更新 |
| 10 | `web/static/styles.css` | `backdrop` 疑似要素のスタイル削除（dialog 廃止に伴う Tailwind 再ビルド） |
