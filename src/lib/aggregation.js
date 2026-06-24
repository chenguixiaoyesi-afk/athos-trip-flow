import { format, getYear, getMonth } from 'date-fns';
import { deriveReportFinancials } from './reportFinancials.js';

// 集計関連の純粋関数モジュール（A6 で新規導入）。
// すべて副作用なし・browser 依存なし・テスト容易性確保。
// Base44 Automation の Custom JavaScript からも browser からも同じ関数を呼び出せる設計。

/**
 * 指定年月の集計を計算する純粋関数
 * @param {Array} reports - Report.filter({ status: '承認済' }) で取得したレポート配列
 * @param {{ year: number, month: number }} options - month は 1-12（人間直感的）
 * @returns {{
 *   year: number,
 *   month: number,
 *   totalAmount: number,
 *   reportCount: number,
 *   byType: { [type: string]: { count: number, amount: number } },
 *   byUser: { [name: string]: { count: number, amount: number } },
 *   reports: Array, // 該当月のレポート配列
 * }}
 */
export function aggregateMonthlySummary(reports, { year, month }) {
  const monthIdx = month - 1; // date-fns getMonth は 0 始まり
  const monthReports = (reports || []).filter(r => {
    const d = new Date(r.created_date);
    return getYear(d) === year && getMonth(d) === monthIdx;
  });

  const totalAmount = monthReports.reduce((s, r) => s + (r.total_amount || 0), 0);

  const byType = {};
  for (const r of monthReports) {
    const k = r.report_type || '不明';
    if (!byType[k]) byType[k] = { count: 0, amount: 0 };
    byType[k].count += 1;
    byType[k].amount += (r.total_amount || 0);
  }

  const byUser = {};
  for (const r of monthReports) {
    const k = r.created_by_name || '不明';
    if (!byUser[k]) byUser[k] = { count: 0, amount: 0 };
    byUser[k].count += 1;
    byUser[k].amount += (r.total_amount || 0);
  }

  return {
    year,
    month,
    totalAmount,
    reportCount: monthReports.length,
    byType,
    byUser,
    reports: monthReports,
  };
}

/**
 * 集計データをメール本文用 plain text に整形する純粋関数
 * @param {ReturnType<typeof aggregateMonthlySummary>} aggregate
 * @returns {string} plain text body
 */
export function formatSummaryForEmail(aggregate) {
  const { year, month, totalAmount, reportCount, byType, byUser } = aggregate;
  const typeLines = Object.entries(byType)
    .map(([k, v]) => `  ${k}: ${v.count} 件 / ¥${v.amount.toLocaleString()}`)
    .join('\n');
  const userLines = Object.entries(byUser)
    .map(([k, v]) => `  ${k}: ${v.count} 件 / ¥${v.amount.toLocaleString()}`)
    .join('\n');

  return `${year}年${month}月の旅費精算集計レポート

合計支給額: ¥${totalAmount.toLocaleString()}
承認済レポート件数: ${reportCount} 件

【種別別小計】
${typeLines || '  （該当なし）'}

【ユーザー別小計】
${userLines || '  （該当なし）'}

詳細はシステムの「集計」画面でご確認ください。
CSV は本メールに添付しています（または別途配信されています）。`;
}

// ---------------------------------------------------------------------------
// A7: CSV ビルダー内部ヘルパー
// 注: 引数名は handoff §[DO] 2.1 雛形では `format` だが、これは date-fns の
// `format` 関数をシャドーする致命的バグ（design-review-verdict-A7 §4 Q1 指摘、
// 修正の選択肢 (a)）のため、Implementation Agent の判断で `formatName` に変更。
// ---------------------------------------------------------------------------

/**
 * RFC 4180 準拠の最小 CSV エスケープ。
 * セルに , / " / 改行 を含む場合は " で囲み、内部の " は "" にする。
 */
