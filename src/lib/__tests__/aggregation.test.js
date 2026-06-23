import { describe, it, expect, vi } from 'vitest';
import {
  aggregateMonthlySummary,
  formatSummaryForEmail,
  buildReportsCSV,
  buildReportsCSVAsync,
  buildCrossCompanyReportsCSV,
  buildCrossCompanyReportsCSVAsync,
  buildCompanyBreakdown,
  GROUP_REPORT_HEADERS,
  buildGroupReportsCSV,
  buildGroupReportsCSVAsync,
} from '../aggregation.js';

// A9 回帰テスト: aggregation.js は本体変更禁止。公開 API 経由のみで検証する。
// 日付は正午ローカル時刻にして getYear/getMonth のタイムゾーン境界揺れを避ける。
// 金額は実行時 toLocaleString() で突き合わせ、ICU/ロケール差による誤判定を避ける。

const SIMPLE_HEADER = ['レポートID', '種別', '作成者', '年月', '日付', '目的地', 'ステータス', '合計金額'].join(',');
const AUDIT_HEADER = [
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
].join(',');

describe('aggregateMonthlySummary', () => {
  it('指定年月のレポートのみ集計し、他月を除外する', () => {
    const reports = [
      { created_date: '2026-03-15T12:00:00', report_type: '日帰り出張', created_by_name: '田中', total_amount: 10000 },
      { created_date: '2026-03-20T12:00:00', report_type: '外出作業', created_by_name: '田中', total_amount: 5000 },
      { created_date: '2026-02-28T12:00:00', report_type: '日帰り出張', created_by_name: '佐藤', total_amount: 99999 },
    ];
    const result = aggregateMonthlySummary(reports, { year: 2026, month: 3 });

    expect(result.year).toBe(2026);
    expect(result.month).toBe(3);
    expect(result.reportCount).toBe(2);
    expect(result.totalAmount).toBe(15000);
    expect(result.reports).toHaveLength(2);
  });

  it('byType / byUser を件数・金額で集計する', () => {
    const reports = [
      { created_date: '2026-03-01T12:00:00', report_type: '日帰り出張', created_by_name: '田中', total_amount: 10000 },
      { created_date: '2026-03-02T12:00:00', report_type: '日帰り出張', created_by_name: '佐藤', total_amount: 20000 },
      { created_date: '2026-03-03T12:00:00', report_type: '外出作業', created_by_name: '田中', total_amount: 5000 },
    ];
    const result = aggregateMonthlySummary(reports, { year: 2026, month: 3 });

    expect(result.byType['日帰り出張']).toEqual({ count: 2, amount: 30000 });
    expect(result.byType['外出作業']).toEqual({ count: 1, amount: 5000 });
    expect(result.byUser['田中']).toEqual({ count: 2, amount: 15000 });
    expect(result.byUser['佐藤']).toEqual({ count: 1, amount: 20000 });
  });

  it('report_type / created_by_name 欠落時は "不明" に集約し、total_amount 欠落は 0 扱い', () => {
    const reports = [
      { created_date: '2026-03-10T12:00:00' },
    ];
    const result = aggregateMonthlySummary(reports, { year: 2026, month: 3 });

    expect(result.totalAmount).toBe(0);
    expect(result.byType['不明']).toEqual({ count: 1, amount: 0 });
    expect(result.byUser['不明']).toEqual({ count: 1, amount: 0 });
  });

  it('該当レポートなし / null 入力でもゼロ・空オブジェクトを返す', () => {
    const none = aggregateMonthlySummary([], { year: 2026, month: 3 });
    expect(none.reportCount).toBe(0);
    expect(none.totalAmount).toBe(0);
    expect(none.byType).toEqual({});
    expect(none.byUser).toEqual({});

    const nullInput = aggregateMonthlySummary(null, { year: 2026, month: 3 });
    expect(nullInput.reportCount).toBe(0);
    expect(nullInput.reports).toEqual([]);
  });
});

