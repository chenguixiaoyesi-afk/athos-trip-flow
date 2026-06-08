# Design Handoff — Phase A3

From: Design Agent
To: Implementation Agent（※ Design Review Gate 通過後のみ起動可）
Date: 2026-06-05
Goal 正本: `.claude-team/goal.md`
Roadmap 正本: `.claude-team/roadmap.md`
直近 verdict: `.claude-team/verdicts/verdict-A2.md`（APPROVED / PHASE COMPLETE / NEXT PHASE: A3）
A2 設計レビュー判定: `.claude-team/design-reviews/design-review-verdict-A2.md`

本 handoff は roadmap.md の A3 行と verdict-A2 §8.6 の指示を 9 ブロック仕様に整形したもの。verdict-A2 §6.1（grep による行番号確定）、§6.2（lint warnings の処遇は本 handoff では現状維持を明示）、§6.3（手動 UI 検証は Owner の `npm run dev` 任意）、§6.4（メタファイル commit は Owner 運用判断）を反映済み。

---

## 【CURRENT PHASE】

**A3 — レポート編集経路の追加（HANDOFF.md P0 #1 解消）**

業務フローの「レポート作成」レイヤで、**申請後の修正手段** を整備する。現状は `下書き` または `差戻し` 状態のレポートを修正する手段が「削除→再作成」しかなく、業務上の主要 pain point となっている。本フェーズで `/reports/:id/edit` ルートと `ReportEdit.jsx` を新設し、4 種別フォームに `mode` prop を導入して edit モードを開く。

---

## 【OBJECTIVE】

1. 新規ルート `/reports/:id/edit` を `src/App.jsx` に追加
2. 新規ページ `src/pages/ReportEdit.jsx` を作成し、`:id` から Report を取得して種別に応じた form を `mode='edit'` で mount する
3. 4 種別フォーム（DayTrip / Overnight / Overseas / Fieldwork）に `mode` + `initialReport` prop を追加し、edit モードで以下を実現:
   - 既存 Report の値で form 初期化
   - 重複検証で自身（`initialReport.id`）を除外
   - 保存時は `Report.create` ではなく `Report.update(initialReport.id, data)` を呼ぶ
   - `report_number` / `created_by_*` を維持
4. `src/pages/ReportDetail.jsx` に編集ボタンを追加（`canEdit` 真のとき）し、`/reports/:id/edit` へ navigate する
5. 4 種別すべてで「下書き → 編集 → 申請」「差戻し → 編集 → 再申請」のサイクルが通る
6. 申請中 / 承認済の編集ボタンは表示されない（`canEdit` 既存定義に従う）

---

## 【SCOPE】

A3 の作業範囲は以下に **厳密に限定**:

| カテゴリ | 内容 |
|---|---|
| 新規ファイル | `src/pages/ReportEdit.jsx` |
| 新規ルート | `src/App.jsx` の Routes 配下に 1 行追加 + import 1 行 |
| フォーム改修 | 4 form の `props`（`mode` / `initialReport` 追加）、`useState` 初期化、`handleGenerate` の重複検証、`handleSubmit` の create/update 分岐 |
| 詳細画面改修 | `ReportDetail.jsx` の `canEdit` 真ブロックに「編集する」ボタン追加 |
| 文書化 | `review-package-A3.md` に edit モード設計判断（status 遷移ルール、navigate 先、エラー時挙動）と検証手順 |

### 非対象（DO NOT で詳述）
- 申請中・承認済の編集
- 編集履歴 / 差分可視化 / 楽観ロック
- メール通知（A5）
- 領収書 AI の他フォーム展開 / 共通化（A4）
- 規程 PDF 解析の改善（A8）

---

## 【DO】

### 1. 現状確認

実装着手前に以下を grep / Read で再確認し、Review Package §1 に転記:

