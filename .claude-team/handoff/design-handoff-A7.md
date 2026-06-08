# Design Handoff — Phase A7

From: Design Agent
To: Implementation Agent（※ Design Review Gate 通過後のみ起動可）
Date: 2026-06-08
Goal 正本: `.claude-team/goal.md`
Roadmap 正本: `.claude-team/roadmap.md`
直近 verdict: `.claude-team/verdicts/verdict-A6.md`（APPROVED / PHASE COMPLETE / NEXT PHASE: A7）
A6 設計レビュー判定: `.claude-team/design-reviews/design-review-verdict-A6.md`

本 handoff は roadmap.md の A7 行と verdict-A6 §8.5 の指示を 9 ブロック仕様に整形したもの。verdict-A6 §6 改善提案のうち A7 関連項目（§6.2 CSV 添付化は A6 で扱い済みのため A7 では再検討せず）を反映。

---

## 【CURRENT PHASE】

**A7 — CSV 出力フォーマット固定 + 大量データ対応**

業務フローの「CSV」レイヤを監査要件に沿って整える。現状の `buildReportsCSV`（A6 で確立）は 8 列の最小フォーマットで、エスケープ処理なし。本フェーズで:
1. 監査要件に沿った **`audit` フォーマット**（経費内訳・承認者・期間等を含む拡張列）を追加
2. CSV セルのエスケープ（カンマ・引用符・改行を含むセルを正しく出力）を導入
3. 大量データ（500〜1000 件超）でブラウザがフリーズしない **chunked async 生成**
4. Summary 画面に **絞り込み（期間 + ユーザー + 種別）UI** を追加し、監査用エクスポートで使用
5. CSV 列定義を `baseline-A7.md` に明示

既存 `buildReportsCSV(reports)`（同期版）の戻り値挙動は完全等価維持。A6 の月次メール配信は影響を受けない（エスケープ追加は外形改善で回帰ではない）。

---

## 【OBJECTIVE】

1. `src/lib/aggregation.js` を改修:
   - 内部ヘルパー `escapeCsvCell(value)` 追加（RFC 4180 準拠の最小エスケープ）
   - 内部ヘルパー `getHeaders(format)` / `buildRow(report, format)` 追加（`format: 'simple' | 'audit'`）
   - 既存 `buildReportsCSV(reports)` を内部ヘルパー使用に書き換え（外形挙動は等価、エスケープ追加のみが差分）
   - 新規 `buildReportsCSVAsync(reports, { format, chunkSize, onProgress })` を追加（async + chunked + format 切替 + progress callback）
2. `src/pages/Summary.jsx` を改修:
   - 既存「CSV 出力」ボタン（簡易、年フィルタ）は維持
   - 新規「監査用 CSV 出力」ボタン（admin 限定）を追加 → 絞り込みダイアログ表示
   - ダイアログで期間（開始日・終了日）/ ユーザー / 種別を選択
   - `buildReportsCSVAsync` を `format: 'audit'` で呼出、progress 表示
   - chart / table / KPI Card 既存表示は触らない
3. `.claude-team/baseline-A7.md` を新規作成:
   - `simple` フォーマットの列定義（既存 8 列）
   - `audit` フォーマットの列定義（拡張列の一覧）
   - 大量データ動作確認手順（Owner 分担）
   - Excel 開封検証手順

---

## 【SCOPE】

A7 の作業範囲は以下に **厳密に限定**:

| カテゴリ | 内容 |
|---|---|
| 改修 | `src/lib/aggregation.js`（既存 `buildReportsCSV` 内部リファクタ + 新規 `buildReportsCSVAsync` + エスケープヘルパー + format ヘルパー） |
| 改修 | `src/pages/Summary.jsx`（監査用 CSV ボタン + Dialog + 絞り込みフォーム + progress 表示。chart/table 既存 JSX は不変） |
| 新規 | `.claude-team/baseline-A7.md`（CSV 列定義 + 検証手順） |
| 新規 | `.claude-team/review-packages/review-package-A7.md` |
| 文書化 | Review Package に設計判断（format 切替の戻り値構造 / chunkSize 選択 / エスケープ仕様 / 絞り込み UI 範囲）と検証手順 |

