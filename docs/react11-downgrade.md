# React 0.11 ダウングレード改修ドキュメント

## 1. 概要

学習目的で、React 0.12 の構成を React 0.11 にダウングレードした。
前回（React 0.13 → 0.12）が ES6 class → createClass 移行や ref 方式変更が中心だったのに対し、今回は **JSX 全廃と `React.DOM.*` ファクトリ直接記述への移行** が中心の改修となった。

38 ファイル変更、+600 / -785 行。

主な変更軸：
- **JSX 廃止 → `React.DOM.*` ファクトリ直接記述**：React 0.11 の `createElement` は `type.apply()` を呼ぶため文字列タグで即エラーとなり、JSX を全廃して `React.DOM.*` による記述に移行
- **`React.render` → `React.renderComponent`**：React 0.11 では `render` が存在せず、`renderComponent` を使用
- **`babel-preset-react` 削除**：JSX 変換が不要になったためプリセットを除去
- **`PropTypes.node` → `PropTypes.renderable`**：React 0.11 の PropTypes 名称に合わせた変更

このドキュメントでは、ダウングレードに伴い **何を・なぜ・どのように** 変更したかを記録する。

---

## 2. 依存パッケージの変更

`web/package.json` で以下のパッケージバージョンを変更した。

| パッケージ | 変更前（React 0.12） | 変更後（React 0.11） |
|---|---|---|
| `react` | `^0.12.2` | `^0.11.2` |

**追加パッケージ：** なし

**削除パッケージ：** なし（`babel-preset-react` は npm 依存には残るが `.babelrc` から除外）

**npm scripts の変更：** なし

`web/package-lock.json` では `node_modules/react` が `0.12.2` から `0.11.2` に再解決されている。

---

## 3. 改修パターン一覧

### 3.1 JSX → `React.DOM.*` ファクトリ呼び出し（33 ファイル）

| 項目 | 内容 |
|---|---|
| **変更内容** | 全ての JSX 記述を `React.DOM.*` ファクトリ関数の直接呼び出しに置換 |
| **変更理由** | React 0.11 の `createElement` は `type.apply()` を呼ぶため、文字列タグ（`'div'` 等）を渡すと即エラーになる。Babel の `pragma` オプションも HTML 要素とカスタムコンポーネントで 2 系統の出力を要するため不可。当時の `react-tools` も ES6+ 構文非対応 |
| **対象ファイル** | 33 ファイル（全 UI コンポーネント + `Room.js` + `Top.js` + `Toast.js`） |

#### React 0.12（変更前） — `web/components/buttons/Button.js`

```js
render: function() {
  var props = this.props;
  // ...
  return (
    <button
      type={type}
      className={'inline-flex h-10 w-full ...' + bgColor + ' ' + textColor + ' ...'}
      onClick={props.onClick}
      disabled={disabled}
    >
      {props.children}
    </button>
  );
}
```

#### React 0.11（変更後） — `web/components/buttons/Button.js`

```js
render: function() {
  var props = this.props;
  // ...
  return React.DOM.button({
    type: type,
    className: 'inline-flex h-10 w-full ...' + bgColor + ' ' + textColor + ' ...',
    onClick: props.onClick,
    disabled: disabled
  },
    props.children
  );
}
```

#### React 0.12（変更前） — `web/components/Layout.js`（HTML 要素 + カスタムコンポーネント混在）

```js
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
```

#### React 0.11（変更後） — `web/components/Layout.js`

```js
return ToastProvider(null,
  React.DOM.div({className: 'w-full grid place-items-center bg-gray-900'},
    React.DOM.div({className: 'w-full max-w-screen-md'},
      props.children
    ),
    Toast(null)
  )
);
```

**変換ルール表：**