| 観点 | 確認方法 | 期待値 |
|---|---|---|
| ルート定義 | `src/App.jsx` の `<Route>` 列挙 | `/reports/:id` 既存、`/reports/:id/edit` 不在 |
| `canEdit` 定義 | `src/pages/ReportDetail.jsx` の `canEdit = isOwner && (status==='下書き' \|\| status==='差戻し')` | 既存ロジック維持 |
| 既存編集ボタン | ReportDetail.jsx の `canEdit` 真ブロック | 「申請する」「再申請する」「削除」ボタンのみ存在、「編集する」不在 |
| Form mount パターン | `src/pages/ReportNew.jsx` | `<XxxForm onBack={...} />` のみ |
| 各 form の handleGenerate 重複検証 | DayTrip L66-/Overnight L66-/Overseas L53-/Fieldwork L231-（A2 commit 後 / A1 commit 後） | 4 フォームに重複検証ロジック存在 |
| 各 form の handleSubmit | DayTrip L98-/Overnight L78-/Overseas L65-/Fieldwork L240- | `Report.create(data)` 呼出 + `RPT-${Date.now()}` で report_number 生成 |

verdict-A2 §6.1 の改善提案を受け、行番号は handoff 起草時点のものではなく **A3 開始時の grep 結果を Review Package §1 に転記** することを優先する（A1/A2 改修により行ずれの可能性あり）。

### 2. ルート追加（`src/App.jsx`）

`AuthenticatedApp` 内の `<Routes>` 配下、`<Route path="/reports/:id" element={<ReportDetail />} />` の **直後** に以下を追加:

```jsx
<Route path="/reports/:id/edit" element={<ReportEdit />} />
```

import 追加（既存 import の並びを尊重）:

```js
import ReportEdit from '@/pages/ReportEdit';
```

それ以外は触れない（PageNotFound 既存、Layout 既存、その他 Routes 既存をすべて温存）。

### 3. `src/pages/ReportEdit.jsx` 新規作成

骨子:

```jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import DayTripForm from '@/components/forms/DayTripForm';
import OvernightTripForm from '@/components/forms/OvernightTripForm';
import OverseasTripForm from '@/components/forms/OverseasTripForm';
import FieldworkForm from '@/components/forms/FieldworkForm';

export default function ReportEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Report.filter({ id }).then(results => {
      setReport(results?.[0] || null);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="p-8 text-center text-muted-foreground">読み込み中...</div>;
  if (!report) return <div className="p-8 text-center text-muted-foreground">レポートが見つかりません</div>;

  const isOwner = report.created_by_id === user?.id;
  const canEdit = isOwner && (report.status === '下書き' || report.status === '差戻し');
  if (!canEdit) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        このレポートは編集できません（申請中または承認済、または所有者ではありません）
      </div>
    );
  }

  const onBack = () => navigate(`/reports/${id}`);

  if (report.report_type === '日帰り出張') return <DayTripForm onBack={onBack} mode="edit" initialReport={report} />;
  if (report.report_type === '宿泊出張') return <OvernightTripForm onBack={onBack} mode="edit" initialReport={report} />;
  if (report.report_type === '海外出張') return <OverseasTripForm onBack={onBack} mode="edit" initialReport={report} />;
  if (report.report_type === '外出作業') return <FieldworkForm onBack={onBack} mode="edit" initialReport={report} />;

  return (
    <div className="p-8 text-center text-muted-foreground">
      不明なレポート種別です: {report.report_type}
    </div>
  );
}
```

**注意点**:
- `canEdit` のロジックは `ReportDetail.jsx` のそれと **完全に同一の真理値式** にする（DRY ではなく敢えて複製。共通化は将来）
- 404 / 権限なし のとき適切なメッセージを表示する
- `useAuth` / `base44` / `useParams` の import は既存 ReportDetail のパターンを踏襲

### 4. 4 form の改修（`mode` + `initialReport` 対応）

各 form のシグネチャ変更:

```js
// before
export default function DayTripForm({ onBack }) { ... }

// after
export default function DayTripForm({ onBack, mode = 'create', initialReport = null }) { ... }
```

#### 4.1 useState 初期化（edit モード時に initialReport の値を充填）

各 form の `useState({ ... })` 初期値を以下のように分岐:

```js
const [form, setForm] = useState(() => {
  if (mode === 'edit' && initialReport) {
    return {
      travel_date: initialReport.travel_date || '',
      destination_name: initialReport.destination_name || '',
      // ... 残りのフィールドを initialReport から取得（空文字 / 0 にフォールバック）
    };
  }
  return {
    travel_date: '',
    destination_name: '',
    // ... 既存の空初期値
  };
});
```

