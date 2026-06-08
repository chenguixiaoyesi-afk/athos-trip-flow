# Design Handoff — Phase A8 ⭐ ロードマップ最終フェーズ

From: Design Agent
To: Implementation Agent（※ Design Review Gate 通過後のみ起動可）
Date: 2026-06-08
Goal 正本: `.claude-team/goal.md`
Roadmap 正本: `.claude-team/roadmap.md`
直近 verdict: `.claude-team/verdicts/verdict-A7.md`（APPROVED / PHASE COMPLETE / NEXT PHASE: A8）
A7 設計レビュー判定: `.claude-team/design-reviews/design-review-verdict-A7.md`

本 handoff は roadmap.md の A8 行と verdict-A7 §8.6 の指示を 9 ブロック仕様に整形したもの。verdict-A7 §6.2「handoff 雛形コード内の変数シャドー自己チェック」を起草時に適用済（`policy` / `oldPolicy` / `newPolicy` 引数のスコープ衝突を回避）。verdict-A7 §6.5「lint warnings 3 件の処遇確定」を §4 Q5 で Review Agent に問う。

**⭐ A8 = ロードマップ最終フェーズ**。本フェーズ APPROVED で全 9 フェーズ完走（A0 → A0.1 → A1 → A2 → A3 → A4 → A5（MVP COMPLETE）→ A6 → A7 → **A8（PROJECT COMPLETE）**）。

---

## 【CURRENT PHASE】

**A8 — 旅費規程監査: 規程変更履歴 + 影響範囲追跡**

業務フロー最終段「旅費規定監査」を整える。現状 `PolicyManagement.jsx` は規程の PDF アップロード・AI 解析・適用・履歴閲覧をカバーしているが、**規程変更が過去の承認済レポートに与える影響**を可視化する手段がない。本フェーズで:
1. 規程変更影響を計算する **純粋関数モジュール**（`src/lib/policyImpactAnalyzer.js`）を新規作成
2. `PolicyManagement.jsx` の規程履歴一覧に **「影響範囲を確認」ボタン**（admin 用）を追加
3. ボタン → Dialog で件数・合計差額・影響レポート一覧を表示
4. **業務ルール厳守**: 過去レポートの計算値は **据え置き**、表示のみで保存しない
5. baseline-A8.md で業務シナリオ + 検証手順 + 「過去レポートへの遡及禁止」原則を文書化

---

## 【OBJECTIVE】

1. `src/lib/policyImpactAnalyzer.js` を新規作成し、以下を純粋関数として export:
   - `recomputeReportPolicyValues(report, currentPolicy)` — report の元データ + 規程値から規程依存計算値を再計算
   - `computeImpact(reports, sourcePolicy, targetPolicy)` — 全 report の旧/新規程比較で件数・合計差額・影響レポート一覧を返す
2. `PolicyManagement.jsx` の規程履歴一覧に admin 限定「影響範囲を確認」ボタンを追加
3. クリック → Dialog 表示:
   - 比較対象: 規程一覧で選んだ規程 vs 現行 `activePolicy`
   - 集計: 影響レポート件数 / 合計差額（円）
   - 影響レポート一覧: report_number / 種別 / 作成者 / 旧 total / 新 total / 差分
4. `.claude-team/baseline-A8.md` を新規作成し、業務シナリオ + 検証手順 + 「過去レポートへの遡及禁止」原則 + 「実費項目は差分計算対象外」原則を文書化

---

## 【SCOPE】

A8 の作業範囲は以下に **厳密に限定**:

| カテゴリ | 内容 |
|---|---|
| 新規ファイル | `src/lib/policyImpactAnalyzer.js`（純粋関数 2 つ + 内部ヘルパー） |
| 改修 | `src/pages/PolicyManagement.jsx`（影響範囲確認ボタン + Dialog + 影響計算 handler。既存 PDF 取込・AI 解析・規程適用・履歴表示は不変） |
| 新規 | `.claude-team/baseline-A8.md`（業務シナリオ + 検証手順 + 業務ルール文書化） |
| 新規 | `.claude-team/review-packages/review-package-A8.md` |

### 非対象（DO NOT で詳述）
- 過去レポートへの遡及計算反映（業務ルール厳守、表示のみで保存禁止）
- 規程承認ワークフロー（多段階）
- 規程比較の外部公開
- 新規 `AuditLog` エンティティ追加
- 既存 PDF 取込・AI 解析・規程適用フローへの変更
- 既存 AI 解析後 diff 表示（`analyzedPolicy && showDiff` ブロック）への変更
- 4 form の計算ロジック抽出（A8 では `policyImpactAnalyzer.js` に必要分のみを記述）
- 実費項目（highway_fee, parking_fee, taxi_fee, flight_fee 等）の影響計算（規程値非依存のため対象外）
- A1〜A7 すべての成果物への touch

