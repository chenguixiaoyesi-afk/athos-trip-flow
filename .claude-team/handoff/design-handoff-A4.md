# Design Handoff — Phase A4

From: Design Agent
To: Implementation Agent（※ Design Review Gate 通過後のみ起動可）
Date: 2026-06-06
Goal 正本: `.claude-team/goal.md`
Roadmap 正本: `.claude-team/roadmap.md`
直近 verdict: `.claude-team/verdicts/verdict-A3.md`（APPROVED / PHASE COMPLETE / NEXT PHASE: A4）
A3 設計レビュー判定: `.claude-team/design-reviews/design-review-verdict-A3.md`

本 handoff は roadmap.md の A4 行と verdict-A3 §8.7 の指示を 9 ブロック仕様に整形したもの。verdict-A3 §6.1（AUTO-FILL 自己マッチ回避テンプレ）、§6.2（手動 UI 検証推奨）、§6.4（lint warnings 3 件の処遇は本フェーズでも現状維持）を反映済み。verdict-A3 §6.3 の `useCanEdit` 抽出は本フェーズスコープ外とし、§4 質問で Design Review に判断を仰ぐ。

---

## 【CURRENT PHASE】

**A4 — AI 補完: 領収書 AI 全フォーム展開 + 精算書見出し安定化 + 金額 0 ガード強化（P0 #2 + 既知不具合 #2 #3）**

業務フローの「AI 補完」レイヤを 4 種別すべてで等価動作させる。現状 `FieldworkForm` のみが領収書 AI 仕分けを持ち、業務 UX が割れている。本フェーズで `useReceiptParser` フックと `ReceiptUploaderSection` コンポーネントを抽出し、4 form に展開する。同時に AI 生成レポートの精算書見出し不安定（既知 #2）と金額 0 ガードの型安全性（既知 #3）を解消する。

---

## 【OBJECTIVE】

1. `src/hooks/useReceiptParser.js` を新規作成し、`FieldworkForm` の領収書 AI ロジック（UploadFile → InvokeLLM → state 同期）を抽出
2. `src/components/forms/ReceiptUploaderSection.jsx` を新規作成し、領収書アップロード UI（ファイル選択ボタン + 領収書プレビュー + 解析状態表示）を form 非依存コンポーネントとして抽出
3. `FieldworkForm.jsx` を hook + component を使う形に置換（既存挙動を保つ）
4. `DayTripForm.jsx` / `OvernightTripForm.jsx` / `OverseasTripForm.jsx` の 3 form に領収書 AI を展開（各 form 用 `CATEGORY_MAP` + `FALLBACK_KEY` を定義）
5. `src/lib/reportGenerator.js` のプロンプトと分割ロジックを強化し、AI 生成精算書見出しを「`## 旅費精算書`」（出張 3 種）または「`## 経費精算書`」（外出作業）に固定（既知 #2）
6. 金額 0 ガードを型安全な形（`typeof / Number.isFinite / > 0`）に強化（既知 #3）
7. edit モード（A3 で導入）と新展開された receipt parser の整合性を保証

---

## 【SCOPE】

A4 の作業範囲は以下に **厳密に限定**:

| カテゴリ | 内容 |
|---|---|
| 新規ファイル | `src/hooks/useReceiptParser.js`, `src/components/forms/ReceiptUploaderSection.jsx` |
| 改修（4 form） | hook / component の差し込み、各 form 固有の `CATEGORY_MAP` / `FALLBACK_KEY` 定義、edit モード時の receipts 復元委譲 |
| 改修（reportGenerator） | プロンプト強化（見出し固定指示）、分割ロジックの regex 化、フォールバック挙動の明確化 |
| 改修（金額 0 ガード） | hook 内に型安全チェックを集約 |
| 文書化 | `review-package-A4.md` に設計判断（hook signature、CATEGORY_MAP の form 別管理、分割 regex 設計）と検証手順 |

### 非対象（DO NOT で詳述）
- 新規 AI モデル接続
- 編集中の領収書差し替え UI（A3 の receipts 復元は維持しつつ、edit 中に追加 / 削除 / 再解析する UX は現状維持）
- 規程 PDF 解析改善（A8）
- メール通知（A5）
- `useCanEdit` の抽出（verdict-A3 §6.3 で提案されたが本フェーズスコープ外。§4 Q5 で Review に確認）

