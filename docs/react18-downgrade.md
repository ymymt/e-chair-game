# React 18 ダウングレード改修ドキュメント

## 1. 概要

学習目的で、React 19 / Next.js 16 の構成を React 18 / Next.js 15 にダウングレードした。
React 19 で導入された新しい API（`useActionState`、`ref` as prop、フォームアクション等）は React 18 には存在しないため、従来の書き方に書き換える必要があった。

このドキュメントでは、ダウングレードに伴い **何を・なぜ・どのように** 変更したかを記録する。

---

## 2. 依存パッケージの変更

`web/package.json` で以下のパッケージバージョンを変更した。

| パッケージ | 変更前（React 19） | 変更後（React 18） |
|---|---|---|
| `next` | `^16.1.1` | `^15.3.3` |
| `react` | `^19.2.3` | `^18.3.1` |
| `react-dom` | `^19.2.3` | `^18.3.1` |
| `@types/react` | `^19` | `^18` |
| `@types/react-dom` | `^19` | `^18` |
| `eslint-config-next` | `^16.1.1` | `^15.3.3` |

---

## 3. 改修パターン一覧

### 3.1 `ref` as prop → `forwardRef`

| 項目 | 内容 |
|---|---|
| **React 19 の API** | `ref` を通常の props として受け取れる（`forwardRef` 不要） |
| **React 18 での代替** | `React.forwardRef` でコンポーネントをラップし、第2引数として `ref` を受け取る |
| **変更理由** | React 18 では `ref` は特別な予約プロパティであり、props に含めると警告が出る。`forwardRef` を使って明示的に転送する必要がある |
| **対象ファイル** | `InfoDialog.tsx`, `GameResultDialog.tsx`, `TurnResultDialog.tsx` |

#### React 19（変更前）

```tsx
type InfoDialogProps = {
  ref: Ref<HTMLDialogElement>;
  children: React.ReactNode;
};

export function InfoDialog({ ref, children }: InfoDialogProps) {
  return <dialog ref={ref}>{children}</dialog>;
}
```

#### React 18（変更後）

```tsx
type InfoDialogProps = {
  children: React.ReactNode;
};

export const InfoDialog = forwardRef<HTMLDialogElement, InfoDialogProps>(
  function InfoDialog({ children }, ref) {
    return <dialog ref={ref}>{children}</dialog>;
  }
);
```

**ポイント:**

- Props の型定義から `ref` を削除する
- `export function` → `export const` + `forwardRef` に変更
- `forwardRef` のジェネリクスで `<要素の型, Props型>` を指定
- コンポーネント関数の第2引数で `ref` を受け取る

---

### 3.2 `useActionState` → `useState` + 手動 async 処理

| 項目 | 内容 |
|---|---|
| **React 19 の API** | `useActionState(action, initialState)` — Server Action をバインドし、状態・ディスパッチ関数・pending 状態を返す |
| **React 18 での代替** | `useState` で状態と pending フラグを個別管理し、async 関数で Server Action を呼び出す |
| **変更理由** | `useActionState` は React 19 で新規追加されたフックであり、React 18 には存在しない |
| **対象ファイル** | `Top.tsx`, `useRoomActions.ts` |

#### React 19（変更前） — `Top.tsx`

```tsx
const [createState, createAction, isCreating] = useActionState(
  createRoomAction,
  { error: "" }
);
const [joinState, joinAction, isJoining] = useActionState(joinRoomAction, {
  error: "",
});
```

#### React 18（変更後） — `Top.tsx`

```tsx
const [isCreating, setIsCreating] = useState(false);
const [createState, setCreateState] = useState<{ error?: string }>({ error: "" });
const createAction = async () => {
  setIsCreating(true);
  try {
    const result = await createRoomAction();
    setCreateState({ error: result?.error });
  } finally {
    setIsCreating(false);
  }
};

const [isJoining, setIsJoining] = useState(false);
const [joinState, setJoinState] = useState<{ error: string | undefined }>({ error: "" });
const joinAction = async (formData: FormData) => {
  setIsJoining(true);
  try {
    const result = await joinRoomAction(joinState, formData);
    setJoinState({ error: result?.error });
  } finally {
    setIsJoining(false);
  }
};
```

#### React 19（変更前） — `useRoomActions.ts`

```tsx
const selectChairActionWithData = selectChairAction.bind(null, {
  roomId: roomId,
  roundData: getSubmitRoundData(selectedChair),
});

const [selectState, selectChair] = useActionState(selectChairActionWithData, {
  status: 0,
  error: "",
});
```

#### React 18（変更後） — `useRoomActions.ts`

```tsx
const [selectState, setSelectState] = useState<{
  status: number;
  error: string | undefined;
}>({
  status: 0,
  error: "",
});

const selectChair = async () => {
  const result = await selectChairAction({
    roomId: roomId,
    roundData: getSubmitRoundData(selectedChair),
  });
  setSelectState({ status: result.status, error: result.error });
};
```