### 非対象（DO NOT で詳述）
- PDF 出力（roadmap 非実装）
- 列カスタマイズ UI（roadmap 非実装、固定 simple / audit の 2 種類のみ）
- CSV 出力履歴の DB 保存（roadmap 非実装、新規エンティティ禁止）
- A6 の `aggregateMonthlySummary` / `formatSummaryForEmail` への変更（集計ロジック再設計禁止）
- A6 の `Summary.jsx` 既存「CSV 出力」ボタン挙動の変更（ファイル名・列順は完全維持）
- A6 の `notifications.js` / 月次メール配信への touch
- A5 以前の成果物（4 form / ReportEdit / Approval / hook / receipt UI / reportGenerator）への touch
- A8 領域（規程変更履歴 / 影響範囲追跡）
- Web Worker / WASM 等の重実装（chunked async で最小実装）
- メール添付ファイル機能（verdict-A6 §5 Q2 → A7 Design Agent 判断として「本フェーズでは扱わない、roadmap 改訂時に独立判断」と決定）

---

## 【DO】

### 1. 現状把握（A7 開始時の grep で行番号確定）

| 観点 | 確認方法 | 期待 |
|---|---|---|
| 既存 `buildReportsCSV` シグネチャ | `grep -n "buildReportsCSV" src/lib/aggregation.js` | A6 完了状態の純粋関数、headers 8 列、`row.join(',')` 素朴連結（エスケープなし） |
| `aggregation.js` の純粋性 | `grep -nE "window\|document\|localStorage\|Blob" src/lib/aggregation.js` | ヒット 0（A6 で確立） |
| Summary.jsx の `exportCSV` | grep + Read | A6 完了状態、`buildReportsCSV` 呼出、BOM 付与、Blob/Download |
| Summary.jsx の `sendPreviousMonthSummary` | grep | A6 完了状態、`buildReportsCSV` 呼出 |
| Summary.jsx の Dialog 使用 | `grep -n "Dialog" src/pages/Summary.jsx` | 既存使用ヒット 0、本フェーズで初導入想定 |
| Approval.jsx の Dialog import パターン | 参考用 grep | `@/components/ui/dialog` から import |
| Report スキーマフィールド | HANDOFF.md L177-231 参照 | audit format で参照する全フィールドが実在することを確認 |

### 2. `src/lib/aggregation.js` の改修

#### 2.1 内部ヘルパー追加

```js
// RFC 4180 準拠の最小 CSV エスケープ
// セルに , / " / 改行 を含む場合は " で囲み、内部の " は "" にする
function escapeCsvCell(value) {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// format 別のヘッダー定義
function getHeaders(format) {
  if (format === 'audit') {
    return [
      'レポートID', '種別', 'ステータス',
      '作成者', '作成者メール',
      '作成日', '承認日', '承認者',
      '出張日_開始', '出張日_終了', '泊数', '日数',
      '目的地', '住所', '国', '都市',
      '業務内容',
      '片道距離_km', '走行距離_km',
      '日当', '宿泊費', '車手当',
      '高速道路料金', '駐車場料金', 'タクシー料金', 'その他交通費',
      '航空券代', '空港送迎費',
      'コワーキング_会議室', 'WiFi_通信費', '食事代', 'その他業務費',
      '合計金額',
    ];
  }
  // simple（既存 8 列、A6 から不変）
  return ['レポートID', '種別', '作成者', '年月', '日付', '目的地', 'ステータス', '合計金額'];
}

// format 別の 1 レポート → セル配列
function buildRow(r, format) {
  if (format === 'audit') {
    return [
      r.report_number || r.id?.slice(-6) || '',
      r.report_type || '',
      r.status || '',
      r.created_by_name || '',
      r.created_by_email || '',
      r.created_date ? format(new Date(r.created_date), 'yyyy-MM-dd') : '',
      r.approved_date || '',
      r.approver_name || '',
      r.travel_date || r.start_date || '',
      r.end_date || '',
      r.num_nights ?? '',
      r.num_days ?? '',
      r.destination_name || '',
      r.destination_address || '',
      r.country_name || '',
      r.city_name || '',
      r.business_content || '',
      r.one_way_distance_km ?? '',
      r.driving_distance_km ?? '',
      r.daily_allowance || 0,
      r.accommodation_fee || 0,
      r.car_allowance || 0,
      r.highway_fee || 0,
      r.parking_fee || 0,
      r.taxi_fee || 0,
      r.other_transport_fee || 0,
      r.flight_fee || 0,
      r.airport_transport_fee || 0,
      r.coworking_fee || 0,
      r.wifi_fee || 0,
      r.meal_fee || 0,
      r.other_work_fee || 0,
      r.total_amount || 0,
    ];
  }
  // simple（既存 A6 buildReportsCSV と同等）
  return [
    r.report_number || r.id?.slice(-6) || '',
    r.report_type || '',
    r.created_by_name || '',
    r.created_date ? format(new Date(r.created_date), 'yyyy/MM') : '',
    r.travel_date || r.start_date || (r.created_date ? format(new Date(r.created_date), 'yyyy-MM-dd') : ''),
    r.destination_name || `${r.country_name || ''} ${r.city_name || ''}`.trim() || '',
    r.status || '',
    r.total_amount || 0,
  ];
}

// ヘルパー: 1 行のセル配列を CSV 1 行に整形（全セル escapeCsvCell 適用）
function rowToCsvLine(cells) {
  return cells.map(escapeCsvCell).join(',');
}
```

