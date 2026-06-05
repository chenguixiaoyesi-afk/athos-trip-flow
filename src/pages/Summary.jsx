import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, TrendingUp, TrendingDown, Minus, Settings } from 'lucide-react';
import { format, getYear, getMonth } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const PIE_COLORS = ['#1a237e', '#4caf50', '#ff9800', '#e53935'];

export default function Summary() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [annualBudget, setAnnualBudget] = useState(() => {
    const saved = localStorage.getItem('annualBudget');
    return saved ? Number(saved) : 0;
  });
  const [showBudgetInput, setShowBudgetInput] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let data;
      if (isAdmin) {
        data = await base44.entities.Report.filter({ status: '承認済' }, '-created_date', 500);
      } else {
        data = await base44.entities.Report.filter({ created_by_id: user?.id, status: '承認済' }, '-created_date', 200);
      }
      setReports(data || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const yearReports = reports.filter(r => getYear(new Date(r.created_date)) === year);
  const prevYearReports = reports.filter(r => getYear(new Date(r.created_date)) === year - 1);

  const currentMonth = getMonth(new Date());
  const currentMonthReports = yearReports.filter(r => getMonth(new Date(r.created_date)) === currentMonth);
  const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYearForPrevMonth = currentMonth === 0 ? year - 1 : year;
  const prevMonthReports = reports.filter(r =>
    getYear(new Date(r.created_date)) === prevYearForPrevMonth &&
    getMonth(new Date(r.created_date)) === prevMonthIdx
  );
  const currentMonthTotal = currentMonthReports.reduce((s, r) => s + (r.total_amount || 0), 0);
  const prevMonthTotal = prevMonthReports.reduce((s, r) => s + (r.total_amount || 0), 0);
  const monthDiff = currentMonthTotal - prevMonthTotal;

  const yearTotal = yearReports.reduce((s, r) => s + (r.total_amount || 0), 0);
  const prevYearTotal = prevYearReports.reduce((s, r) => s + (r.total_amount || 0), 0);
  const yearDiff = yearTotal - prevYearTotal;

  // Pie chart data by report type
  const typeTotals = {};
  yearReports.forEach(r => {
    typeTotals[r.report_type] = (typeTotals[r.report_type] || 0) + (r.total_amount || 0);
  });
  const pieData = Object.entries(typeTotals).map(([name, value]) => ({ name, value }));

  // Monthly chart
  const monthlyData = MONTHS.map((month, idx) => {
    const monthRpts = yearReports.filter(r => getMonth(new Date(r.created_date)) === idx);
    return {
      month,
      出張: monthRpts.filter(r => r.report_type !== '外出作業').reduce((s, r) => s + (r.total_amount || 0), 0),
      外出作業: monthRpts.filter(r => r.report_type === '外出作業').reduce((s, r) => s + (r.total_amount || 0), 0),
    };
  });

  // User summary (admin only) — monthly breakdown
  const userMonthlyMap = {};
  yearReports.forEach(r => {
    const key = r.created_by_name || '不明';
    if (!userMonthlyMap[key]) userMonthlyMap[key] = { count: 0, total: 0, monthly: Array(12).fill(0) };
    userMonthlyMap[key].count++;
    userMonthlyMap[key].total += (r.total_amount || 0);
    userMonthlyMap[key].monthly[getMonth(new Date(r.created_date))] += (r.total_amount || 0);
  });
  const userSummary = Object.entries(userMonthlyMap).sort(([, a], [, b]) => b.total - a.total);

  const budgetRate = annualBudget > 0 ? Math.min((yearTotal / annualBudget) * 100, 999) : null;

  const saveBudget = () => {
    const val = Number(budgetInput);
    if (val > 0) {
      setAnnualBudget(val);
      localStorage.setItem('annualBudget', String(val));
    }
    setShowBudgetInput(false);
  };

  const exportCSV = () => {
    const headers = ['レポートID', '種別', '作成者', '年月', '日付', '目的地', 'ステータス', '合計金額'];
    const rows = yearReports.map(r => [
      r.report_number || r.id?.slice(-6),
      r.report_type,
      r.created_by_name,
      format(new Date(r.created_date), 'yyyy/MM'),
      r.travel_date || r.start_date || format(new Date(r.created_date), 'yyyy-MM-dd'),
      r.destination_name || `${r.country_name || ''} ${r.city_name || ''}`.trim() || '',
      r.status,
      r.total_amount || 0,
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `旅費精算_${year}年_経理用.csv`;
    link.click();
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const DiffBadge = ({ diff }) => {
    if (diff === 0) return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Minus className="w-3 h-3" />前月同額</span>;
    const up = diff > 0;
    return (
      <span className={`flex items-center gap-1 text-xs font-medium ${up ? 'text-red-500' : 'text-green-600'}`}>
        {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {up ? '+' : ''}¥{diff.toLocaleString()}
      </span>
    );
  };

  if (loading) return <div className="p-10 text-center text-muted-foreground">読み込み中...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">月次集計</h1>
          <p className="text-muted-foreground text-sm mt-1">承認済レポートの集計</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}年</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => { setBudgetInput(String(annualBudget)); setShowBudgetInput(!showBudgetInput); }} className="gap-2">
            <Settings className="w-4 h-4" />予算設定
          </Button>
          <Button variant="outline" onClick={exportCSV} className="gap-2">
            <Download className="w-4 h-4" />CSV出力
          </Button>
        </div>
      </div>

      {/* Budget input */}
      {showBudgetInput && (
        <Card className="border-0 shadow-sm mb-6 border-l-4 border-l-[#1a237e]">
          <CardContent className="p-4 flex items-center gap-4">
            <Label className="text-sm whitespace-nowrap">年間予算（円）</Label>
            <Input type="number" value={budgetInput} onChange={e => setBudgetInput(e.target.value)}
              placeholder="例: 5000000" className="max-w-xs" />
            <Button onClick={saveBudget} className="bg-[#1a237e] hover:bg-[#1a237e]/90 text-white">保存</Button>
            <Button variant="ghost" onClick={() => setShowBudgetInput(false)}>キャンセル</Button>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-[#1a237e] to-[#283593] text-white">
          <CardContent className="p-5">
            <p className="text-white/80 text-sm mb-2">年間合計支給額</p>
            <p className="text-2xl font-bold">¥{yearTotal.toLocaleString()}</p>
            <div className="mt-1 text-white/60 text-xs">
              {prevYearTotal > 0 && (
                <span>{yearDiff >= 0 ? '+' : ''}¥{yearDiff.toLocaleString()}（前年比）</span>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-muted-foreground text-sm mb-2">今月の支給額</p>
            <p className="text-2xl font-bold">¥{currentMonthTotal.toLocaleString()}</p>
            <div className="mt-1"><DiffBadge diff={monthDiff} /></div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-muted-foreground text-sm mb-2">年間レポート総数</p>
            <p className="text-2xl font-bold">{yearReports.length}<span className="text-base font-normal text-muted-foreground ml-1">件</span></p>
            <p className="text-muted-foreground text-xs mt-1">承認済のみ</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-muted-foreground text-sm mb-2">予算消化率</p>
            {budgetRate !== null ? (
              <>
                <p className="text-2xl font-bold">{budgetRate.toFixed(1)}<span className="text-base font-normal text-muted-foreground ml-1">%</span></p>
                <div className="mt-2 bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${budgetRate > 90 ? 'bg-red-500' : budgetRate > 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(budgetRate, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">予算: ¥{annualBudget.toLocaleString()}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">予算未設定<br /><button onClick={() => setShowBudgetInput(true)} className="text-[#1a237e] underline text-xs mt-1">設定する</button></p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">月別支給額推移（{year}年）</CardTitle></CardHeader>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v === 0 ? '0' : `¥${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => `¥${v.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="出張" fill="#1a237e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="外出作業" fill="#4caf50" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">種別内訳（{year}年）</CardTitle></CardHeader>
          <CardContent className="p-4">
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                      {pieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => `¥${v.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {pieData.map((item, idx) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">¥{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">データなし</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly table */}
      <Card className="border-0 shadow-sm mb-8">
        <CardHeader className="pb-3"><CardTitle className="text-base">月別集計表</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">月</th>
                <th className="text-right px-5 py-3 text-muted-foreground font-medium">出張件数</th>
                <th className="text-right px-5 py-3 text-muted-foreground font-medium">外出作業</th>
                <th className="text-right px-5 py-3 text-muted-foreground font-medium">合計金額</th>
                <th className="text-right px-5 py-3 text-muted-foreground font-medium">前月比</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {MONTHS.map((month, idx) => {
                const monthRpts = yearReports.filter(r => getMonth(new Date(r.created_date)) === idx);
                const trips = monthRpts.filter(r => r.report_type !== '外出作業');
                const works = monthRpts.filter(r => r.report_type === '外出作業');
                const total = monthRpts.reduce((s, r) => s + (r.total_amount || 0), 0);
                const prevMonthRptIdx = idx === 0 ? 11 : idx - 1;
                const prevYearForIdx = idx === 0 ? year - 1 : year;
                const prevRpts = reports.filter(r =>
                  getYear(new Date(r.created_date)) === prevYearForIdx &&
                  getMonth(new Date(r.created_date)) === prevMonthRptIdx
                );
                const prevTotal = prevRpts.reduce((s, r) => s + (r.total_amount || 0), 0);
                const diff = total - prevTotal;
                const isCurrentMonth = idx === currentMonth && year === new Date().getFullYear();
                return (
                  <tr key={month} className={isCurrentMonth ? 'bg-[#1a237e]/5' : ''}>
                    <td className={`px-5 py-3 ${isCurrentMonth ? 'font-semibold text-[#1a237e]' : ''}`}>{month}</td>
                    <td className="px-5 py-3 text-right">{trips.length}件</td>
                    <td className="px-5 py-3 text-right">{works.length}件</td>
                    <td className="px-5 py-3 text-right font-semibold">{total > 0 ? `¥${total.toLocaleString()}` : '-'}</td>
                    <td className="px-5 py-3 text-right">
                      {total > 0 || prevTotal > 0 ? (
                        <span className={`text-xs font-medium ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {diff > 0 ? '+' : ''}{diff !== 0 ? `¥${diff.toLocaleString()}` : '±0'}
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-muted/30 font-bold">
                <td className="px-5 py-3">合計</td>
                <td className="px-5 py-3 text-right">{yearReports.filter(r => r.report_type !== '外出作業').length}件</td>
                <td className="px-5 py-3 text-right">{yearReports.filter(r => r.report_type === '外出作業').length}件</td>
                <td className="px-5 py-3 text-right text-[#1a237e]">¥{yearTotal.toLocaleString()}</td>
                <td className="px-5 py-3 text-right text-xs text-muted-foreground">
                  {prevYearTotal > 0 ? `前年: ¥${prevYearTotal.toLocaleString()}` : ''}
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* User monthly summary (admin only) */}
      {isAdmin && userSummary.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">ユーザー別月間支給額（{year}年）</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs min-w-[800px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium whitespace-nowrap">氏名</th>
                  {MONTHS.map(m => <th key={m} className="text-right px-2 py-3 text-muted-foreground font-medium whitespace-nowrap">{m}</th>)}
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium whitespace-nowrap">年計</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium whitespace-nowrap">件数</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {userSummary.map(([name, data]) => (
                  <tr key={name} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium whitespace-nowrap">{name}</td>
                    {data.monthly.map((amt, idx) => (
                      <td key={idx} className={`px-2 py-2.5 text-right whitespace-nowrap ${idx === currentMonth && year === new Date().getFullYear() ? 'text-[#1a237e] font-semibold' : ''}`}>
                        {amt > 0 ? `¥${amt.toLocaleString()}` : '-'}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-right font-bold whitespace-nowrap">¥{data.total.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground whitespace-nowrap">{data.count}件</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}