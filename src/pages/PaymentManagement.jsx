import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { buildScopedFilter, can } from '@/lib/tenantScope';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Wallet, Loader2, CheckSquare } from 'lucide-react';
import {
  PAYMENT_STATUS,
  PAYMENT_STATUS_LABEL,
  buildPaymentRows,
  filterPaymentRows,
  aggregatePaymentRows,
  buildPaymentsCSV,
} from '@/lib/paymentManagement';

// A12 / A12.5: 支給管理（payment 権限者専用）。
// レポートを支給ライフサイクル 4 状態（未承認 / 承認待ち / 支給待ち / 支給済）で管理する。
// 下書きはパイプライン外として除外。手当 / 実費 / 総支給は A11 deriveReportFinancials 由来（二重計算なし）。
// A12.5: systemOwner は会社別ビュー（会社フィルタ + 会社列）で 4 社横断、companyAdmin は自社固定。RLS は不使用。

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

const StatusBadge = ({ status }) => {
  const label = PAYMENT_STATUS_LABEL[status] || status;
  const cls =
    status === PAYMENT_STATUS.PAID
      ? 'bg-green-50 text-green-700'
      : status === PAYMENT_STATUS.READY
        ? 'bg-blue-50 text-blue-700'
        : status === PAYMENT_STATUS.PENDING_APPROVAL
          ? 'bg-amber-50 text-amber-700'
          : 'bg-gray-100 text-gray-600';
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>;
};

