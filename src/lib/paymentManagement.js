import { format, getYear, getMonth } from 'date-fns';
import { deriveReportFinancials } from './reportFinancials.js';

// 支給管理の純粋関数モジュール（A12 で新規導入）。
// すべて副作用なし・browser 依存なし・テスト容易性確保。
// 手当 / 実費 / 総支給は A11 `deriveReportFinancials` に委譲し二重計算しない。
// CSV エスケープは aggregation.js（A9 固定・不可侵）を触らないため本モジュール内にローカル再実装する。
//
// 不変条件（A11 踏襲）:
//   payment_total === total_amount
//   expense_total = max(0, payment_total - allowance_total)

// 支給ステータス定数 + 日本語ラベル（A12.5 で 4 状態へ拡張：承認待ち=pending_approval を追加）
export const PAYMENT_STATUS = {
  PENDING: 'pending',                   // 未承認（下書き / 差戻し）
  PENDING_APPROVAL: 'pending_approval', // 承認待ち（申請中）
  READY: 'ready',                       // 支給待ち（承認済・未支給）
  PAID: 'paid',                         // 支給済
};
export const PAYMENT_STATUS_LABEL = {
  pending: '未承認',
  pending_approval: '承認待ち',
  ready: '支給待ち',
  paid: '支給済',
};

const VALID_PAYMENT_STATUSES = [
  PAYMENT_STATUS.PENDING,
  PAYMENT_STATUS.PENDING_APPROVAL,
  PAYMENT_STATUS.READY,
  PAYMENT_STATUS.PAID,
];

/**
 * 支給ステータスの導出（永続値優先・レガシーは status からフォールバック）。
 * - report.payment_status が pending/pending_approval/ready/paid のいずれか（明示値）ならその値を尊重。
 * - 未設定 / 不正値の場合: status==='承認済'→'ready'、status==='申請中'→'pending_approval'、それ以外→'pending'。
 *   → A12 以前に承認済となったレポート（payment_status 未保持）も 'ready' として正しく扱える
 *     （前方追記 + レガシー導出の二重安全）。A12.5 で 申請中→承認待ち を追加。
 * @param {object|null|undefined} report
 * @returns {'pending'|'pending_approval'|'ready'|'paid'}
 */
export function derivePaymentStatus(report) {
  const r = report || {};
  if (VALID_PAYMENT_STATUSES.includes(r.payment_status)) {
    return r.payment_status;
  }
  if (r.status === '承認済') return PAYMENT_STATUS.READY;
  if (r.status === '申請中') return PAYMENT_STATUS.PENDING_APPROVAL;
  return PAYMENT_STATUS.PENDING;
}

/**
 * created_date（ISO 文字列）を 'yyyy-MM-dd' に整形（無効/欠損は ''）。
 * 月絞り込みと同一の `new Date()` 解釈を用い、aggregation.js の月集計と意味を揃える。
 */
function formatDateOnly(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return format(d, 'yyyy-MM-dd');
}

/**
 * 1 レポート → 支給行（表示 / CSV 共通の素データ）。
 * 手当 / 実費 / 総支給は deriveReportFinancials に委譲。
 * applied_date（申請日）は created_date を用いる（申請専用タイムスタンプが schema に存在しないため）。
 * @param {object} report
 * @returns {{
 *   id: string|undefined,
 *   company_id: string,
 *   report_number: any,
 *   report_type: any,
 *   name: string,
 *   created_date: any,
 *   applied_date: string,
 *   allowance_total: number,
 *   expense_total: number,
 *   payment_total: number,
 *   payment_status: 'pending'|'pending_approval'|'ready'|'paid',
 *   paid_at: string,
 * }}
 */
export function derivePaymentRow(report) {
  const r = report || {};
  const fin = deriveReportFinancials(r);
  return {
    id: r.id,
    company_id: r.company_id || '',
    report_number: r.report_number,
    report_type: r.report_type,
    name: r.created_by_name || '不明',
    created_date: r.created_date,          // 月絞り込み用に raw を保持
    applied_date: formatDateOnly(r.created_date),
    allowance_total: fin.allowance_total,
    expense_total: fin.expense_total,
    payment_total: fin.payment_total,      // === total_amount
    payment_status: derivePaymentStatus(r),
    paid_at: r.paid_at || '',
  };
}

/**
 * 配列 → 支給行配列。
 * @param {Array} reports
 * @returns {Array}
 */
export function buildPaymentRows(reports) {
  return (reports || []).map(derivePaymentRow);
}

