import { Outlet, Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { can } from '@/lib/tenantScope';
import { useState } from 'react';
import {
  LayoutDashboard, FilePlus, FileText, CheckSquare, BarChart3,
  BookOpen, LogOut, Menu, X, ChevronRight, Building2, Building, Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';

// A13: ナビは app_role の capability で出し分け（tenantScope.can）。
//   capability:null = テナントを持つ全員に表示（個々のルートは RequireCompany が最終ガード）。
//   ルート自体は App.jsx の RequireRole が二重で守る（ナビ非表示は UX 上の出し分けに過ぎない）。
const navItems = [
  { path: '/', label: 'ダッシュボード', icon: LayoutDashboard, capability: null },
  { path: '/reports/new', label: '新規レポート作成', icon: FilePlus, capability: null },
  { path: '/reports', label: 'レポート一覧', icon: FileText, capability: null },
  { path: '/approval', label: '承認管理', icon: CheckSquare, capability: 'approve' },
  { path: '/summary', label: '月次集計', icon: BarChart3, capability: null },
  { path: '/payments', label: '支給管理', icon: Wallet, capability: 'payment' },
  { path: '/policy', label: '旅費規程管理', icon: BookOpen, capability: 'policyManage' },
  { path: '/companies', label: '会社管理', icon: Building, capability: 'companyManage' },
];

// A13: app_role 表示ラベル（テナント不在は「未所属」）。
const ROLE_LABELS = {
  systemOwner: 'システムオーナー',
  companyAdmin: '会社管理者',
  manager: 'マネージャー',
  member: '一般ユーザー',
};

export default function Layout() {
  const location = useLocation();
  const {
    user, tenant, companies, selectedCompanyId, setSelectedCompany, currentCompany,
  } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // A13: capability ベースのナビ出し分け（テナント不在は capability:null のみ表示）。
  const filteredNav = navItems.filter(item => !item.capability || can(tenant, item.capability));
  const canSwitchCompany = can(tenant, 'companySwitch');
  const roleLabel = tenant ? (ROLE_LABELS[tenant.appRole] || '一般ユーザー') : '未所属';
  // systemOwner が「全社表示」中は会社名ではなく横断中であることを示す。
  const brandName = tenant?.isSystemOwner && !selectedCompanyId
    ? '全社表示'
    : (currentCompany?.name || '株式会社Athos');

  const handleLogout = () => {
    base44.auth.logout('/login');
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col transition-transform duration-300",
        "bg-[#1a237e]",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm truncate">{brandName}</p>
            <p className="text-white/60 text-xs">旅費精算システム</p>
          </div>
          <button className="ml-auto lg:hidden text-white/60 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* A13: systemOwner のみ会社セレクタ。空値=全社横断（buildScopedFilter は company_id 非注入）。 */}
        {canSwitchCompany && (
          <div className="px-4 py-3 border-b border-white/10">
            <label htmlFor="company-switcher" className="text-white/50 text-xs mb-1 block">表示会社</label>
            <select
              id="company-switcher"
              value={selectedCompanyId || ''}
              onChange={(e) => setSelectedCompany(e.target.value || null)}
              className="w-full bg-white/10 text-white text-sm rounded-md px-2 py-1.5 border border-white/20 focus:outline-none focus:ring-1 focus:ring-white/40"
            >
              <option value="" className="text-black">全社（横断）</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id} className="text-black">{c.name}</option>
              ))}
            </select>
          </div>
        )}

        <nav className="flex-1 py-4 overflow-y-auto">
          {filteredNav.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-5 py-3 mx-2 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-white/20 text-white"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">
              {user?.full_name?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.full_name || 'ユーザー'}</p>
              <p className="text-white/50 text-xs">{roleLabel}</p>
            </div>
            <button onClick={handleLogout} className="text-white/50 hover:text-white transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-border shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-sm text-primary">Athos 旅費精算</span>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}