describe('formatSummaryForEmail', () => {
  it('通常データで年月・合計・件数・種別別・ユーザー別を本文に含む', () => {
    const reports = [
      { created_date: '2026-03-01T12:00:00', report_type: '日帰り出張', created_by_name: '田中', total_amount: 10000 },
      { created_date: '2026-03-02T12:00:00', report_type: '日帰り出張', created_by_name: '佐藤', total_amount: 20000 },
      { created_date: '2026-03-03T12:00:00', report_type: '外出作業', created_by_name: '田中', total_amount: 12000 },
    ];
    const aggregate = aggregateMonthlySummary(reports, { year: 2026, month: 3 });
    const body = formatSummaryForEmail(aggregate);

    expect(body).toContain('2026年3月の旅費精算集計レポート');
    expect(body).toContain(`合計支給額: ¥${(42000).toLocaleString()}`);
    expect(body).toContain('承認済レポート件数: 3 件');
    expect(body).toContain(`日帰り出張: 2 件 / ¥${(30000).toLocaleString()}`);
    expect(body).toContain(`外出作業: 1 件 / ¥${(12000).toLocaleString()}`);
    expect(body).toContain(`田中: 2 件 / ¥${(22000).toLocaleString()}`);
  });

  it('集計対象ゼロのとき種別別・ユーザー別は「（該当なし）」', () => {
    const aggregate = aggregateMonthlySummary([], { year: 2026, month: 3 });
    const body = formatSummaryForEmail(aggregate);

    expect(body).toContain('合計支給額: ¥0');
    expect(body).toContain('承認済レポート件数: 0 件');
    expect(body).toContain('（該当なし）');
  });
});

describe('buildReportsCSV (simple 8 列固定)', () => {
  it('ヘッダー行が 8 列で固定されている', () => {
    const csv = buildReportsCSV([]);
    expect(csv.split('\n')[0]).toBe(SIMPLE_HEADER);
  });

  it('空配列ではヘッダー行のみを返す', () => {
    const csv = buildReportsCSV([]);
    expect(csv.split('\n')).toHaveLength(1);
  });

  it('RFC 4180: カンマを含むセルは二重引用符で囲む', () => {
    const csv = buildReportsCSV([
      { report_number: 'R001', report_type: '日帰り出張', created_by_name: '田中', destination_name: '東京, 日本', status: '承認済', total_amount: 10000 },
    ]);
    const dataLine = csv.split('\n')[1];
    expect(dataLine).toContain('"東京, 日本"');
    // 引用符化されたセル内のカンマで列がずれないこと
    expect(csv.split('\n')[0].split(',')).toHaveLength(8);
  });
});

describe('buildReportsCSVAsync (chunk + format 切替)', () => {
  it('simple 形式は buildReportsCSV と完全一致する', async () => {
    const reports = [
      { report_number: 'R001', report_type: '日帰り出張', created_by_name: '田中', destination_name: '東京', status: '承認済', total_amount: 10000 },
      { report_number: 'R002', report_type: '外出作業', created_by_name: '佐藤', destination_name: '横浜', status: '申請中', total_amount: 5000 },
    ];
    const sync = buildReportsCSV(reports);
    const async = await buildReportsCSVAsync(reports, { format: 'simple' });
    expect(async).toBe(sync);
  });

  it('audit 形式は 33 列ヘッダーで固定されている', async () => {
    const csv = await buildReportsCSVAsync([], { format: 'audit' });
    expect(csv.split('\n')[0]).toBe(AUDIT_HEADER);
    expect(csv.split('\n')[0].split(',')).toHaveLength(33);
  });

  it('onProgress が chunk ごとに呼ばれ、最後は done=total になる', async () => {
    const reports = Array.from({ length: 5 }, (_, i) => ({
      report_number: `R${i}`, report_type: '外出作業', created_by_name: 'X', total_amount: 100,
    }));
    const onProgress = vi.fn();
    await buildReportsCSVAsync(reports, { chunkSize: 2, onProgress });

    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress).toHaveBeenNthCalledWith(1, { done: 2, total: 5 });
    expect(onProgress).toHaveBeenNthCalledWith(2, { done: 4, total: 5 });
    expect(onProgress).toHaveBeenNthCalledWith(3, { done: 5, total: 5 });
  });

  it('RFC 4180: 引用符・改行を含むセルを正しくエスケープする', async () => {
    const csv = await buildReportsCSVAsync([
      { report_number: 'R001', report_type: '外出作業', business_content: 'a"b\nc', total_amount: 0 },
    ], { format: 'audit' });
    // " は "" に倍化し、改行を含むため全体を " で囲む
    expect(csv).toContain('"a""b\nc"');
  });
});

