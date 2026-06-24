import { describe, it, expect } from 'vitest';
import {
  PAYMENT_STATUS,
  PAYMENT_STATUS_LABEL,
  PAYMENTS_CSV_HEADERS,
  derivePaymentStatus,
  derivePaymentRow,
  buildPaymentRows,
  filterPaymentRows,
  aggregatePaymentRows,
  buildPaymentsCSV,
} from '../paymentManagement.js';
import { deriveReportFinancials } from '../reportFinancials.js';

// A12 支給管理ユニットテスト（A12.5 で 4 状態 + 会社軸 + 5 列 CSV へ更新）。
// 日付は正午ローカル（'...T12:00:00'）で固定し TZ 揺れを回避（aggregation.test.js 様式）。
// 財務（手当/実費/総支給）は A11 deriveReportFinancials と一致することを検証し二重計算を排除。
// 不変条件: payment_total === total_amount、expense_total = max(0, payment_total - allowance_total)。

// ---- 1) derivePaymentStatus -------------------------------------------------
describe('derivePaymentStatus — 永続優先・レガシー導出・4 状態', () => {
  it('永続値 paid は status より優先される', () => {
    expect(derivePaymentStatus({ status: '承認済', payment_status: 'paid' })).toBe('paid');
  });

  it('レガシー承認済（payment_status 未保持）→ ready', () => {
    expect(derivePaymentStatus({ status: '承認済' })).toBe('ready');
  });

  it('レガシー申請中（payment_status 未保持）→ pending_approval（A12.5）', () => {
    expect(derivePaymentStatus({ status: '申請中' })).toBe('pending_approval');
  });

  it('未承認系（下書き / 差戻し）→ pending', () => {
    expect(derivePaymentStatus({ status: '下書き' })).toBe('pending');
    expect(derivePaymentStatus({ status: '差戻し' })).toBe('pending');
  });

  it('明示 pending / pending_approval / ready を尊重する', () => {
    expect(derivePaymentStatus({ payment_status: 'pending', status: '承認済' })).toBe('pending');
    expect(derivePaymentStatus({ payment_status: 'pending_approval', status: '承認済' })).toBe('pending_approval');
    expect(derivePaymentStatus({ payment_status: 'ready' })).toBe('ready');
  });

  it('null / undefined / 空 / 不正値でも安全', () => {
    expect(derivePaymentStatus(null)).toBe('pending');
    expect(derivePaymentStatus(undefined)).toBe('pending');
    expect(derivePaymentStatus({})).toBe('pending');
    // 不正値は無視してレガシー導出へフォールバック
    expect(derivePaymentStatus({ payment_status: 'invalid', status: '承認済' })).toBe('ready');
    expect(derivePaymentStatus({ payment_status: 'invalid', status: '申請中' })).toBe('pending_approval');
  });

  it('定数 / ラベルが規定どおり（4 状態）', () => {
    expect(PAYMENT_STATUS).toEqual({
      PENDING: 'pending',
      PENDING_APPROVAL: 'pending_approval',
      READY: 'ready',
      PAID: 'paid',
    });
    expect(PAYMENT_STATUS_LABEL).toEqual({
      pending: '未承認',
      pending_approval: '承認待ち',
      ready: '支給待ち',
      paid: '支給済',
    });
  });
});