---

## 【DO】

### 1. 現状把握（A8 開始時の grep + Read で確認）

| 観点 | 確認方法 | 期待 |
|---|---|---|
| PolicyManagement.jsx の構造 | `grep -n "function\|const\|return" src/pages/PolicyManagement.jsx` | 4 主要ロジック（loadPolicies / handlePdfUpload / handleActivate / handleSaveNew）+ JSX |
| `FIELD_LABELS` 定義 | `grep -n "FIELD_LABELS" src/pages/PolicyManagement.jsx` | 9 規程値フィールド（既存 L143-153） |
| 既存 `analyzedPolicy && showDiff` ブロック | `grep -n "showDiff" src/pages/PolicyManagement.jsx` | L230-266 周辺、本フェーズで触らない |
| `usePolicy` hook | `grep -n "usePolicy" src/lib/policyContext.jsx` | 現行 active policy を返す既存 hook |
| Report スキーマフィールド | HANDOFF.md L177-231 | A8 で再計算に使う元データ（`num_nights`, `num_days`, `driving_distance_km`, `report_type` 等）が実在 |
| `TravelPolicyMaster` スキーマ | HANDOFF.md L234-252 | 9 規程値フィールドが実在 |

### 2. `src/lib/policyImpactAnalyzer.js` 新規作成

純粋関数（UI 非依存、外部 IO なし、Date 演算のみ）として以下を export:

```js
/**
 * 規程値依存の計算値（日当・宿泊費・車手当）を report の元データから再計算する純粋関数
 *
 * 重要: 実費項目（highway_fee, parking_fee, taxi_fee, other_transport_fee,
 *        flight_fee, airport_transport_fee, coworking_fee, wifi_fee,
 *        meal_fee, other_work_fee）は規程値非依存のため再計算対象外（report の値をそのまま使用）
 *
 * @param {object} report - Report エンティティ
 * @param {object} currentPolicy - 適用したい TravelPolicyMaster（規程値オブジェクト）
 * @returns {{
 *   daily_allowance: number,
 *   accommodation_fee: number,
 *   car_allowance: number,
 *   total_amount: number,
 * }}
 */
export function recomputeReportPolicyValues(report, currentPolicy) {
  if (!report || !currentPolicy) {
    return { daily_allowance: 0, accommodation_fee: 0, car_allowance: 0, total_amount: 0 };
  }

  const type = report.report_type;
  let daily_allowance = 0;
  let accommodation_fee = 0;
  let car_allowance = 0;

  if (type === '日帰り出張') {
    daily_allowance = currentPolicy.daily_allowance_daytrip || 0;
    car_allowance = (report.driving_distance_km || 0) * (currentPolicy.car_allowance_per_km || 0);
  } else if (type === '宿泊出張') {
    const days = report.num_days || 1;
    const nights = report.num_nights || 0;
    daily_allowance = (currentPolicy.daily_allowance_overnight || 0) * days;
    accommodation_fee = (currentPolicy.accommodation_domestic || 0) * nights;
    car_allowance = (report.driving_distance_km || 0) * (currentPolicy.car_allowance_per_km || 0);
  } else if (type === '海外出張') {
    const days = report.num_days || 1;
    const nights = report.num_nights || 0;
    daily_allowance = (currentPolicy.daily_allowance_overseas || 0) * days;
    accommodation_fee = (currentPolicy.accommodation_overseas || 0) * nights;
    // 海外出張は車手当なし
  } else if (type === '外出作業') {
    car_allowance = (report.driving_distance_km || 0) * (currentPolicy.car_allowance_per_km || 0);
    // 外出作業は日当・宿泊費なし
  }

  // 実費合計（規程値非依存、report 値をそのまま使用）
  const actuals =
    (report.highway_fee || 0) +
    (report.parking_fee || 0) +
    (report.taxi_fee || 0) +
    (report.other_transport_fee || 0) +
    (report.flight_fee || 0) +
    (report.airport_transport_fee || 0) +
    (report.coworking_fee || 0) +
    (report.wifi_fee || 0) +
    (report.meal_fee || 0) +
    (report.other_work_fee || 0);

  const total_amount = daily_allowance + accommodation_fee + car_allowance + actuals;

  return { daily_allowance, accommodation_fee, car_allowance, total_amount };
}

/**
 * 全レポートの旧規程 vs 新規程の差分を集計する純粋関数
 *
 * @param {Array} reports - 影響評価対象のレポート配列（通常 status='承認済' でフィルタ済）
 * @param {object} sourcePolicy - 比較元（通常: 現行 active policy）
 * @param {object} targetPolicy - 比較先（通常: 履歴から選んだ別規程）
 * @returns {{
 *   totalReports: number,
 *   affectedCount: number,
 *   totalDiff: number,
 *   items: Array<{ report, oldTotal, newTotal, diff }>,
 * }}
 *
 * `items` は **差分が 0 でないレポートのみ** を含む。
 */
export function computeImpact(reports, sourcePolicy, targetPolicy) {
  if (!sourcePolicy || !targetPolicy) {
    return { totalReports: 0, affectedCount: 0, totalDiff: 0, items: [] };
  }

  const list = reports || [];
  const items = [];

  for (const r of list) {
    const oldVals = recomputeReportPolicyValues(r, sourcePolicy);
    const newVals = recomputeReportPolicyValues(r, targetPolicy);
    const diff = newVals.total_amount - oldVals.total_amount;
    if (diff !== 0) {
      items.push({
        report: r,
        oldTotal: oldVals.total_amount,
        newTotal: newVals.total_amount,
        diff,
      });
    }
  }

  const totalDiff = items.reduce((s, it) => s + it.diff, 0);

  return {
    totalReports: list.length,
    affectedCount: items.length,
    totalDiff,
    items,
  };
}
```

