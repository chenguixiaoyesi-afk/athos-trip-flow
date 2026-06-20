import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { notifySubmitted } from '@/lib/notifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Send, Trash2, Loader2, Clock, CheckCircle, XCircle, AlertCircle, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';

const STATUS_CONFIG = {
  '下書き': { color: 'bg-gray-100 text-gray-700', icon: Clock },
  '申請中': { color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
  '承認済': { color: 'bg-green-100 text-green-700', icon: CheckCircle },
  '差戻し': { color: 'bg-red-100 text-red-700', icon: XCircle },
};

// 支給項目の内訳を報告書種別ごとに生成
function buildBreakdown(report) {
  const items = [];
  const add = (label, amount) => {
    if (amount && amount > 0) items.push({ label, amount });
  };

  if (report.report_type === '日帰り出張' || report.report_type === '宿泊出張') {
    add('日当', report.daily_allowance);
    add('宿泊費', report.accommodation_fee);
    add(`マイカー手当（${report.driving_distance_km || 0}km）`, report.car_allowance);
    add('高速道路料金', report.highway_fee);
    add('駐車場料金', report.parking_fee);
    add('タクシー料金', report.taxi_fee);
    add('その他交通費', report.other_transport_fee);
  } else if (report.report_type === '海外出張') {
    add('日当（海外）', report.daily_allowance);
    add('宿泊費（海外）', report.accommodation_fee);
    add('航空券代', report.flight_fee);
    add('空港までの交通費', report.airport_transport_fee);
  } else if (report.report_type === '外出作業') {
    add(`マイカー手当（${report.driving_distance_km || 0}km）`, report.car_allowance);
    add('コワーキング/貸会議室', report.coworking_fee);
    add('Wi-Fi/通信費', report.wifi_fee);
    add('駐車場料金', report.parking_fee);
    add('飲食代', report.meal_fee);
    add('その他業務関連費', report.other_work_fee);
  }
  return items;
}

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    base44.entities.Report.filter({ id }).then(results => {
      setReport(results?.[0] || null);
      setLoading(false);
    });
  }, [id]);

  const isOwner = report?.created_by_id === user?.id;
  const canEdit = isOwner && (report?.status === '下書き' || report?.status === '差戻し');

  const handleSubmit = async () => {
    setSubmitting(true);
    await base44.entities.Report.update(id, { status: '申請中' });
    setReport(prev => ({ ...prev, status: '申請中' }));
    // 申請通知（throw しない、ヘルパー内で吸収）
    if (report) {
      await notifySubmitted({ report: { ...report, status: '申請中', id } });
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!confirm('このレポートを削除しますか？')) return;
    await base44.entities.Report.delete(id);
    navigate('/reports');
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">読み込み中...</div>;
  if (!report) return <div className="p-8 text-center text-muted-foreground">レポートが見つかりません</div>;

  const StatusIcon = STATUS_CONFIG[report.status]?.icon || Clock;
  const breakdown = buildBreakdown(report);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/reports" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{report.report_type}</h1>
            <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_CONFIG[report.status]?.color}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {report.status}
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5 font-mono">{report.report_number}</p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <Button
                variant="outline"
                onClick={() => navigate(`/reports/${id}/edit`)}
                className="gap-2"
              >
                <Pencil className="w-4 h-4" />
                編集する
              </Button>
              {(report.status === '下書き' || report.status === '差戻し') && (
                <Button onClick={handleSubmit} disabled={submitting}
                  className="bg-[#1a237e] hover:bg-[#1a237e]/90 text-white gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {report.status === '差戻し' ? '再申請する' : '申請する'}
                </Button>
              )}
              <Button variant="outline" onClick={handleDelete} className="border-destructive text-destructive hover:bg-destructive/5">
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 差戻し理由 */}
      {report.status === '差戻し' && report.rejection_reason && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700 font-semibold text-sm">差戻し理由</p>
              <p className="text-red-600 text-sm mt-1">{report.rejection_reason}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meta info */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">作成者</p>
              <p className="font-medium">{report.created_by_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">作成日</p>
              <p className="font-medium">{format(new Date(report.created_date), 'yyyy/MM/dd')}</p>
            </div>
            {report.travel_date && (
              <div>
                <p className="text-muted-foreground text-xs mb-1">
                  {report.report_type === '外出作業' ? '作業日' : '出張日'}
                </p>
                <p className="font-medium">{report.travel_date}</p>
              </div>
            )}
            {report.start_date && (
              <div>
                <p className="text-muted-foreground text-xs mb-1">期間</p>
                <p className="font-medium">{report.start_date} ～ {report.end_date}</p>
              </div>
            )}
            {report.destination_name && (
              <div>
                <p className="text-muted-foreground text-xs mb-1">
                  {report.report_type === '外出作業' ? '作業場所' : '目的地'}
                </p>
                <p className="font-medium">{report.destination_name}</p>
              </div>
            )}
            {report.approved_date && (
              <div>
                <p className="text-muted-foreground text-xs mb-1">承認日</p>
                <p className="font-medium">{report.approved_date}</p>
              </div>
            )}
            {report.approver_name && (
              <div>
                <p className="text-muted-foreground text-xs mb-1">承認者</p>
                <p className="font-medium">{report.approver_name}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 支給額内訳 — 誰がなんの項目で支給されるか一目でわかる */}
      <Card className="border-0 shadow-sm mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">支給額内訳</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-5 py-2.5 text-muted-foreground font-medium">項目</th>
                <th className="text-left px-5 py-2.5 text-muted-foreground font-medium">支給対象者</th>
                <th className="text-right px-5 py-2.5 text-muted-foreground font-medium">金額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {breakdown.length > 0 ? breakdown.map((item, i) => (
                <tr key={i}>
                  <td className="px-5 py-2.5">{item.label}</td>
                  <td className="px-5 py-2.5 text-muted-foreground">{report.created_by_name}</td>
                  <td className="px-5 py-2.5 text-right font-medium">¥{item.amount.toLocaleString()}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={3} className="px-5 py-3 text-center text-muted-foreground text-xs">内訳データなし</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-[#1a237e]/5 border-t-2 border-[#1a237e]/20">
                <td className="px-5 py-3 font-bold text-[#1a237e]">合計支給額</td>
                <td className="px-5 py-3 text-muted-foreground text-xs">{report.created_by_name}</td>
                <td className="px-5 py-3 text-right text-xl font-bold text-[#1a237e]">
                  ¥{(report.total_amount || 0).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {/* Report content */}
      {report.generated_report_text && (
        <Card className="border-0 shadow-sm mb-6">
          <CardHeader className="pb-3"><CardTitle className="text-base">レポート内容</CardTitle></CardHeader>
          <CardContent className="p-6">
            <div className="prose prose-sm max-w-none prose-headings:text-[#1a237e]">
              <ReactMarkdown>{report.generated_report_text}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Receipts */}
      {report.receipt_urls && report.receipt_urls.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">領収書（{report.receipt_urls.length}枚）</CardTitle></CardHeader>
          <CardContent className="p-5">
            <div className="flex flex-wrap gap-3">
              {report.receipt_urls.map((url, idx) => (
                <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                  className="w-24 h-24 border rounded-lg overflow-hidden hover:opacity-80 transition-opacity">
                  <img src={url} alt={`領収書${idx + 1}`} className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}