**ポイント:**

- `useActionState` が返していた 3 つの値（`state`, `dispatch`, `isPending`）を、`useState` × 2 + async 関数で再現する
- `isPending` は `useState(false)` で管理し、`try/finally` で確実にリセットする
- Server Action の呼び出しと結果の反映を手動で行う

---

### 3.3 `<form action={serverAction}>` → `<form onSubmit={...}>`

| 項目 | 内容 |
|---|---|
| **React 19 の API** | `<form action={serverAction}>` — `action` 属性に Server Action を直接渡すと、フォーム送信時に自動実行される |
| **React 18 での代替** | `<form onSubmit={handler}>` で `e.preventDefault()` した上で手動で Server Action を呼び出す |
| **変更理由** | フォームの `action` 属性に関数を渡す仕組みは React 19 / Next.js 16 のネイティブ機能であり、React 18 / Next.js 15 では対応していない |
| **対象ファイル** | `Room.tsx`, `TopOperations.tsx`, `JoinDialog.tsx` |

#### React 19（変更前）

```tsx
<form action={selectChair}>
  {/* ... */}
</form>
```

#### React 18（変更後）

```tsx
<form
  onSubmit={(e) => {
    e.preventDefault();
    selectChair();
  }}
>
  {/* ... */}
</form>
```

**ポイント:**

- `e.preventDefault()` でデフォルトのフォーム送信を防ぐ
- `JoinDialog.tsx` では `new FormData(e.currentTarget)` で `FormData` を手動で生成して渡す
- 関連する型定義も `() => void` → `() => Promise<void>` に更新（`TopOperations.tsx`, `JoinDialog.tsx`）

---

### 3.4 `React.RefObject<T>` → `React.MutableRefObject<T>`

| 項目 | 内容 |
|---|---|
| **React 19 の型** | `useRef` の戻り値は `React.RefObject<T>` で、`.current` が書き換え可能 |
| **React 18 の型** | `useRef(null)` の戻り値は `React.MutableRefObject<T \| null>` であり、`.current` への代入には `MutableRefObject` 型が必要 |
| **変更理由** | React 19 では `RefObject` の `.current` が mutable に変更されたが、React 18 の `RefObject` は readonly。`.current` に値を代入する箇所では `MutableRefObject` を使う必要がある |
| **対象ファイル** | `useRoomWatcher.ts`, `useRoomActions.ts` |

#### React 19（変更前）

```tsx
previousRoomDataRef: React.RefObject<GameRoom | null>;
tooltipRef: React.RefObject<TooltipRefProps | null>;
```

#### React 18（変更後）

```tsx
previousRoomDataRef: React.MutableRefObject<GameRoom | null>;
tooltipRef: React.MutableRefObject<TooltipRefProps | null>;
```

---

## 4. tsconfig.json の変更

| 設定 | 変更前 | 変更後 |
|---|---|---|
| `jsx` | `"react-jsx"` | `"preserve"` |

Next.js 15 ではフレームワーク側が JSX の変換を行うため、TypeScript の `jsx` オプションは `"preserve"`（変換せずそのまま出力）に設定する。Next.js 16 では `"react-jsx"` が推奨されていた。

---

## 5. 変更ファイル一覧

| # | ファイル | 変更内容 |
|---|---|---|
| 1 | `web/package.json` | React 18 / Next.js 15 へバージョンダウン |
| 2 | `web/package-lock.json` | 依存関係の再解決 |
| 3 | `web/tsconfig.json` | `jsx: "react-jsx"` → `"preserve"` |
| 4 | `web/components/dialogs/InfoDialog.tsx` | `ref` as prop → `forwardRef` |
| 5 | `web/features/room/components/dialogs/GameResultDialog.tsx` | `ref` as prop → `forwardRef` |
| 6 | `web/features/room/components/dialogs/TurnResultDialog.tsx` | `ref` as prop → `forwardRef` |
| 7 | `web/features/top/page/Top.tsx` | `useActionState` → `useState` + async 関数 |
| 8 | `web/features/room/hooks/useRoomActions.ts` | `useActionState` → `useState` + async 関数、`RefObject` → `MutableRefObject` |
| 9 | `web/features/room/hooks/useRoomWatcher.ts` | `RefObject` → `MutableRefObject` |
| 10 | `web/features/room/page/Room.tsx` | `<form action>` → `<form onSubmit>` |
| 11 | `web/features/top/components/TopOperations.tsx` | `<form action>` → `<form onSubmit>`、型定義更新 |
| 12 | `web/features/top/components/dialogs/JoinDialog.tsx` | `<form action>` → `<form onSubmit>`、型定義更新 |