**重要な設計判断**:
- すべて **純粋関数**（副作用なし、外部 IO なし、Date のみ依存）→ Base44 Automation の Custom JavaScript からも呼出可能
- 引数名は `currentPolicy` / `sourcePolicy` / `targetPolicy`（`policy` を避け、`usePolicy` hook の戻り値とシャドーしない設計）
- 実費項目は規程値非依存のため再計算対象外（業務ルール）
- `海外出張` は車手当なし、`外出作業` は日当・宿泊費なし（4 種別ごとの計算ロジック差を厳密に反映）
- `affectedCount` は `diff !== 0` のレポートのみカウント
- 引数が null/undefined のときは安全フォールバック

### 3. `src/pages/PolicyManagement.jsx` の改修

#### 3.1 imports 追加

```js
// 既存 imports に追加
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Eye } from 'lucide-react';
import { computeImpact } from '@/lib/policyImpactAnalyzer';
```

`Eye` アイコンは「影響範囲を確認」ボタン用。

#### 3.2 新規 state

```js
const [showImpactDialog, setShowImpactDialog] = useState(false);
const [impactTarget, setImpactTarget] = useState(null);   // 比較対象の policy（規程一覧で選んだもの）
const [impactResult, setImpactResult] = useState(null);   // computeImpact の戻り値
const [impactLoading, setImpactLoading] = useState(false);
```

#### 3.3 影響範囲計算ハンドラ

```js
const handleShowImpact = async (targetPolicy) => {
  setImpactTarget(targetPolicy);
  setShowImpactDialog(true);
  setImpactLoading(true);
  setImpactResult(null);
  try {
    // 承認済の Report 全件を取得（500 件まで、Summary と同方針）
    const approvedReports = await base44.entities.Report.filter(
      { status: '承認済' },
      '-created_date',
      500,
    );
    // 現行規程と targetPolicy を比較
    const result = computeImpact(approvedReports || [], activePolicy, targetPolicy);
    setImpactResult(result);
  } catch (e) {
    console.warn('[PolicyManagement] computeImpact error', e);
    setImpactResult({ totalReports: 0, affectedCount: 0, totalDiff: 0, items: [], error: true });
  } finally {
    setImpactLoading(false);
  }
};
```

注意:
- 比較元は **現行 `activePolicy`**、比較先は規程一覧から選んだ規程
- 承認済レポート 500 件まで（A6 / A7 と整合）
- エラー時もフォールバック表示

#### 3.4 「影響範囲を確認」ボタンの追加

規程履歴一覧（既存 L296-321）の各規程行で:

```jsx
{!p.is_active && activePolicy && (
  <Button
    size="sm"
    variant="outline"
    onClick={() => handleShowImpact(p)}
    className="text-xs gap-1"
    title="現行規程と比較して影響範囲を確認"
  >
    <Eye className="w-3.5 h-3.5" />影響範囲
  </Button>
)}
```

挿入位置: 既存「適用する」ボタンの **直前**（同じ flex 行内）。`activePolicy` 不在時は表示しない（比較不能）。`is_active` の規程は自身との比較になるため非表示。