---

## 【DO】

### 1. 現状把握（A4 開始時の grep で行番号確定 / verdict-A3 §6.1 改善提案 1 継続適用）

実装着手前に以下を grep / Read で確認し、Review Package §1 に転記:

| 観点 | 確認方法 | 期待内容 |
|---|---|---|
| FieldworkForm の receipts state | `grep -n "useState" src/components/forms/FieldworkForm.jsx` | A1+A3 で確立した単一 `receipts` state、edit モード時の `existing-N` id 復元 |
| FieldworkForm の handleReceiptUpload | grep + Read | UploadFile → InvokeLLM → setReceipts の構造 |
| CATEGORY_MAP（Fieldwork 既存） | `grep -n "CATEGORY_MAP" src/components/forms/FieldworkForm.jsx` | コワーキング / Wi-Fi / 駐車場 / 飲食 の現マッピング |
| 金額 0 ガード現状 | `grep -n "parsed.amount" src/components/forms/FieldworkForm.jsx` | `if (parsed.amount && parsed.amount > 0)` |
| reportGenerator の見出し分割 | `grep -n "旅費精算書\|経費精算書\|split" src/lib/reportGenerator.js` | L244-249 の素朴 split、表記揺れに脆弱 |
| 3 form の経費フィールド | DayTrip: highway_fee/parking_fee/taxi_fee/other_transport_fee、Overnight: 同上、Overseas: flight_fee/airport_transport_fee | 既存 form の useState 初期値 |
| 3 form の現状 JSX に領収書 UI 不在 | grep "領収書\|receipt" 該当 3 form | ヒット 0 |

### 2. `src/hooks/useReceiptParser.js` 新規作成

シグネチャ:

```js
export function useReceiptParser({
  initialReceiptUrls = [],
  categoryMap,      // { 'コワーキング': 'coworking_fee', ... }
  fallbackKey,      // 例: 'other_work_fee'
  onAmountParsed,   // (mapKey, amount, parsedFull) => void
}) {
  // 単一 receipts state
  // {id, url, name, parsed, status: 'uploading'|'analyzing'|'done'|'failed'}
  const [receipts, setReceipts] = useState(() => {
    if (initialReceiptUrls?.length) {
      return initialReceiptUrls.map((url, i) => ({
        id: `existing-${i}`,
        url,
        name: `領収書${i + 1}`,
        parsed: null,
        status: 'done',
      }));
    }
    return [];
  });

  const handleReceiptUpload = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setReceipts(prev => [...prev, { id, url: null, name: file.name, parsed: null, status: 'uploading' }]);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setReceipts(prev => prev.map(r => r.id === id ? { ...r, url: file_url, status: 'analyzing' } : r));

        try {
          const parsed = await base44.integrations.Core.InvokeLLM({
            prompt: `この領収書画像を読み取り、以下のJSON形式で情報を抽出してください。
カテゴリは「コワーキング」「貸会議室」「Wi-Fi」「駐車場」「飲食」「航空券」「空港送迎」「タクシー」「高速道路」「その他」のいずれかに分類してください。`,
            file_urls: [file_url],
            response_json_schema: {
              type: 'object',
              properties: {
                store: { type: 'string', description: '店舗・施設名' },
                amount: { type: 'number', description: '合計金額（円）' },
                date: { type: 'string', description: '日付 YYYY-MM-DD' },
                category: { type: 'string', description: 'カテゴリ' },
              },
            },
          });

          // 金額 0 ガード強化（既知 #3）— 型安全チェック
          const isValidAmount =
            typeof parsed.amount === 'number' &&
            Number.isFinite(parsed.amount) &&
            parsed.amount > 0;

          setReceipts(prev => prev.map(r => r.id === id ? { ...r, parsed, status: 'done' } : r));

          if (isValidAmount) {
            const matchedKey =
              Object.entries(categoryMap).find(([cat]) => parsed.category?.includes(cat))?.[1] ||
              fallbackKey;
            onAmountParsed?.(matchedKey, parsed.amount, parsed);
          }
        } catch {
          setReceipts(prev => prev.map(r => r.id === id ? { ...r, parsed: null, status: 'failed' } : r));
        }
      } catch {
        setReceipts(prev => prev.filter(r => r.id !== id));
      }
    }
    // input value を空に戻して同じファイルを再選択可能にする
    if (e?.target) e.target.value = '';
  };

  const removeReceipt = (id) => {
    setReceipts(prev => prev.filter(r => r.id !== id));
  };

  const isUploading = receipts.some(r => r.status === 'uploading');
  const isAnalyzing = receipts.some(r => r.status === 'analyzing');
  const receiptUrls = receipts.map(r => r.url).filter(Boolean);

  return { receipts, setReceipts, handleReceiptUpload, removeReceipt, isUploading, isAnalyzing, receiptUrls };
}
```

