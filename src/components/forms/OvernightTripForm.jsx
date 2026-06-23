import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { stampCompanyId, buildScopedFilter } from '@/lib/tenantScope';
import { usePolicy } from '@/lib/policyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { FormField, FormInput, FormTextarea } from './FormField';
import AmountSummary from './AmountSummary';
import TransportSelector from './TransportSelector';
import ReceiptUploaderSection from './ReceiptUploaderSection';
import { generateReport } from '@/lib/reportGenerator';
import ReportPreview from '@/components/ReportPreview';
import { useReceiptParser } from '@/hooks/useReceiptParser';
import { notifySubmitted } from '@/lib/notifications';
import { useFeeState } from '@/hooks/useFeeState';
import { calcAllowances } from '@/lib/allowanceCalculator';
import { resolvePolicy } from '@/lib/policyResolver';
import { differenceInDays } from 'date-fns';

// 出張系の経費フィールドに領収書カテゴリをマッピング（DayTrip と共通構造）
const CATEGORY_MAP_TRIP = {
  '高速道路': 'highway_fee', '高速': 'highway_fee', 'ETC': 'highway_fee',
  '駐車場': 'parking_fee', 'parking': 'parking_fee',
  'タクシー': 'taxi_fee', 'taxi': 'taxi_fee',
};
const FALLBACK_TRIP = 'other_transport_fee';