| JSX 記述 | `React.DOM.*` 記述 | 備考 |
|---|---|---|
| `<div className="x">...</div>` | `React.DOM.div({className: 'x'}, ...)` | HTML 要素 → `React.DOM.*` |
| `<MyComponent prop={val} />` | `MyComponent({prop: val})` | カスタムコンポーネント → 直接呼び出し |
| `<MyComponent />` | `MyComponent(null)` | props なし → `null` を渡す |
| `<div>{child1}{child2}</div>` | `React.DOM.div(null, child1, child2)` | children は可変引数 |
| `{condition && <div>...</div>}` | `condition && React.DOM.div(null, ...)` | 条件付きレンダリング |
| `{items.map(fn)}` | `items.map(fn)` | map の中で同様にファクトリ呼び出し |
| `<svg>...<path d="..." /></svg>` | `React.DOM.svg({...}, React.DOM.path({d: '...'}))` | SVG 要素も `React.DOM.*` |
| `<span ref="dialog">` | `React.DOM.span({ref: 'dialog'})` | ref も props として渡す |

---

### 3.2 `React.render` → `React.renderComponent`（`client.js`）

| 項目 | 内容 |
|---|---|
| **変更内容** | エントリポイントの `React.render()` 呼び出しを `React.renderComponent()` に変更 |
| **変更理由** | React 0.11 では `React.render` が存在せず、`React.renderComponent` がトップレベルのレンダリング API |
| **対象ファイル** | `web/client.js` |

#### React 0.12（変更前） — `web/client.js`

```js
React.render(
  React.createElement(Layout, null,
    React.createElement(Room, { initialData: json.data })
  ),
  rootEl
);
```

#### React 0.11（変更後） — `web/client.js`

```js
React.renderComponent(
  Layout(null,
    Room({initialData: json.data})
  ),
  rootEl
);
```

**ポイント：**
- `React.render` → `React.renderComponent` の API 名変更
- 同時に `React.createElement(Component, props)` → `Component(props)` の直接呼び出しへ変換（3.1 の変換と同一パターン）

---

### 3.3 `babel-preset-react` 削除（`.babelrc`）

| 項目 | 内容 |
|---|---|
| **変更内容** | `.babelrc` の presets から `react` を削除 |
| **変更理由** | JSX 構文を使わなくなったため、JSX → createElement 変換プリセットが不要 |
| **対象ファイル** | `web/.babelrc` |

#### React 0.12（変更前）

```json
{
  "presets": ["env", "react"],
  "plugins": [...]
}
```

#### React 0.11（変更後）

```json
{
  "presets": ["env"],
  "plugins": [...]
}
```

---

### 3.4 `PropTypes.node` → `PropTypes.renderable`（`ToastProvider.js`）

| 項目 | 内容 |
|---|---|
| **変更内容** | `React.PropTypes.node` を `React.PropTypes.renderable` に変更 |
| **変更理由** | React 0.11 では `PropTypes.node` が存在せず、代わりに `PropTypes.renderable` を使用 |
| **対象ファイル** | `web/utils/toast/ToastProvider.js`（2 箇所） |

#### React 0.12（変更前）

```js
var toastShape = React.PropTypes.shape({
  isOpen: React.PropTypes.bool.isRequired,
  message: React.PropTypes.node,
  open: React.PropTypes.func.isRequired,
});

// ...
propTypes: {
  children: React.PropTypes.node.isRequired,
},
```

#### React 0.11（変更後）

```js
var toastShape = React.PropTypes.shape({
  isOpen: React.PropTypes.bool.isRequired,
  message: React.PropTypes.renderable,
  open: React.PropTypes.func.isRequired,
});

// ...
propTypes: {
  children: React.PropTypes.renderable.isRequired,
},
```

---

## 4. 変更ファイル一覧

### 変更ファイル（38 ファイル）

