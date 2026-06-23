// 旅費規程の解決 seam（A11）— design-handoff-A11.md rev.2 §6.3 / §8.2。
//
// 目的: 「どの規程（TravelPolicyMaster）を適用するか」を決める唯一の差し替え点を用意する。
// 現状は単一グローバル active policy のみのため、渡された有効規程をそのまま返す。
//
// 将来（A13 組織管理 / A14 SaaS）では、ここで context.companyId / context.employeeType 等から
// 適用規程を 1 本に解決する。calcAllowances は「解決済み policy を受け取る純粋関数」のままにし、
// テナント / 職種の選択ロジックは本 seam の内部だけを差し替えれば済むようにする。
//
// 純粋関数・副作用/IO なし・throw しない。

/**
 * 適用すべき旅費規程を解決する。現状は context.policy（有効規程）をそのまま返す。
 *
 * @param {object} [context] 解決コンテキスト { policy, companyId?, employeeType? }
 * @returns {object|null} 解決済み規程（現状は context.policy）
 */
export function resolvePolicy(context = {}) {
  return context?.policy ?? null;
}
