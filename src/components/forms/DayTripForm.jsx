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
import { generateReport } from '@/lib/reportGenerator';
import ReportPreview from '@/components/ReportPreview';

export default function DayTripForm({ onBack }) {
  const { user } = useAuth();
  const { policy } = usePolicy();
  const navigate = useNavigate();

  const [form, setForm] = useState({
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
  });
  const [errors, setErrors] = useState({});
  const [generating, setGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState(null);
  const [saving, setSaving] = useState(false);

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
    setGenerating(true);
    try {
      const reportData = {
        ...form,
        report_type: '日帰り出張',
        daily_allowance: dailyAllowance,
        car_allowance: carAllowance,
        total_amount: totalAmount,
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
      const num = `RPT-${Date.now().toString().slice(-8)}`;
      const data = {
        ...form,
        report_type: '日帰り出張',
        status,
        report_number: num,
        created_by_name: user?.full_name,
        created_by_email: user?.email,
        daily_allowance: dailyAllowance,
        car_allowance: carAllowance,
        total_amount: totalAmount,
        one_way_distance_km: parseFloat(form.one_way_distance_km),
        generated_report_text: generatedReport?.reportText || '',
        generated_settlement_text: generatedReport?.settlementText || '',
      };
      const saved = await base44.entities.Report.create(data);
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