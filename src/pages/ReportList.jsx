import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Clock, CheckCircle, XCircle, AlertCircle, ChevronRight, FilePlus } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  '下書き': { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock },
  '申請中': { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: AlertCircle },
  '承認済': { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  '差戻し': { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
};

const TYPE_COLORS = {
  '日帰り出張': 'bg-indigo-50 text-indigo-700',
  '宿泊出張': 'bg-purple-50 text-purple-700',
  '海外出張': 'bg-orange-50 text-orange-700',
  '外出作業': 'bg-teal-50 text-teal-700',
};

export default function ReportList() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      let data;
      if (isAdmin) {
        data = await base44.entities.Report.list('-created_date', 100);
      } else {
        data = await base44.entities.Report.filter({ created_by_id: user?.id }, '-created_date', 100);
      }
      setReports(data || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const filtered = reports.filter(r => {
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchType = typeFilter === 'all' || r.report_type === typeFilter;
    const matchSearch = !search || 
      (r.destination_name || '').includes(search) ||
      (r.country_name || '').includes(search) ||
      (r.business_content || '').includes(search) ||
      (r.report_number || '').includes(search) ||
      (r.created_by_name || '').includes(search);
    return matchStatus && matchType && matchSearch;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">レポート一覧</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length}件のレポート</p>
        </div>
        <Link to="/reports/new">
          <Button className="bg-[#1a237e] hover:bg-[#1a237e]/90 text-white gap-2">
            <FilePlus className="w-4 h-4" />新規作成
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="目的地、業務内容、レポートIDで検索" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべてのステータス</SelectItem>
            <SelectItem value="下書き">下書き</SelectItem>
            <SelectItem value="申請中">申請中</SelectItem>
            <SelectItem value="承認済">承認済</SelectItem>
            <SelectItem value="差戻し">差戻し</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="種別" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべての種別</SelectItem>
            <SelectItem value="日帰り出張">日帰り出張</SelectItem>
            <SelectItem value="宿泊出張">宿泊出張</SelectItem>
            <SelectItem value="海外出張">海外出張</SelectItem>
            <SelectItem value="外出作業">外出作業</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">読み込み中...</div>
      ) : filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">レポートが見つかりません</p>
            <Link to="/reports/new">
              <Button className="mt-4 bg-[#1a237e] hover:bg-[#1a237e]/90 text-white">新規レポートを作成</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map(report => {
              const StatusIcon = STATUS_CONFIG[report.status]?.icon || Clock;
              return (
                <Link key={report.id} to={`/reports/${report.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[report.report_type]}`}>
                        {report.report_type}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">{report.report_number || `#${report.id?.slice(-6)}`}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">
                      {report.destination_name || `${report.country_name} ${report.city_name}` || '目的地未設定'}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      {isAdmin && <span className="text-xs text-muted-foreground">{report.created_by_name}</span>}
                      <span className="text-xs text-muted-foreground">
                        {report.travel_date || report.start_date || format(new Date(report.created_date), 'yyyy/MM/dd')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {report.total_amount != null && (
                      <span className="text-sm font-semibold">¥{report.total_amount.toLocaleString()}</span>
                    )}
                    <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${STATUS_CONFIG[report.status]?.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {report.status}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}