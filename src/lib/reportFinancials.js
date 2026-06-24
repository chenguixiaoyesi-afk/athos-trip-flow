// 旅費規程ベースの財務計算基盤（A11）— 既存 Report から「手当 / 実費 / 総支給額」の 3 概念を
// read 時に導出する純粋関数（design-handoff-A11.md rev.2 §7）。
//
// 不変条件（回帰ゼロの根幹・§5.2）:
//   - payment_total === total_amount（フィールドを増やさず概念名のみ付与。総額の値・意味は不変）。
//   - allowance_total / expense_total は導出のみ・永続しない。
//   - expense_total = max(0, total_amount - allowance_total)。
//
// 本モジュールは read 専用。Report への書込み・新フィールド永続は一切しない。
// breakdown のラベル・順序・0 超フィルタは ReportDetail.buildBreakdown と完全一致させ、
// category（'allowance' | 'expense'）タグのみ付与して一般化する（表示値不変）。

/**
 * Report 種別ごとの支給項目内訳を生成（category タグ付き）。
 * ラベル / 順序 / 「金額 > 0 のみ表示」は従来の ReportDetail.buildBreakdown と同一。
 *
 * @param {object} reportLike Report エンティティ（または同形のオブジェクト）
 * @returns {Array<{ key:string, label:string, amount:number, category:('allowance'|'expense') }>}
 */
export function buildTaggedBreakdown(reportLike) {
  const report = reportLike || {};
  const items = [];
  const add = (key, label, amount, category) => {
    if (amount && amount > 0) items.push({ key, label, amount, category });
  };

  if (report.report_type === '日帰り出張' || report.report_type === '宿泊出張') {
    add('daily_allowance', '日当', report.daily_allowance, 'allowance');
    add('accommodation_fee', '宿泊費', report.accommodation_fee, 'allowance');
    add('car_allowance', `マイカー手当（${report.driving_distance_km || 0}km）`, report.car_allowance, 'allowance');
    add('highway_fee', '高速道路料金', report.highway_fee, 'expense');
    add('parking_fee', '駐車場料金', report.parking_fee, 'expense');
    add('taxi_fee', 'タクシー料金', report.taxi_fee, 'expense');
    add('other_transport_fee', 'その他交通費', report.other_transport_fee, 'expense');
  } else if (report.report_type === '海外出張') {
    add('daily_allowance', '日当（海外）', report.daily_allowance, 'allowance');
    add('accommodation_fee', '宿泊費（海外）', report.accommodation_fee, 'allowance');
    add('flight_fee', '航空券代', report.flight_fee, 'expense');
    add('airport_transport_fee', '空港までの交通費', report.airport_transport_fee, 'expense');
  } else if (report.report_type === '外出作業') {
    add('car_allowance', `マイカー手当（${report.driving_distance_km || 0}km）`, report.car_allowance, 'allowance');
    add('coworking_fee', 'コワーキング/貸会議室', report.coworking_fee, 'expense');
    add('wifi_fee', 'Wi-Fi/通信費', report.wifi_fee, 'expense');
    add('parking_fee', '駐車場料金', report.parking_fee, 'expense');
    add('meal_fee', '飲食代', report.meal_fee, 'expense');
    add('other_work_fee', 'その他業務関連費', report.other_work_fee, 'expense');
  }
  return items;
}

/**
 * 既存 Report（または form 算出済みオブジェクト）から手当合計 / 実費合計 / 総支給額を導出する。
 * 永続化しない read 専用の導出ビュー。
 *
 * @param {object} reportLike Report エンティティ（または同形のオブジェクト）
 * @returns {{
 *   allowance_total: number,
 *   expense_total: number,
 *   payment_total: number,
 *   breakdown: Array<{ key:string, label:string, amount:number, category:('allowance'|'expense') }>,
 * }}
 */
export function deriveReportFinancials(reportLike) {
  const report = reportLike || {};

  const allowance_total =
    (report.daily_allowance || 0) +
    (report.accommodation_fee || 0) +
    (report.car_allowance || 0);

  // payment_total は常に total_amount と同値（同フィールド・別名概念）。
  const payment_total = report.total_amount || 0;

  // 実費合計は「総支給 − 手当」を基本式とし、負値は 0 にクランプ。
  const expense_total = Math.max(0, payment_total - allowance_total);

  return {
    allowance_total,
    expense_total,
    payment_total,
    breakdown: buildTaggedBreakdown(report),
  };
}