`format` を date-fns から既に import 済（A6 で確立）。新規追加なし。

#### 2.2 既存 `buildReportsCSV` の書き換え

外形挙動は等価維持（テスト容易性向上 + CSV エスケープ追加）:

```js
export function buildReportsCSV(reports) {
  const headers = getHeaders('simple');
  const rows = (reports || []).map(r => buildRow(r, 'simple'));
  return [headers, ...rows].map(rowToCsvLine).join('\n');
}
```

注意点:
- 既存 8 列の headers / row 構造は完全等価
- 違い: `row.join(',')` → `rowToCsvLine(row)`（エスケープ追加）
- セルにカンマや改行を含まない通常データでは出力結果は **完全に同一**
- セルにカンマや改行を含む場合（destination_address、business_content 等）のみ正しく引用符で囲まれる

これは外形改善であり、A6 月次メールの CSV も同じ改善を受ける（業務目的に合致）。

#### 2.3 新規 `buildReportsCSVAsync` の追加

```js
/**
 * 大量データに対応した async + chunked + format 切替の CSV ビルダ
 * @param {Array} reports
 * @param {{ format?: 'simple'|'audit', chunkSize?: number, onProgress?: (state: {done:number,total:number}) => void }} options
 * @returns {Promise<string>} CSV 文字列（BOM なし）
 */
export async function buildReportsCSVAsync(reports, options = {}) {
  const { format = 'simple', chunkSize = 200, onProgress } = options;
  const total = (reports || []).length;
  const headers = getHeaders(format);
  const lines = [rowToCsvLine(headers)];

  for (let i = 0; i < total; i += chunkSize) {
    const chunk = reports.slice(i, i + chunkSize);
    for (const r of chunk) {
      lines.push(rowToCsvLine(buildRow(r, format)));
    }
    const done = Math.min(i + chunkSize, total);
    if (onProgress) {
      try { onProgress({ done, total }); } catch { /* ignore caller errors */ }
    }
    // UI thread に制御を返す（chunk 間で setTimeout(0) を await）
    if (done < total) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return lines.join('\n');
}
```

**重要な設計判断**:
- `chunkSize = 200` をデフォルト（経験的に UI thread 解放と速度のバランス）
- `onProgress` は throw しても aggregate を継続（try-catch でユーザー callback の例外を吸収）
- 最後の chunk 後は setTimeout を呼ばない（無駄な待機なし）
- 戻り値は BOM なしの純粋 CSV 文字列。BOM 付与は UI 層に残す（A6 確立の責務分離）
- 純粋関数性は維持（外部 IO なし、`Date` のみ依存）

### 3. `src/pages/Summary.jsx` の改修

#### 3.1 imports 追加

```js
// 既存 imports（A6 完了状態）に追加
import { buildReportsCSV, aggregateMonthlySummary, formatSummaryForEmail, buildReportsCSVAsync } from '@/lib/aggregation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Filter } from 'lucide-react';
```

`Filter` アイコンは「監査用 CSV 出力」ボタン用。

#### 3.2 新規 state

```js
const [showAuditDialog, setShowAuditDialog] = useState(false);
const [auditFilter, setAuditFilter] = useState(() => ({
  startDate: '', // YYYY-MM-DD
  endDate: '',
  userName: '',  // '' = 全員
  reportType: '', // '' = 全種別
}));
const [auditExporting, setAuditExporting] = useState(false);
const [auditProgress, setAuditProgress] = useState({ done: 0, total: 0 });
```

