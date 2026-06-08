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

  const type = report.report_type;
  let daily_allowance = 0;
  let accommodation_fee = 0;
  let car_allowance = 0;

  if (type === '日帰り出張') {
    daily_allowance = currentPolicy.daily_allowance_daytrip || 0;
    car_allowance = (report.driving_distance_km || 0) * (currentPolicy.car_allowance_per_km || 0);
  } else if (type === '宿泊出張') {
    const days = report.num_days || 1;
    const nights = report.num_nights || 0;
    daily_allowance = (currentPolicy.daily_allowance_overnight || 0) * days;
    accommodation_fee = (currentPolicy.accommodation_domestic || 0) * nights;
    car_allowance = (report.driving_distance_km || 0) * (currentPolicy.car_allowance_per_km || 0);
  } else if (type === '海外出張') {
    const days = report.num_days || 1;
    const nights = report.num_nights || 0;
    daily_allowance = (currentPolicy.daily_allowance_overseas || 0) * days;
    accommodation_fee = (currentPolicy.accommodation_overseas || 0) * nights;
    // 海外出張は車手当なし
  } else if (type === '外出作業') {
    car_allowance = (report.driving_distance_km || 0) * (currentPolicy.car_allowance_per_km || 0);
    // 外出作業は日当・宿泊費なし
  }

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
