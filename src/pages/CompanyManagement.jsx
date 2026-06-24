// src/pages/CompanyManagement.jsx
// =============================================================================
// A13 マルチカンパニー — 会社管理（systemOwner 専用 / 最小実装）
// -----------------------------------------------------------------------------
// - 会社の追加（name / code）と 稼働⇄停止（status）切替のみ。物理削除は不可（rls.delete=false）。
// - ルートは <RequireRole capability="companyManage" /> で systemOwner 限定（§4.5）。
//   画面内でも can(tenant,'companyManage') を二重チェック。
// =============================================================================
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { can } from '@/lib/tenantScope';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Loader2, Plus } from 'lucide-react';

export default function CompanyManagement() {
  const { tenant, companies, reloadCompanies } = useAuth();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const allowed = can(tenant, 'companyManage');

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedName || !trimmedCode) {
      setError('会社名と会社コードを入力してください。');
      return;
    }
    if (companies.some((c) => (c.code || '').toUpperCase() === trimmedCode)) {
      setError(`会社コード「${trimmedCode}」は既に存在します。`);
      return;
    }
    setSaving(true);
    try {
      await base44.entities.Company.create({ name: trimmedName, code: trimmedCode, status: 'active' });
      setName('');
      setCode('');
      await reloadCompanies();
    } catch (err) {
      console.error('Company.create failed:', err);
      setError('会社の作成に失敗しました。権限（systemOwner）をご確認ください。');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (company) => {
    setBusyId(company.id);
    try {
      const next = company.status === 'suspended' ? 'active' : 'suspended';
      await base44.entities.Company.update(company.id, { status: next });
      await reloadCompanies();
    } catch (err) {
      console.error('Company.update failed:', err);
    } finally {
      setBusyId(null);
    }
  };

  if (!allowed) {
    // ルートガードを擦り抜けても画面内で再遮断（防御的）。
    return (
      <div className="p-6 text-sm text-slate-500">この画面を表示する権限がありません。</div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#1a237e]/10 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-[#1a237e]" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800">会社管理</h1>
          <p className="text-sm text-slate-500">会社の追加・稼働状態の切替（systemOwner 専用）</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4" /> 会社を追加
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="company-name">会社名</Label>
                <Input
                  id="company-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="株式会社Example"
                  disabled={saving}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="company-code">会社コード（不変・ユニーク）</Label>
                <Input
                  id="company-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="EXAMPLE"
                  disabled={saving}
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={saving} className="bg-[#1a237e] hover:bg-[#1a237e]/90">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              追加
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">登録済みの会社（{companies.length}）</CardTitle>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <p className="text-sm text-slate-500">会社がまだ登録されていません。</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {companies.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-slate-800">{c.name}</span>
                    <span className="text-xs text-slate-400 font-mono">{c.code}</span>
                    <Badge variant={c.status === 'suspended' ? 'secondary' : 'default'}>
                      {c.status === 'suspended' ? '停止中' : '稼働中'}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === c.id}
                    onClick={() => toggleStatus(c)}
                  >
                    {busyId === c.id && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                    {c.status === 'suspended' ? '稼働させる' : '停止する'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
