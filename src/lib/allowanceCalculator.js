// 旅費規程ベースの財務計算基盤（A11）— 手当（日当 / 宿泊費 / 車両手当）の決定論計算。
//
// 設計方針（design-handoff-A11.md rev.2 §6）:
//   - 純粋関数・副作用/IO なし・throw しない（policyImpactAnalyzer の防御方針を継承）。
//   - 4 種別のルールは現状フォーム / policyImpactAnalyzer と 1:1 で同値（回帰ゼロ）。
//   - AI（InvokeLLM）に最終金額を計算させない。手当は本モジュールのみが決定論で確定する。
//   - 実費（highway_fee 等）は対象外。実費は useFeeState（手入力 + 領収書）が扱う。
//
// 役割分離（§7.1）:
//   - allowanceCalculator : 規程 → 手当（これから手当をいくらにするか／フォーム入力時）。
//   - reportFinancials    : 既存 Report → 手当/実費/総支給（この Report はいくらか／読取時）。
//
// 数量の既定値（callers が事前適用する前提・本関数は最終ガードのみ）:
//   - numDays  : 既存挙動どおり「1 以上」。本関数では `numDays || 1`（フォームは Math.max(1, …) 済み、
//                analyzer は report.num_days || 1 相当）。
//   - numNights: 本関数では `numNights || 0`（analyzer の `report.num_nights || 0` と一致。
//                フォームは `form.num_nights || 1` を事前適用して渡すため実質その値を使用）。
//   - drivingKm: `drivingKm || 0`（フォーム / analyzer の既存式と同一の合算挙動）。
//   - hasCar   : フォームは交通手段に「マイカー」を含むか。analyzer は常に true（距離があれば計上＝既存挙動）。

function allowanceItem(key, label, policyKey, unitValue, quantity, amount) {
  return { key, label, policyKey, unitValue, quantity, amount, category: 'allowance' };
}

function carAllowanceItem(unitValue, quantity, amount) {
  return {
    key: 'car_allowance',
    label: 'マイカー手当',
    policyKey: 'car_allowance_per_km',
    unitValue,
    quantity,
    amount,
    category: 'allowance',
  };
}

/**
 * 規程（TravelPolicyMaster）から手当を決定論的に算出する純粋関数。
 *
 * @param {object} args
 * @param {('日帰り出張'|'宿泊出張'|'海外出張'|'外出作業')} args.reportType レポート種別
 * @param {object} [args.quantities] 数量 { numDays, numNights, drivingKm, hasCar }
 * @param {object} [args.policy] 解決済み TravelPolicyMaster（resolvePolicy の戻り値）
 * @returns {{
 *   daily_allowance: number,
 *   accommodation_fee: number,
 *   car_allowance: number,
 *   breakdown: Array<{ key:string, label:string, policyKey:string, unitValue:number, quantity:number, amount:number, category:'allowance' }>,
 *   allowanceTotal: number,
 * }}
 */
export function calcAllowances({ reportType, quantities = {}, policy = {} } = {}) {
  const p = policy || {};
  const { numDays, numNights, drivingKm, hasCar } = quantities || {};

  const carRate = p.car_allowance_per_km || 0;
  const km = drivingKm || 0;
  const carAmount = hasCar ? km * carRate : 0;
  const carQuantity = hasCar ? km : 0;

  const days = numDays || 1;
  const nights = numNights || 0;

  let daily_allowance = 0;
  let accommodation_fee = 0;
  let car_allowance = 0;
  const breakdown = [];

  if (reportType === '日帰り出張') {
    daily_allowance = p.daily_allowance_daytrip || 0;
    car_allowance = carAmount;
    breakdown.push(allowanceItem('daily_allowance', '日当', 'daily_allowance_daytrip', daily_allowance, 1, daily_allowance));
    breakdown.push(carAllowanceItem(carRate, carQuantity, car_allowance));
  } else if (reportType === '宿泊出張') {
    const dailyUnit = p.daily_allowance_overnight || 0;
    const accomUnit = p.accommodation_domestic || 0;
    daily_allowance = dailyUnit * days;
    accommodation_fee = accomUnit * nights;
    car_allowance = carAmount;
    breakdown.push(allowanceItem('daily_allowance', '日当', 'daily_allowance_overnight', dailyUnit, days, daily_allowance));
    breakdown.push(allowanceItem('accommodation_fee', '宿泊費', 'accommodation_domestic', accomUnit, nights, accommodation_fee));
    breakdown.push(carAllowanceItem(carRate, carQuantity, car_allowance));
  } else if (reportType === '海外出張') {
    const dailyUnit = p.daily_allowance_overseas || 0;
    const accomUnit = p.accommodation_overseas || 0;
    daily_allowance = dailyUnit * days;
    accommodation_fee = accomUnit * nights;
    // 海外出張は車手当なし（§6.2）
    breakdown.push(allowanceItem('daily_allowance', '日当（海外）', 'daily_allowance_overseas', dailyUnit, days, daily_allowance));
    breakdown.push(allowanceItem('accommodation_fee', '宿泊費（海外）', 'accommodation_overseas', accomUnit, nights, accommodation_fee));
  } else if (reportType === '外出作業') {
    // 外出作業は日当・宿泊費なし。車手当のみ（§6.2）
    car_allowance = carAmount;
    breakdown.push(carAllowanceItem(carRate, carQuantity, car_allowance));
  }

  const allowanceTotal = daily_allowance + accommodation_fee + car_allowance;

  return { daily_allowance, accommodation_fee, car_allowance, breakdown, allowanceTotal };
}
