import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { buildScopedFilter, can } from '@/lib/tenantScope';
import { buildCompanyBreakdown } from '@/lib/aggregation';
import { FilePlus, TrendingUp, Calendar, Briefcase, Clock, CheckCircle, XCircle, AlertCircle, ChevronRight, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ja } from 'date-fns/locale';

const STATUS_CONFIG = {
  '下書き': { color: 'bg-gray-100 text-gray-700', icon: Clock },
  '申請中': { color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
  '承認済': { color: 'bg-green-100 text-green-700', icon: CheckCircle },
  '差戻し': { color: 'bg-red-100 text-red-700', icon: XCircle },
};

const TYPE_COLORS = {
  '日帰り出張': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  '宿泊出張': 'bg-purple-50 text-purple-700 border-purple-200',
  '海外出張': 'bg-orange-50 text-orange-700 border-orange-200',
  '外出作業': 'bg-teal-50 text-teal-700 border-teal-200',
};

export default function Dashboard() {
  const { user, tenant, companies, selectedCompanyId, effectiveCompanyId } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // A13: 会社全体を見られるか（reportViewAll）。member は自分のレポートのみ。
  const isAdmin = can(tenant, 'reportViewAll');
  // A12.5: 会社横断できる systemOwner か（会社別集計を全社で出すか自社のみか）。
  const canSwitchCompany = can(tenant, 'companySwitch');

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant]);

  const loadReports = async () => {
    // 無所属（fail-closed）は何も取得しない。本来はルートガードで遮断済み。
    if (!tenant) { setReports([]); setLoading(false); return; }
    try {
      // reportViewAll 保有者は自社全件（systemOwner は全社/選択会社）、member は自分の作成分のみ。
      const scoped = isAdmin
        ? buildScopedFilter(tenant, {})
        : buildScopedFilter(tenant, { created_by_id: user?.id });
      // A12.5: 会社別集計と今月カードの精度のため取得上限を引き上げ（支給管理と同じ 500）。
      const data = await base44.entities.Report.filter(scoped, '-created_date', 500);
      setReports(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const monthReports = reports.filter(r => {
    const d = new Date(r.created_date);
    return d >= monthStart && d <= monthEnd;
  });

  const approvedThisMonth = monthReports.filter(r => r.status === '承認済');
  const totalAmount = approvedThisMonth.reduce((s, r) => s + (r.total_amount || 0), 0);
  const tripCount = approvedThisMonth.filter(r => r.report_type !== '外出作業').length;
  const workCount = approvedThisMonth.filter(r => r.report_type === '外出作業').length;

  const pendingReports = reports.filter(r => r.status === '申請中');
  const recentReports = reports.slice(0, 10);

  // A12.5: 会社別集計（systemOwner=全社 or 選択会社 / companyAdmin・manager=自社 1 行 / member=非表示）。
  // 対象会社を role で絞ってから集計する（全社マスタをそのまま渡すと自社以外が 0 行で並ぶため）。
  const breakdownCompanies = !isAdmin
    ? []
    : canSwitchCompany
      ? (selectedCompanyId
          ? (companies || []).filter(c => c.id === selectedCompanyId)
          : (companies || []))
      : (companies || []).filter(c => c.id === effectiveCompanyId);
  const companyBreakdown = buildCompanyBreakdown(reports, breakdownCompanies);
  // 複数社表示時の合計行（全社横断の systemOwner 向け）。
  const breakdownTotals = companyBreakdown.reduce((acc, c) => ({
    appliedCount: acc.appliedCount + c.appliedCount,
    approvedCount: acc.approvedCount + c.approvedCount,
    totalPayment: acc.totalPayment + c.totalPayment,
    totalAllowance: acc.totalAllowance + c.totalAllowance,
    totalExpense: acc.totalExpense + c.totalExpense,
  }), { appliedCount: 0, approvedCount: 0, totalPayment: 0, totalAllowance: 0, totalExpense: 0 });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ダッシュボード</h1>
          <p className="text-muted-foreground text-sm mt-1">{format(now, 'yyyy年MM月dd日（EEEE）', { locale: ja })}</p>
        </div>
        <Link to="/reports/new">
          <Button className="bg-[#1a237e] hover:bg-[#1a237e]/90 text-white gap-2">
            <FilePlus className="w-4 h-4" />
            新規レポート作成
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-[#1a237e] to-[#283593] text-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/80 text-sm font-medium">今月の合計支給額</p>
              <TrendingUp className="w-5 h-5 text-white/60" />
            </div>
            <p className="text-3xl font-bold">¥{totalAmount.toLocaleString()}</p>
            <p className="text-white/60 text-xs mt-1">承認済レポートの合計</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-muted-foreground text-sm font-medium">今月の出張回数</p>
              <Briefcase className="w-5 h-5 text-[#1a237e]" />
            </div>
            <p className="text-3xl font-bold text-foreground">{tripCount}<span className="text-lg font-normal text-muted-foreground ml-1">回</span></p>
            <p className="text-muted-foreground text-xs mt-1">承認済出張レポート</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-muted-foreground text-sm font-medium">今月の外出作業回数</p>
              <Calendar className="w-5 h-5 text-teal-600" />
            </div>
            <p className="text-3xl font-bold text-foreground">{workCount}<span className="text-lg font-normal text-muted-foreground ml-1">回</span></p>
            <p className="text-muted-foreground text-xs mt-1">承認済外出作業レポート</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-muted-foreground text-sm font-medium">承認待ち</p>
              <AlertCircle className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-3xl font-bold text-foreground">{pendingReports.length}<span className="text-lg font-normal text-muted-foreground ml-1">件</span></p>
            <p className="text-muted-foreground text-xs mt-1">申請中のレポート</p>
          </CardContent>
        </Card>
      </div>

      {/* A12.5: 会社別集計（reportViewAll 以上のみ。member は非表示。systemOwner=全社/選択会社、companyAdmin・manager=自社） */}
      {isAdmin && companyBreakdown.length > 0 && (
        <Card className="border-0 shadow-sm mb-8">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#1a237e]" />
              <CardTitle className="text-base font-semibold">会社別集計</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium whitespace-nowrap">会社</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium whitespace-nowrap">申請件数</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium whitespace-nowrap">承認件数</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium whitespace-nowrap">支給額</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium whitespace-nowrap">手当額</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium whitespace-nowrap">実費額</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {companyBreakdown.map(c => (
                  <tr key={c.company_id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{c.company_name || '—'}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">{c.appliedCount}件</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">{c.approvedCount}件</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">¥{c.totalPayment.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">¥{c.totalAllowance.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">¥{c.totalExpense.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              {companyBreakdown.length > 1 && (
                <tfoot className="border-t bg-muted/30">
                  <tr className="font-semibold">
                    <td className="px-4 py-3 whitespace-nowrap">合計</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">{breakdownTotals.appliedCount}件</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">{breakdownTotals.approvedCount}件</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">¥{breakdownTotals.totalPayment.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">¥{breakdownTotals.totalAllowance.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">¥{breakdownTotals.totalExpense.toLocaleString()}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </CardContent>
        </Card>
      )}

      {/* 差戻し通知 */}
      {reports.filter(r => r.status === '差戻し').length > 0 && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-700 font-medium text-sm">差戻しのレポートがあります</p>
              <p className="text-red-600 text-xs mt-0.5">内容を確認して修正・再申請してください</p>
            </div>
            <Link to="/reports">
              <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100">確認する</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Recent Reports */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">今月のレポート一覧</CardTitle>
            <Link to="/reports" className="text-sm text-[#1a237e] hover:underline flex items-center gap-1">
              すべて見る <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">読み込み中...</div>
          ) : recentReports.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground text-sm">まだレポートがありません</p>
              <Link to="/reports/new">
                <Button className="mt-4 bg-[#1a237e] hover:bg-[#1a237e]/90 text-white">
                  最初のレポートを作成
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentReports.map(report => {
                const StatusIcon = STATUS_CONFIG[report.status]?.icon || Clock;
                return (
                  <Link key={report.id} to={`/reports/${report.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_COLORS[report.report_type]}`}>
                          {report.report_type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {report.report_number || `#${report.id?.slice(-6)}`}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">
                        {report.destination_name || report.country_name || '目的地未設定'}
                      </p>
                      {isAdmin && <p className="text-xs text-muted-foreground mt-0.5">{report.created_by_name}</p>}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {report.total_amount && (
                        <p className="text-sm font-semibold text-foreground">¥{report.total_amount.toLocaleString()}</p>
                      )}
                      <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${STATUS_CONFIG[report.status]?.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {report.status}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}