// ---- 2) derivePaymentRow / buildPaymentRows --------------------------------
describe('derivePaymentRow / buildPaymentRows — 行マップ + 財務委譲 + 会社', () => {
  const readyReport = {
    id: 'r1',
    company_id: 'co-1',
    report_number: 'RPT-001',
    report_type: '日帰り出張',
    created_by_name: '山田太郎',
    created_date: '2026-03-15T12:00:00',
    daily_allowance: 5000,
    car_allowance: 300,
    highway_fee: 1000,
    total_amount: 6300,
    status: '承認済',
  };

  it('氏名・種別・番号・申請日・会社・paid_at をマップ（ready）', () => {
    const row = derivePaymentRow(readyReport);
    expect(row.id).toBe('r1');
    expect(row.company_id).toBe('co-1');
    expect(row.report_number).toBe('RPT-001');
    expect(row.report_type).toBe('日帰り出張');
    expect(row.name).toBe('山田太郎');
    expect(row.applied_date).toBe('2026-03-15');
    expect(row.created_date).toBe('2026-03-15T12:00:00');
    expect(row.payment_status).toBe('ready');
    expect(row.paid_at).toBe('');
  });

  it('手当/実費/総支給は deriveReportFinancials と完全一致（二重計算なし）', () => {
    const row = derivePaymentRow(readyReport);
    const fin = deriveReportFinancials(readyReport);
    expect(row.allowance_total).toBe(fin.allowance_total); // 5000 + 300
    expect(row.expense_total).toBe(fin.expense_total);     // 6300 - 5300
    expect(row.payment_total).toBe(fin.payment_total);     // total_amount
    expect(row.allowance_total).toBe(5300);
    expect(row.expense_total).toBe(1000);
    expect(row.payment_total).toBe(6300);
    // 不変条件
    expect(row.payment_total).toBe(readyReport.total_amount);
    expect(row.expense_total).toBe(Math.max(0, row.payment_total - row.allowance_total));
  });

  it('氏名欠損は「不明」、company_id 欠損は空文字、paid レポートは paid_at を保持', () => {
    const paid = {
      report_type: '宿泊出張',
      created_date: '2026-03-20T12:00:00',
      daily_allowance: 15000,
      accommodation_fee: 30000,
      total_amount: 45300,
      status: '承認済',
      payment_status: 'paid',
      paid_at: '2026-03-25',
      paid_amount: 45300,
      paid_by: '管理者',
    };
    const row = derivePaymentRow(paid);
    expect(row.name).toBe('不明');
    expect(row.company_id).toBe('');
    expect(row.payment_status).toBe('paid');
    expect(row.paid_at).toBe('2026-03-25');
    expect(row.payment_total).toBe(45300);
  });

  it('buildPaymentRows は配列を写像、null は空配列', () => {
    expect(buildPaymentRows(null)).toEqual([]);
    expect(buildPaymentRows(undefined)).toEqual([]);
    expect(buildPaymentRows([readyReport])).toHaveLength(1);
  });
});

// ---- 3) filterPaymentRows ---------------------------------------------------
describe('filterPaymentRows — 月 / 氏名 / 状態 / 会社', () => {
  const reports = [
    { id: 'a', company_id: 'co-1', created_by_name: '山田', report_type: '日帰り出張', created_date: '2026-03-15T12:00:00', daily_allowance: 5000, total_amount: 6300, status: '承認済' },
    { id: 'b', company_id: 'co-2', created_by_name: '鈴木', report_type: '宿泊出張', created_date: '2026-03-20T12:00:00', daily_allowance: 15000, accommodation_fee: 30000, total_amount: 45300, status: '承認済', payment_status: 'paid', paid_at: '2026-03-25' },
    { id: 'c', company_id: 'co-1', created_by_name: '山田', report_type: '海外出張', created_date: '2026-04-10T12:00:00', daily_allowance: 30000, accommodation_fee: 40000, total_amount: 190000, status: '承認済' },
    { id: 'd', company_id: 'co-2', created_by_name: '佐藤', report_type: '日帰り出張', created_date: '2026-04-12T12:00:00', daily_allowance: 4000, total_amount: 4000, status: '申請中' },
  ];
  const rows = buildPaymentRows(reports);

  it('月で絞り込む（created_date 基準・他月除外）', () => {
    expect(filterPaymentRows(rows, { year: 2026, month: 3 }).map(r => r.id)).toEqual(['a', 'b']);
    expect(filterPaymentRows(rows, { year: 2026, month: 4 }).map(r => r.id)).toEqual(['c', 'd']);
  });

  it('月のみ指定（年なし）でも月一致で絞る', () => {
    expect(filterPaymentRows(rows, { month: 3 }).map(r => r.id)).toEqual(['a', 'b']);
  });

  it('氏名 / 状態で絞り込む（pending_approval を含む）', () => {
    expect(filterPaymentRows(rows, { name: '山田' }).map(r => r.id)).toEqual(['a', 'c']);
    expect(filterPaymentRows(rows, { status: 'paid' }).map(r => r.id)).toEqual(['b']);
    expect(filterPaymentRows(rows, { status: 'ready' }).map(r => r.id)).toEqual(['a', 'c']);
    expect(filterPaymentRows(rows, { status: 'pending_approval' }).map(r => r.id)).toEqual(['d']);
  });

  it('会社で絞り込む（A12.5・companyId）', () => {
    expect(filterPaymentRows(rows, { companyId: 'co-1' }).map(r => r.id)).toEqual(['a', 'c']);
    expect(filterPaymentRows(rows, { companyId: 'co-2' }).map(r => r.id)).toEqual(['b', 'd']);
  });

  it('複合条件（年月 + 氏名 + 会社）', () => {
    expect(filterPaymentRows(rows, { year: 2026, month: 3, name: '山田' }).map(r => r.id)).toEqual(['a']);
    expect(filterPaymentRows(rows, { year: 2026, month: 4, companyId: 'co-2' }).map(r => r.id)).toEqual(['d']);
  });

  it("'' / null / 引数なし は全件", () => {
    expect(filterPaymentRows(rows, { year: null, month: null, name: '', status: '', companyId: '' })).toHaveLength(4);
    expect(filterPaymentRows(rows, {})).toHaveLength(4);
    expect(filterPaymentRows(rows)).toHaveLength(4);
    expect(filterPaymentRows(null)).toEqual([]);
  });
});

