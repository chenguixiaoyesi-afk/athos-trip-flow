import { describe, it, expect, beforeEach } from 'vitest';
import {
  APP_ROLES,
  CAPABILITIES,
  buildTenant,
  normalizeAppRole,
  buildScopedFilter,
  stampCompanyId,
  assertSameTenant,
  can,
  isOwnScopeOnly,
  resolveCompanyId,
  configureAthosCompanyId,
  getAthosCompanyId,
  budgetStorageKey,
} from '../tenantScope.js';

// A13 マルチカンパニー: テナント・スコープ純関数のユニットテスト。
// カバー観点（Owner 指定）: scope resolver / filter builder / company_id 付与 /
//   systemOwner 全社 / companyAdmin 自社のみ / fail-closed。

const owner = { id: 'u-owner', email: 'owner@athos.jp', company_id: 'co-athos', app_role: APP_ROLES.SYSTEM_OWNER };
const admin = { id: 'u-admin', email: 'admin@duo.jp', company_id: 'co-duo', app_role: APP_ROLES.COMPANY_ADMIN };
const manager = { id: 'u-mgr', email: 'mgr@duo.jp', company_id: 'co-duo', app_role: APP_ROLES.MANAGER };
const member = { id: 'u-mem', email: 'mem@duo.jp', company_id: 'co-duo', app_role: APP_ROLES.MEMBER };

describe('buildTenant — ctx 構築と fail-closed', () => {
  it('company_id を持たないユーザは null（fail-closed / §4.3b）', () => {
    expect(buildTenant({ id: 'x', email: 'x@x.jp', app_role: 'companyAdmin' })).toBeNull();
    expect(buildTenant(null)).toBeNull();
    expect(buildTenant(undefined)).toBeNull();
  });

  it('company_id を持つユーザは ctx を返し homeCompanyId = company_id', () => {
    const ctx = buildTenant(admin);
    expect(ctx.companyId).toBe('co-duo');
    expect(ctx.homeCompanyId).toBe('co-duo');
    expect(ctx.appRole).toBe('companyAdmin');
    expect(ctx.isSystemOwner).toBe(false);
  });

  it('systemOwner は isSystemOwner=true、selectedCompanyId を保持', () => {
    const ctx = buildTenant(owner, 'co-disney');
    expect(ctx.isSystemOwner).toBe(true);
    expect(ctx.selectedCompanyId).toBe('co-disney');
  });

  it('非 systemOwner の selectedCompanyId は無視される（越境不可）', () => {
    const ctx = buildTenant(admin, 'co-athos');
    expect(ctx.selectedCompanyId).toBeNull();
  });
});

describe('normalizeAppRole — 正本優先 / レガシーfallback / systemOwner 不導出', () => {
  it('有効な app_role はそのまま採用', () => {
    expect(normalizeAppRole('manager', 'user')).toBe('manager');
    expect(normalizeAppRole('systemOwner', undefined)).toBe('systemOwner');
  });

  it('app_role 不在時はレガシー role からマップ（admin→companyAdmin / それ以外→member）', () => {
    expect(normalizeAppRole(undefined, 'admin')).toBe('companyAdmin');
    expect(normalizeAppRole(null, 'user')).toBe('member');
    expect(normalizeAppRole('', undefined)).toBe('member');
  });

  it('レガシーからは決して systemOwner を導出しない', () => {
    expect(normalizeAppRole(undefined, 'admin')).not.toBe('systemOwner');
    expect(normalizeAppRole('bogus', 'admin')).not.toBe('systemOwner');
  });
});

describe('buildScopedFilter — scope resolver（最終強制は RLS、これは UX）', () => {
  it('companyAdmin は自社 company_id を必ず注入', () => {
    expect(buildScopedFilter(buildTenant(admin), { status: '申請中' }))
      .toEqual({ status: '申請中', company_id: 'co-duo' });
  });

  it('manager / member も自社のみ', () => {
    expect(buildScopedFilter(buildTenant(manager), {}).company_id).toBe('co-duo');
    expect(buildScopedFilter(buildTenant(member), {}).company_id).toBe('co-duo');
  });

  it('systemOwner は会社未選択なら全社（company_id 非注入）', () => {
    expect(buildScopedFilter(buildTenant(owner), { status: '承認済' }))
      .toEqual({ status: '承認済' });
  });

  it('systemOwner は会社選択時のみその会社に絞る', () => {
    expect(buildScopedFilter(buildTenant(owner, 'co-disney'), {}))
      .toEqual({ company_id: 'co-disney' });
  });

  it('baseFilter を破壊しない（純関数）', () => {
    const base = { status: '申請中' };
    buildScopedFilter(buildTenant(admin), base);
    expect(base).toEqual({ status: '申請中' });
  });

  it('tenant 不在(null)では base をそのまま返す（呼出側が別途 fail-closed）', () => {
    expect(buildScopedFilter(null, { status: 'x' })).toEqual({ status: 'x' });
  });
});

