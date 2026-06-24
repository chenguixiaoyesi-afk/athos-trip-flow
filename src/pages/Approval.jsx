import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { buildScopedFilter, assertSameTenant } from '@/lib/tenantScope';
import { notifyApproved, notifyRejected } from '@/lib/notifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Loader2, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';

const TYPE_COLORS = {
  '日帰り出張': 'bg-indigo-50 text-indigo-700',
  '宿泊出張': 'bg-purple-50 text-purple-700',
  '海外出張': 'bg-orange-50 text-orange-700',
  '外出作業': 'bg-teal-50 text-teal-700',
};

export default function Approval() {
  const { user, tenant } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

  // tenant 変化（systemOwner の会社切替含む）で再取得。
  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant]);

  const loadReports = async () => {
    // 無所属（fail-closed）は何も取得しない。本来はルートガードで遮断済み。
    if (!tenant) { setReports([]); setLoading(false); return; }
    // 自社の申請中のみ（systemOwner は会社未選択なら全社）。最終強制はサーバ RLS。
    const data = await base44.entities.Report.filter(
      buildScopedFilter(tenant, { status: '申請中' }), '-created_date', 100
    );
    setReports(data || []);
    setLoading(false);
  };

  const handleApprove = async (reportId) => {
    setProcessing(true);
    // 通知のため、対象 report を事前確保（loadReports 後に reports state がリフレッシュされるため）
    const target = reports.find(r => r.id === reportId);
    // 越境防止（UX 早期遮断。最終強制は RLS）。
    if (target && !assertSameTenant(tenant, target)) { setProcessing(false); return; }
    await base44.entities.Report.update(reportId, {
      status: '承認済',
      approver_name: user?.full_name,
      approved_date: new Date().toISOString().split('T')[0],
      payment_status: 'ready', // A12: 承認 → 支給待ち遷移（支給管理で参照）
    });
    // 承認通知（throw しない、ヘルパー内で吸収）
    if (target) {
      await notifyApproved({ report: target, approverName: user?.full_name });
    }
    await loadReports();
    setSelected(null);
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    setProcessing(true);
    // 通知のため、selected を事前に確保（loadReports / setSelected(null) の前）
    const target = selected;
    const reason = rejectionReason;
    // 越境防止（UX 早期遮断。最終強制は RLS）。
    if (target && !assertSameTenant(tenant, target)) { setProcessing(false); return; }
    await base44.entities.Report.update(selected.id, {
      status: '差戻し',
      rejection_reason: rejectionReason,
    });
    // 差戻し通知（throw しない、ヘルパー内で吸収）
    if (target) {
      await notifyRejected({
        report: target,
        approverName: user?.full_name,
        rejectionReason: reason,
      });
    }
    await loadReports();
    setSelected(null);
    setShowRejectDialog(false);
    setRejectionReason('');
    setProcessing(false);
  };

  const handleBulkApprove = async () => {
    if (!confirm(`選択した${selectedIds.length}件を一括承認しますか？`)) return;
    setProcessing(true);
    // 通知のため、対象 reports を事前確保（越境行は除外＝自社のみ一括承認）
    const targets = reports.filter(r => selectedIds.includes(r.id) && assertSameTenant(tenant, r));
    for (const target of targets) {
      const id = target.id;
      await base44.entities.Report.update(id, {
        status: '承認済',
        approver_name: user?.full_name,
        approved_date: new Date().toISOString().split('T')[0],
        payment_status: 'ready', // A12: 承認 → 支給待ち遷移（支給管理で参照）
      });
    }
    // 一括承認通知（並列発火、ヘルパー内で各々失敗吸収）
    await Promise.all(
      targets.map(target =>
        notifyApproved({ report: target, approverName: user?.full_name })
      )
    );
    setSelectedIds([]);
    await loadReports();
    setProcessing(false);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">読み込み中...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">承認管理</h1>
          <p className="text-muted-foreground text-sm mt-1">申請中: {reports.length}件</p>
        </div>
        {selectedIds.length > 0 && (
          <Button onClick={handleBulkApprove} disabled={processing}
            className="bg-green-600 hover:bg-green-700 text-white gap-2">
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
            {selectedIds.length}件を一括承認
          </Button>
        )}
      </div>

      {reports.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-muted-foreground">申請中のレポートはありません</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* List */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">申請一覧</CardTitle>
            </CardHeader>
            <div className="divide-y">
              {reports.map(report => (
                <div
                  key={report.id}
                  className={`flex items-center gap-3 px-4 py-4 cursor-pointer hover:bg-muted/30 transition-colors ${selected?.id === report.id ? 'bg-[#1a237e]/5 border-l-2 border-[#1a237e]' : ''}`}
                  onClick={() => setSelected(report)}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(report.id)}
                    onChange={() => toggleSelect(report.id)}
                    onClick={e => e.stopPropagation()}
                    className="w-4 h-4 accent-[#1a237e]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[report.report_type]}`}>
                        {report.report_type}
                      </span>
                    </div>
                    <p className="text-sm font-medium truncate">
                      {report.destination_name || `${report.country_name} ${report.city_name}` || '目的地未設定'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{report.created_by_name} · {format(new Date(report.created_date), 'yyyy/MM/dd')}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-semibold">¥{(report.total_amount || 0).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Detail */}
          {selected ? (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">レポート詳細</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setShowRejectDialog(true); }}
                      className="border-destructive text-destructive hover:bg-destructive/5 gap-1">
                      <XCircle className="w-3.5 h-3.5" />差戻し
                    </Button>
                    <Button size="sm" onClick={() => handleApprove(selected.id)} disabled={processing}
                      className="bg-green-600 hover:bg-green-700 text-white gap-1">
                      {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      承認
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 overflow-y-auto max-h-[calc(100vh-280px)]">
                <div className="mb-4 p-3 bg-[#1a237e]/5 rounded-lg flex justify-between items-center">
                  <span className="text-sm font-medium">合計支給額</span>
                  <span className="text-lg font-bold text-[#1a237e]">¥{(selected.total_amount || 0).toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div><p className="text-xs text-muted-foreground">申請者</p><p className="font-medium">{selected.created_by_name}</p></div>
                  <div><p className="text-xs text-muted-foreground">申請日</p><p className="font-medium">{format(new Date(selected.created_date), 'yyyy/MM/dd')}</p></div>
                  <div><p className="text-xs text-muted-foreground">種別</p><p className="font-medium">{selected.report_type}</p></div>
                  <div><p className="text-xs text-muted-foreground">日付</p><p className="font-medium">{selected.travel_date || selected.start_date}</p></div>
                </div>
                {selected.generated_report_text && (
                  <div className="prose prose-xs max-w-none prose-headings:text-[#1a237e] border-t pt-4">
                    <ReactMarkdown>{selected.generated_report_text}</ReactMarkdown>
                  </div>
                )}
                {selected.receipt_urls?.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <p className="text-sm font-medium mb-2">領収書（{selected.receipt_urls.length}枚）</p>
                    <div className="flex flex-wrap gap-2">
                      {selected.receipt_urls.map((url, idx) => (
                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                          className="w-16 h-16 border rounded overflow-hidden hover:opacity-80">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm flex items-center justify-center">
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground text-sm">左のリストからレポートを選択してください</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>差戻し理由の入力</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="差戻しの理由を入力してください（必須）"
            value={rejectionReason}
            onChange={e => setRejectionReason(e.target.value)}
            className="min-h-[120px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRejectDialog(false); setRejectionReason(''); }}>キャンセル</Button>
            <Button onClick={handleReject} disabled={!rejectionReason.trim() || processing}
              className="bg-destructive hover:bg-destructive/90 text-white">
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : '差戻し確定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}