// ---- 4) aggregatePaymentRows ------------------------------------------------
describe('aggregatePaymentRows — 合算 / 4 状態件数', () => {
  const reports = [
    { id: 'a', created_by_name: '山田', created_date: '2026-03-15T12:00:00', daily_allowance: 5000, total_amount: 6300, status: '承認済' },                                  // ready: allow 5000 / exp 1300 / pay 6300
    { id: 'b', created_by_name: '鈴木', created_date: '2026-03-20T12:00:00', daily_allowance: 15000, accommodation_fee: 30000, total_amount: 45300, status: '承認済', payment_status: 'paid', paid_at: '2026-03-25' }, // paid: allow 45000 / exp 300 / pay 45300
    { id: 'c', created_by_name: '山田', created_date: '2026-04-10T12:00:00', daily_allowance: 30000, accommodation_fee: 40000, total_amount: 190000, status: '承認済' },     // ready: allow 70000 / exp 120000 / pay 190000
    { id: 'd', created_by_name: '佐藤', created_date: '2026-04-12T12:00:00', daily_allowance: 4000, total_amount: 4000, status: '申請中' },                                   // pending_approval
    { id: 'e', created_by_name: '田中', created_date: '2026-04-13T12:00:00', daily_allowance: 1000, total_amount: 1000, status: '差戻し' },                                   // pending
  ];
  const rows = buildPaymentRows(reports);

  it('総支給 / 総手当 / 総実費 と paid/ready/awaiting/pending/件数', () => {
    const agg = aggregatePaymentRows(rows);
    expect(agg.totalPayment).toBe(246600);    // 6300 + 45300 + 190000 + 4000 + 1000
    expect(agg.totalAllowance).toBe(125000);   // 5000 + 45000 + 70000 + 4000 + 1000
    expect(agg.totalExpense).toBe(121600);     // 1300 + 300 + 120000 + 0 + 0
    expect(agg.paidCount).toBe(1);
    expect(agg.readyCount).toBe(2);
    expect(agg.awaitingCount).toBe(1);
    expect(agg.pendingCount).toBe(1);
    expect(agg.count).toBe(5);
    // 整合: 総支給 = 総手当 + 総実費
    expect(agg.totalPayment).toBe(agg.totalAllowance + agg.totalExpense);
    // 整合: 件数の合算 = 全件
    expect(agg.paidCount + agg.readyCount + agg.awaitingCount + agg.pendingCount).toBe(agg.count);
  });

  it('空配列 / null は全て 0（awaiting/pending 含む）', () => {
    const zero = {
      totalPayment: 0, totalAllowance: 0, totalExpense: 0,
      paidCount: 0, readyCount: 0, awaitingCount: 0, pendingCount: 0, count: 0,
    };
    expect(aggregatePaymentRows([])).toEqual(zero);
    expect(aggregatePaymentRows(null)).toEqual(zero);
  });
});