export default function OvernightTripForm({ onBack, mode = 'create', initialReport = null }) {
  const { user, tenant } = useAuth();
  const { policy } = usePolicy();
  const navigate = useNavigate();

  const [form, setForm] = useState(() => {
    if (mode === 'edit' && initialReport) {
      return {
        start_date: initialReport.start_date || '',
        end_date: initialReport.end_date || '',
        destination_name: initialReport.destination_name || '',
        destination_address: initialReport.destination_address || '',
        one_way_distance_km: initialReport.one_way_distance_km ?? '',
        num_nights: initialReport.num_nights || 1,
        business_content: initialReport.business_content || '',
        transport_methods: initialReport.transport_methods || [],
        driving_distance_km: initialReport.driving_distance_km || 0,
        shinkansen_reason: initialReport.shinkansen_reason || '',
        remarks: initialReport.remarks || '',
      };
    }
    return {
      start_date: '', end_date: '',
      destination_name: '', destination_address: '',
      one_way_distance_km: '',
      num_nights: 1,
      business_content: '',
      transport_methods: [],
      driving_distance_km: 0,
      shinkansen_reason: '', remarks: '',
    };
  });
  const [errors, setErrors] = useState({});
  const [generating, setGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState(null);
  const [saving, setSaving] = useState(false);

  // Task I: 手入力分と領収書認識分を別管理（合算は feeTotal / combinedFees）
  const { manualFees, setManualFee, addReceiptFee, feeTotal, combinedFees } = useFeeState(
    ['highway_fee', 'parking_fee', 'taxi_fee', 'other_transport_fee'],
    mode === 'edit' && initialReport ? {
      highway_fee: initialReport.highway_fee || 0,
      parking_fee: initialReport.parking_fee || 0,
      taxi_fee: initialReport.taxi_fee || 0,
      other_transport_fee: initialReport.other_transport_fee || 0,
    } : {},
  );

  // 領収書 AI 仕分け（A4 で展開）
  const onAmountParsed = (mapKey, amount) => addReceiptFee(mapKey, amount);
  const {
    receipts,
    handleReceiptUpload,
    removeReceipt,
    isUploading,
    isAnalyzing,
    receiptUrls,
  } = useReceiptParser({
    initialReceiptUrls: mode === 'edit' && initialReport?.receipt_urls ? initialReport.receipt_urls : [],
    categoryMap: CATEGORY_MAP_TRIP,
    fallbackKey: FALLBACK_TRIP,
    onAmountParsed,
  });

  const hasCar = form.transport_methods.includes('マイカー');
  const numDays = form.start_date && form.end_date
    ? Math.max(1, differenceInDays(new Date(form.end_date), new Date(form.start_date)) + 1)
    : 1;
  // A11: 手当（日当×日数 + 宿泊費×泊数 + マイカー手当）は allowanceCalculator に集約。
  // 実費は useFeeState。出力金額は従来と完全一致。
  const { daily_allowance: dailyAllowance, accommodation_fee: accommodationFee, car_allowance: carAllowance } = calcAllowances({
    reportType: '宿泊出張',
    quantities: { numDays, numNights: form.num_nights || 1, drivingKm: form.driving_distance_km, hasCar },
    policy: resolvePolicy({ policy }),
  });
  const totalAmount = dailyAllowance + accommodationFee + carAllowance +
    feeTotal('highway_fee') + feeTotal('parking_fee') +
    feeTotal('taxi_fee') + feeTotal('other_transport_fee');

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const validate = () => {
    const e = {};
    if (!form.start_date) e.start_date = '開始日を入力してください';
    if (!form.end_date) e.end_date = '終了日を入力してください';
    if (!form.destination_name) e.destination_name = '施設名を入力してください';
    if (!form.destination_address) e.destination_address = '所在地を入力してください';
    if (!form.one_way_distance_km || parseFloat(form.one_way_distance_km) < policy.min_distance_km) {
      e.one_way_distance_km = `片道距離は${policy.min_distance_km}km以上必要です`;
    }
    if (form.transport_methods.length === 0) e.transport_methods = '交通手段を選択してください';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleGenerate = async () => {
    if (!validate()) return;
    if (form.start_date) {
      // A13: 重複チェックも会社スコープ（§4.6）。created_by_id で自分に限定済みだが防御的に company_id も注入。
      const existing = await base44.entities.Report.filter(buildScopedFilter(tenant, {
        created_by_id: user?.id,
        report_type: '宿泊出張',
        start_date: form.start_date,
      }));
      const conflicting = existing
        .filter(r => r.id !== initialReport?.id)  // edit 時は自身を除外
        .filter(r => r.status !== '差戻し');
      if (conflicting.length > 0) {
        setErrors(prev => ({ ...prev, start_date: '同一開始日に既に宿泊出張レポートが存在します（1日1件まで）' }));
        return;
      }
    }
    setGenerating(true);
    try {
      const reportData = { ...form, ...combinedFees(), report_type: '宿泊出張', num_days: numDays, daily_allowance: dailyAllowance, accommodation_fee: accommodationFee, car_allowance: carAllowance, total_amount: totalAmount, receipt_urls: receiptUrls };
      const result = await generateReport(reportData, user, policy);
      setGeneratedReport(result);
    } finally { setGenerating(false); }
  };

  const handleSubmit = async (status) => {
    setSaving(true);
    try {
      const data = {
        ...form, ...combinedFees(), report_type: '宿泊出張', status,
        report_number: mode === 'edit' ? initialReport.report_number : `RPT-${Date.now().toString().slice(-8)}`,
        created_by_name: mode === 'edit' ? initialReport.created_by_name : user?.full_name,
        created_by_email: mode === 'edit' ? initialReport.created_by_email : user?.email,
        num_days: numDays, daily_allowance: dailyAllowance,
        accommodation_fee: accommodationFee, car_allowance: carAllowance,
        total_amount: totalAmount,
        one_way_distance_km: parseFloat(form.one_way_distance_km),
        receipt_urls: receiptUrls,
        generated_report_text: generatedReport?.reportText || initialReport?.generated_report_text || '',
        generated_settlement_text: generatedReport?.settlementText || initialReport?.generated_settlement_text || '',
      };
      // A13: 新規作成時に company_id を付与（RLS create 一致）。編集時は既存の所属を維持。
      const payload = mode === 'edit'
        ? { ...data, company_id: initialReport?.company_id }
        : stampCompanyId(tenant, data);
      let saved;
      if (mode === 'edit') {
        await base44.entities.Report.update(initialReport.id, payload);
        saved = { id: initialReport.id };
      } else {
        saved = await base44.entities.Report.create(payload);
      }
      // 申請通知（throw しない、status 遷移を破壊しない）
      if (status === '申請中') {
        await notifySubmitted({ report: { ...payload, id: saved.id } });
      }
      navigate(`/reports/${saved.id}`);
    } finally { setSaving(false); }
  };

  if (generatedReport) {
    return <ReportPreview report={generatedReport} onBack={() => setGeneratedReport(null)}
      onSaveDraft={() => handleSubmit('下書き')} onSubmit={() => handleSubmit('申請中')}
      saving={saving} totalAmount={totalAmount} receiptUrls={receiptUrls} />;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-2xl font-bold">宿泊出張レポート</h1>
          <p className="text-muted-foreground text-sm mt-0.5">必要事項を入力してレポートを生成してください</p>
        </div>
      </div>
      <div className="space-y-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4"><CardTitle className="text-base">基本情報</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput label="開始日" type="date" required value={form.start_date}
                onChange={e => set('start_date', e.target.value)} error={errors.start_date} />
              <FormInput label="終了日" type="date" required value={form.end_date}
                onChange={e => set('end_date', e.target.value)} error={errors.end_date} />
            </div>
            {form.start_date && form.end_date && (
              <p className="text-sm text-[#1a237e] font-medium">{numDays}日間・{form.num_nights}泊</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput label="目的地（施設名）" required placeholder="〇〇株式会社" value={form.destination_name}
                onChange={e => set('destination_name', e.target.value)} error={errors.destination_name} />
              <FormInput label="所在地" required placeholder="大阪府大阪市〇〇" value={form.destination_address}
                onChange={e => set('destination_address', e.target.value)} error={errors.destination_address} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput label={`片道距離（km）※${policy.min_distance_km}km以上`} type="number" required
                value={form.one_way_distance_km} onChange={e => set('one_way_distance_km', e.target.value)}
                error={errors.one_way_distance_km} placeholder={`${policy.min_distance_km}以上`} />
              <FormField label="宿泊数">
                <Input type="number" min="1" value={form.num_nights}
                  onChange={e => set('num_nights', parseInt(e.target.value) || 1)} />
              </FormField>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4"><CardTitle className="text-base">業務内容</CardTitle></CardHeader>
          <CardContent>
            <FormTextarea label="業務内容" placeholder="具体的な業務内容を入力してください"
              value={form.business_content} onChange={e => set('business_content', e.target.value)} error={errors.business_content} />
            <p className="text-xs text-muted-foreground mt-1">{form.business_content.length}文字</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4"><CardTitle className="text-base">交通手段・経費</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <TransportSelector value={form.transport_methods} onChange={v => set('transport_methods', v)}
              drivingKm={form.driving_distance_km} onDrivingKmChange={v => set('driving_distance_km', v)}
              error={errors.transport_methods} />
            <div className="grid grid-cols-2 gap-4 pt-2">
              {[['highway_fee','高速道路料金'], ['parking_fee','駐車場料金'], ['taxi_fee','タクシー料金'], ['other_transport_fee','その他交通費']].map(([key, label]) => (
                <FormField key={key} label={`${label}（円）`}>
                  <Input type="number" min="0" value={manualFees[key] || ''} onChange={e => setManualFee(key, parseFloat(e.target.value) || 0)} placeholder="0" />
                </FormField>
              ))}
            </div>
            <FormField label="新幹線指定席・グリーン車利用理由（任意）">
              <Input placeholder="利用理由を入力" value={form.shinkansen_reason} onChange={e => set('shinkansen_reason', e.target.value)} />
            </FormField>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4"><CardTitle className="text-base">備考（任意）</CardTitle></CardHeader>
          <CardContent>
            <FormTextarea placeholder="その他の備考" value={form.remarks} onChange={e => set('remarks', e.target.value)} />
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4"><CardTitle className="text-base">領収書（任意）</CardTitle></CardHeader>
          <CardContent>
            <ReceiptUploaderSection
              receipts={receipts}
              handleReceiptUpload={handleReceiptUpload}
              removeReceipt={removeReceipt}
              isUploading={isUploading}
              isAnalyzing={isAnalyzing}
            />
          </CardContent>
        </Card>
        <AmountSummary
          items={[
            { label: `日当（${policy.daily_allowance_overnight.toLocaleString()}円 × ${numDays}日）`, amount: dailyAllowance },
            { label: `宿泊費（${policy.accommodation_domestic.toLocaleString()}円 × ${form.num_nights}泊）`, amount: accommodationFee },
            { label: `マイカー手当（${form.driving_distance_km || 0}km × ${policy.car_allowance_per_km}円）`, amount: carAllowance },
            { label: '高速道路料金', amount: feeTotal('highway_fee') },
            { label: '駐車場料金', amount: feeTotal('parking_fee') },
            { label: 'タクシー料金', amount: feeTotal('taxi_fee') },
            { label: 'その他交通費', amount: feeTotal('other_transport_fee') },
          ]}
          total={totalAmount}
        />
        <Button onClick={handleGenerate} disabled={generating} className="w-full bg-[#1a237e] hover:bg-[#1a237e]/90 text-white h-12 text-base">
          {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />AI生成中...</> : 'レポートを生成する'}
        </Button>
      </div>
    </div>
  );
}