注意点:
- 既存 FieldworkForm の挙動と **完全等価** であること（state 構造 / id 発行ルール / setter 操作 / 金額加算判定）
- `onAmountParsed` は form 側で `setForm(prev => ({ ...prev, [mapKey]: (prev[mapKey] || 0) + amount }))` を実行するためのコールバック
- ガード強化は hook 内 1 箇所に集約（form 側で再チェックしない）
- `e.target.value = ''` で「同じファイルの再選択」を可能にする（既存 FieldworkForm にない改善）

### 3. `src/components/forms/ReceiptUploaderSection.jsx` 新規作成

シグネチャ:

```jsx
export default function ReceiptUploaderSection({
  receipts,
  handleReceiptUpload,
  removeReceipt,
  isUploading,
  isAnalyzing,
  title = '領収書',
  description = '領収書を撮影/アップロードすると、AI が自動仕分けして経費欄に反映します',
  acceptImage = true,
}) {
  // JSX matching FieldworkForm 現状の receipt UI（Card / CardHeader / CardContent + ファイル input + 領収書プレビュー一覧）
  // - File input: type="file" multiple accept="image/*" capture="environment" onChange={handleReceiptUpload}
  // - 各 receipt の status に応じた表示（uploading: スピナー / analyzing: Sparkles アイコン / done: parsed 情報 / failed: 失敗テキスト）
  // - 削除ボタン（X アイコン）
}
```

注意点:
- FieldworkForm 現状の領収書 JSX を **そのまま抽出** して props 化する。新しい UI 要素は加えない
- import は既存 `lucide-react` / `@/components/ui/*` を踏襲
- `capture="environment"` 属性を維持（HANDOFF.md「モバイルカメラ起動の最適化」は実装済み）

### 4. `FieldworkForm.jsx` のリファクタ

- 既存の `receipts` state 宣言と `handleReceiptUpload` / `removeReceipt` ロジックを **削除**
- hook 呼出に置換:

```js
const onAmountParsed = (mapKey, amount) => {
  setForm(prev => ({ ...prev, [mapKey]: (prev[mapKey] || 0) + amount }));
};

const {
  receipts,
  handleReceiptUpload,
  removeReceipt,
  isUploading,
  isAnalyzing,
  receiptUrls,
} = useReceiptParser({
  initialReceiptUrls: mode === 'edit' && initialReport?.receipt_urls ? initialReport.receipt_urls : [],
  categoryMap: CATEGORY_MAP_FIELDWORK,
  fallbackKey: 'other_work_fee',
  onAmountParsed,
});
```

- 既存の領収書 JSX を `<ReceiptUploaderSection ... />` に置換
- `CATEGORY_MAP_FIELDWORK` 定義はそのまま温存（既存マッピング: コワーキング / 貸会議室 / Wi-Fi / 駐車場 / 飲食）
- 既存挙動 100% 維持（並列 3 枚アップロード / 削除 / edit モード復元 / handleSubmit の receipt_urls 渡し）

### 5. 3 form への展開

DayTripForm / OvernightTripForm / OverseasTripForm に以下を追加:

#### 5.1 各 form の CATEGORY_MAP と FALLBACK_KEY を form ファイル上部に定義