// A13: クロスカンパニー CSV ビルダー（会社 2 列を先頭付与）。
//   3 列目以降は A9 凍結の simple/audit 出力と完全一致する（=従来 buildReportsCSV と等価）であることを保証する。
describe('buildCrossCompanyReportsCSV (全社横断・会社列付き)', () => {
  const COMPANIES = [
    { id: 'c-athos', name: '株式会社Athos', code: 'ATHOS' },
    { id: 'c-dmotion', name: 'D-motion', code: 'DMOTION' },
  ];
  const CROSS_SIMPLE_HEADER = ['会社名', '会社コード'].join(',') + ',' + SIMPLE_HEADER;
  const CROSS_AUDIT_HEADER = ['会社名', '会社コード'].join(',') + ',' + AUDIT_HEADER;

  it('simple ヘッダーは会社 2 列 + 既存 8 列の計 10 列', () => {
    const csv = buildCrossCompanyReportsCSV([], COMPANIES);
    expect(csv.split('\n')[0]).toBe(CROSS_SIMPLE_HEADER);
    expect(csv.split('\n')[0].split(',')).toHaveLength(10);
  });

  it('各行の先頭 2 列に会社名・会社コードを付与し、3 列目以降は buildReportsCSV と完全一致', () => {
    const reports = [
      { company_id: 'c-athos', report_number: 'R001', report_type: '日帰り出張', created_by_name: '田中', destination_name: '東京', status: '承認済', total_amount: 10000 },
      { company_id: 'c-dmotion', report_number: 'R002', report_type: '外出作業', created_by_name: '佐藤', destination_name: '横浜', status: '申請中', total_amount: 5000 },
    ];
    const cross = buildCrossCompanyReportsCSV(reports, COMPANIES).split('\n');
    const base = buildReportsCSV(reports).split('\n');
    // 行 1: Athos、行 2: D-motion。会社 2 列を除去すると従来出力に一致。
    expect(cross[1]).toBe('株式会社Athos,ATHOS,' + base[1]);
    expect(cross[2]).toBe('D-motion,DMOTION,' + base[2]);
  });

  it('未知の company_id は会社名・会社コードを空欄にする（落とさない）', () => {
    const reports = [
      { company_id: 'c-unknown', report_number: 'R009', report_type: '日帰り出張', created_by_name: '謎', status: '承認済', total_amount: 1 },
    ];
    const line = buildCrossCompanyReportsCSV(reports, COMPANIES).split('\n')[1];
    expect(line.startsWith(',,')).toBe(true); // 会社名,会社コード が空
  });

  it('RFC 4180: 会社名にカンマを含む場合も引用符化され列がずれない', () => {
    const companies = [{ id: 'c-x', name: 'A, Inc', code: 'X' }];
    const reports = [{ company_id: 'c-x', report_number: 'R001', report_type: '日帰り出張', status: '承認済', total_amount: 0 }];
    const line = buildCrossCompanyReportsCSV(reports, companies).split('\n')[1];
    expect(line).toContain('"A, Inc"');
  });
});

describe('buildCrossCompanyReportsCSVAsync (全社横断・chunk + format 切替)', () => {
  const COMPANIES = [{ id: 'c-athos', name: '株式会社Athos', code: 'ATHOS' }];

  it('simple 形式は同期版 buildCrossCompanyReportsCSV と完全一致する', async () => {
    const reports = [
      { company_id: 'c-athos', report_number: 'R001', report_type: '日帰り出張', created_by_name: '田中', destination_name: '東京', status: '承認済', total_amount: 10000 },
    ];
    const sync = buildCrossCompanyReportsCSV(reports, COMPANIES);
    const async = await buildCrossCompanyReportsCSVAsync(reports, COMPANIES, { format: 'simple' });
    expect(async).toBe(sync);
  });

  it('audit 形式は会社 2 列 + 33 列 = 35 列ヘッダー', async () => {
    const csv = await buildCrossCompanyReportsCSVAsync([], COMPANIES, { format: 'audit' });
    expect(csv.split('\n')[0].split(',')).toHaveLength(35);
  });

  it('onProgress が chunk ごとに呼ばれ、最後は done=total になる', async () => {
    const reports = Array.from({ length: 5 }, (_, i) => ({
      company_id: 'c-athos', report_number: `R${i}`, report_type: '外出作業', created_by_name: 'X', total_amount: 100,
    }));
    const onProgress = vi.fn();
    await buildCrossCompanyReportsCSVAsync(reports, COMPANIES, { chunkSize: 2, onProgress });

    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress).toHaveBeenNthCalledWith(3, { done: 5, total: 5 });
  });
});

