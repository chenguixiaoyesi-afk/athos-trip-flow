// src/lib/tenantScope.js
// =============================================================================
// A13 マルチカンパニー / SaaS 基盤 — テナント・スコープ中央チョークポイント（純関数）
// -----------------------------------------------------------------------------
// 設計正本: .claude-team/handoff/design-handoff-A13.md (r3)
//
// 【最重要原則】
//   - 本モジュールは「UX・最小取得・表示整形」のための純関数群である。
//   - **本当のセキュリティ境界は Base44 の server-side RLS**（base44/entities/*.jsonc の rls）。
//   - フロントの buildScopedFilter だけではテナント越境を防げない（RLS 必須）。
//   - 所属・権限の正本は User.company_id / User.app_role（Membership は使わない / A13）。
//
// A11 reportFinancials / A12 paymentManagement と同じ「pure lib + UI 層が IO」方針。
// すべて副作用なし（唯一 ATHOS_COMPANY_ID の解決値だけは init 時に設定可能な保持変数）。
// =============================================================================

/** 4 ロール（app_role の正本）。 */
export const APP_ROLES = Object.freeze({
  SYSTEM_OWNER: 'systemOwner',
  COMPANY_ADMIN: 'companyAdmin',
  MANAGER: 'manager',
  MEMBER: 'member',
});

const VALID_APP_ROLES = Object.freeze([
  APP_ROLES.SYSTEM_OWNER,
  APP_ROLES.COMPANY_ADMIN,
  APP_ROLES.MANAGER,
  APP_ROLES.MEMBER,
]);

// -----------------------------------------------------------------------------
// capability マトリクス（§4.5）。値 = その操作を許可する app_role の集合。
// member は会社内の「自分のレポートのみ」。reportViewAll を持たない＝一覧は自分のみ。
// -----------------------------------------------------------------------------
const { SYSTEM_OWNER, COMPANY_ADMIN, MANAGER, MEMBER } = APP_ROLES;

export const CAPABILITIES = Object.freeze({
  reportCreate: [SYSTEM_OWNER, COMPANY_ADMIN, MANAGER, MEMBER],
  reportViewAll: [SYSTEM_OWNER, COMPANY_ADMIN, MANAGER], // 会社内 全レポート閲覧（member は own のみ）
  approve: [SYSTEM_OWNER, COMPANY_ADMIN, MANAGER],
  payment: [SYSTEM_OWNER, COMPANY_ADMIN],
  summaryView: [SYSTEM_OWNER, COMPANY_ADMIN, MANAGER], // member は自分の集計のみ（own）
  csvExport: [SYSTEM_OWNER, COMPANY_ADMIN, MANAGER],
  policyManage: [SYSTEM_OWNER, COMPANY_ADMIN],
  companyManage: [SYSTEM_OWNER],
  memberManage: [SYSTEM_OWNER, COMPANY_ADMIN],
  companySwitch: [SYSTEM_OWNER],
});

// -----------------------------------------------------------------------------
// ATHOS_COMPANY_ID — ハードコード禁止（id は Base44 create 時採番）。
// アプリ起動時に Company.filter({code:'ATHOS'}) で決定的に解決し、ここへ設定する。
// resolveCompanyId の「データ行表示の補助フォールバック」専用（identity には使わない）。
// -----------------------------------------------------------------------------
let _athosCompanyId = null;

/** 起動時に解決した Athos の company_id を設定（AuthContext 初期化時に呼ぶ）。 */
export function configureAthosCompanyId(id) {
  _athosCompanyId = id || null;
}

/** 現在設定されている Athos company_id（未解決なら null）。 */
export function getAthosCompanyId() {
  return _athosCompanyId;
}

/**
 * app_role を正規化。正本(app_role)が有効ならそれを使う。
 * 無い場合のみレガシー role(admin|user) からマップ（admin→companyAdmin / それ以外→member）。
 * **レガシーからは決して systemOwner を導出しない**（越境権限は明示付与のみ / Implementation Safety）。
 */
export function normalizeAppRole(appRole, legacyRole) {
  if (VALID_APP_ROLES.includes(appRole)) return appRole;
  if (legacyRole === 'admin') return COMPANY_ADMIN;
  return MEMBER;
}

