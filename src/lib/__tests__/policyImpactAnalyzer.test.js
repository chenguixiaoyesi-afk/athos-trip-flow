import { describe, it, expect } from 'vitest';
import {
  recomputeReportPolicyValues,
  computeImpact,
} from '../policyImpactAnalyzer.js';

// A9 回帰テスト: policyImpactAnalyzer.js は本体変更禁止。公開 API 経由のみで検証する。
// 4 種別ごとの計算差（海外＝車手当なし / 外出作業＝日当・宿泊費なし）を固定する。

const POLICY = {
  daily_allowance_daytrip: 5000,
  daily_allowance_overnight: 5000,
  daily_allowance_overseas: 10000,
  accommodation_domestic: 15000,
  accommodation_overseas: 20000,
  car_allowance_per_km: 30,
};

describe('recomputeReportPolicyValues — 種別別計算', () => {
  it('日帰り出張: 日当 + 距離×km単価、宿泊費なし', () => {
    const r = { report_type: '日帰り出張', driving_distance_km: 10 };
    expect(recomputeReportPolicyValues(r, POLICY)).toEqual({
      daily_allowance: 5000,
      accommodation_fee: 0,
      car_allowance: 300,
      total_amount: 5300,
    });
  });

  it('宿泊出張: 日当×日数 + 宿泊費×泊数 + 車手当', () => {
    const r = { report_type: '宿泊出張', num_days: 3, num_nights: 2, driving_distance_km: 10 };
    expect(recomputeReportPolicyValues(r, POLICY)).toEqual({
      daily_allowance: 15000,
      accommodation_fee: 30000,
      car_allowance: 300,
      total_amount: 45300,
    });
  });

  it('海外出張: 海外日当×日数 + 海外宿泊費×泊数、車手当なし', () => {
    const r = { report_type: '海外出張', num_days: 3, num_nights: 2, driving_distance_km: 10 };
    expect(recomputeReportPolicyValues(r, POLICY)).toEqual({
      daily_allowance: 30000,
      accommodation_fee: 40000,
      car_allowance: 0,
      total_amount: 70000,
    });
  });

  it('外出作業: 車手当のみ、日当・宿泊費なし', () => {
    const r = { report_type: '外出作業', driving_distance_km: 10 };
    expect(recomputeReportPolicyValues(r, POLICY)).toEqual({
      daily_allowance: 0,
      accommodation_fee: 0,
      car_allowance: 300,
      total_amount: 300,
    });
  });

  it('実費項目は規程値非依存で合計に加算される', () => {
    const r = {
      report_type: '日帰り出張',
      driving_distance_km: 0,
      highway_fee: 1000,
      parking_fee: 200,
      taxi_fee: 500,
      meal_fee: 800,
    };
    const result = recomputeReportPolicyValues(r, POLICY);
    expect(result.car_allowance).toBe(0);
    // daily 5000 + 実費 2500
    expect(result.total_amount).toBe(7500);
  });

  it('未知の種別は規程値ゼロ、実費のみ合計', () => {
    const r = { report_type: '不明な種別', highway_fee: 1000 };
    expect(recomputeReportPolicyValues(r, POLICY)).toEqual({
      daily_allowance: 0,
      accommodation_fee: 0,
      car_allowance: 0,
      total_amount: 1000,
    });
  });

  it('report / currentPolicy が null ならすべてゼロ', () => {
    const zero = { daily_allowance: 0, accommodation_fee: 0, car_allowance: 0, total_amount: 0 };
    expect(recomputeReportPolicyValues(null, POLICY)).toEqual(zero);
    expect(recomputeReportPolicyValues({ report_type: '日帰り出張' }, null)).toEqual(zero);
  });
});

describe('computeImpact — 規程差分集計', () => {
  it('差分が 0 でないレポートのみ items に含み、totalDiff / affectedCount を集計する', () => {
    const source = { ...POLICY, daily_allowance_daytrip: 5000 };
    const target = { ...POLICY, daily_allowance_daytrip: 6000 };
    const reports = [
      { report_type: '日帰り出張', driving_distance_km: 0 }, // 5000 -> 6000, diff +1000
      { report_type: '外出作業', driving_distance_km: 0 },   // 0 -> 0, diff 0（除外）
    ];
    const result = computeImpact(reports, source, target);

    expect(result.totalReports).toBe(2);
    expect(result.affectedCount).toBe(1);
    expect(result.totalDiff).toBe(1000);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ oldTotal: 5000, newTotal: 6000, diff: 1000 });
    expect(result.items[0].report).toBe(reports[0]);
  });

  it('同一規程では差分なし（items 空 / totalDiff 0）', () => {
    const reports = [{ report_type: '日帰り出張', driving_distance_km: 10 }];
    const result = computeImpact(reports, POLICY, POLICY);
    expect(result.affectedCount).toBe(0);
    expect(result.totalDiff).toBe(0);
    expect(result.items).toEqual([]);
  });

  it('空のレポート配列でも安全にゼロを返す', () => {
    const result = computeImpact([], POLICY, POLICY);
    expect(result).toEqual({ totalReports: 0, affectedCount: 0, totalDiff: 0, items: [] });
  });

  it('sourcePolicy / targetPolicy が null ならゼロを返す', () => {
    const reports = [{ report_type: '日帰り出張', driving_distance_km: 10 }];
    const zero = { totalReports: 0, affectedCount: 0, totalDiff: 0, items: [] };
    expect(computeImpact(reports, null, POLICY)).toEqual(zero);
    expect(computeImpact(reports, POLICY, null)).toEqual(zero);
  });
});