/**
 * 支給行の絞り込み（純粋）。
 * year/month は数値 or null（null/undefined=全期間）、month は 1-12。
 * name ''/undefined = 全員、status ''/undefined = 全状態。月は created_date で判定。
 * companyId ''/undefined = 全社（A12.5：systemOwner の 会社別ビュー用・row.company_id で判定）。
 * @param {Array} rows
 * @param {{ year?: number|null, month?: number|null, name?: string, status?: string, companyId?: string }} criteria
 * @returns {Array}
 */
export function filterPaymentRows(rows, { year, month, name, status, companyId } = {}) {
  return (rows || []).filter(row => {
    if (year != null || month != null) {
      if (!row.created_date) return false;
      const d = new Date(row.created_date);
      if (Number.isNaN(d.getTime())) return false;
      if (year != null && getYear(d) !== year) return false;
      if (month != null && getMonth(d) + 1 !== month) return false;
    }
    if (name && row.name !== name) return false;
    if (status && row.payment_status !== status) return false;
    if (companyId && row.company_id !== companyId) return false;
    return true;
  });
}

/**
 * 集計（純粋）。total_* は deriveReportFinancials 由来の合算（行が保持する値の総和）。
 * A12.5：awaitingCount（承認待ち）/ pendingCount（未承認）を追記（既存フィールドは不変）。
 * @param {Array} rows
 * @returns {{ totalPayment: number, totalAllowance: number, totalExpense: number,
 *            paidCount: number, readyCount: number, awaitingCount: number,
 *            pendingCount: number, count: number }}
 */
export function aggregatePaymentRows(rows) {
  const list = rows || [];
  let totalPayment = 0;
  let totalAllowance = 0;
  let totalExpense = 0;
  let paidCount = 0;
  let readyCount = 0;
  let awaitingCount = 0;
  let pendingCount = 0;
  for (const row of list) {
    totalPayment += row.payment_total || 0;
    totalAllowance += row.allowance_total || 0;
    totalExpense += row.expense_total || 0;
    if (row.payment_status === PAYMENT_STATUS.PAID) paidCount += 1;
    else if (row.payment_status === PAYMENT_STATUS.READY) readyCount += 1;
    else if (row.payment_status === PAYMENT_STATUS.PENDING_APPROVAL) awaitingCount += 1;
    else pendingCount += 1;
  }
  return {
    totalPayment, totalAllowance, totalExpense,
    paidCount, readyCount, awaitingCount, pendingCount,
    count: list.length,
  };
}

/**
 * RFC 4180 準拠の最小 CSV エスケープ（aggregation.js を不可侵にするためローカル再実装）。
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
 * companies 配列から company_id -> 会社名 の参照表を作る（純粋・副作用なし）。
 * aggregation.js を不可侵にするため本モジュール内にローカル実装する。
 * @param {Array} companies AuthContext.companies（{ id, name, ... }）
 * @returns {Map<string, string>}
 */
function buildCompanyNameLookup(companies) {
  const map = new Map();
  for (const c of companies || []) {
    if (c && c.id) map.set(c.id, c.name || '');
  }
  return map;
}

// 支給管理 CSV のヘッダー（A12.5：会社名/氏名/支給額/支給状態/支給日・5 列固定・順序厳守）
export const PAYMENTS_CSV_HEADERS = [
  '会社名', '氏名', '支給額', '支給状態', '支給日',
];

/**
 * 支給管理 CSV（A12.5：5 列固定・順序厳守）。RFC4180 最小エスケープ。BOM は UI 層で付与。
 * 会社名 = companies の company_id 解決、氏名 = row.name、支給額 = payment_total（=total_amount, raw 数値）、
 * 支給状態 = PAYMENT_STATUS_LABEL[payment_status]、支給日 = paid_at（未支給は ''）。
 * @param {Array} rows derivePaymentRow / buildPaymentRows の出力
 * @param {Array} [companies] AuthContext.companies（会社名解決用。未指定時は会社名空欄）
 * @returns {string} CSV 文字列（BOM なし）
 */
export function buildPaymentsCSV(rows, companies) {
  const list = rows || [];
  const lookup = buildCompanyNameLookup(companies);
  const lines = list.map(row => ([
    lookup.get(row.company_id) || '',
    row.name,
    row.payment_total,
    PAYMENT_STATUS_LABEL[row.payment_status] || '',
    row.paid_at,
  ].map(escapeCsvCell).join(',')));
  return [PAYMENTS_CSV_HEADERS.join(','), ...lines].join('\n');
}
