import { describe, it, expect } from 'vitest';
import { deriveReportFinancials, buildTaggedBreakdown } from '../reportFinancials.js';

// A11 回帰テスト: 既存 Report から手当 / 実費 / 総支給を read 時導出する。
// 不変条件: payment_total === total_amount、expense_total = max(0, total_amount - allowance_total)。
// breakdown のラベル / 順序 / 「>0 のみ」は従来 ReportDetail.buildBreakdown と一致（表示値不変）。

describe('deriveReportFinancials — 3 概念導出', () => {
  it('payment_total は常に total_amount と同値', () => {
    const report = { report_type: '日帰り出張', daily_allowance: 5000, total_amount: 6300 };
    expect(deriveReportFinancials(report).payment_total).toBe(6300);
  });

  it('allowance_total = 日当 + 宿泊費 + 車手当、expense_total = total_amount - allowance_total', () => {
    const report = {
      report_type: '日帰り出張',
      daily_allowance: 5000,
      car_allowance: 300,
      highway_fee: 1000,
      driving_distance_km: 10,
      total_amount: 6300,
    };
    const fin = deriveReportFinancials(report);
    expect(fin.allowance_total).toBe(5300);
    expect(fin.payment_total).toBe(6300);
    expect(fin.expense_total).toBe(1000);
  });

  it('expense_total は負値を 0 にクランプ（手当 > 総額の異常データでも安全）', () => {
    const report = { report_type: '日帰り出張', daily_allowance: 5000, total_amount: 4000 };
    const fin = deriveReportFinancials(report);
    expect(fin.allowance_total).toBe(5000);
    expect(fin.expense_total).toBe(0);
  });

  it('expense_total は実費フィールド総和と一致する（total = 手当 + 実費 の整合）', () => {
    const report = {
      report_type: '宿泊出張',
      daily_allowance: 15000,
      accommodation_fee: 30000,
      car_allowance: 300,
      highway_fee: 1000,
      parking_fee: 200,
      taxi_fee: 500,
      other_transport_fee: 800,
      driving_distance_km: 10,
      total_amount: 47800, // 手当 45300 + 実費 2500
    };
    const fin = deriveReportFinancials(report);
    expect(fin.allowance_total).toBe(45300);
    const expenseSum = fin.breakdown
      .filter(b => b.category === 'expense')
      .reduce((s, b) => s + b.amount, 0);
    expect(expenseSum).toBe(2500);
    expect(fin.expense_total).toBe(2500);
  });

  it('null / 空オブジェクトでも安全にゼロ・空 breakdown を返す', () => {
    const zero = { allowance_total: 0, expense_total: 0, payment_total: 0, breakdown: [] };
    expect(deriveReportFinancials(null)).toEqual(zero);
    expect(deriveReportFinancials({})).toEqual(zero);
  });
});

describe('buildTaggedBreakdown — 従来ラベル / 順序の再現 + category タグ', () => {
  it('日帰り/宿泊: 順序・ラベル・category が従来 ReportDetail と一致（>0 のみ）', () => {
    const report = {
      report_type: '宿泊出張',
      daily_allowance: 15000,
      accommodation_fee: 30000,
      car_allowance: 300,
      driving_distance_km: 12,
      highway_fee: 1000,
      parking_fee: 200,
      taxi_fee: 500,
      other_transport_fee: 800,
    };
    expect(buildTaggedBreakdown(report)).toEqual([
      { key: 'daily_allowance', label: '日当', amount: 15000, category: 'allowance' },
      { key: 'accommodation_fee', label: '宿泊費', amount: 30000, category: 'allowance' },
      { key: 'car_allowance', label: 'マイカー手当（12km）', amount: 300, category: 'allowance' },
      { key: 'highway_fee', label: '高速道路料金', amount: 1000, category: 'expense' },
      { key: 'parking_fee', label: '駐車場料金', amount: 200, category: 'expense' },
      { key: 'taxi_fee', label: 'タクシー料金', amount: 500, category: 'expense' },
      { key: 'other_transport_fee', label: 'その他交通費', amount: 800, category: 'expense' },
    ]);
  });

  it('日帰り: 金額 0 / 欠損の項目は内訳に含めない', () => {
    const report = {
      report_type: '日帰り出張',
      daily_allowance: 4000,
      car_allowance: 0,        // 0 は除外
      driving_distance_km: 0,
      highway_fee: 500,
    };
    expect(buildTaggedBreakdown(report)).toEqual([
      { key: 'daily_allowance', label: '日当', amount: 4000, category: 'allowance' },
      { key: 'highway_fee', label: '高速道路料金', amount: 500, category: 'expense' },
    ]);
  });

  it('海外: 日当（海外）/ 宿泊費（海外）/ 航空券代 / 空港までの交通費', () => {
    const report = {
      report_type: '海外出張',
      daily_allowance: 30000,
      accommodation_fee: 40000,
      flight_fee: 120000,
      airport_transport_fee: 3000,
    };
    expect(buildTaggedBreakdown(report)).toEqual([
      { key: 'daily_allowance', label: '日当（海外）', amount: 30000, category: 'allowance' },
      { key: 'accommodation_fee', label: '宿泊費（海外）', amount: 40000, category: 'allowance' },
      { key: 'flight_fee', label: '航空券代', amount: 120000, category: 'expense' },
      { key: 'airport_transport_fee', label: '空港までの交通費', amount: 3000, category: 'expense' },
    ]);
  });

  it('外出作業: マイカー手当 + 業務関連実費（従来ラベル）', () => {
    const report = {
      report_type: '外出作業',
      car_allowance: 600,
      driving_distance_km: 20,
      coworking_fee: 1000,
      wifi_fee: 500,
      parking_fee: 300,
      meal_fee: 800,
      other_work_fee: 200,
    };
    expect(buildTaggedBreakdown(report)).toEqual([
      { key: 'car_allowance', label: 'マイカー手当（20km）', amount: 600, category: 'allowance' },
      { key: 'coworking_fee', label: 'コワーキング/貸会議室', amount: 1000, category: 'expense' },
      { key: 'wifi_fee', label: 'Wi-Fi/通信費', amount: 500, category: 'expense' },
      { key: 'parking_fee', label: '駐車場料金', amount: 300, category: 'expense' },
      { key: 'meal_fee', label: '飲食代', amount: 800, category: 'expense' },
      { key: 'other_work_fee', label: 'その他業務関連費', amount: 200, category: 'expense' },
    ]);
  });
});
