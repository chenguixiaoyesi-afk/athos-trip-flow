import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { usePolicy } from '@/lib/policyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, Loader2, CheckCircle, FileText } from 'lucide-react';

export default function PolicyManagement() {
  const { policy, setPolicy } = usePolicy();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [analyzingPdf, setAnalyzingPdf] = useState(false);
  const [analyzedPolicy, setAnalyzedPolicy] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [form, setForm] = useState({
    version: '',
    effective_date: '',
    policy_content: '',
  });
  const [saving, setSaving] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    const data = await base44.entities.TravelPolicyMaster.list('-created_date', 20);
    setPolicies(data || []);
    setLoading(false);
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPdf(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPdfUrl(file_url);
      // Analyze with AI using required JSON schema
      setAnalyzingPdf(true);
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `以下の旅費規程PDFを読み取り、全項目を正確に抽出してください。数値が明記されていない項目は現行値をそのまま使用してください。

抽出対象:
- version: 規程バージョン（例: "第5版"）
- effective_date: 施行日（YYYY-MM-DD形式）
- distance_threshold_km: 出張基準距離（km）
- daily_allowance_day_trip: 日帰り出張日当（円）
- daily_allowance_overnight: 宿泊出張日当（円/日）
- daily_allowance_overseas: 海外出張日当（円/日）
- accommodation_domestic: 国内宿泊費（円/泊）
- accommodation_overseas: 海外宿泊費（円/泊）
- mileage_rate_per_km: 走行距離単価（円/km）
- external_work_fee_limit: 外出作業費上限（円）
- external_work_min_hours: 外出作業最低時間（時間）
- requires_receipt: 領収書必須かどうか（true/false）
- summary: 規程の変更点・概要（日本語）`,
        file_urls: [file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            version: { type: 'string' },
            effective_date: { type: 'string' },
            distance_threshold_km: { type: 'number' },
            daily_allowance_day_trip: { type: 'number' },
            daily_allowance_overnight: { type: 'number' },
            daily_allowance_overseas: { type: 'number' },
            accommodation_domestic: { type: 'number' },
            accommodation_overseas: { type: 'number' },
            mileage_rate_per_km: { type: 'number' },
            external_work_fee_limit: { type: 'number' },
            external_work_min_hours: { type: 'number' },
            requires_receipt: { type: 'boolean' },
            summary: { type: 'string' },
          },
        },
      });
      // Map to internal policy field names
      const mapped = {
        min_distance_km: result.distance_threshold_km,
        daily_allowance_daytrip: result.daily_allowance_day_trip,
        daily_allowance_overnight: result.daily_allowance_overnight,
        daily_allowance_overseas: result.daily_allowance_overseas,
        accommodation_domestic: result.accommodation_domestic,
        accommodation_overseas: result.accommodation_overseas,
        car_allowance_per_km: result.mileage_rate_per_km,
        max_work_expense: result.external_work_fee_limit,
        min_work_hours: result.external_work_min_hours,
        summary: result.summary,
        _raw: result,
      };
      if (result.version && !form.version) setForm(p => ({ ...p, version: result.version }));
      if (result.effective_date && !form.effective_date) setForm(p => ({ ...p, effective_date: result.effective_date }));
      setAnalyzedPolicy(mapped);
      setShowDiff(true);
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingPdf(false);
      setAnalyzingPdf(false);
    }
  };

  const handleActivate = async (policyId) => {
    // Deactivate all
    for (const p of policies) {
      if (p.is_active) await base44.entities.TravelPolicyMaster.update(p.id, { is_active: false });
    }
    // Activate this one
    await base44.entities.TravelPolicyMaster.update(policyId, { is_active: true });
    const activated = policies.find(p => p.id === policyId);
    if (activated) setPolicy({ ...policy, ...activated });
    await loadPolicies();
  };

  const handleSaveNew = async () => {
    setSaving(true);
    try {
      const data = {
        ...form,
        pdf_url: pdfUrl,
        is_active: false,
        ...(analyzedPolicy || {}),
      };
      delete data.summary;
      await base44.entities.TravelPolicyMaster.create(data);
      setForm({ version: '', effective_date: '', policy_content: '' });
      setPdfUrl('');
      setAnalyzedPolicy(null);
      setShowDiff(false);
      await loadPolicies();
    } finally {
      setSaving(false);
    }
  };

  const FIELD_LABELS = {
    min_distance_km: '出張基準距離（km）',
    daily_allowance_daytrip: '日帰り出張日当（円）',
    daily_allowance_overnight: '宿泊出張日当（円/日）',
    daily_allowance_overseas: '海外出張日当（円/日）',
    accommodation_domestic: '国内宿泊費（円/泊）',
    accommodation_overseas: '海外宿泊費（円/泊）',
    car_allowance_per_km: '走行距離単価（円/km）',
    max_work_expense: '外出作業費上限（円）',
    min_work_hours: '外出作業時間要件（時間）',
  };

  const activePolicy = policies.find(p => p.is_active);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">旅費規程管理</h1>
        <p className="text-muted-foreground text-sm mt-1">規程のPDFをアップロードするとAIが自動解析します</p>
      </div>

      {/* Current Active Policy */}
      {activePolicy && (
        <Card className="border-0 shadow-sm mb-8 border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <CardTitle className="text-base">現行規程: {activePolicy.version}</CardTitle>
              <Badge className="bg-green-100 text-green-700 border-green-200">適用中</Badge>
            </div>
            <p className="text-sm text-muted-foreground">施行日: {activePolicy.effective_date}</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Object.entries(FIELD_LABELS).map(([key, label]) => (
                <div key={key} className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="font-semibold text-sm">
                    {key.includes('km') && !key.includes('distance') && !key.includes('per')
                      ? `¥${(activePolicy[key] || policy[key] || 0).toLocaleString()}`
                      : key === 'min_distance_km' ? `${activePolicy[key] || policy[key]}km以上`
                      : key === 'min_work_hours' ? `${activePolicy[key] || policy[key]}時間以上`
                      : `¥${(activePolicy[key] || policy[key] || 0).toLocaleString()}`
                    }
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload new policy */}
      <Card className="border-0 shadow-sm mb-8">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">新規規程の登録</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">規程バージョン<span className="text-destructive ml-1">*</span></Label>
              <Input placeholder="例：第5版" value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-sm">施行日<span className="text-destructive ml-1">*</span></Label>
              <Input type="date" value={form.effective_date} onChange={e => setForm(p => ({ ...p, effective_date: e.target.value }))} className="mt-1.5" />
            </div>
          </div>

          {/* PDF Upload */}
          <div>
            <Label className="text-sm">規程PDF（AI自動解析）</Label>
            <label className="mt-1.5 flex items-center gap-3 px-4 py-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-[#1a237e]/50 transition-colors">
              {uploadingPdf || analyzingPdf ? (
                <><Loader2 className="w-5 h-5 animate-spin text-[#1a237e]" />
                  <span className="text-sm text-[#1a237e]">{analyzingPdf ? 'AI解析中...' : 'アップロード中...'}</span></>
              ) : pdfUrl ? (
                <><FileText className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-700">PDFアップロード済 ✓</span></>
              ) : (
                <><Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">PDFファイルを選択してAI解析</span></>
              )}
              <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} disabled={uploadingPdf || analyzingPdf} />
            </label>
          </div>

          {/* AI Analysis Result */}
          {analyzedPolicy && showDiff && (
            <Card className="border-[#1a237e]/20 bg-[#1a237e]/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />AI解析結果（変更点）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(FIELD_LABELS).map(([key, label]) => {
                    const current = policy[key];
                    const next = analyzedPolicy[key];
                    const changed = next && next !== current;
                    return (
                      <div key={key} className={`p-3 rounded-lg ${changed ? 'bg-amber-50 border border-amber-200' : 'bg-white border border-border'}`}>
                        <p className="text-xs text-muted-foreground mb-1">{label}</p>
                        <div className="flex items-center gap-2 text-sm">
                          <span className={changed ? 'line-through text-muted-foreground' : 'font-medium'}>
                            {current}
                          </span>
                          {changed && (
                            <>
                              <span className="text-amber-600">→</span>
                              <span className="font-bold text-amber-700">{next}</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {analyzedPolicy.summary && (
                  <p className="text-sm text-muted-foreground mt-3 p-3 bg-white rounded-lg">{analyzedPolicy.summary}</p>
                )}
              </CardContent>
            </Card>
          )}

          <div>
            <Label className="text-sm">規程内容メモ（任意）</Label>
            <Textarea placeholder="補足情報や変更点のメモ" value={form.policy_content}
              onChange={e => setForm(p => ({ ...p, policy_content: e.target.value }))} className="mt-1.5" />
          </div>

          <Button
            onClick={handleSaveNew}
            disabled={!form.version || !form.effective_date || saving}
            className="bg-[#1a237e] hover:bg-[#1a237e]/90 text-white w-full sm:w-auto"
          >
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />保存中...</> : '規程を保存する'}
          </Button>
        </CardContent>
      </Card>

      {/* Policy list */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">規程履歴</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">読み込み中...</div>
          ) : policies.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">規程が登録されていません</div>
          ) : (
            <div className="divide-y">
              {policies.map(p => (
                <div key={p.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{p.version}</span>
                      {p.is_active && <Badge className="bg-green-100 text-green-700 text-xs">適用中</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">施行日: {p.effective_date}</p>
                    {p.policy_content && <p className="text-xs text-muted-foreground mt-1 truncate max-w-xs">{p.policy_content}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {p.pdf_url && (
                      <a href={p.pdf_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-[#1a237e] hover:underline flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />PDF
                      </a>
                    )}
                    {!p.is_active && (
                      <Button size="sm" variant="outline" onClick={() => handleActivate(p.id)}
                        className="text-xs border-[#1a237e] text-[#1a237e] hover:bg-[#1a237e]/5">
                        適用する
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}