#### 3.5 影響範囲 Dialog の JSX

`Approval.jsx` / Summary.jsx（A7）の Dialog パターンを踏襲:

```jsx
<Dialog open={showImpactDialog} onOpenChange={setShowImpactDialog}>
  <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>
        影響範囲: {impactTarget?.version || ''} → 現行規程（{activePolicy?.version || ''}）と比較
      </DialogTitle>
    </DialogHeader>
    {impactLoading ? (
      <div className="py-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">承認済レポートで影響を計算中...</p>
      </div>
    ) : impactResult ? (
      <div className="space-y-4 py-2">
        {impactResult.error && (
          <div className="text-sm text-red-600">計算中にエラーが発生しました。コンソールを確認してください。</div>
        )}
        {/* サマリ */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">承認済件数（評価対象）</p>
            <p className="font-bold text-lg">{impactResult.totalReports}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-700">影響を受けるレポート件数</p>
            <p className="font-bold text-lg text-amber-700">{impactResult.affectedCount}</p>
          </div>
          <div className={`rounded-lg p-3 border ${impactResult.totalDiff > 0 ? 'bg-red-50 border-red-200' : impactResult.totalDiff < 0 ? 'bg-green-50 border-green-200' : 'bg-muted/30 border-border'}`}>
            <p className="text-xs text-muted-foreground">合計差額</p>
            <p className={`font-bold text-lg ${impactResult.totalDiff > 0 ? 'text-red-700' : impactResult.totalDiff < 0 ? 'text-green-700' : ''}`}>
              {impactResult.totalDiff > 0 ? '+' : ''}¥{impactResult.totalDiff.toLocaleString()}
            </p>
          </div>
        </div>
        {/* 影響レポート一覧 */}
        {impactResult.items.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">レポートID</th>
                  <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">種別</th>
                  <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">作成者</th>
                  <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium">旧合計</th>
                  <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium">新合計</th>
                  <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium">差分</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {impactResult.items.map((it, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-mono text-xs">{it.report.report_number || it.report.id?.slice(-6) || '-'}</td>
                    <td className="px-3 py-2">{it.report.report_type}</td>
                    <td className="px-3 py-2">{it.report.created_by_name}</td>
                    <td className="px-3 py-2 text-right">¥{it.oldTotal.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">¥{it.newTotal.toLocaleString()}</td>
                    <td className={`px-3 py-2 text-right font-medium ${it.diff > 0 ? 'text-red-700' : 'text-green-700'}`}>
                      {it.diff > 0 ? '+' : ''}¥{it.diff.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !impactResult.error ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            影響を受けるレポートはありません（規程値の差分が承認済レポートの計算結果に影響しません）
          </div>
        ) : null}
        {/* 業務ルール明示 */}
        <div className="text-xs text-muted-foreground border-t pt-3">
          ⚠ 表示は <strong>規程変更による計算差分のシミュレーション</strong> です。
          過去の承認済レポートの計算値は <strong>業務ルールにより据え置き</strong> されており、
          本画面の差額は **DB に保存されません**。
        </div>
      </div>
    ) : null}
    <DialogFooter>
      <Button variant="outline" onClick={() => setShowImpactDialog(false)}>閉じる</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

注意点:
- ヘッダで比較対象の version を明示
- 3 つの KPI カード（評価対象件数 / 影響件数 / 合計差額）
- テーブルで影響レポート一覧
- 「業務ルール明示」フッターで「シミュレーション、保存されない」を明示
- max-h-[80vh] + overflow-y-auto で長いリストもスクロール可能

#### 3.6 触れない箇所

- 現行規程表示 Card（L165-192）
- PDF アップロード + AI 解析（L195-227）
- AI 解析後 diff 表示（L230-266）
- 規程内容メモ / 保存ボタン（L268-282）
- 規程履歴の既存表示（L284-325、ただし各規程行に新ボタンを追加するのは例外）
- `handlePdfUpload` / `handleActivate` / `handleSaveNew` 関数
- `FIELD_LABELS` 定義
- `usePolicy` hook 利用

### 4. `.claude-team/baseline-A8.md` 新規作成

```markdown
# Baseline A8 — 旅費規程監査ベースライン

策定日: 2026-06-08
保持者: Design Agent
適用: A8 以降（ロードマップ最終）

## 目的
A8 で実装した「規程変更影響範囲確認」機能の業務的位置付けと検証手順を文書化する。

## 業務ルール（厳守）

