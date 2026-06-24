// src/components/RequireTenant.jsx
// =============================================================================
// A13 マルチカンパニー — ルートガード（fail-closed / capability ベース）
// -----------------------------------------------------------------------------
// - RequireCompany: 無所属（tenant=null / company_id 未設定）を 403 で遮断（§4.3b）。
// - RequireRole   : capability マトリクス（§4.5）で admin 系ルートをガード。
//
// 【重要】これは UX 早期 403 であり、最終的なセキュリティ境界はサーバ側 RLS。
//   ガードを擦り抜けても RLS が越境データを返さない設計（二層防御）。
// =============================================================================
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { can } from '@/lib/tenantScope';
import { AlertTriangle } from 'lucide-react';

function Forbidden({ title, message }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7 text-red-500" />
      </div>
      <h1 className="text-lg font-semibold text-slate-800 mb-2">{title}</h1>
      <p className="text-sm text-slate-500 max-w-md mb-6">{message}</p>
      <Link
        to="/"
        className="text-sm px-4 py-2 rounded-md bg-[#1a237e] text-white hover:bg-[#1a237e]/90 transition-colors"
      >
        ダッシュボードへ戻る
      </Link>
    </div>
  );
}

/**
 * 所属会社を持つユーザのみ通す。company_id 未設定（tenant=null）は 403（fail-closed）。
 */
export function RequireCompany() {
  const { tenant } = useAuth();
  if (!tenant) {
    return (
      <Forbidden
        title="アクセスできません"
        message="このアカウントには所属会社が設定されていません。管理者に会社の割り当てを依頼してください。"
      />
    );
  }
  return <Outlet />;
}

/**
 * 指定 capability を持つロールのみ通す。tenant 不在 or 権限不足は 403。
 * 使い方: <Route element={<RequireRole capability="approve" />}> ... </Route>
 */
export function RequireRole({ capability }) {
  const { tenant } = useAuth();
  if (!tenant) {
    return (
      <Forbidden
        title="アクセスできません"
        message="このアカウントには所属会社が設定されていません。管理者に会社の割り当てを依頼してください。"
      />
    );
  }
  if (!can(tenant, capability)) {
    return (
      <Forbidden
        title="権限がありません"
        message="この画面を表示する権限がありません。必要な場合は会社管理者にお問い合わせください。"
      />
    );
  }
  return <Outlet />;
}