// ===========================================================================
// A12.5: 会社別集計 + グループ用レポート CSV（APPEND-ONLY 追記関数のテスト）
// 金額（手当/実費/総支給）は A11 deriveReportFinancials 由来。raw 数値で出力。
// allowance = 日当 + 宿泊費 + マイカー手当、expense = max(0, total - allowance)。
// ===========================================================================

describe('buildCompanyBreakdown (会社別集計)', () => {
  const COMPANIES = [
    { id: 'c-athos', name: '株式会社Athos', code: 'ATHOS' },
    { id: 'c-dmotion', name: 'D-motion', code: 'DMOTION' },
    { id: 'c-porthos', name: 'Porthos', code: 'PORTHOS' }, // レポートなし → ゼロ行
  ];
  // Athos: 承認済(6300/allow5300/exp1000) + 申請中(4000) + 下書き(2000)
  // D-motion: 差戻し(1000)
  const reports = [
    { company_id: 'c-athos', status: '承認済', daily_allowance: 5000, car_allowance: 300, highway_fee: 1000, total_amount: 6300 },
    { company_id: 'c-athos', status: '申請中', daily_allowance: 4000, total_amount: 4000 },
    { company_id: 'c-athos', status: '下書き', daily_allowance: 2000, total_amount: 2000 },
    { company_id: 'c-dmotion', status: '差戻し', daily_allowance: 1000, total_amount: 1000 },
  ];

  it('companies の順序を保持し、各社 1 行を返す', () => {
    const bd = buildCompanyBreakdown(reports, COMPANIES);
    expect(bd.map(c => c.company_id)).toEqual(['c-athos', 'c-dmotion', 'c-porthos']);
    expect(bd.map(c => c.company_name)).toEqual(['株式会社Athos', 'D-motion', 'Porthos']);
    expect(bd.map(c => c.company_code)).toEqual(['ATHOS', 'DMOTION', 'PORTHOS']);
  });

  it('申請件数 = 申請中+承認済+差戻し（下書きを除外）、承認件数 = 承認済', () => {
    const [athos, dmotion] = buildCompanyBreakdown(reports, COMPANIES);
    expect(athos.appliedCount).toBe(2);   // 承認済 + 申請中（下書きは除外）
    expect(athos.approvedCount).toBe(1);  // 承認済のみ
    expect(dmotion.appliedCount).toBe(1); // 差戻し
    expect(dmotion.approvedCount).toBe(0);
  });

  it('支給額/手当額/実費額は当該会社の全レポート（下書き含む）の合算', () => {
    const [athos, dmotion] = buildCompanyBreakdown(reports, COMPANIES);
    // Athos: pay 6300+4000+2000、allow 5300+4000+2000、exp 1000+0+0
    expect(athos.totalPayment).toBe(12300);
    expect(athos.totalAllowance).toBe(11300);
    expect(athos.totalExpense).toBe(1000);
    expect(athos.reportCount).toBe(3);
    // 整合: 支給額 = 手当額 + 実費額
    expect(athos.totalPayment).toBe(athos.totalAllowance + athos.totalExpense);
    expect(dmotion.totalPayment).toBe(1000);
    expect(dmotion.totalAllowance).toBe(1000);
    expect(dmotion.totalExpense).toBe(0);
    expect(dmotion.reportCount).toBe(1);
  });

  it('レポートのない会社は全数値 0・reportCount 0', () => {
    const porthos = buildCompanyBreakdown(reports, COMPANIES)[2];
    expect(porthos).toMatchObject({
      company_id: 'c-porthos', appliedCount: 0, approvedCount: 0,
      totalPayment: 0, totalAllowance: 0, totalExpense: 0, reportCount: 0,
    });
  });

  it('reports / companies が null・空でも安全', () => {
    expect(buildCompanyBreakdown(null, COMPANIES)).toHaveLength(3);
    expect(buildCompanyBreakdown(null, COMPANIES).every(c => c.reportCount === 0)).toBe(true);
    expect(buildCompanyBreakdown(reports, null)).toEqual([]);
    expect(buildCompanyBreakdown(null, null)).toEqual([]);
  });
});