1. **過去レポートへの遡及反映禁止**: 規程が変更されても、既存の承認済レポートの計算値（daily_allowance / accommodation_fee / car_allowance / total_amount）は **据え置く**。本 A8 で実装した影響範囲表示は **シミュレーションのみ** であり、DB の保存値を書き換えない。
2. **実費項目は対象外**: highway_fee / parking_fee / taxi_fee / other_transport_fee / flight_fee / airport_transport_fee / coworking_fee / wifi_fee / meal_fee / other_work_fee は規程値に依存しない実費のため、規程変更による再計算対象外。
3. **比較範囲**: 影響評価対象は status='承認済' のレポートのみ（500 件まで、Summary / 月次配信と同方針）。

## 業務シナリオ（監査担当の利用フロー）

### シナリオ 1: 規程変更前の影響範囲事前確認
1. 監査担当が `PolicyManagement.jsx` を開く
2. 規程履歴一覧で **「適用予定の新規程」** を見つける（is_active=false）
3. 「影響範囲」ボタンを押下 → Dialog で件数 / 合計差額 / 影響レポート一覧を確認
4. 必要に応じて経理に事前共有
5. 問題なければ「適用する」ボタンで規程を切り替え

### シナリオ 2: 過去の規程変更履歴の追跡
1. 監査担当が規程履歴一覧で過去の規程（is_active=false）の「影響範囲」を押下
2. 「当該規程に切り替えたとしたら、現在の承認済レポートにどう影響したか」を確認
3. 監査レポート作成時の参考にする

### シナリオ 3: CSV 出力との連携（A7 統合）
1. 監査担当が `Summary.jsx` で「監査用 CSV 出力」（A7）を実施
2. CSV の合計金額と、`PolicyManagement.jsx` の影響範囲表示で集計を二重チェック
3. 規程変更タイミングが集計期間に跨る場合、影響を事前に把握

## 検証手順（Owner 分担）

1. **基本動作確認**:
   - admin で `PolicyManagement.jsx` を開く
   - 「影響範囲」ボタンが規程履歴の各 inactive 規程に表示される（is_active=true には非表示）
   - クリック → Dialog 表示
   - 3 KPI カード + 影響レポート一覧 + 業務ルール明示フッター
   - 「閉じる」ボタンで Dialog 閉じる
2. **計算正確性確認**:
   - 既知の承認済レポート（例: 日帰り出張 1 件、daily_allowance=5000）に対し、
     `daily_allowance_daytrip` を 5000 → 6000 に変えた規程との比較で **+1000 / 件** が出ることを確認
   - 種別ごと（日帰り / 宿泊 / 海外 / 外出作業）の規程依存項目が正しく再計算される
3. **業務ルール確認**:
   - 影響範囲 Dialog を閉じた後、対象レポートの保存値が **変わっていない** ことを `ReportDetail.jsx` で確認
   - DB に書き戻しが発生していないことを確認
4. **境界条件**:
   - 承認済レポートが 0 件: Dialog で「影響を受けるレポートはありません」表示
   - `activePolicy` 不在: 「影響範囲」ボタン自体が非表示
   - 500 件超: 上位 500 件のみ評価対象（明示は不要、A6/A7 と整合）

## 既存機能への影響

### 影響なし（不変）
- 現行規程表示 Card
- PDF アップロード + AI 解析 + diff 表示
- 規程内容メモ / 新規規程保存
- 規程履歴の既存表示要素（version, 施行日, 適用中バッジ, PDF リンク, 適用するボタン）
- `handlePdfUpload` / `handleActivate` / `handleSaveNew` の動作
- `usePolicy` hook / `policyContext.jsx`

### 影響あり（A8 で追加）
- 規程履歴の各 inactive 規程行に「影響範囲」ボタンが追加
- 新規 Dialog 1 つが追加

## ロードマップ完了

