import { describe, it, expect, vi } from 'vitest';
import {
  aggregateMonthlySummary,
  formatSummaryForEmail,
  buildReportsCSV,
  buildReportsCSVAsync,
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