describe('buildGroupReportsCSV (グループ用レポート CSV・6 列)', () => {
  const COMPANIES = [
    { id: 'c-athos', name: '株式会社Athos', code: 'ATHOS' },
    { id: 'c-dmotion', name: 'D-motion', code: 'DMOTION' },
  ];
  const GROUP_HEADER = '会社名,氏名,レポート種別,手当,実費,総支給額';

  it('ヘッダーは 6 列固定・順序厳守', () => {
    const csv = buildGroupReportsCSV([], COMPANIES);
    expect(csv.split('\n')[0]).toBe(GROUP_HEADER);
    expect(GROUP_REPORT_HEADERS).toEqual(['会社名', '氏名', 'レポート種別', '手当', '実費', '総支給額']);
  });

  it('行: 会社名解決・氏名・種別・手当/実費/総支給（raw 数値・委譲値）', () => {
    const reports = [
      { company_id: 'c-athos', created_by_name: '田中', report_type: '日帰り出張', daily_allowance: 5000, car_allowance: 300, highway_fee: 1000, total_amount: 6300 },
      { company_id: 'c-dmotion', created_by_name: '佐藤', report_type: '外出作業', daily_allowance: 1000, total_amount: 1000 },
    ];
    const lines = buildGroupReportsCSV(reports, COMPANIES).split('\n');
    expect(lines[1]).toBe('株式会社Athos,田中,日帰り出張,5300,1000,6300');
    expect(lines[2]).toBe('D-motion,佐藤,外出作業,1000,0,1000');
  });

  it('未知の company_id / companies 未指定は会社名空欄（行は落とさない）', () => {
    const reports = [
      { company_id: 'c-unknown', created_by_name: '謎', report_type: '日帰り出張', total_amount: 0 },
    ];
    expect(buildGroupReportsCSV(reports, COMPANIES).split('\n')[1]).toBe(',謎,日帰り出張,0,0,0');
    expect(buildGroupReportsCSV(reports).split('\n')[1]).toBe(',謎,日帰り出張,0,0,0');
  });

  it('RFC 4180: 会社名・氏名のカンマ/引用符を正しくエスケープ', () => {
    const companies = [{ id: 'c-x', name: 'A, Inc', code: 'X' }];
    const reports = [
      { company_id: 'c-x', created_by_name: '"引用"', report_type: '宿泊出張', total_amount: 0 },
    ];
    const line = buildGroupReportsCSV(reports, companies).split('\n')[1];
    expect(line).toBe('"A, Inc","""引用""",宿泊出張,0,0,0');
  });

  it('空 / null はヘッダーのみ', () => {
    expect(buildGroupReportsCSV([], COMPANIES).split('\n')).toHaveLength(1);
    expect(buildGroupReportsCSV(null, COMPANIES)).toBe(GROUP_HEADER);
    expect(buildGroupReportsCSV(null)).toBe(GROUP_HEADER);
  });
});

describe('buildGroupReportsCSVAsync (グループ CSV・chunk + onProgress)', () => {
  const COMPANIES = [{ id: 'c-athos', name: '株式会社Athos', code: 'ATHOS' }];

  it('同期版 buildGroupReportsCSV と完全一致する', async () => {
    const reports = [
      { company_id: 'c-athos', created_by_name: '田中', report_type: '日帰り出張', daily_allowance: 5000, total_amount: 6300 },
      { company_id: 'c-athos', created_by_name: '佐藤', report_type: '外出作業', daily_allowance: 1000, total_amount: 1000 },
    ];
    const sync = buildGroupReportsCSV(reports, COMPANIES);
    const async = await buildGroupReportsCSVAsync(reports, COMPANIES);
    expect(async).toBe(sync);
  });

  it('onProgress が chunk ごとに呼ばれ、最後は done=total になる', async () => {
    const reports = Array.from({ length: 5 }, (_, i) => ({
      company_id: 'c-athos', created_by_name: 'X', report_type: '外出作業', total_amount: 100,
    }));
    const onProgress = vi.fn();
    await buildGroupReportsCSVAsync(reports, COMPANIES, { chunkSize: 2, onProgress });

    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress).toHaveBeenNthCalledWith(1, { done: 2, total: 5 });
    expect(onProgress).toHaveBeenNthCalledWith(2, { done: 4, total: 5 });
    expect(onProgress).toHaveBeenNthCalledWith(3, { done: 5, total: 5 });
  });
});