describe('stampCompanyId — 書込時の company_id 付与', () => {
  it('companyAdmin は自社 id を付与', () => {
    expect(stampCompanyId(buildTenant(admin), { total_amount: 100 }))
      .toEqual({ total_amount: 100, company_id: 'co-duo' });
  });

  it('systemOwner は selectedCompanyId 優先、無ければ homeCompanyId', () => {
    expect(stampCompanyId(buildTenant(owner, 'co-disney'), {}).company_id).toBe('co-disney');
    expect(stampCompanyId(buildTenant(owner), {}).company_id).toBe('co-athos');
  });

  it('元データを破壊しない', () => {
    const data = { a: 1 };
    stampCompanyId(buildTenant(admin), data);
    expect(data).toEqual({ a: 1 });
  });
});

describe('assertSameTenant — 越境チェック', () => {
  it('companyAdmin は自社行のみ true', () => {
    const ctx = buildTenant(admin);
    expect(assertSameTenant(ctx, { company_id: 'co-duo' })).toBe(true);
    expect(assertSameTenant(ctx, { company_id: 'co-athos' })).toBe(false);
  });

  it('systemOwner は他社行でも true（唯一の越境主体）', () => {
    expect(assertSameTenant(buildTenant(owner), { company_id: 'co-disney' })).toBe(true);
  });

  it('tenant 不在は false（fail-closed）', () => {
    expect(assertSameTenant(null, { company_id: 'co-duo' })).toBe(false);
  });
});

describe('can — capability マトリクス（§4.5）', () => {
  it('支給は systemOwner / companyAdmin のみ（manager 不可）', () => {
    expect(can(buildTenant(owner), 'payment')).toBe(true);
    expect(can(buildTenant(admin), 'payment')).toBe(true);
    expect(can(buildTenant(manager), 'payment')).toBe(false);
    expect(can(buildTenant(member), 'payment')).toBe(false);
  });

  it('承認は manager まで可、member 不可', () => {
    expect(can(buildTenant(manager), 'approve')).toBe(true);
    expect(can(buildTenant(member), 'approve')).toBe(false);
  });

  it('会社管理 / 会社切替は systemOwner のみ', () => {
    expect(can(buildTenant(owner), 'companyManage')).toBe(true);
    expect(can(buildTenant(admin), 'companyManage')).toBe(false);
    expect(can(buildTenant(owner), 'companySwitch')).toBe(true);
    expect(can(buildTenant(admin), 'companySwitch')).toBe(false);
  });

  it('規程管理は companyAdmin 以上（manager 不可）', () => {
    expect(can(buildTenant(admin), 'policyManage')).toBe(true);
    expect(can(buildTenant(manager), 'policyManage')).toBe(false);
  });

  it('tenant 不在 / 未知 capability は false', () => {
    expect(can(null, 'approve')).toBe(false);
    expect(can(buildTenant(admin), 'nonexistentCap')).toBe(false);
  });
});

describe('isOwnScopeOnly — member は一覧で自分のみ', () => {
  it('member は own 限定、それ以上は会社内全件可', () => {
    expect(isOwnScopeOnly(buildTenant(member))).toBe(true);
    expect(isOwnScopeOnly(buildTenant(manager))).toBe(false);
    expect(isOwnScopeOnly(buildTenant(admin))).toBe(false);
    expect(isOwnScopeOnly(buildTenant(owner))).toBe(false);
  });

  it('tenant 不在は own 限定（fail-closed 寄り）', () => {
    expect(isOwnScopeOnly(null)).toBe(true);
  });
});

describe('resolveCompanyId — データ行の表示補助フォールバック（非セキュリティ境界）', () => {
  beforeEach(() => configureAthosCompanyId(null));

  it('row.company_id があればそれを返す', () => {
    expect(resolveCompanyId({ company_id: 'co-duo' }, 'co-athos')).toBe('co-duo');
  });

  it('欠落時は明示 fallback を返す', () => {
    expect(resolveCompanyId({}, 'co-athos')).toBe('co-athos');
    expect(resolveCompanyId(null, 'co-athos')).toBe('co-athos');
  });

  it('configureAthosCompanyId 設定値を既定 fallback に使う', () => {
    configureAthosCompanyId('co-athos');
    expect(getAthosCompanyId()).toBe('co-athos');
    expect(resolveCompanyId({})).toBe('co-athos');
  });

  it('fallback 未設定かつ欠落なら null', () => {
    expect(resolveCompanyId({})).toBeNull();
  });
});

describe('budgetStorageKey — 会社別名前空間', () => {
  it('会社ごとに異なるキー', () => {
    expect(budgetStorageKey(buildTenant(admin))).toBe('annualBudget:co-duo');
    expect(budgetStorageKey(buildTenant(owner, 'co-disney'))).toBe('annualBudget:co-disney');
  });
});

describe('CAPABILITIES エクスポートの健全性', () => {
  it('全 capability が systemOwner を含む（越境主体は常に許可）', () => {
    Object.values(CAPABILITIES).forEach(roles => {
      expect(roles).toContain(APP_ROLES.SYSTEM_OWNER);
    });
  });
});
