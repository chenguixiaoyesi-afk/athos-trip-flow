import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
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

// 出張系（日帰り/宿泊）の経費フィールドに領収書カテゴリをマッピング
const CATEGORY_MAP_TRIP = {
  '高速道路': 'highway_fee', '高速': 'highway_fee', 'ETC': 'highway_fee',
  '駐車場': 'parking_fee', 'parking': 'parking_fee',
  'タクシー': 'taxi_fee', 'taxi': 'taxi_fee',
};
const FALLBACK_TRIP = 'other_transport_fee';

export default function DayTripForm({ onBack, mode = 'create', initialReport = null }) {
  const { user } = useAuth();
  const { policy } = usePolicy();
  const navigate = useNavigate();

  const [form, setForm] = useState(() => {
    if (mode === 'edit' && initialReport) {
      return {
        travel_date: initialReport.travel_date || '',
        destination_name: initialReport.destination_name || '',
        destination_address: initialReport.destination_address || '',
        one_way_distance_km: initialReport.one_way_distance_km ?? '',
        business_content: initialReport.business_content || '',
        transport_methods: initialReport.transport_methods || [],
        driving_distance_km: initialReport.driving_distance_km || 0,
        highway_fee: initialReport.highway_fee || 0,
        parking_fee: initialReport.parking_fee || 0,
        taxi_fee: initialReport.taxi_fee || 0,
        other_transport_fee: initialReport.other_transport_fee || 0,
        remarks: initialReport.remarks || '',
      };
    }
    return {
      travel_date: '',
      destination_name: '',
      destination_address: '',
      one_way_distance_km: '',
      business_content: '',
      transport_methods: [],
      driving_distance_km: 0,
      highway_fee: 0,
      parking_fee: 0,
      taxi_fee: 0,
      other_transport_fee: 0,
      remarks: '',
    };
  });
  const [errors, setErrors] = useState({});
  const [generating, setGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState(null);
  const [saving, setSaving] = useState(false);

  // 領収書 AI 仕分け（A4 で展開）
  const onAmountParsed = (mapKey, amount) => {
    setForm(prev => ({ ...prev, [mapKey]: (prev[mapKey] || 0) + amount }));
  };
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
  const dailyAllowance = policy.daily_allowance_daytrip;
  const carAllowance = hasCar ? (form.driving_distance_km || 0) * policy.car_allowance_per_km : 0;
  const totalAmount = dailyAllowance + carAllowance +
    (form.highway_fee || 0) + (form.parking_fee || 0) +
    (form.taxi_fee || 0) + (form.other_transport_fee || 0);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const validate = () => {
    const e = {};
    if (!form.travel_date) e.travel_date = '出張日を入力してください';
    if (!form.destination_name) e.destination_name = '施設名を入力してください';
    if (!form.destination_address) e.destination_address = '所在地を入力してください';
    if (!form.one_way_distance_km || parseFloat(form.one_way_distance_km) < policy.min_distance_km) {
      e.one_way_distance_km = `片道距離は${policy.min_distance_km}km以上である必要があります`;
    }
    if (!form.business_content || form.business_content.length < 50) {
      e.business_content = '業務内容は50文字以上入力してください';
    }
    if (form.transport_methods.length === 0) e.transport_methods = '交通手段を選択してください';
    if (hasCar && !form.driving_distance_km) e.driving_distance_km = '走行距離を入力してください';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleGenerate = async () => {
    if (!validate()) return;
    if (form.travel_date) {
      const existing = await base44.entities.Report.filter({
        created_by_id: user?.id,
        report_type: '日帰り出張',
        travel_date: form.travel_date,
      });
      const conflicting = existing
        .filter(r => r.id !== initialReport?.id)  // edit 時は自身を除外
        .filter(r => r.status !== '差戻し');
      if (conflicting.length > 0) {
        setErrors(prev => ({ ...prev, travel_date: '同一日に既に日帰り出張レポートが存在します（1日1件まで）' }));
        return;
      }
    }
    setGenerating(true);
    try {
      const reportData = {
        ...form,
        report_type: '日帰り出張',
        daily_allowance: dailyAllowance,
        car_allowance: carAllowance,
        total_amount: totalAmount,
        receipt_urls: receiptUrls,
      };
      const result = await generateReport(reportData, user, policy);
      setGeneratedReport(result);
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (status) => {
    setSaving(true);
    try {
      const data = {
        ...form,
        report_type: '日帰り出張',
        status,
        report_number: mode === 'edit' ? initialReport.report_number : `RPT-${Date.now().toString().slice(-8)}`,
        created_by_name: mode === 'edit' ? initialReport.created_by_name : user?.full_name,
        created_by_email: mode === 'edit' ? initialReport.created_by_email : user?.email,
        daily_allowance: dailyAllowance,
        car_allowance: carAllowance,
        total_amount: totalAmount,
        one_way_distance_km: parseFloat(form.one_way_distance_km),
        receipt_urls: receiptUrls,
        generated_report_text: generatedReport?.reportText || initialReport?.generated_report_text || '',
        generated_settlement_text: generatedReport?.settlementText || initialReport?.generated_settlement_text || '',
      };
      let saved;
      if (mode === 'edit') {
        await base44.entities.Report.update(initialReport.id, data);
        saved = { id: initialReport.id };
      } else {
        saved = await base44.entities.Report.create(data);
      }
      // 申請通知（throw しない、status 遷移を破壊しない）
      if (status === '申請中') {
        await notifySubmitted({ report: { ...data, id: saved.id } });
      }
      navigate(`/reports/${saved.id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (generatedReport) {
    return (
      <ReportPreview
        report={generatedReport}
        onBack={() => setGeneratedReport(null)}
        onSaveDraft={() => handleSubmit('下書き')}
        onSubmit={() => handleSubmit('申請中')}
        saving={saving}
        totalAmount={totalAmount}
        receiptUrls={receiptUrls}
      />
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">日帰り出張レポート</h1>
          <p className="text-muted-foreground text-sm mt-0.5">必要事項を入力してレポートを生成してください</p>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4"><CardTitle className="text-base">基本情報</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormInput label="出張日" type="date" required value={form.travel_date}
              onChange={e => set('travel_date', e.target.value)} error={errors.travel_date} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput label="目的地（施設名）" required placeholder="〇〇株式会社" value={form.destination_name}
                onChange={e => set('destination_name', e.target.value)} error={errors.destination_name} />
              <FormInput label="所在地" required placeholder="東京都千代田区〇〇" value={form.destination_address}
                onChange={e => set('destination_address', e.target.value)} error={errors.destination_address} />
            </div>
            <FormInput label={`片道距離（km）※${policy.min_distance_km}km以上`} type="number" required min={policy.min_distance_km}
              value={form.one_way_distance_km} onChange={e => set('one_way_distance_km', e.target.value)}
              error={errors.one_way_distance_km} placeholder={`${policy.min_distance_km}以上`} />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4"><CardTitle className="text-base">業務内容</CardTitle></CardHeader>
          <CardContent>
            <FormTextarea label="業務内容" required placeholder="具体的な業務内容を50文字以上で入力してください"
              value={form.business_content} onChange={e => set('business_content', e.target.value)}
              error={errors.business_content} />
            <p className="text-xs text-muted-foreground mt-1">{form.business_content.length}文字（最低50文字）</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4"><CardTitle className="text-base">交通手段・経費</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <TransportSelector
              value={form.transport_methods}
              onChange={v => set('transport_methods', v)}
              drivingKm={form.driving_distance_km}
              onDrivingKmChange={v => set('driving_distance_km', v)}
              error={errors.transport_methods}
            />
            <div className="grid grid-cols-2 gap-4 pt-2">
              <FormField label="高速道路料金（円）">
                <Input type="number" min="0" value={form.highway_fee || ''} onChange={e => set('highway_fee', parseFloat(e.target.value) || 0)} placeholder="0" />
              </FormField>
              <FormField label="駐車場料金（円）">
                <Input type="number" min="0" value={form.parking_fee || ''} onChange={e => set('parking_fee', parseFloat(e.target.value) || 0)} placeholder="0" />
              </FormField>
              <FormField label="タクシー料金（円）">
                <Input type="number" min="0" value={form.taxi_fee || ''} onChange={e => set('taxi_fee', parseFloat(e.target.value) || 0)} placeholder="0" />
              </FormField>
              <FormField label="その他交通費（円）">
                <Input type="number" min="0" value={form.other_transport_fee || ''} onChange={e => set('other_transport_fee', parseFloat(e.target.value) || 0)} placeholder="0" />
              </FormField>
            </div>
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
            { label: '日当', amount: dailyAllowance },
            { label: `マイカー手当（${form.driving_distance_km || 0}km × ${policy.car_allowance_per_km}円）`, amount: carAllowance },
            { label: '高速道路料金', amount: form.highway_fee },
            { label: '駐車場料金', amount: form.parking_fee },
            { label: 'タクシー料金', amount: form.taxi_fee },
            { label: 'その他交通費', amount: form.other_transport_fee },
          ]}
          total={totalAmount}
        />

        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full bg-[#1a237e] hover:bg-[#1a237e]/90 text-white h-12 text-base"
        >
          {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />AI生成中...</> : 'レポートを生成する'}
        </Button>
      </div>
    </div>
  );
}