**各 form のフィールド一覧は、現状の `useState` 初期値オブジェクトから機械的に取得する**。新しいフィールドを増やさない。

`localStorage` 読み込み（`STORAGE_KEY` パターン、Fieldwork 等で実装あり）は **edit モード時には行わない**（initialReport を優先）。

#### 4.2 FieldworkForm の receipts 初期化

A1 で導入された単一 `receipts` state（`{ id, url, name, parsed, status }[]`）は edit モード時に `initialReport.receipt_urls` から復元する:

```js
const [receipts, setReceipts] = useState(() => {
  if (mode === 'edit' && initialReport?.receipt_urls?.length) {
    return initialReport.receipt_urls.map((url, i) => ({
      id: `existing-${i}`,
      url,
      name: `領収書${i + 1}`,
      parsed: null,
      status: 'done',
    }));
  }
  return [];
});
```

`parsed` は復元しない（AI 解析結果は元の Report に直接反映済 = 金額フィールドが既に正しい値を保持）。

#### 4.3 重複検証の自己除外

各 form の `handleGenerate` の重複検証で、edit モード時は自身を除外:

```js
const conflicting = existing.filter(r =>
  r.status !== '差戻し' && (mode !== 'edit' || r.id !== initialReport?.id)
);
```

または可読性のため:
```js
const conflicting = existing
  .filter(r => r.id !== initialReport?.id)  // edit 時は自身を除外
  .filter(r => r.status !== '差戻し');
```

いずれの形式でも可。`mode === 'create'` 時の挙動は完全に既存と同一であること。

#### 4.4 handleSubmit の create / update 分岐

各 form の `handleSubmit(status)` で:

```js
const handleSubmit = async (status) => {
  setSaving(true);
  try {
    const data = {
      ...form,
      report_type: '日帰り出張',  // 既存
      status,
      // edit モードでは report_number / created_by_* を維持
      report_number: mode === 'edit' ? initialReport.report_number : `RPT-${Date.now().toString().slice(-8)}`,
      created_by_name: mode === 'edit' ? initialReport.created_by_name : user?.full_name,
      created_by_email: mode === 'edit' ? initialReport.created_by_email : user?.email,
      // ... 計算値・生成テキストは現状通り（再生成可能なので新しい値を保存）
    };
    let saved;
    if (mode === 'edit') {
      await base44.entities.Report.update(initialReport.id, data);
      saved = { id: initialReport.id };
    } else {
      saved = await base44.entities.Report.create(data);
    }
    navigate(`/reports/${saved.id}`);
  } finally {
    setSaving(false);
  }
};
```

**status の扱い**:
- 既存の create モードと同じく `status` 引数（`'下書き'` / `'申請中'`）で受ける
- edit モードでも user が「下書き保存」「申請する」「再申請する」のボタンを押す
- `'差戻し'` 状態から `'申請中'` に遷移するときの `approver_name` / `rejection_reason` のクリアは **本フェーズでは扱わない**（既存 Approval.jsx の流れに任せる）

**`rejection_reason` の扱い**:
- edit モードで `'差戻し'` から `'申請中'` に再申請する際、`rejection_reason` を保存データに **明示的に含めない**（既存値が保持される、または Approval.jsx の次回差戻しで上書きされる）

#### 4.5 領収書 / `report_number` / その他

- 領収書 URL の `receipt_urls` データ送信は `receipts.map(r => r.url).filter(Boolean)` の既存パターンを温存
- AI 生成テキスト（`generated_report_text` / `generated_settlement_text`）は edit 時に再生成された場合のみ更新。再生成しなければ既存値を保つ（initialReport の値を data に含める）

```js
generated_report_text: generatedReport?.reportText || initialReport?.generated_report_text || '',
generated_settlement_text: generatedReport?.settlementText || initialReport?.generated_settlement_text || '',
```

### 5. `ReportDetail.jsx` への編集ボタン追加

`canEdit` 真の `<>` ブロック内、「申請する」ボタンの **直前** に編集ボタンを追加:

```jsx
<Button
  variant="outline"
  onClick={() => navigate(`/reports/${id}/edit`)}
  className="gap-2"
>
  編集する
</Button>
```

