import { describe, it, expect } from 'vitest';
import { calcAllowances } from '../allowanceCalculator.js';

// A11 回帰テスト: 手当（日当 / 宿泊費 / 車手当）の決定論計算を 4 種別 × 代表数量で固定する。
// 現状フォーム / policyImpactAnalyzer と同値であることを保証（金額 1 円も変わらない）。

const POLICY = {
  daily_allowance_daytrip: 4000,
  daily_allowance_overnight: 5000,
  daily_allowance_overseas: 10000,
  accommodation_domestic: 15000,
  accommodation_overseas: 20000,
  car_allowance_per_km: 30,
};

describe('calcAllowances — 種別別の手当計算', () => {
  it('日帰り出張: 日当 + マイカー手当（hasCar 時のみ距離×単価）', () => {
    const result = calcAllowances({
      reportType: '日帰り出張',
      quantities: { drivingKm: 10, hasCar: true },
      policy: POLICY,
    });
    expect(result.daily_allowance).toBe(4000);
    expect(result.accommodation_fee).toBe(0);
    expect(result.car_allowance).toBe(300);
    expect(result.allowanceTotal).toBe(4300);
    expect(result.breakdown).toEqual([
      { key: 'daily_allowance', label: '日当', policyKey: 'daily_allowance_daytrip', unitValue: 4000, quantity: 1, amount: 4000, category: 'allowance' },
      { key: 'car_allowance', label: 'マイカー手当', policyKey: 'car_allowance_per_km', unitValue: 30, quantity: 10, amount: 300, category: 'allowance' },
    ]);
  });

  it('日帰り出張: hasCar false なら車手当 0（距離があっても計上しない）', () => {
    const result = calcAllowances({
      reportType: '日帰り出張',
      quantities: { drivingKm: 10, hasCar: false },
      policy: POLICY,
    });
    expect(result.car_allowance).toBe(0);
    expect(result.allowanceTotal).toBe(4000);
    // 車手当 breakdown は quantity 0 / amount 0 で存在
    expect(result.breakdown[1]).toMatchObject({ key: 'car_allowance', quantity: 0, amount: 0 });
  });

  it('日帰り出張: hasCar 省略（undefined）でも車手当 0', () => {
    const result = calcAllowances({
      reportType: '日帰り出張',
      quantities: { drivingKm: 10 },
      policy: POLICY,
    });
    expect(result.car_allowance).toBe(0);
  });

  it('宿泊出張: 日当×日数 + 宿泊費×泊数 + 車手当', () => {
    const result = calcAllowances({
      reportType: '宿泊出張',
      quantities: { numDays: 3, numNights: 2, drivingKm: 10, hasCar: true },
      policy: POLICY,
    });
    expect(result.daily_allowance).toBe(15000);
    expect(result.accommodation_fee).toBe(30000);
    expect(result.car_allowance).toBe(300);
    expect(result.allowanceTotal).toBe(45300);
    expect(result.breakdown).toEqual([
      { key: 'daily_allowance', label: '日当', policyKey: 'daily_allowance_overnight', unitValue: 5000, quantity: 3, amount: 15000, category: 'allowance' },
      { key: 'accommodation_fee', label: '宿泊費', policyKey: 'accommodation_domestic', unitValue: 15000, quantity: 2, amount: 30000, category: 'allowance' },
      { key: 'car_allowance', label: 'マイカー手当', policyKey: 'car_allowance_per_km', unitValue: 30, quantity: 10, amount: 300, category: 'allowance' },
    ]);
  });

  it('宿泊出張: numNights 欠損は 0 泊（宿泊費 0）、numDays 欠損は 1 日', () => {
    const result = calcAllowances({
      reportType: '宿泊出張',
      quantities: { drivingKm: 0, hasCar: true },
      policy: POLICY,
    });
    expect(result.daily_allowance).toBe(5000); // 5000 × 1 日
    expect(result.accommodation_fee).toBe(0);  // × 0 泊
    expect(result.car_allowance).toBe(0);
  });

  it('海外出張: 海外日当×日数 + 海外宿泊費×泊数、車手当なし', () => {
    const result = calcAllowances({
      reportType: '海外出張',
      quantities: { numDays: 3, numNights: 2, drivingKm: 10, hasCar: true },
      policy: POLICY,
    });
    expect(result.daily_allowance).toBe(30000);
    expect(result.accommodation_fee).toBe(40000);
    expect(result.car_allowance).toBe(0); // hasCar=true でも海外は車手当なし
    expect(result.allowanceTotal).toBe(70000);
    expect(result.breakdown).toEqual([
      { key: 'daily_allowance', label: '日当（海外）', policyKey: 'daily_allowance_overseas', unitValue: 10000, quantity: 3, amount: 30000, category: 'allowance' },
      { key: 'accommodation_fee', label: '宿泊費（海外）', policyKey: 'accommodation_overseas', unitValue: 20000, quantity: 2, amount: 40000, category: 'allowance' },
    ]);
  });

  it('外出作業: 車手当のみ、日当・宿泊費なし', () => {
    const result = calcAllowances({
      reportType: '外出作業',
      quantities: { drivingKm: 10, hasCar: true },
      policy: POLICY,
    });
    expect(result.daily_allowance).toBe(0);
    expect(result.accommodation_fee).toBe(0);
    expect(result.car_allowance).toBe(300);
    expect(result.allowanceTotal).toBe(300);
    expect(result.breakdown).toEqual([
      { key: 'car_allowance', label: 'マイカー手当', policyKey: 'car_allowance_per_km', unitValue: 30, quantity: 10, amount: 300, category: 'allowance' },
    ]);
  });

  it('外出作業: hasCar false なら車手当 0', () => {
    const result = calcAllowances({
      reportType: '外出作業',
      quantities: { drivingKm: 10, hasCar: false },
      policy: POLICY,
    });
    expect(result.car_allowance).toBe(0);
    expect(result.allowanceTotal).toBe(0);
  });
});

describe('calcAllowances — ガード（throw しない・0 既定）', () => {
  it('引数なしでもゼロを返す', () => {
    expect(calcAllowances()).toEqual({
      daily_allowance: 0,
      accommodation_fee: 0,
      car_allowance: 0,
      breakdown: [],
      allowanceTotal: 0,
    });
  });

  it('未知の種別はすべてゼロ・breakdown 空', () => {
    const result = calcAllowances({ reportType: '不明な種別', quantities: { drivingKm: 10, hasCar: true }, policy: POLICY });
    expect(result).toEqual({
      daily_allowance: 0,
      accommodation_fee: 0,
      car_allowance: 0,
      breakdown: [],
      allowanceTotal: 0,
    });
  });

  it('policy 欠損フィールドは 0 として扱う（NaN を出さない）', () => {
    const result = calcAllowances({
      reportType: '宿泊出張',
      quantities: { numDays: 2, numNights: 1, drivingKm: 5, hasCar: true },
      policy: {}, // すべて欠損
    });
    expect(result.daily_allowance).toBe(0);
    expect(result.accommodation_fee).toBe(0);
    expect(result.car_allowance).toBe(0);
    expect(result.allowanceTotal).toBe(0);
  });
});