/**
 * ログインユーザ(User レコード)からテナント ctx を構築する。
 * **fail-closed**: company_id を持たないユーザは null を返す（§4.3b）。
 *   - identity の会社を Athos へ黙ってフォールバックさせない。
 * @param {object|null} user base44.auth.me() の戻り（company_id / app_role / role / id / email）
 * @param {string|null} selectedCompanyId systemOwner の会社セレクタ選択値（任意）
 * @returns {null | {userId,email,companyId,homeCompanyId,appRole,isSystemOwner,selectedCompanyId}}
 */
export function buildTenant(user, selectedCompanyId = null) {
  if (!user || !user.company_id) return null; // fail-closed
  const appRole = normalizeAppRole(user.app_role, user.role);
  const isSystemOwner = appRole === SYSTEM_OWNER;
  return {
    userId: user.id ?? null,
    email: user.email ?? null,
    companyId: user.company_id,
    homeCompanyId: user.company_id,
    appRole,
    isSystemOwner,
    // 会社セレクタは systemOwner のみ意味を持つ
    selectedCompanyId: isSystemOwner ? (selectedCompanyId || null) : null,
  };
}

/**
 * データ行の company_id を解決する「表示補助フォールバック」。
 * **セキュリティ境界ではない**。server RLS はこの JS を実行しないため、
 * 既存行は移行 M-3 で必ず company_id をバックフィルすること（B-15）。
 */
export function resolveCompanyId(row, fallback = _athosCompanyId) {
  if (row && row.company_id) return row.company_id;
  return fallback ?? null;
}

/**
 * 取得スコープ（filter 条件）を構築する。**UX・最小取得用**（最終強制は RLS）。
 *   - systemOwner: selectedCompanyId があればその会社、無ければ全社（company_id 非注入）。
 *   - それ以外  : 自社（company_id = ctx.companyId）を必ず注入。
 * @param {object|null} ctx buildTenant の戻り
 * @param {object} baseFilter 既存の filter（status 等）
 */
export function buildScopedFilter(ctx, baseFilter = {}) {
  const base = { ...(baseFilter || {}) };
  if (!ctx) return base; // 呼出側が tenant 不在を別途 fail-closed する前提
  if (ctx.isSystemOwner) {
    if (ctx.selectedCompanyId) return { ...base, company_id: ctx.selectedCompanyId };
    return base; // 全社横断（唯一の越境主体）
  }
  return { ...base, company_id: ctx.companyId };
}

/**
 * 書込データに company_id を必ず付与する（create 一致＝RLS create を満たす）。
 *   - systemOwner: selectedCompanyId ?? homeCompanyId。
 *   - それ以外  : 自社。
 * tenant 不在時は付与せず元データを返す（呼出側が fail-closed 済みの前提）。
 */
export function stampCompanyId(ctx, data) {
  if (!ctx) return { ...(data || {}) };
  const companyId = ctx.isSystemOwner
    ? (ctx.selectedCompanyId || ctx.homeCompanyId)
    : ctx.companyId;
  return { ...(data || {}), company_id: companyId };
}

/**
 * 詳細/編集/削除前の越境チェック。systemOwner は常に true、他は同一会社のみ true。
 * （最終遮断は RLS。これは UX 早期 403 用）
 */
export function assertSameTenant(ctx, row) {
  if (!ctx) return false;
  if (ctx.isSystemOwner) return true;
  return !!row && row.company_id === ctx.companyId;
}

/** capability マトリクス判定（§4.5）。tenant 不在は常に false（fail-closed）。 */
export function can(ctx, capability) {
  if (!ctx) return false;
  const allowed = CAPABILITIES[capability];
  if (!allowed) return false;
  return allowed.includes(ctx.appRole);
}

/** member 等が「自分のレポートのみ」かどうか（reportViewAll を持たない＝own限定）。 */
export function isOwnScopeOnly(ctx) {
  if (!ctx) return true;
  return !can(ctx, 'reportViewAll');
}

/** Summary 等の予算 localStorage を会社ごとに名前空間化するキー。 */
export function budgetStorageKey(ctx) {
  const companyId = ctx
    ? (ctx.isSystemOwner ? (ctx.selectedCompanyId || ctx.homeCompanyId) : ctx.companyId)
    : 'unknown';
  return `annualBudget:${companyId || 'unknown'}`;
}