`Pencil` / `Edit` などのアイコンを `lucide-react` から import するかは Implementation Agent の裁量（追加 import を最小化するため、テキストのみでも可）。

ボタンの位置・色・サイズは既存 UI（申請する / 削除）と視覚的に調和すること。

### 6. `current-phase.txt` の確認と自動補正（verdict-A1 §8 改善提案 1 継続適用）

実装着手時に `current-phase.txt = A3` であることを確認。`A2` のままなら **本 DO の範疇で `A3` に更新**。`A4` 以降への更新は禁止（Review Agent verdict-A3 の責任）。

### 7. ビルド / lint 検証

- `npm run lint` errors=0 を確認
- A2 完了時点（verdict-A2 §2.3）の warnings 3 件（`Login.jsx err` / `ReportDetail.jsx isAdmin` / `ReportNew.jsx navigate`）から **増加していない** ことを確認
- 新規ファイル `ReportEdit.jsx` で新たな lint warnings が発生していないこと
- 各 form 改修で `mode` / `initialReport` を使うとき、未使用引数の warning が出ないこと
- `npm run build` 成功

### 8. Regression 検証

#### 8.1 create モードの不変性
4 form すべてで以下のサイクルが create モードで動作:
- 種別選択 → フォーム表示 → 必須入力 → 下書き保存 → status='下書き'
- 申請する → status='申請中'
- 過去フォームの全動作（AI 生成、領収書アップロード（Fieldwork）、duplicate check）に regression なし

#### 8.2 edit モードの動作
4 form すべてで以下のサイクルが edit モードで動作:
- `/reports/:id` で「編集する」クリック → `/reports/:id/edit` に遷移
- フォームに既存値が prefill されている
- 値を変更して「下書き保存」→ Report.update で status='下書き' のまま保存、`/reports/:id` に navigate
- 値を変更して「申請する」→ Report.update で status='申請中'、`/reports/:id` に navigate
- 差戻し → 編集 → 「再申請する」→ status='申請中'

#### 8.3 編集権限の境界
- 他人の Report の `/edit` URL に直接アクセス → 「編集できません」表示
- 申請中の `/edit` URL に直接アクセス → 同上
- 承認済の `/edit` URL に直接アクセス → 同上
- 存在しない id の `/edit` → 「レポートが見つかりません」表示

#### 8.4 重複検証の edit 自己除外
- 既存の Report を edit モードで開き、travel_date / start_date を変更せずに 申請 → 自己重複として拒否されない（正しい挙動）
- edit 中に travel_date を変更し、既存の他レポートと衝突 → 拒否される

検証結果は Review Package §4 に種別ごと（4 種別 × 4 観点 = 16 ケース）記録する。手動 UI 確認が困難な場合は、コードのロジック存在を grep で示し、論理確認として §4 に明記する。

### 9. Commit 方針（verdict-A1 §8 改善提案 3 継続適用）

実コミットは **Review verdict 後の Owner 操作**で実行する。Implementation Agent は Review Package §7 に以下を記載:

- ステージング対象ファイル一覧
- コミットメッセージ案
- 注意事項（`git push` 禁止、`--no-verify` 禁止、`--amend` 禁止）

---

## 【DO NOT】

- 申請中 / 承認済の Report の編集を許可すること（`canEdit` ロジックは既存定義を踏襲）
- 編集履歴 / 差分の可視化（HANDOFF.md スコープ外）
- 楽観ロック / 競合検知（HANDOFF.md スコープ外）
- 編集時の `report_number` 再生成（既存値を維持する DO 4.4 を厳守）
- 編集時の `created_by_*` 上書き（同上）
- メール通知の追加（A5）
- 領収書 AI ロジックの他フォーム展開 / 共通フック化（A4）
- AI 精算書見出し安定化、金額 0 ガード強化（A4）
- `lib/reportGenerator.js` のプロンプト変更
- `Report.create` を新規シナリオに使うこと（既存 create フローの呼出元は ReportNew のみ）
- 新規ルートを `/reports/:id/edit` 以外に追加すること
- 新規ページを `ReportEdit.jsx` 以外に追加すること
- 新規エンティティ / 新規フックの作成
- `lib/policyContext.jsx` / `lib/AuthContext.jsx` の変更
- `src/api/base44Client.js` の変更
- `src/components/ui/*` の変更
- `package.json` / `package-lock.json` の変更
- `eslint.config.js` / `vite.config.js` / `tailwind.config.js` の変更
- `npm run lint:fix` の実行
- `.claude-team/goal.md` / `.claude-team/roadmap.md` / `.claude-team/auto-handoff.md` / `.claude-team/README.md` / `.claude-team/templates/*` の変更
- `current-phase.txt` を `A4` 以降に更新
- `git push`
- `git commit` の実行（Review verdict 後の Owner 操作）
- `git commit --amend`
- `--no-verify` 等の hook スキップ
- `review-package-A3.md` でのプレースホルダ未充填での Review 起動