function escapeCsvCell(value) {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * format 別のヘッダー定義。
 * formatName='audit' は監査用 33 列、'simple'（既定）は A6 から不変の 8 列。
 */
function getHeaders(formatName) {
  if (formatName === 'audit') {
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

/**
 * format 別の 1 レポート → セル配列。
 * 引数名 `formatName` は date-fns `format` のシャドー回避。
 */
function buildRow(r, formatName) {
  if (formatName === 'audit') {
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

/** 1 行のセル配列を CSV 1 行に整形（全セル escapeCsvCell 適用） */
function rowToCsvLine(cells) {
  return cells.map(escapeCsvCell).join(',');
}

/**
 * レポート配列を CSV 文字列に変換する純粋関数
 * Summary.jsx の exportCSV ロジックを抽出（browser 依存なし、BOM なしのプレーン CSV）
 * A7 で内部ヘルパー使用に書換（外形挙動は A6 と等価、エスケープ追加が唯一の差分）。
 * 通常データでは A6 出力と完全同一、カンマ/改行/引用符を含むセルのみ RFC 4180 準拠で引用符化。
 * @param {Array} reports
 * @returns {string} CSV 文字列
 */
export function buildReportsCSV(reports) {
  const headers = getHeaders('simple');
  const rows = (reports || []).map(r => buildRow(r, 'simple'));
  return [headers, ...rows].map(rowToCsvLine).join('\n');
}

/**
 * 大量データ対応の async + chunked + format 切替の CSV ビルダ（A7 で新規追加）。
 * @param {Array} reports
 * @param {{ format?: 'simple'|'audit', chunkSize?: number, onProgress?: (state: {done:number,total:number}) => void }} options
 * @returns {Promise<string>} CSV 文字列（BOM なし、BOM 付与は UI 層）
 */
export async function buildReportsCSVAsync(reports, options = {}) {
  // options.format は呼出 API として保持（外部 API はそのまま、内部では formatName に rename）
  const { format: formatName = 'simple', chunkSize = 200, onProgress } = options;
  const total = (reports || []).length;
  const headers = getHeaders(formatName);
  const lines = [rowToCsvLine(headers)];

  for (let i = 0; i < total; i += chunkSize) {
    const chunk = reports.slice(i, i + chunkSize);
    for (const r of chunk) {
      lines.push(rowToCsvLine(buildRow(r, formatName)));
    }
    const done = Math.min(i + chunkSize, total);
    if (onProgress) {
      try { onProgress({ done, total }); } catch { /* ignore caller errors */ }
    }
    // UI thread に制御を返す（最後の chunk 後は待機なし）
    if (done < total) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return lines.join('\n');
}

// ===========================================================================
// A13: クロスカンパニー（全社横断）CSV ビルダー（APPEND-ONLY）
// ---------------------------------------------------------------------------
// systemOwner が「全社表示」で書き出す際、各行がどの会社のものか判別できるよう
// 会社名・会社コード列を先頭に付与する。A9 で凍結された simple/audit の列・順序・
// 値・エスケープ規則は一切変更しない（既存 getHeaders/buildRow/rowToCsvLine を再利用）。
// 単一会社スコープ（companyAdmin/manager 等）は従来の buildReportsCSV(Async) を使う。
// ===========================================================================

/**
 * companies 配列から company_id -> { name, code } の参照表を作る（純粋・副作用なし）。
 * @param {Array} companies AuthContext.companies（{ id, name, code, ... }）
 * @returns {Map<string, { name: string, code: string }>}
 */
function buildCompanyLookup(companies) {
  const map = new Map();
  for (const c of companies || []) {
    if (c && c.id) map.set(c.id, { name: c.name || '', code: c.code || '' });
  }
  return map;
}

/** 全社横断時のみ先頭に付与する会社 2 列ヘッダー。 */
const CROSS_COMPANY_HEADERS = ['会社名', '会社コード'];

/**
 * 全社横断 CSV（同期版）。会社名・会社コードを先頭 2 列に付与し、
 * 3 列目以降は既存 getHeaders/buildRow（simple|audit）と完全一致。
 * @param {Array} reports
 * @param {Array} companies
 * @param {{ format?: 'simple'|'audit' }} [options]
 * @returns {string} CSV 文字列（BOM なし、BOM 付与は UI 層）
 */
export function buildCrossCompanyReportsCSV(reports, companies, options = {}) {
  const { format: formatName = 'simple' } = options;
  const lookup = buildCompanyLookup(companies);
  const headers = [...CROSS_COMPANY_HEADERS, ...getHeaders(formatName)];
  const rows = (reports || []).map(r => {
    const co = lookup.get(r.company_id) || { name: '', code: '' };
    return [co.name, co.code, ...buildRow(r, formatName)];
  });
  return [headers, ...rows].map(rowToCsvLine).join('\n');
}

/**
 * 全社横断 CSV（大量データ対応 async + chunked 版）。buildReportsCSVAsync と同じ
 * chunk / onProgress 契約。会社 2 列を先頭に付与する点のみが差分。
 * @param {Array} reports
 * @param {Array} companies
 * @param {{ format?: 'simple'|'audit', chunkSize?: number, onProgress?: (state: {done:number,total:number}) => void }} [options]
 * @returns {Promise<string>} CSV 文字列（BOM なし、BOM 付与は UI 層）
 */
export async function buildCrossCompanyReportsCSVAsync(reports, companies, options = {}) {
  const { format: formatName = 'simple', chunkSize = 200, onProgress } = options;
  const lookup = buildCompanyLookup(companies);
  const total = (reports || []).length;
  const headers = [...CROSS_COMPANY_HEADERS, ...getHeaders(formatName)];
  const lines = [rowToCsvLine(headers)];

  for (let i = 0; i < total; i += chunkSize) {
    const chunk = reports.slice(i, i + chunkSize);
    for (const r of chunk) {
      const co = lookup.get(r.company_id) || { name: '', code: '' };
      lines.push(rowToCsvLine([co.name, co.code, ...buildRow(r, formatName)]));
    }
    const done = Math.min(i + chunkSize, total);
    if (onProgress) {
      try { onProgress({ done, total }); } catch { /* ignore caller errors */ }
    }
    // UI thread に制御を返す（最後の chunk 後は待機なし）
    if (done < total) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return lines.join('\n');
}

// ===========================================================================
// A12.5: グループ統合管理用の追記関数（APPEND-ONLY）
// ---------------------------------------------------------------------------
// 会社別集計（ダッシュボード）とグループ用レポート CSV（会社名/氏名/種別/手当/実費/総支給額）。
// A9 凍結（getHeaders/buildRow/rowToCsvLine/buildReportsCSV(Async)）および A13 cross-company
// 関数の列・順序・値・エスケープ規則は一切変更しない（上記は不変・本セクションは末尾追記のみ）。
// 金額（手当/実費/総支給）は A11 deriveReportFinancials に委譲し二重計算しない。
// ===========================================================================

/**
 * 会社別集計（純粋・副作用なし）。companies の各社について、当該 company_id の
 * レポートを集計する。ダッシュボードの「会社別集計」セクション用。
 * - appliedCount（申請件数）= status ∈ {申請中, 承認済, 差戻し}（下書きを除く提出済みの総数）
 * - approvedCount（承認件数）= status === '承認済'
 * - totalPayment（支給額）= Σ deriveReportFinancials.payment_total（= total_amount）
 * - totalAllowance（手当額）= Σ allowance_total ／ totalExpense（実費額）= Σ expense_total
 * @param {Array} reports
 * @param {Array} companies AuthContext.companies（{ id, name, code, ... }）
 * @returns {Array<{ company_id: string, company_name: string, company_code: string,
 *                   appliedCount: number, approvedCount: number, totalPayment: number,
 *                   totalAllowance: number, totalExpense: number, reportCount: number }>}
 */
export function buildCompanyBreakdown(reports, companies) {
  const SUBMITTED = ['申請中', '承認済', '差戻し'];
  const list = reports || [];
  return (companies || []).map(co => {
    const own = list.filter(r => r && r.company_id === co.id);
    let appliedCount = 0;
    let approvedCount = 0;
    let totalPayment = 0;
    let totalAllowance = 0;
    let totalExpense = 0;
    for (const r of own) {
      if (SUBMITTED.includes(r.status)) appliedCount += 1;
      if (r.status === '承認済') approvedCount += 1;
      const fin = deriveReportFinancials(r);
      totalPayment += fin.payment_total || 0;
      totalAllowance += fin.allowance_total || 0;
      totalExpense += fin.expense_total || 0;
    }
    return {
      company_id: co.id,
      company_name: co.name || '',
      company_code: co.code || '',
      appliedCount,
      approvedCount,
      totalPayment,
      totalAllowance,
      totalExpense,
      reportCount: own.length,
    };
  });
}

/** グループ用レポート CSV のヘッダー（A12.5：会社名/氏名/レポート種別/手当/実費/総支給額）。 */
export const GROUP_REPORT_HEADERS = ['会社名', '氏名', 'レポート種別', '手当', '実費', '総支給額'];

/** 1 レポート → グループ CSV 行（会社名解決済み）。手当/実費/総支給は deriveReportFinancials 委譲。 */
function buildGroupRow(report, lookup) {
  const co = lookup.get(report.company_id) || { name: '', code: '' };
  const fin = deriveReportFinancials(report);
  return [
    co.name,
    report.created_by_name || '',
    report.report_type || '',
    fin.allowance_total,
    fin.expense_total,
    fin.payment_total,
  ];
}

/**
 * グループ用レポート CSV（同期版）。会社名/氏名/種別/手当/実費/総支給額の 6 列。
 * 既存 buildReportsCSV(simple/audit) / buildCrossCompanyReportsCSV(A13) とは別系統の新規ビルダ。
 * 金額は deriveReportFinancials 委譲・raw 数値（Excel 集計可能）。
 * @param {Array} reports
 * @param {Array} companies
 * @returns {string} CSV 文字列（BOM なし、BOM 付与は UI 層）
 */
export function buildGroupReportsCSV(reports, companies) {
  const lookup = buildCompanyLookup(companies);
  const rows = (reports || []).map(r => buildGroupRow(r, lookup));
  return [GROUP_REPORT_HEADERS, ...rows].map(rowToCsvLine).join('\n');
}

/**
 * グループ用レポート CSV（大量データ対応 async + chunked 版）。buildReportsCSVAsync と同じ
 * chunk / onProgress 契約。列は buildGroupReportsCSV と同一。
 * @param {Array} reports
 * @param {Array} companies
 * @param {{ chunkSize?: number, onProgress?: (state: {done:number,total:number}) => void }} [options]
 * @returns {Promise<string>}
 */
export async function buildGroupReportsCSVAsync(reports, companies, options = {}) {
  const { chunkSize = 200, onProgress } = options;
  const lookup = buildCompanyLookup(companies);
  const total = (reports || []).length;
  const lines = [rowToCsvLine(GROUP_REPORT_HEADERS)];

  for (let i = 0; i < total; i += chunkSize) {
    const chunk = reports.slice(i, i + chunkSize);
    for (const r of chunk) {
      lines.push(rowToCsvLine(buildGroupRow(r, lookup)));
    }
    const done = Math.min(i + chunkSize, total);
    if (onProgress) {
      try { onProgress({ done, total }); } catch { /* ignore caller errors */ }
    }
    if (done < total) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return lines.join('\n');
}