export default function PaymentManagement() {
  const { user, tenant, companies } = useAuth();
  // A13: 支給権限は capability マトリクス（systemOwner / companyAdmin）。ルートでも RequireRole で遮断済み。
  const isAdmin = can(tenant, 'payment');
  // A12.5: 会社別ビューの切替（会社横断できる systemOwner のみ）。companyAdmin は自社に固定。
  const canSwitchCompany = can(tenant, 'companySwitch');
  const now = new Date();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12、0 = 全期間
  const [nameFilter, setNameFilter] = useState('');       // '' = 全員
  const [statusFilter, setStatusFilter] = useState('');   // '' = 全状態
  const [companyFilter, setCompanyFilter] = useState(''); // '' = 全社（systemOwner の会社別ビュー用）

  useEffect(() => {
    // 支給管理は payment 権限者専用。非権限/無所属ではロードしない（A12.5 は RLS 無し＝アプリ層スコープが境界）。
    // tenant 変化（systemOwner の会社切替）でも再取得。
    if (tenant && isAdmin) {
      loadReports();
    } else {
      setReports([]);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant]);

  const loadReports = async () => {
    setLoading(true);
    // A12.5: 支給管理は 4 状態（未承認 / 承認待ち / 支給待ち / 支給済）を扱う。
    //   下書き（未提出・本人専用）はパイプライン外なので除外し、申請中/承認済/差戻しを取得する。
    //   payment_status のサーバ絞り込みはしない（A12 以前の承認済は field 未保持 → client 側 derivePaymentStatus に委ねる）。
    //   会社スコープは buildScopedFilter で注入（systemOwner は会社未選択なら全社）。RLS は使用しない。
    const data = await base44.entities.Report.filter(
      buildScopedFilter(tenant, {}), '-created_date', 500
    );
    setReports((data || []).filter(r => r.status !== '下書き'));
    setSelectedIds([]);
    setLoading(false);
  };

  // A12.5: company_id → 会社名 の参照表（テーブルの会社列・会社別フィルタ表示用）
  const companyNameById = new Map((companies || []).map(c => [c.id, c.name]));
  // 会社横断できる systemOwner のみ会社別フィルタが有効（他ロールは自社固定なので無視）
  const effectiveCompanyFilter = canSwitchCompany ? companyFilter : '';

  // 純関数モジュールで行生成 → 絞り込み → 集計
  const allRows = buildPaymentRows(reports);
  const filtered = filterPaymentRows(allRows, {
    year,
    month: month || null, // 0 = 全期間 → null
    name: nameFilter,
    status: statusFilter,
    companyId: effectiveCompanyFilter,
  });
  const agg = aggregatePaymentRows(filtered);

  // 動的な絞り込み選択肢
  const nameOptions = Array.from(new Set(allRows.map(r => r.name).filter(Boolean))).sort();
  // 会社別フィルタ選択肢：取得データに現れる company_id を会社名へ解決し名前順（systemOwner 用）
  const companyOptions = Array.from(new Set(allRows.map(r => r.company_id).filter(Boolean)))
    .map(id => ({ id, name: companyNameById.get(id) || id }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  // D1: 集計カードのラベルは選択中の年月を反映（「今月」固定文言にしない）
  const periodLabel = month ? `${year}年${month}月` : `${year}年 全期間`;

  // 二重支給防止（D3）: チェック可能なのは支給待ち（ready）の行のみ
  const readyInView = filtered.filter(r => r.payment_status === PAYMENT_STATUS.READY);
  const allReadySelected =
    readyInView.length > 0 && readyInView.every(r => selectedIds.includes(r.id));

  const toggleSelect = (id) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (allReadySelected) {
      const viewIds = new Set(readyInView.map(r => r.id));
      setSelectedIds(prev => prev.filter(id => !viewIds.has(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...readyInView.map(r => r.id)])));
    }
  };

  const handleBulkPay = async () => {
    if (selectedIds.length === 0) return;
    // D3: 確定時に対象が支給待ちのままかを再確認し、ready 以外は除外（二重支給防止の二段目）
    const targets = filtered.filter(
      r => selectedIds.includes(r.id) && r.payment_status === PAYMENT_STATUS.READY
    );
    if (targets.length === 0) return;
    if (!confirm(`選択した${targets.length}件を支給済にしますか？`)) return;

    setProcessing(true);
    const paidAt = new Date().toISOString().split('T')[0]; // approved_date と同形式
    for (const row of targets) {
      // D4: paid_amount は payment_total（= total_amount || 0）の支給時点スナップショット。
      //     undefined / NaN を書き込まない。total_amount 自体は変更しない。
      const amount = Number.isFinite(row.payment_total) ? row.payment_total : 0;
      await base44.entities.Report.update(row.id, {
        payment_status: PAYMENT_STATUS.PAID,
        paid_at: paidAt,
        paid_amount: amount,
        paid_by: user?.full_name,
      });
    }
    setSelectedIds([]);
    await loadReports();
    setProcessing(false);
  };

  const exportCSV = () => {
    // CSV 組み立ては純粋関数に委譲。BOM 付与 + Blob 化 + Download トリガは UI 層に残す（Summary と同形）。
    // A12.5: companies を渡して会社名列（先頭列）を解決する。
    const csv = buildPaymentsCSV(filtered, companies);
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const monthPart = month ? `${month}月` : '_全期間';
    link.download = `支給管理_${year}年${monthPart}.csv`;
    link.click();
  };

  if (!isAdmin) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <Wallet className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
        <p>このページは管理者のみ利用できます。</p>
      </div>
    );
  }

  if (loading) return <div className="p-10 text-center text-muted-foreground">読み込み中...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">支給管理</h1>
          <p className="text-muted-foreground text-sm mt-1">レポートの支給状況を管理（{periodLabel}）</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {selectedIds.length > 0 && (
            <Button onClick={handleBulkPay} disabled={processing}
              className="bg-green-600 hover:bg-green-700 text-white gap-2">
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
              {selectedIds.length}件を支給済にする
            </Button>
          )}
          <Button variant="outline" onClick={exportCSV} className="gap-2">
            <Download className="w-4 h-4" />CSV出力
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {/* A12.5: 会社別ビュー（会社横断できる systemOwner のみ表示。companyAdmin は自社固定） */}
        {canSwitchCompany && (
          <Select value={companyFilter || '__all__'} onValueChange={v => setCompanyFilter(v === '__all__' ? '' : v)}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="全社" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全社</SelectItem>
              {companyOptions.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={String(y)}>{y}年</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
          <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="0">全期間</SelectItem>
            {MONTHS.map((m, idx) => <SelectItem key={m} value={String(idx + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={nameFilter || '__all__'} onValueChange={v => setNameFilter(v === '__all__' ? '' : v)}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="全員" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全員</SelectItem>
            {nameOptions.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter || '__all__'} onValueChange={v => setStatusFilter(v === '__all__' ? '' : v)}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="全状態" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全状態</SelectItem>
            <SelectItem value={PAYMENT_STATUS.PENDING}>{PAYMENT_STATUS_LABEL[PAYMENT_STATUS.PENDING]}</SelectItem>
            <SelectItem value={PAYMENT_STATUS.PENDING_APPROVAL}>{PAYMENT_STATUS_LABEL[PAYMENT_STATUS.PENDING_APPROVAL]}</SelectItem>
            <SelectItem value={PAYMENT_STATUS.READY}>{PAYMENT_STATUS_LABEL[PAYMENT_STATUS.READY]}</SelectItem>
            <SelectItem value={PAYMENT_STATUS.PAID}>{PAYMENT_STATUS_LABEL[PAYMENT_STATUS.PAID]}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Aggregation cards (D1: 選択中の年月を反映) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-[#1a237e] to-[#283593] text-white">
          <CardContent className="p-5">
            <p className="text-white/80 text-sm mb-2">総支給額（{periodLabel}）</p>
            <p className="text-2xl font-bold">¥{agg.totalPayment.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-muted-foreground text-sm mb-2">総手当</p>
            <p className="text-2xl font-bold">¥{agg.totalAllowance.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-muted-foreground text-sm mb-2">総実費</p>
            <p className="text-2xl font-bold">¥{agg.totalExpense.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-muted-foreground text-sm mb-2">支給件数</p>
            <p className="text-2xl font-bold">
              {agg.paidCount}<span className="text-base font-normal text-muted-foreground ml-1">件</span>
            </p>
            <p className="text-muted-foreground text-xs mt-1">支給待ち {agg.readyCount} / 承認待ち {agg.awaitingCount} / 未承認 {agg.pendingCount} 件</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base">支給対象一覧（{filtered.length}件）</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              該当する支給対象がありません
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allReadySelected}
                      onChange={toggleSelectAll}
                      disabled={readyInView.length === 0}
                      className="w-4 h-4 accent-[#1a237e]"
                      aria-label="支給待ちを全選択"
                    />
                  </th>
                  {canSwitchCompany && (
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium whitespace-nowrap">会社</th>
                  )}
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium whitespace-nowrap">氏名</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium whitespace-nowrap">レポート</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium whitespace-nowrap">手当</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium whitespace-nowrap">実費</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium whitespace-nowrap">総支給</th>
                  <th className="text-center px-4 py-3 text-muted-foreground font-medium whitespace-nowrap">状態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(row => {
                  const selectable = row.payment_status === PAYMENT_STATUS.READY;
                  return (
                    <tr key={row.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.id)}
                          onChange={() => toggleSelect(row.id)}
                          disabled={!selectable}
                          className="w-4 h-4 accent-[#1a237e] disabled:opacity-30"
                          aria-label={selectable ? '支給対象に選択' : '支給済（選択不可）'}
                        />
                      </td>
                      {canSwitchCompany && (
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {companyNameById.get(row.company_id) || '—'}
                        </td>
                      )}
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{row.name}</td>
                      <td className="px-4 py-3">
                        <Link to={`/reports/${row.id}`} className="text-[#1a237e] hover:underline">
                          {row.report_type}
                          {row.report_number ? <span className="text-muted-foreground ml-1">#{row.report_number}</span> : null}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">¥{(row.allowance_total || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">¥{(row.expense_total || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">¥{(row.payment_total || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <StatusBadge status={row.payment_status} />
                        {row.payment_status === PAYMENT_STATUS.PAID && row.paid_at && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{row.paid_at}</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