---

## 【FILES / AREAS】

### 変更可能
- `src/App.jsx`（import 1 行 + Route 1 行のみ追加）
- `src/pages/ReportDetail.jsx`（編集ボタンの追加と navigate、`useNavigate` 既存使用を活用）
- `src/components/forms/DayTripForm.jsx`（props / 初期化 / 重複検証 / handleSubmit）
- `src/components/forms/OvernightTripForm.jsx`（同）
- `src/components/forms/OverseasTripForm.jsx`（同）
- `src/components/forms/FieldworkForm.jsx`（同 + 領収書 receipts 復元）

### 新規作成
- `src/pages/ReportEdit.jsx`
- `.claude-team/review-packages/review-package-A3.md`

### メタ更新（任意、A1 §8 改善提案 1/2 継続適用）
- `.claude-team/current-phase.txt`（`A2` のままなら `A3` に更新可。`A4` 以降への更新は禁止）

### 参照のみ（変更しない）
- `src/pages/ReportNew.jsx`（create フロー mount パターンの参照）
- `.claude-team/verdicts/verdict-A2.md`
- `.claude-team/handoff/design-handoff-A2.md`
- `.claude-team/review-packages/review-package-A2.md`
- `.claude-team/roadmap.md` A3 行
- HANDOFF.md P0 #1

### 触れてはいけない
- 上記「変更可能」以外の `src/**`
- `src/api/base44Client.js`
- `src/components/ui/*`
- `src/lib/reportGenerator.js`
- `src/lib/policyContext.jsx`
- `src/lib/AuthContext.jsx`
- `src/components/Layout.jsx`
- `src/pages/Approval.jsx`
- `src/pages/Summary.jsx`
- `src/pages/PolicyManagement.jsx`
- 設定ファイル類
- `.claude-team/` の goal / roadmap / auto-handoff / README / templates / 過去 verdict / 過去 handoff

---

## 【DONE CRITERIA】

Review Agent はこの順で確認する:

- [ ] `npm run lint` errors=0、warnings は A2 完了時点（3 件）から増加していない
- [ ] `npm run build` 成功
- [ ] `git diff --stat` の変更ファイルが以下に限定:
  - `src/App.jsx`
  - `src/pages/ReportDetail.jsx`
  - `src/components/forms/DayTripForm.jsx`
  - `src/components/forms/OvernightTripForm.jsx`
  - `src/components/forms/OverseasTripForm.jsx`
  - `src/components/forms/FieldworkForm.jsx`
  - `.claude-team/review-packages/review-package-A3.md`
  - `.claude-team/current-phase.txt`（任意、`A2` → `A3` 補正のみ許容）
- [ ] 新規ファイル `src/pages/ReportEdit.jsx` が存在
- [ ] `src/App.jsx` に `<Route path="/reports/:id/edit" element={<ReportEdit />} />` が存在
- [ ] 4 form すべてのシグネチャに `mode = 'create'` + `initialReport = null` が追加
- [ ] 4 form すべての `handleSubmit` で `mode === 'edit'` 時に `Report.update(initialReport.id, data)` が呼ばれる
- [ ] 4 form すべての `handleGenerate` で edit モード時に自己（`initialReport.id`）が conflict から除外される
- [ ] `ReportDetail.jsx` の `canEdit` 真ブロックに「編集する」ボタンが存在し、`/reports/:id/edit` へ navigate する
- [ ] `ReportEdit.jsx` で他人の Report / 申請中 / 承認済 / 存在しない id を開いた際、適切なメッセージが表示される
- [ ] create モードの動作が完全に既存と同一（4 種別 × 「下書き」「申請」サイクル）
- [ ] edit モードのサイクル（下書き → 編集 → 申請、差戻し → 編集 → 再申請）が 4 種別すべてで動作
- [ ] `review-package-A3.md` の必須セクション（§1 現状把握 / §2 設計判断 / §3 4 form 改修要点 / §4 16 ケース regression / §5 lint/build / §6 Review 質問 / §7 commit 方針）すべて存在
- [ ] `grep -c "AUTO-FILL:" .claude-team/review-packages/review-package-A3.md` = `0`
- [ ] `current-phase.txt` の内容が `A3`
- [ ] `git push` 未実行
- [ ] commit 未実行（Review verdict 後の Owner 操作）