#### 3.3 絞り込みロジック（純粋計算、useMemo 推奨）

```js
const userOptions = Array.from(new Set(reports.map(r => r.created_by_name).filter(Boolean))).sort();
const typeOptions = ['日帰り出張', '宿泊出張', '海外出張', '外出作業'];

const filterReportsForAudit = (allReports, filter) => {
  return (allReports || []).filter(r => {
    const rDate = r.created_date ? r.created_date.slice(0, 10) : '';
    if (filter.startDate && rDate < filter.startDate) return false;
    if (filter.endDate && rDate > filter.endDate) return false;
    if (filter.userName && r.created_by_name !== filter.userName) return false;
    if (filter.reportType && r.report_type !== filter.reportType) return false;
    return true;
  });
};
```

#### 3.4 監査用エクスポートハンドラ

```js
const exportAuditCSV = async () => {
  setAuditExporting(true);
  setAuditProgress({ done: 0, total: 0 });
  try {
    const filtered = filterReportsForAudit(reports, auditFilter);
    if (filtered.length === 0) {
      alert('該当するレポートがありません。絞り込み条件を見直してください。');
      return;
    }
    const csv = await buildReportsCSVAsync(filtered, {
      format: 'audit',
      chunkSize: 200,
      onProgress: (state) => setAuditProgress(state),
    });
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const datePart = `${auditFilter.startDate || 'all'}_${auditFilter.endDate || 'all'}`;
    link.download = `旅費精算_監査用_${datePart}.csv`;
    link.click();
    setShowAuditDialog(false);
  } catch (e) {
    console.warn('[Summary] exportAuditCSV error', e);
    alert('CSV 出力中にエラーが発生しました。コンソールを確認してください。');
  } finally {
    setAuditExporting(false);
  }
};
```

#### 3.5 admin 向け「監査用 CSV 出力」ボタンの追加

既存「CSV 出力」ボタン（簡易、年フィルタ）の **隣** に admin 限定ボタンを追加:

```jsx
{isAdmin && (
  <Button variant="outline" onClick={() => setShowAuditDialog(true)} className="gap-2">
    <Filter className="w-4 h-4" />
    監査用 CSV 出力
  </Button>
)}
```

#### 3.6 絞り込みダイアログ JSX

`Approval.jsx` の Dialog パターンを踏襲:

```jsx
<Dialog open={showAuditDialog} onOpenChange={setShowAuditDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>監査用 CSV 出力 — 絞り込み</DialogTitle>
    </DialogHeader>
    <div className="space-y-3 py-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">開始日（作成日）</Label>
          <Input type="date" value={auditFilter.startDate} onChange={e => setAuditFilter(f => ({ ...f, startDate: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">終了日（作成日）</Label>
          <Input type="date" value={auditFilter.endDate} onChange={e => setAuditFilter(f => ({ ...f, endDate: e.target.value }))} />
        </div>
      </div>
      <div>
        <Label className="text-xs">ユーザー</Label>
        <Select value={auditFilter.userName || '__all__'} onValueChange={v => setAuditFilter(f => ({ ...f, userName: v === '__all__' ? '' : v }))}>
          <SelectTrigger><SelectValue placeholder="全員" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全員</SelectItem>
            {userOptions.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">種別</Label>
        <Select value={auditFilter.reportType || '__all__'} onValueChange={v => setAuditFilter(f => ({ ...f, reportType: v === '__all__' ? '' : v }))}>
          <SelectTrigger><SelectValue placeholder="全種別" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全種別</SelectItem>
            {typeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {auditExporting && (
        <div className="text-xs text-muted-foreground">
          生成中: {auditProgress.done} / {auditProgress.total} 件...
        </div>
      )}
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setShowAuditDialog(false)} disabled={auditExporting}>キャンセル</Button>
      <Button onClick={exportAuditCSV} disabled={auditExporting} className="bg-[#1a237e] hover:bg-[#1a237e]/90 text-white gap-2">
        {auditExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        ダウンロード
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

`Select` 系コンポーネントは既存 import（Summary.jsx L6 で `@/components/ui/select` から）を再利用。

#### 3.7 触れない箇所

- chart / table 既存 JSX
- KPI Card 既存
- 既存「CSV 出力」ボタンの動作（簡易、年フィルタ、ファイル名 `旅費精算_${year}年_経理用.csv`）
- A6 で追加した「先月の集計を管理者に送信」ボタン
- localStorage / annualBudget 既存処理
- 月次・年次計算ロジック

### 4. `.claude-team/baseline-A7.md` 新規作成

```markdown
# Baseline A7 — CSV 出力フォーマット定義