// ---- 5) buildPaymentsCSV ----------------------------------------------------
describe('buildPaymentsCSV — 5 列・会社名解決・順序・エスケープ・日本語ラベル', () => {
  const companies = [
    { id: 'co-1', name: 'D-motion' },
    { id: 'co-2', name: 'Athos' },
  ];
  const reports = [
    { id: 'a', company_id: 'co-1', created_by_name: '山田', report_type: '日帰り出張', created_date: '2026-03-15T12:00:00', daily_allowance: 5000, total_amount: 6300, status: '承認済' },
    { id: 'b', company_id: 'co-2', created_by_name: '鈴木', report_type: '宿泊出張', created_date: '2026-03-20T12:00:00', daily_allowance: 15000, accommodation_fee: 30000, total_amount: 45300, status: '承認済', payment_status: 'paid', paid_at: '2026-03-25' },
  ];
  const rows = buildPaymentRows(reports);

  it('ヘッダーは 5 列固定・順序厳守', () => {
    const csv = buildPaymentsCSV(rows, companies);
    expect(csv.split('\n')[0]).toBe('会社名,氏名,支給額,支給状態,支給日');
    expect(PAYMENTS_CSV_HEADERS).toEqual(['会社名', '氏名', '支給額', '支給状態', '支給日']);
  });

  it('行: 会社名解決・raw 数値・日本語状態・支給日（未支給は空）', () => {
    const lines = buildPaymentsCSV(rows, companies).split('\n');
    expect(lines[1]).toBe('D-motion,山田,6300,支給待ち,');
    expect(lines[2]).toBe('Athos,鈴木,45300,支給済,2026-03-25');
  });

  it('companies 未指定 / 未解決 company_id は会社名空欄', () => {
    const lines = buildPaymentsCSV(rows).split('\n');
    expect(lines[1]).toBe(',山田,6300,支給待ち,');
    expect(lines[2]).toBe(',鈴木,45300,支給済,2026-03-25');
  });

  it('カンマ / 引用符 / 改行を RFC4180 で正しくエスケープ', () => {
    const tricky = buildPaymentRows([
      { company_id: 'co-1', created_by_name: '山田, 太郎', report_type: '日帰り出張', created_date: '2026-05-01T12:00:00', daily_allowance: 1000, total_amount: 1000, status: '承認済' },
      { company_id: 'co-1', created_by_name: '"引用"', report_type: '宿泊出張', created_date: '2026-05-02T12:00:00', daily_allowance: 2000, total_amount: 2000, status: '承認済' },
    ]);
    const lines = buildPaymentsCSV(tricky, companies).split('\n');
    expect(lines[1]).toBe('D-motion,"山田, 太郎",1000,支給待ち,');
    expect(lines[2]).toBe('D-motion,"""引用""",2000,支給待ち,');

    const nl = buildPaymentsCSV(buildPaymentRows([
      { company_id: 'co-1', created_by_name: '山田\n花子', report_type: '外出作業', created_date: '2026-05-03T12:00:00', car_allowance: 500, total_amount: 500, status: '承認済' },
    ]), companies);
    expect(nl).toContain('"山田\n花子"');
  });

  it('空 / null はヘッダーのみ', () => {
    expect(buildPaymentsCSV([], companies)).toBe(PAYMENTS_CSV_HEADERS.join(','));
    expect(buildPaymentsCSV(null, companies)).toBe(PAYMENTS_CSV_HEADERS.join(','));
    expect(buildPaymentsCSV(null)).toBe(PAYMENTS_CSV_HEADERS.join(','));
  });
});