A8 完了で **ロードマップ全 9 フェーズ完走**（A0 → A0.1 → A1 → A2 → A3 → A4 → A5（MVP COMPLETE）→ A6 → A7 → **A8**）。
業務フロー「社員 → レポート作成 → AI 補完 → 承認 → 集計 → CSV → 旅費規定監査」全体が完成。
```

### 5. `current-phase.txt` の確認と自動補正

実装着手時に `current-phase.txt = A8` であることを確認。`A7` のままなら本 DO で `A8` に更新。`A9` 以降は **存在しない**（ロードマップ最終）。Review Agent verdict-A8 が `PHASE COMPLETE` と同時に `PROJECT COMPLETE` を宣言できる構造。

### 6. ビルド / lint 検証

- `npm run lint` errors=0
- A7 完了時点（3 warnings: `Login.jsx err` / `ReportDetail.jsx isAdmin` / `ReportNew.jsx navigate`）から増加していないこと
- 新規 `policyImpactAnalyzer.js` 改修 / `PolicyManagement.jsx` 改修で新たな warning が出ないこと
- `npm run build` 成功

### 7. Regression 検証

#### 7.1 既存 PolicyManagement.jsx の動作
- 現行規程表示 Card の表示
- PDF アップロード + AI 解析 + AI 解析後 diff 表示
- 「規程を保存する」ボタン → 新規規程作成
- 「適用する」ボタン → 規程切り替え（is_active 更新）
- 「PDF」リンクの動作
- 規程履歴一覧の表示

#### 7.2 新規「影響範囲」機能の動作
- admin で表示、user では PolicyManagement 画面自体にアクセス不可（既存の Layout / ロール分岐に依存）
- ボタンが is_active=false の規程のみに表示
- クリック → Dialog 表示 → 3 KPI + テーブル + 業務ルール明示
- 0 件影響時の「該当なし」表示
- エラー時のフォールバック表示
- 「閉じる」で Dialog 閉じる

#### 7.3 計算正確性
- 4 種別（日帰り / 宿泊 / 海外 / 外出作業）でそれぞれ規程値依存項目が正しく再計算される
- 実費項目は再計算対象外（report 値そのまま）
- 海外出張の車手当 = 0、外出作業の日当 + 宿泊費 = 0 の境界条件

#### 7.4 業務ルール検証
- Dialog を閉じた後も `ReportDetail.jsx` の保存値が **変わらない**（書き戻しが発生していない）

検証結果は Review Package §4 に記録。手動 UI 確認が困難な場合は、コードロジックの存在と論理確認として §4 に明記する。

### 8. Commit 方針（verdict-A1 §8 改善提案 3 継続適用）

実コミットは **Review verdict 後の Owner 操作**で実行する。Implementation Agent は Review Package §7 に以下を記載:
- ステージング対象ファイル一覧
- コミットメッセージ案（例: `feat(A8): add policy impact analyzer and history viewer`）
- 注意事項

### 9. handoff 雛形からの逸脱明示（verdict-A4 §7.1 改善継続）

本 handoff §2-§3 の雛形コードは設計参考。Implementation Agent が等価機能を別構造で実装する場合は Review Package §2 / §3 に逸脱と理由を明示。verdict-A7 §6.2「変数シャドー自己チェック」に倣い、Design Agent は本 handoff 起草時点で:
- 引数名 `currentPolicy` / `sourcePolicy` / `targetPolicy` を採用（`policy` シャドー回避）
- `target` 等の汎用名は避け、`impactTarget` / `impactResult` 等の文脈明示名を採用

---

## 【DO NOT】

- 過去レポートへの遡及計算反映（**業務ルール厳守**、保存処理を一切追加しない）
- 規程承認ワークフロー（多段階）
- 規程比較の外部公開（公開 URL、共有リンク等）
- 新規エンティティの作成（`AuditLog` 等）
- 既存 `analyzedPolicy && showDiff` ブロック（PDF AI 解析後の diff 表示）への変更
- 既存 `FIELD_LABELS` 定義への変更
- 既存 `handlePdfUpload` / `handleActivate` / `handleSaveNew` の変更
- `policyContext.jsx` / `usePolicy` hook への touch
- `policyImpactAnalyzer.js` 内に `Date.now()` 以外の外部 IO（`window` / `document` / `localStorage` / `Blob` / `URL.createObjectURL` / `fetch` / `console.warn` 含む）を含めること
- 4 form の計算ロジック抽出（A8 では `policyImpactAnalyzer.js` に必要分のみを純粋関数として記述）
- 実費項目の規程依存化（業務ルール: 実費は規程値非依存）
- A1〜A7 すべての成果物（4 form / ReportEdit / Approval / ReportDetail / Summary / aggregation.js / notifications.js / useReceiptParser.js / ReceiptUploaderSection.jsx / reportGenerator.js / App.jsx Routes）への touch
- 新規ルート / 新規ページ / 新規 hook
- `src/api/base44Client.js` の変更
- `src/components/ui/*` の変更
- `lib/AuthContext.jsx` の変更
- `package.json` / `package-lock.json` の変更
- `eslint.config.js` / `vite.config.js` / `tailwind.config.js` の変更
- `npm run lint:fix` の実行
- `.claude-team/goal.md` / `.claude-team/roadmap.md` / `.claude-team/auto-handoff.md` / `.claude-team/README.md` / `.claude-team/templates/*` の変更
- `current-phase.txt` を `A9` 以降に更新（A9 は存在しない、ロードマップ最終）
- `git push`
- `git commit` の実行（Review verdict 後の Owner 操作）
- `git commit --amend`
- `--no-verify` 等の hook スキップ
- `review-package-A8.md` でのプレースホルダ未充填での Review 起動

---

## 【FILES / AREAS】

### 変更可能
- `src/pages/PolicyManagement.jsx`（imports + state + handler + ボタン + Dialog。既存表示への touch なし）

### 新規作成
- `src/lib/policyImpactAnalyzer.js`
- `.claude-team/baseline-A8.md`
- `.claude-team/review-packages/review-package-A8.md`

### メタ更新（任意）
- `.claude-team/current-phase.txt`（`A7` のままなら `A8` に更新可。`A9` 以降への更新は禁止）

### 参照のみ（変更しない）
- `.claude-team/verdicts/verdict-A7.md`
- `.claude-team/handoff/design-handoff-A7.md`
- `.claude-team/review-packages/review-package-A7.md`
- `.claude-team/baseline-A6.md` / `.claude-team/baseline-A7.md`
- `.claude-team/roadmap.md` A8 行
- HANDOFF.md Report スキーマ（L177-231）/ TravelPolicyMaster スキーマ（L234-252）
- `src/lib/policyContext.jsx`（`usePolicy` の参照のみ）
- `src/pages/Approval.jsx` / `src/pages/Summary.jsx`（Dialog import パターン参考）

### 触れてはいけない
- 上記「変更可能」以外の `src/**`
- `src/api/base44Client.js`
- `src/components/ui/*`
- `src/components/forms/*`
- `src/hooks/useReceiptParser.js`
- `src/lib/notifications.js`（A5-A6 で確立した 4 ヘルパー）
- `src/lib/aggregation.js`（A6-A7 で確立）
- `src/lib/reportGenerator.js`
- `src/lib/policyContext.jsx`
- `src/lib/AuthContext.jsx`
- `src/pages/Approval.jsx`
- `src/pages/Summary.jsx`
- `src/pages/ReportDetail.jsx`
- `src/pages/ReportEdit.jsx`
- `src/pages/ReportNew.jsx`
- `src/pages/ReportList.jsx`
- `src/pages/Dashboard.jsx`
- `src/App.jsx`
- 設定ファイル類
- `.claude-team/` の goal / roadmap / auto-handoff / README / templates / 過去 verdict / 過去 handoff / baseline-A6.md / baseline-A7.md

---

## 【DONE CRITERIA】

Review Agent はこの順で確認する:

- [ ] `npm run lint` errors=0、warnings は A7 完了時点（3 件）から増加していない
- [ ] `npm run build` 成功
- [ ] `src/lib/policyImpactAnalyzer.js` 存在
- [ ] `policyImpactAnalyzer.js` に `recomputeReportPolicyValues` / `computeImpact` の 2 export が存在
- [ ] `recomputeReportPolicyValues` が 4 種別（日帰り / 宿泊 / 海外 / 外出作業）の規程依存項目を再計算する分岐が存在
- [ ] `recomputeReportPolicyValues` で実費項目（10 種類）が規程値非依存で集計されている
- [ ] `computeImpact` の戻り値に `totalReports` / `affectedCount` / `totalDiff` / `items` が含まれる
- [ ] `computeImpact` で `diff !== 0` のレポートのみ `items` に含まれる
- [ ] `policyImpactAnalyzer.js` 全体に `window` / `document` / `localStorage` / `Blob` / `URL.createObjectURL` / `fetch` / `console.warn` の使用なし（純粋関数性）
- [ ] `PolicyManagement.jsx` に admin 限定「影響範囲」ボタンが追加されている
- [ ] ボタンは `is_active === false` かつ `activePolicy` 存在時のみ表示
- [ ] ボタン押下 → `handleShowImpact` が呼ばれ、Dialog が開く
- [ ] Dialog に 3 KPI（評価対象件数 / 影響件数 / 合計差額）+ レポート一覧テーブル + 業務ルール明示フッターが存在
- [ ] 0 件影響時のフォールバック表示が存在
- [ ] エラー時のフォールバック表示が存在
- [ ] Dialog の「閉じる」ボタンで閉じる
- [ ] `PolicyManagement.jsx` の既存機能（現行規程表示 / PDF AI 解析 / 規程保存 / 規程適用 / 規程履歴表示 / `FIELD_LABELS`）への touch がない
- [ ] `baseline-A8.md` に業務ルール + 業務シナリオ + 検証手順 + 既存機能への影響評価が記載されている
- [ ] `git diff --stat` の変更ファイルが許容範囲（1 改修 + 3 新規 + 任意 current-phase.txt）
- [ ] `review-package-A8.md` の必須セクション（§1〜§7）すべて存在
- [ ] **プレースホルダ完全充填**: `grep -c "AUTO-""FILL:" review-package-A8.md` = `0`（分割表記）
- [ ] `current-phase.txt` の内容が `A8`
- [ ] `git push` 未実行
- [ ] commit 未実行（Review verdict 後の Owner 操作）

---

## 【REVIEW POINTS】

Review Agent は以下を確認:

1. **スコープ厳守**: 変更が「変更可能」リスト 1 ファイル + 新規 3 ファイル + メタ任意の範囲
2. **`policyImpactAnalyzer.js` の純粋性**: 副作用なし、browser 依存なし、外部 IO 不使用
3. **4 種別の再計算分岐**: 日帰り / 宿泊 / 海外 / 外出作業 で規程依存項目（daily_allowance / accommodation_fee / car_allowance）が正しく分岐
4. **実費項目の規程非依存性**: 10 種類の実費フィールドが規程値に関係なく report 値そのまま使用
5. **変数シャドー回避**: `currentPolicy` / `sourcePolicy` / `targetPolicy` / `impactTarget` / `impactResult` 等の引数・変数名が既存 `policy` / `target` 等とシャドーしない（verdict-A7 §6.2 改善反映）
6. **業務ルール厳守**: 影響範囲表示が **シミュレーションのみ**、DB への書き戻しが発生していない（`Report.update` 呼出が `handleShowImpact` 内に存在しないこと）
7. **既存 `PolicyManagement.jsx` 機能の不変性**: PDF 取込 / AI 解析 / 規程保存 / 規程適用 / 履歴表示すべて touch なし
8. **「影響範囲」ボタンの表示条件**: `!p.is_active && activePolicy` の AND 条件で表示
9. **`activePolicy` 不在時の安全性**: ボタン自体が非表示で実行不能
10. **Dialog UI の整合性**: Approval.jsx / Summary.jsx の Dialog パターンと一貫
11. **A1〜A7 成果物の不変性**: 4 form / ReportEdit / Approval / Summary / aggregation.js / notifications.js / hook / receipt UI / reportGenerator.js / App.jsx Routes へのいかなる touch もなし
12. **REPOSITORY ISOLATION RULE 違反なし**
13. **handoff 雛形からの逸脱明示**: Implementation Agent が雛形から構造変更した場合、Review Package §2 / §3 に理由が記載
14. **プレースホルダ完全充填**: `grep -c "AUTO-""FILL:" review-package-A8.md` = 0
15. **`git push` 未実行**
16. **commit 未実行**: Review verdict 後の Owner 操作、Review Package §7 に staging + メッセージ案完備

判定:
- 合格時: `.claude-team/verdicts/verdict-A8.md` に
  ```
  APPROVED
  PHASE COMPLETE
  PROJECT COMPLETE
  ```
  + `current-phase.txt` を `DONE` または同等の終端値に更新（A9 は存在しない）
  + **PROJECT COMPLETE 宣言**（ロードマップ全 9 フェーズ完走）
- 不合格時: `REJECTED` + 修正要求
- 違反時: `REJECTED / FOREIGN CONTEXT DETECTED`

---

## 【NEXT PHASE DEPENDENCY】

A8 は **ロードマップ最終フェーズ**。本フェーズ APPROVED の時点で:

- 業務フロー全体（社員 → レポート作成 → AI 補完 → 承認 → 集計 → CSV → 旅費規定監査）が完成
- A0 → A0.1 → A1 → A2 → A3 → A4 → A5（MVP COMPLETE）→ A6 → A7 → A8（PROJECT COMPLETE）の全 9 フェーズ完走
- 監査担当が `Summary.jsx`（A7 audit CSV）+ `PolicyManagement.jsx`（A8 影響範囲）で監査作業を完結可能

NEXT PHASE は存在しない。Review Agent の判定形式は:
```
APPROVED
PHASE COMPLETE
PROJECT COMPLETE
```

または同等の最終宣言。`NEXT PHASE: A9` のような次フェーズ指定は行わない。

ロードマップ完了後の運用（バグ対応 / 機能追加要望）は、新規 roadmap 策定（A9-A16 等）または独立タスク管理として、Design Agent が Owner と協議して決定する。本フェーズ範囲外。