策定日: 2026-06-08
保持者: Design Agent
適用: A7 以降のフェーズ

## simple フォーマット（既存 8 列、A6 から不変）

A6 月次メール配信および Summary.jsx の既存「CSV 出力」ボタンで使用。

| 列順 | ヘッダ | データソース |
|---|---|---|
| 1 | レポートID | `report_number || id` |
| 2 | 種別 | `report_type` |
| 3 | 作成者 | `created_by_name` |
| 4 | 年月 | `format(created_date, 'yyyy/MM')` |
| 5 | 日付 | `travel_date / start_date / format(created_date)` |
| 6 | 目的地 | `destination_name / country city` |
| 7 | ステータス | `status` |
| 8 | 合計金額 | `total_amount` |

## audit フォーマット（A7 で導入）

監査用 CSV エクスポート、admin 限定。

| 列順 | ヘッダ | データソース |
|---|---|---|
| 1 | レポートID | `report_number` |
| 2 | 種別 | `report_type` |
| 3 | ステータス | `status` |
| 4 | 作成者 | `created_by_name` |
| 5 | 作成者メール | `created_by_email` |
| 6 | 作成日 | `format(created_date, 'yyyy-MM-dd')` |
| 7 | 承認日 | `approved_date` |
| 8 | 承認者 | `approver_name` |
| 9 | 出張日_開始 | `travel_date / start_date` |
| 10 | 出張日_終了 | `end_date`（出張系のみ） |
| 11 | 泊数 | `num_nights` |
| 12 | 日数 | `num_days` |
| 13 | 目的地 | `destination_name` |
| 14 | 住所 | `destination_address` |
| 15 | 国 | `country_name`（海外） |
| 16 | 都市 | `city_name`（海外） |
| 17 | 業務内容 | `business_content` |
| 18 | 片道距離_km | `one_way_distance_km` |
| 19 | 走行距離_km | `driving_distance_km` |
| 20-32 | 経費内訳 | 日当・宿泊費・車手当・高速・駐車場・タクシー・その他交通費・航空券・空港送迎・コワーキング・WiFi・食事・その他業務費（個別列） |
| 33 | 合計金額 | `total_amount` |

## エスケープ仕様

RFC 4180 準拠の最小エスケープ:
- セル値が `,` / `"` / 改行（`\n` / `\r`）を含む場合、セル全体を `"..."` で囲む
- セル内の `"` は `""` にエスケープ

## エンコーディング

UTF-8 with BOM（先頭に `﻿`）。Excel で直接開封時の文字化けを防ぐ。

## 大量データ動作確認手順（Owner 分担）

1. 500 件想定: Base44 sandbox で 500 件の承認済レポートを作成（または既存データで近似）
2. Summary 画面 → 「監査用 CSV 出力」 → 絞り込みなし → ダウンロード → progress 表示が動作し、ブラウザがフリーズしないことを確認
3. 1000 件想定: 同上、約 5 秒以内に完了することを目安
4. Excel で開封 → 文字化けなし、改行を含むセルが正しく表示されることを確認
5. ステータスフィルタ（承認済のみ）が効いていることを確認

## simple vs audit の使い分け

| 用途 | format | 呼出元 |
|---|---|---|
| A6 月次メール配信（メール本文末尾埋め込み） | simple | `notifyMonthlySummary` |
| Summary 画面の既存「CSV 出力」ボタン（年フィルタ） | simple | `exportCSV` |
| Summary 画面の新規「監査用 CSV 出力」ボタン（admin 限定、絞り込みダイアログ） | audit | `exportAuditCSV` |

## 既存挙動への影響

