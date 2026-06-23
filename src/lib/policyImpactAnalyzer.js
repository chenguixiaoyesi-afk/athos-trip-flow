// 旅費規程影響範囲分析（A8 で新規導入）。
// すべて純粋関数（副作用なし・外部 IO なし・Date 演算のみ）。
// Base44 Automation の Custom JavaScript からも browser からも同じ関数を呼び出せる設計。
//
// 業務ルール:
//   - 規程値依存項目（daily_allowance / accommodation_fee / car_allowance）のみ再計算
//   - 実費項目（highway_fee, parking_fee, taxi_fee, other_transport_fee, flight_fee,
//     airport_transport_fee, coworking_fee, wifi_fee, meal_fee, other_work_fee）は
//     規程値非依存のため再計算対象外（report の値をそのまま使用）
//   - 4 種別ごとの計算差を厳密に反映:
//       日帰り出張: daily_allowance + car_allowance
//       宿泊出張:   (daily_allowance * 日数) + (accommodation_fee * 泊数) + car_allowance
//       海外出張:   (daily_allowance_overseas * 日数) + (accommodation_overseas * 泊数) ※車手当なし
//       外出作業:   car_allowance のみ（日当・宿泊費なし）
//
// 引数名は `currentPolicy` / `sourcePolicy` / `targetPolicy`（`policy` シャドー回避、
// verdict-A7 §6.2 改善「変数シャドー自己チェック」適用）。
//
// A11: 手当（日当 / 宿泊費 / 車手当）の計算は allowanceCalculator.calcAllowances に集約。
// 本ファイルは実費合算 + 総額の組み立てに専念し、手当計算式の二重定義を解消する。
// 既存の種別別計算結果（および policyImpactAnalyzer.test.js）は不変。

import { calcAllowances } from './allowanceCalculator.js';

/**
 * 規程値依存の計算値（日当・宿泊費・車手当）を report の元データから再計算する純粋関数。
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

  // 手当（日当 / 宿泊費 / 車手当）は allowanceCalculator に委譲（種別ルールは §6.2 と一致）。
  // analyzer は report に hasCar を持たないため、距離があれば車手当を計上する従来挙動を
  // hasCar: true で再現する（海外出張は calculator 側で車手当 0 のため影響なし）。
  const { daily_allowance, accommodation_fee, car_allowance } = calcAllowances({
    reportType: report.report_type,
    quantities: {
      numDays: report.num_days,
      numNights: report.num_nights,
      drivingKm: report.driving_distance_km,
      hasCar: true,
    },
    policy: currentPolicy,
  });

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
 * 全レポートの旧規程 vs 新規程の差分を集計する純粋関数。
 * `items` は差分が 0 でないレポートのみを含む。
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