**DayTripForm / OvernightTripForm**（経費フィールド: highway_fee / parking_fee / taxi_fee / other_transport_fee）:
```js
const CATEGORY_MAP_TRIP = {
  '高速道路': 'highway_fee', '高速': 'highway_fee', 'ETC': 'highway_fee',
  '駐車場': 'parking_fee', 'parking': 'parking_fee',
  'タクシー': 'taxi_fee', 'taxi': 'taxi_fee',
};
const FALLBACK_TRIP = 'other_transport_fee';
```

**OverseasTripForm**（経費フィールド: flight_fee / airport_transport_fee）:
```js
const CATEGORY_MAP_OVERSEAS = {
  '航空券': 'flight_fee', 'flight': 'flight_fee', 'airline': 'flight_fee',
  '空港': 'airport_transport_fee', '空港送迎': 'airport_transport_fee',
  'タクシー': 'airport_transport_fee', '電車': 'airport_transport_fee',
};
const FALLBACK_OVERSEAS = 'airport_transport_fee';
```

CATEGORY_MAP は **form 別に管理**。共通化しない（各 form の経費フィールド構造が異なるため）。

#### 5.2 各 form 内に hook 呼出を追加

```js
const onAmountParsed = (mapKey, amount) => {
  setForm(prev => ({ ...prev, [mapKey]: (prev[mapKey] || 0) + amount }));
};

const {
  receipts, handleReceiptUpload, removeReceipt, isUploading, isAnalyzing, receiptUrls,
} = useReceiptParser({
  initialReceiptUrls: mode === 'edit' && initialReport?.receipt_urls ? initialReport.receipt_urls : [],
  categoryMap: CATEGORY_MAP_TRIP, // または CATEGORY_MAP_OVERSEAS
  fallbackKey: FALLBACK_TRIP,      // または FALLBACK_OVERSEAS
  onAmountParsed,
});
```

#### 5.3 各 form の handleSubmit で `receipt_urls` を data に含める

```js
const data = {
  ...form,
  // 既存フィールド
  receipt_urls: receiptUrls,
};
```

既存 form は `receipt_urls` を送信していなかった（領収書未対応のため）。本フェーズで送信開始する。

#### 5.4 各 form の JSX に `<ReceiptUploaderSection ... />` を追加

挿入位置: 既存「経費入力」セクションと「業務内容」セクションの **間**、または「金額サマリー」（`<AmountSummary />`）の **直前**。Implementation Agent が既存 UI と整合する位置を選択。Review Package §3 に挿入位置と理由を記録。

### 6. `src/lib/reportGenerator.js` の強化

#### 6.1 プロンプトの見出し固定指示を強化

`STYLE_RULES` 末尾、または各 report_type 別プロンプトの末尾に以下を追加:

```
- 出張報告書（日帰り出張・宿泊出張・海外出張）の精算書見出しは「## 旅費精算書」と一字一句正確に出力すること
- 外出作業報告書の精算書見出しは「## 経費精算書」と一字一句正確に出力すること
- 表記揺れ（例: 「## 精算書」「## 旅費精算」「## 旅費精算書（合計）」「## 旅費精算書 詳細」など）は厳禁
- 見出しの前後に余分な文字（記号、注釈、改行ずれ）を入れないこと
```

#### 6.2 分割ロジックの regex 化（フォールバック堅牢化）

L244-249 の split 処理を以下に置換:

```js
// 見出し検出 regex（前後の空白許容、行頭・行末アンカ）
const SETTLEMENT_HEADING_RE = /^##\s*(旅費精算書|経費精算書)\s*$/m;

const match = result.match(SETTLEMENT_HEADING_RE);
const settlementText = match ? result.slice(match.index) : '';
const reportBodyText = match ? result.slice(0, match.index).trimEnd() : result;

return {
  reportText: result,
  reportBodyText,
  settlementText,
  rawData: reportData,
};
```

これにより:
- 見出しに前後空白がある場合も検出
- 行頭マッチで `## 旅費精算書` を含む文中表現を誤検出しない
- 見出しが完全に出力されなかった場合も `settlementText: ''` で安全フォールバック（既存挙動と整合）

### 7. 金額 0 ガード強化（既知 #3）

hook 内 §2 の `isValidAmount` チェックで完了。form 側での再チェックは行わない（DRY）。