---

## 【REVIEW POINTS】

Review Agent は以下を確認:

1. **スコープ厳守**: 変更が「変更可能」リスト 6 ファイル + 新規 1 ファイル + メタ 1 ファイルに限定されているか
2. **新規ルートの正確性**: `<Route path="/reports/:id/edit" element={<ReportEdit />} />` が正しい位置に挿入され、既存ルート定義に regression なし
3. **`ReportEdit.jsx` の権限境界**: 非所有者 / 申請中 / 承認済 / 不存在 id に対するメッセージ表示が `canEdit` 既存ロジックと一致
4. **4 form の `mode` 分岐の対称性**: 4 form すべてで同一の prop 追加方式（`mode = 'create'`, `initialReport = null`）、同一の handleSubmit 分岐方式（`mode === 'edit'` で Update）
5. **edit モードの自己除外**: 4 form すべての重複検証で `r.id !== initialReport?.id` の自己除外が入っているか
6. **`report_number` / `created_by_*` の維持**: edit モード時にこれら 3 フィールドが initialReport から保たれる
7. **領収書 receipts の復元（Fieldwork のみ）**: `initialReport.receipt_urls` が `receipts` state の `{ id, url, status: 'done' }` 形式で復元
8. **AI 生成テキストの引継**: edit モード時に再生成しなくても `generated_report_text` / `generated_settlement_text` が initialReport から保たれる
9. **create モードの不変性**: 既存 create フローのコード変更が prop 追加と分岐のみ、既存挙動が完全に同一であること
10. **A4 領域への侵食なし**: 領収書 AI 共通フック抽出 / `reportGenerator.js` プロンプト変更 / 金額 0 ガード変更 / CATEGORY_MAP 変更なし
11. **A5 領域への侵食なし**: SendEmail / 通知機構の追加なし
12. **REPOSITORY ISOLATION RULE 違反なし**: 差分・新規ファイル・review-package に参照禁止語彙が**参照前提として**出現しないか
13. **プレースホルダ完全充填**: `grep -c "AUTO-FILL:" review-package-A3.md` = 0
14. **`git push` 未実行**
15. **commit 未実行**: Review verdict 後の Owner 操作を待つ、Review Package §7 に staging + メッセージ案が完備されている

判定:
- 合格時: `.claude-team/verdicts/verdict-A3.md` に
  ```
  APPROVED
  PHASE COMPLETE
  NEXT PHASE: A4
  ```
  + `current-phase.txt` を `A4` に更新
- 不合格時: `REJECTED` + 修正要求
- 違反時: `REJECTED / FOREIGN CONTEXT DETECTED`

---

## 【NEXT PHASE DEPENDENCY】

A4（領収書 AI 全フォーム展開 + 精算書安定化 + 金額 0 ガード）は以下を A3 に依存:

- 4 form のシグネチャに `mode` / `initialReport` が安定して存在（A4 で `useReceiptParser` を抽出する際、フックは create / edit 両モードで動作する必要がある）
- `Fieldwork` 以外の 3 form に領収書 AI を展開するとき、既存の重複検証ロジックの上に上乗せする構造が固まっていること
- `ReportEdit.jsx` で 4 form を mount する経路が確立し、edit モードでの領収書再アップロード時の整合性確保が必要（A1 で確立した receipts state 構造、A3 で initialReport からの復元、A4 で他 form へ展開の連鎖）

A4 の設計詳細は **A3 の Verdict（実装後ゲート）が APPROVED となった後に Design Agent が作成する**。本 handoff の時点では描かない。