| # | ファイル | 主な変更内容 |
|---|---|---|
| 1 | `web/.babelrc` | `react` プリセット削除 |
| 2 | `web/client.js` | `React.render` → `React.renderComponent`、`createElement` → 直接呼び出し |
| 3 | `web/components/Layout.js` | JSX → `React.DOM.*` + コンポーネント直接呼び出し |
| 4 | `web/components/LoadingOverlay.js` | JSX → `React.DOM.*` |
| 5 | `web/components/buttons/Button.js` | JSX → `React.DOM.*` |
| 6 | `web/components/dialogs/InfoDialog.js` | JSX → `React.DOM.*` |
| 7 | `web/components/dialogs/notice/NoticeDailog.js` | JSX → `React.DOM.*` + コンポーネント直接呼び出し |
| 8 | `web/components/icons/Armchair.js` | JSX → `React.DOM.svg` / `React.DOM.path` |
| 9 | `web/components/icons/ChevronRight.js` | JSX → `React.DOM.svg` / `React.DOM.path` |
| 10 | `web/components/icons/Copy.js` | JSX → `React.DOM.svg` / `React.DOM.path` |
| 11 | `web/components/icons/Meh.js` | JSX → `React.DOM.svg` / `React.DOM.path` / `React.DOM.circle` / `React.DOM.line` |
| 12 | `web/components/icons/Skull.js` | JSX → `React.DOM.svg` / `React.DOM.path` / `React.DOM.circle` |
| 13 | `web/components/icons/Trophy.js` | JSX → `React.DOM.svg` / `React.DOM.path` / `React.DOM.line` |
| 14 | `web/components/icons/Zap.js` | JSX → `React.DOM.svg` / `React.DOM.polygon` |
| 15 | `web/features/room/components/ActivateEffect.js` | JSX → `React.DOM.*` |
| 16 | `web/features/room/components/Chair.js` | JSX → `React.DOM.*` + コンポーネント直接呼び出し |
| 17 | `web/features/room/components/ChairContainer.js` | JSX → `React.DOM.*` |
| 18 | `web/features/room/components/GameStatusContainer.js` | JSX → `React.DOM.*` |
| 19 | `web/features/room/components/InstructionContainer.js` | JSX → `React.DOM.*` |
| 20 | `web/features/room/components/InstructionMessage.js` | JSX → `React.DOM.*` + コンポーネント直接呼び出し |
| 21 | `web/features/room/components/PlayerStatus.js` | JSX → `React.DOM.*` + コンポーネント直接呼び出し |
| 22 | `web/features/room/components/PlayerStatusContainer.js` | JSX → `React.DOM.*` |
| 23 | `web/features/room/components/RoomContainer.js` | JSX → `React.DOM.*` |
| 24 | `web/features/room/components/RoundStatus.js` | JSX → `React.DOM.*` |
| 25 | `web/features/room/components/dialogs/CreaterWaitingStartDialog.js` | JSX → `React.DOM.*` + コンポーネント直接呼び出し |
| 26 | `web/features/room/components/dialogs/GameResultDialog.js` | JSX → `React.DOM.*` + コンポーネント直接呼び出し |
| 27 | `web/features/room/components/dialogs/StartTurnDialog.js` | JSX → `React.DOM.*` + コンポーネント直接呼び出し |
| 28 | `web/features/room/components/dialogs/TurnResultDialog.js` | JSX → `React.DOM.*` + コンポーネント直接呼び出し |
| 29 | `web/features/room/page/Room.js` | JSX → `React.DOM.*` + コンポーネント直接呼び出し、`createElement` → `React.DOM.span` |
| 30 | `web/features/top/components/TopMenu.js` | JSX → `React.DOM.*` |
| 31 | `web/features/top/components/TopOperations.js` | JSX → `React.DOM.*` + コンポーネント直接呼び出し |
| 32 | `web/features/top/components/TopTitle.js` | JSX → `React.DOM.*` |
| 33 | `web/features/top/components/dialogs/JoinDialog.js` | JSX → `React.DOM.*` + コンポーネント直接呼び出し |
| 34 | `web/features/top/page/Top.js` | JSX → `React.DOM.*` + コンポーネント直接呼び出し |
| 35 | `web/package-lock.json` | `react@0.11.2` へロック更新 |
| 36 | `web/package.json` | `react` を `^0.12.2` → `^0.11.2` に変更 |
| 37 | `web/utils/toast/Toast.js` | JSX → `React.DOM.*` |
| 38 | `web/utils/toast/ToastProvider.js` | `PropTypes.node` → `PropTypes.renderable`（2 箇所） |