### 8. `current-phase.txt` の確認と自動補正（verdict-A1 §8 改善提案 1 継続適用）

実装着手時に `current-phase.txt = A4` であることを確認。`A3` のままなら本 DO で `A4` に更新。`A5` 以降への更新は禁止。

### 9. ビルド / lint 検証

- `npm run lint` errors=0 を確認
- A3 完了時点（3 warnings: `Login.jsx err` / `ReportDetail.jsx isAdmin` / `ReportNew.jsx navigate`）から増加していないことを確認
- 新規 hook / component / 4 form 改修で新たな warning が出ないこと
- `npm run build` 成功

### 10. Regression 検証

#### 10.1 FieldworkForm の挙動不変性
- 単件アップロード → 経費欄反映 → 削除
- 並列 3 枚アップロード → receipts state 整合性（A1 成果踏襲）
- edit モード（A3 成果）の receipts 復元（`existing-N` id）
- handleSubmit の `receipt_urls` 送信

#### 10.2 3 form の領収書 AI 動作
- 各 form で領収書アップロード → 経費欄反映
- 金額 0 の領収書は経費欄に加算されない（型安全チェック）
- edit モードでの receipts 復元

#### 10.3 精算書見出し安定性
- 4 種別で AI レポート生成を **5 回ずつ** 実施（または論理確認）
- 見出しが「## 旅費精算書」または「## 経費精算書」に固定されていることを確認
- 分割後の `reportBodyText` と `settlementText` が正しく取得される

#### 10.4 金額 0 ガード
- 金額 0 の領収書（手作りテストファイル、または AI が誤判定したケース）で経費欄が加算されないこと
- 金額が NaN / undefined / null のときも加算されないこと

検証結果は Review Package §4 に記録。手動 UI 確認が困難な場合は、コードロジックの存在を grep で示し論理確認として §4 に明記する。

### 11. Commit 方針（verdict-A1 §8 改善提案 3 継続適用）

実コミットは **Review verdict 後の Owner 操作**で実行する。Implementation Agent は Review Package §7 に以下を記載:

- ステージング対象ファイル一覧
- コミットメッセージ案
- 注意事項

### 12. verdict-A3 §6.1 改善提案: AUTO-FILL 自己マッチ回避

`review-package-A4.md` §7.4（commit 後検証コマンド例）で `grep -c "AUTO-FILL:"` を引用する際は **文字列分割表記** を使う:

```
grep -c "AUTO-""FILL:" .claude-team/review-packages/review-package-A4.md
```

または変数化:
```
AUTOFILL_TOKEN="AUTO-FILL:"; grep -c "$AUTOFILL_TOKEN" .claude-team/review-packages/review-package-A4.md
```

これにより review-package 自身がプレースホルダ検出 grep で false positive を起こさない。

---

## 【DO NOT】

- 新規 AI モデル接続（Base44 InvokeLLM の現行運用を維持、OpenAI 直接接続禁止）
- 編集中の領収書差し替え UI の新規実装（既存 add / remove のみで十分）
- 規程 PDF 解析改善（A8）
- メール通知の追加（A5）
- `useCanEdit` の抽出（verdict-A3 §6.3 提案、本フェーズスコープ外）
- CATEGORY_MAP の form 横断共通化（各 form の経費フィールド構造が異なるため、共通化は将来要件化時に検討）
- 既存 FieldworkForm の挙動変更（hook 抽出は等価リファクタリング）
- 領収書 AI prompt の `response_json_schema` 変更（カテゴリ列挙以外）
- 既存 4 form の `validate` / 表示 JSX 本体への touch（hook + component 差し込みのみ）
- 申請中・承認済の Report の編集を許可するロジック追加（A3 で確立した `canEdit` を維持）
- 新規ルートの追加
- 新規エンティティの作成
- `lib/policyContext.jsx` / `lib/AuthContext.jsx` の変更
- `src/api/base44Client.js` の変更
- `src/components/ui/*` の変更
- `src/App.jsx` の変更
- `package.json` / `package-lock.json` の変更
- `eslint.config.js` / `vite.config.js` / `tailwind.config.js` の変更
- `npm run lint:fix` の実行
- `.claude-team/goal.md` / `.claude-team/roadmap.md` / `.claude-team/auto-handoff.md` / `.claude-team/README.md` / `.claude-team/templates/*` の変更
- `current-phase.txt` を `A5` 以降に更新
- `git push`
- `git commit` の実行（Review verdict 後の Owner 操作）
- `git commit --amend`
- `--no-verify` 等の hook スキップ
- `review-package-A4.md` でのプレースホルダ未充填での Review 起動