- `buildReportsCSV(reports)` の戻り値は **エスケープ追加** のみが差分。通常データでは出力結果は完全同一。
- カンマや改行を含むセル（`destination_address` / `business_content` 等）が含まれる場合のみ、出力に引用符が追加される（これは CSV 規格準拠の改善であり、回帰ではない）。
```

### 5. `current-phase.txt` の確認と自動補正

実装着手時に `current-phase.txt = A7` であることを確認。`A6` のままなら本 DO で `A7` に更新。`A8` 以降への更新は禁止。

### 6. ビルド / lint 検証

- `npm run lint` errors=0
- A6 完了時点（3 warnings: `Login.jsx err` / `ReportDetail.jsx isAdmin` / `ReportNew.jsx navigate`）から増加していないこと
- 新規 `aggregation.js` 改修 / Summary.jsx 改修で新たな warning が出ないこと
- `npm run build` 成功

### 7. Regression 検証

#### 7.1 既存 `buildReportsCSV` の外形不変性
- 既存呼出元（A6 `sendPreviousMonthSummary` / Summary.jsx `exportCSV`）の出力が、エスケープが効かない通常データで完全同一
- エスケープが効くケース（カンマ含む `destination_address` 等）で正しく引用符で囲まれる

#### 7.2 既存 Summary.jsx の動作
- chart / table / KPI Card 表示の見た目に変化なし
- 既存「CSV 出力」ボタンのファイル名・出力内容が完全同一
- A6 で追加した「先月の集計を管理者に送信」ボタンの動作不変
- admin / user の表示分岐に regression なし

#### 7.3 新規「監査用 CSV 出力」の動作
- admin で表示、user で非表示
- ダイアログで期間・ユーザー・種別を絞り込み → buildReportsCSVAsync が呼出される
- progress 表示が更新される
- 0 件絞り込み時はアラート表示
- ファイル名形式 `旅費精算_監査用_${start}_${end}.csv`
- audit format で 33 列出力

検証結果は Review Package §4 に記録。手動 UI 確認が困難な場合は、コードロジックの存在と論理確認として §4 に明記する。

### 8. Commit 方針（verdict-A1 §8 改善提案 3 継続適用）

実コミットは **Review verdict 後の Owner 操作**で実行する。Implementation Agent は Review Package §7 に以下を記載:
- ステージング対象ファイル一覧
- コミットメッセージ案（例: `feat(A7): add audit CSV format with chunked async and filter dialog`）
- 注意事項

### 9. handoff 雛形からの逸脱明示（verdict-A4 §7.1 改善継続）

本 handoff §2-§3 の雛形コードは設計参考。Implementation Agent が等価機能を別構造で実装する場合は Review Package §2 / §3 に逸脱と理由を明示。

特に以下は許容される改善:
- `escapeCsvCell` の正規表現を別形式（`indexOf` 連鎖等）で実装
- `chunkSize` のデフォルト値変更（100-500 の範囲で正当化）
- ダイアログの UI 構造を既存 shadcn/ui コンポーネントで自然に表現

---

## 【DO NOT】

- PDF 出力の実装（roadmap 非実装）
- 列カスタマイズ UI（roadmap 非実装、format は simple / audit の 2 種類のみ）
- CSV 出力履歴の DB 保存（新規エンティティ作成禁止）
- A6 の `aggregateMonthlySummary` / `formatSummaryForEmail` の集計ロジック変更
- A6 の「先月の集計を管理者に送信」ボタンの動作変更
- A6 月次メールに audit format を使うこと（メール本文末尾埋め込みは simple 維持、可読性のため）
- 既存「CSV 出力」ボタンのファイル名・列順・出力範囲の変更
- A5 以前の成果物（4 form / ReportEdit / Approval / hook / receipt UI / reportGenerator / notifications.js の既存 4 ヘルパー）への touch
- A8 領域（規程変更履歴 / 影響範囲追跡 / PolicyManagement.jsx）
- Web Worker / WASM の導入（chunked async + setTimeout で最小実装）
- メール添付ファイル機能の実装（roadmap 改訂時に別フェーズで判断）
- 新規ルート / 新規ページ / 新規エンティティ / 新規 hook
- `src/api/base44Client.js` の変更
- `src/components/ui/*` の変更
- `lib/policyContext.jsx` / `lib/AuthContext.jsx` の変更
- `package.json` / `package-lock.json` の変更（特に CSV ライブラリ等の依存追加禁止、`escapeCsvCell` 自前実装）
- `eslint.config.js` / `vite.config.js` / `tailwind.config.js` の変更
- `npm run lint:fix` の実行
- `.claude-team/goal.md` / `.claude-team/roadmap.md` / `.claude-team/auto-handoff.md` / `.claude-team/README.md` / `.claude-team/templates/*` の変更
- `current-phase.txt` を `A8` 以降に更新
- `git push`
- `git commit` の実行（Review verdict 後の Owner 操作）
- `git commit --amend`
- `--no-verify` 等の hook スキップ
- `review-package-A7.md` でのプレースホルダ未充填での Review 起動

---

## 【FILES / AREAS】

### 変更可能
- `src/lib/aggregation.js`（内部ヘルパー追加 + 既存 `buildReportsCSV` を内部使用に書き換え + 新規 `buildReportsCSVAsync` 追加）
- `src/pages/Summary.jsx`（imports + state + handler + ダイアログ JSX + ボタン追加。chart/table/既存ボタン挙動には touch しない）

### 新規作成
- `.claude-team/baseline-A7.md`
- `.claude-team/review-packages/review-package-A7.md`

### メタ更新（任意）
- `.claude-team/current-phase.txt`（`A6` のままなら `A7` に更新可。`A8` 以降への更新は禁止）

### 参照のみ（変更しない）
- `.claude-team/verdicts/verdict-A6.md`
- `.claude-team/handoff/design-handoff-A6.md`
- `.claude-team/review-packages/review-package-A6.md`
- `.claude-team/baseline-A6.md`
- `.claude-team/roadmap.md` A7 行
- HANDOFF.md Report スキーマ（L177-231）
- `src/pages/Approval.jsx`（Dialog import パターン参考）
- `src/api/base44Client.js`

### 触れてはいけない
- 上記「変更可能」以外の `src/**`
- `src/api/base44Client.js`
- `src/components/ui/*`
- `src/components/forms/*`
- `src/hooks/useReceiptParser.js`
- `src/lib/notifications.js`（A6 で確立した 4 ヘルパーすべて温存）
- `src/lib/reportGenerator.js`
- `src/lib/policyContext.jsx`
- `src/lib/AuthContext.jsx`
- `src/pages/Approval.jsx`
- `src/pages/PolicyManagement.jsx`
- `src/pages/ReportDetail.jsx`
- `src/pages/ReportEdit.jsx`
- `src/pages/ReportNew.jsx`
- `src/pages/ReportList.jsx`
- `src/pages/Dashboard.jsx`
- `src/App.jsx`
- 設定ファイル類
- `.claude-team/` の goal / roadmap / auto-handoff / README / templates / 過去 verdict / 過去 handoff / baseline-A6.md

---

## 【DONE CRITERIA】

Review Agent はこの順で確認する:

- [ ] `npm run lint` errors=0、warnings は A6 完了時点（3 件）から増加していない
- [ ] `npm run build` 成功
- [ ] `aggregation.js` に内部ヘルパー `escapeCsvCell` / `getHeaders` / `buildRow` / `rowToCsvLine` が存在
- [ ] `aggregation.js` の `getHeaders('simple')` が既存 8 列（A6 baseline）を返す
- [ ] `aggregation.js` の `getHeaders('audit')` が baseline-A7.md 記載の 33 列を返す
- [ ] `aggregation.js` の `escapeCsvCell` が `,` / `"` / 改行を含むセルを正しく引用符で囲む
- [ ] 既存 `buildReportsCSV(reports)` の戻り値が、エスケープが効かない通常データで A6 完了時点と完全同一
- [ ] 新規 `buildReportsCSVAsync(reports, options)` が export されている
- [ ] `buildReportsCSVAsync` が `format: 'simple' | 'audit'` を受け、対応する列構造で出力
- [ ] `buildReportsCSVAsync` の `chunkSize` デフォルトが妥当（100-500 範囲）
- [ ] `buildReportsCSVAsync` が `onProgress` callback を呼ぶ（chunk ごとに `{done, total}`）
- [ ] `buildReportsCSVAsync` 内で `await new Promise(r => setTimeout(r, 0))` または等価な UI thread 解放
- [ ] `aggregation.js` 全体に `window` / `document` / `localStorage` / `Blob` / `URL.createObjectURL` の使用なし（純粋関数性維持）
- [ ] `Summary.jsx` に admin 限定「監査用 CSV 出力」ボタンが追加されている
- [ ] ボタン押下 → ダイアログ表示
- [ ] ダイアログに期間・ユーザー・種別の絞り込みフォームが存在
- [ ] 「ダウンロード」押下 → `buildReportsCSVAsync` を `format: 'audit'` で呼出
- [ ] progress 表示（生成中: done / total 件）が動作
- [ ] ファイル名形式 `旅費精算_監査用_${start}_${end}.csv`
- [ ] 0 件絞り込み時のフォールバック（アラート等）が存在
- [ ] Summary.jsx の chart / table / KPI Card / 既存「CSV 出力」ボタン / A6「先月の集計を管理者に送信」ボタンへの touch がない
- [ ] `baseline-A7.md` に simple / audit 両フォーマットの列定義 + エスケープ仕様 + 大量データ動作確認手順 + Owner 検証手順が記載されている
- [ ] `git diff --stat` の変更ファイルが許容範囲（2 改修 + 2 新規 + 任意 current-phase.txt）
- [ ] `review-package-A7.md` の必須セクション（§1〜§7）すべて存在
- [ ] **プレースホルダ完全充填**: `grep -c "AUTO-""FILL:" review-package-A7.md` = `0`（分割表記）
- [ ] `current-phase.txt` の内容が `A7`
- [ ] `git push` 未実行
- [ ] commit 未実行（Review verdict 後の Owner 操作）

---

## 【REVIEW POINTS】

Review Agent は以下を確認:

1. **スコープ厳守**: 変更が「変更可能」リスト 2 ファイル + 新規 2 ファイル + メタ任意の範囲
2. **既存 `buildReportsCSV` の外形不変性**: 通常データでの出力が A6 と完全同一、エスケープが効くケースのみ正しく引用符付与
3. **`aggregation.js` の純粋性維持**: 副作用なし、browser 依存なし、`window/document/localStorage/Blob/URL` 不使用
4. **`buildReportsCSVAsync` の chunked async 動作**: chunk ごとに `setTimeout(0)` で UI thread 解放、progress callback 呼出
5. **audit format の列定義**: baseline-A7.md と `getHeaders('audit')` が一致、33 列
6. **CSV エスケープの正確性**: `,` / `"` / 改行を含むセルが RFC 4180 準拠で正しく escape される
7. **絞り込みダイアログの動作**: 期間 / ユーザー / 種別の絞り込みが `filterReportsForAudit` で正しく適用
8. **A6 成果物の不変性**: `aggregateMonthlySummary` / `formatSummaryForEmail` / `notifyMonthlySummary` / 月次メール配信ボタンへの touch なし
9. **A5 以前の成果物の不変性**: 4 form / ReportEdit / Approval / hook / receipt UI / reportGenerator / notifications.js の既存 4 ヘルパー
10. **既存「CSV 出力」ボタンの動作維持**: ファイル名 `旅費精算_${year}年_経理用.csv`、列構造、BOM、年フィルタすべて維持
11. **A8 領域への侵食なし**: PolicyManagement.jsx 変更なし、規程履歴・影響範囲追跡なし
12. **メール添付化なし**: A6 月次メールの本文末尾埋め込みのまま、添付機能を導入していない
13. **REPOSITORY ISOLATION RULE 違反なし**
14. **handoff 雛形からの逸脱明示**: Implementation Agent が雛形から構造変更した場合、Review Package §2 / §3 に理由が記載
15. **プレースホルダ完全充填**: `grep -c "AUTO-""FILL:" review-package-A7.md` = 0
16. **`git push` 未実行**
17. **commit 未実行**: Review verdict 後の Owner 操作、Review Package §7 に staging + メッセージ案完備

判定:
- 合格時: `.claude-team/verdicts/verdict-A7.md` に
  ```
  APPROVED
  PHASE COMPLETE
  NEXT PHASE: A8
  ```
  + `current-phase.txt` を `A8` に更新
- 不合格時: `REJECTED` + 修正要求
- 違反時: `REJECTED / FOREIGN CONTEXT DETECTED`

---

## 【NEXT PHASE DEPENDENCY】

A8（旅費規程監査: 規程変更履歴 + 影響範囲追跡）は以下を A7 に依存:

- A7 で確立した audit CSV format に「適用規程バージョン」「規程変更前後の計算差分」等の列を追加する余地が、`getHeaders('audit')` の拡張で実現できる構造
- A8 で `PolicyManagement.jsx` から監査担当向けに「規程変更影響レポート」を CSV 出力する場合、A7 の `buildReportsCSVAsync` パターンを再利用
- A6 + A7 が完成することで「集計 → CSV → 規程監査」の業務フロー終端が業務的に閉じる

A8 の設計詳細は **A7 の Verdict（実装後ゲート）が APPROVED となった後に Design Agent が作成する**。本 handoff の時点では描かない。