---

## 【FILES / AREAS】

### 変更可能
- `src/components/forms/FieldworkForm.jsx`（hook 抽出 / ReceiptUploaderSection 差し込み、既存挙動維持）
- `src/components/forms/DayTripForm.jsx`（hook 導入 / CATEGORY_MAP / ReceiptUploaderSection / handleSubmit の receipt_urls 追加）
- `src/components/forms/OvernightTripForm.jsx`（同上）
- `src/components/forms/OverseasTripForm.jsx`（同上、CATEGORY_MAP_OVERSEAS）
- `src/lib/reportGenerator.js`（プロンプト強化 + 分割 regex 化）

### 新規作成
- `src/hooks/useReceiptParser.js`
- `src/components/forms/ReceiptUploaderSection.jsx`
- `.claude-team/review-packages/review-package-A4.md`

### メタ更新（任意）
- `.claude-team/current-phase.txt`（`A3` のままなら `A4` に更新可。`A5` 以降への更新は禁止）

### 参照のみ（変更しない）
- `.claude-team/verdicts/verdict-A3.md`
- `.claude-team/handoff/design-handoff-A3.md`
- `.claude-team/review-packages/review-package-A3.md`
- `.claude-team/roadmap.md` A4 行
- HANDOFF.md P0 #2 / 既知不具合 #2 #3
- `src/pages/ReportEdit.jsx`（A3 で導入、edit モードでの hook 動作確認時）
- `src/pages/ReportNew.jsx`（create モードでの hook 動作確認時）

### 触れてはいけない
- 上記「変更可能」以外の `src/**`
- `src/api/base44Client.js`
- `src/components/ui/*`
- `src/lib/policyContext.jsx`
- `src/lib/AuthContext.jsx`
- `src/pages/Approval.jsx`
- `src/pages/Summary.jsx`
- `src/pages/PolicyManagement.jsx`
- `src/pages/ReportDetail.jsx`
- `src/App.jsx`
- 設定ファイル類
- `.claude-team/` の goal / roadmap / auto-handoff / README / templates / 過去 verdict / 過去 handoff

---

## 【DONE CRITERIA】

Review Agent はこの順で確認する:

- [ ] `npm run lint` errors=0、warnings は A3 完了時点（3 件）から増加していない
- [ ] `npm run build` 成功
- [ ] 新規 `src/hooks/useReceiptParser.js` が存在し、handoff §[DO] 2 のシグネチャに従う
- [ ] 新規 `src/components/forms/ReceiptUploaderSection.jsx` が存在
- [ ] 4 form すべてに `useReceiptParser` の import + 呼出が存在
- [ ] 3 form（DayTrip / Overnight / Overseas）に form 固有の `CATEGORY_MAP_*` と `FALLBACK_*` 定義が存在
- [ ] 3 form の handleSubmit の data オブジェクトに `receipt_urls: receiptUrls` が追加されている
- [ ] 3 form の JSX に `<ReceiptUploaderSection ... />` が含まれる
- [ ] `FieldworkForm.jsx` から旧 `handleReceiptUpload` / `removeReceipt` / 旧 `receipts` state 宣言が削除され、hook + component に置換されている
- [ ] hook 内に金額 0 ガード（`typeof === 'number' && Number.isFinite && > 0`）が存在
- [ ] form 側で金額 0 ガードの **重複チェック** が無い（DRY、hook に集約）
- [ ] `src/lib/reportGenerator.js` のプロンプトに見出し固定指示が追加されている
- [ ] `src/lib/reportGenerator.js` の分割処理が regex ベース（`/^##\s*(旅費精算書|経費精算書)\s*$/m`）に置換されている
- [ ] `git diff --stat` の変更ファイルが許容範囲（4 form + reportGenerator.js + 2 新規 + review-package-A4.md + 任意の current-phase.txt）
- [ ] create モード / edit モード両方で 4 form の領収書 AI が動作することが Review Package §4 に記録されている
- [ ] 精算書見出しの安定性が Review Package §4 に記録されている（5 回サンプリングまたは論理確認）
- [ ] 金額 0 ガードが Review Package §4 に記録されている（NaN / undefined / 0 / 負数 / 正常値の 5 ケース）
- [ ] `review-package-A4.md` の必須セクション（§1〜§7）すべて存在
- [ ] **プレースホルダ完全充填**: `grep -c "AUTO-""FILL:" review-package-A4.md` = `0`（verdict-A3 §6.1 改善反映、分割表記）
- [ ] `current-phase.txt` の内容が `A4`
- [ ] `git push` 未実行
- [ ] commit 未実行（Review verdict 後の Owner 操作）

---

## 【REVIEW POINTS】

Review Agent は以下を確認:

1. **スコープ厳守**: 変更が「変更可能」リスト 5 ファイル + 新規 2 ファイル + メタ 任意の範囲
2. **hook の等価性**: `FieldworkForm` の旧挙動と hook 経由の新挙動が完全に等価（並列アップロード整合性、edit モード復元、削除挙動）
3. **3 form の展開対称性**: 4 form すべてで同じ pattern（hook import → CATEGORY_MAP 定義 → hook 呼出 → ReceiptUploaderSection 差し込み → handleSubmit の receipt_urls 追加）
4. **CATEGORY_MAP の form 別管理**: 各 form の CATEGORY_MAP が form の経費フィールドに整合（DayTrip/Overnight: 交通系、Overseas: 航空・空港系、Fieldwork: 業務系）
5. **金額 0 ガードの型安全性**: hook 内に `typeof / Number.isFinite / > 0` の 3 条件 AND が存在し、form 側に重複チェックがない（DRY）
6. **見出し固定指示の追加**: `STYLE_RULES` または各 prompt 末尾に表記揺れ禁止の明示
7. **分割ロジックの regex 化**: `/^##\s*(旅費精算書|経費精算書)\s*$/m` または等価 regex が存在し、旧素朴 split が削除されている
8. **edit モード（A3 成果）の維持**: 4 form の edit モードで receipts が `existing-N` id で復元される
9. **create モードの不変性**: A3 で確立した create モードの挙動が完全に同一
10. **A5 領域への侵食なし**: SendEmail / 通知機構の追加なし
11. **A8 領域への侵食なし**: 規程 PDF 解析（`PolicyManagement.jsx`）への touch なし
12. **REPOSITORY ISOLATION RULE 違反なし**: 差分・新規ファイル・review-package に参照禁止語彙が **参照前提として** 出現しないか
13. **プレースホルダ完全充填**: `grep -c "AUTO-""FILL:" review-package-A4.md` = 0（分割表記により false positive 回避）
14. **`git push` 未実行**
15. **commit 未実行**: Review verdict 後の Owner 操作を待つ、Review Package §7 に staging + メッセージ案完備

判定:
- 合格時: `.claude-team/verdicts/verdict-A4.md` に
  ```
  APPROVED
  PHASE COMPLETE
  NEXT PHASE: A5
  ```
  + `current-phase.txt` を `A5` に更新
- 不合格時: `REJECTED` + 修正要求
- 違反時: `REJECTED / FOREIGN CONTEXT DETECTED`

---

## 【NEXT PHASE DEPENDENCY】

A5（承認: メール通知）は以下を A4 に依存:

- A4 で 4 form の領収書 AI が完成し、`receipt_urls` が全種別で送信されることで、A5 のメール通知で総支給額・領収書件数を本文に含める設計が安定する
- A4 の `useReceiptParser` hook が確立することで、A5 のメール送信（副作用）追加時に既存ロジックへの干渉を最小化できる
- A4 の精算書見出し安定化により、メール本文に AI 生成テキストを引用する場合の構造が予測可能になる

A5 の設計詳細は **A4 の Verdict（実装後ゲート）が APPROVED となった後に Design Agent が作成する**。本 handoff の時点では描かない。
