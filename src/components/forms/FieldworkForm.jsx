import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { stampCompanyId, buildScopedFilter } from '@/lib/tenantScope';
import { usePolicy } from '@/lib/policyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, AlertTriangle, Clock } from 'lucide-react';
import { FormField, FormInput, FormTextarea } from './FormField';
import AmountSummary from './AmountSummary';
import TransportSelector from './TransportSelector';
import ReceiptUploaderSection from './ReceiptUploaderSection';
import { generateReport } from '@/lib/reportGenerator';
import ReportPreview from '@/components/ReportPreview';
import { useReceiptParser } from '@/hooks/useReceiptParser';
import { useFeeState } from '@/hooks/useFeeState';
import { calcAllowances } from '@/lib/allowanceCalculator';
import { resolvePolicy } from '@/lib/policyResolver';
import { notifySubmitted } from '@/lib/notifications';

// 外出作業フォーム用カテゴリ→経費フィールドマッピング
const CATEGORY_MAP_FIELDWORK = {
  'コワーキング': 'coworking_fee', 'coworking': 'coworking_fee',
  '貸会議室': 'coworking_fee', '会議室': 'coworking_fee',
  'wifi': 'wifi_fee', 'Wi-Fi': 'wifi_fee', '通信': 'wifi_fee', 'インターネット': 'wifi_fee',
  '駐車場': 'parking_fee', 'parking': 'parking_fee',
  '飲食': 'meal_fee', '食事': 'meal_fee', 'カフェ': 'meal_fee', 'レストラン': 'meal_fee', 'コーヒー': 'meal_fee',
};
const FALLBACK_FIELDWORK = 'other_work_fee';

const STORAGE_KEY = 'fieldwork_defaults';

// Quick-pick time slots
const TIME_SLOTS = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','19:00'];

function TimePicker({ label, value, onChange, error }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <p className="text-sm font-medium mb-1">{label}</p>
      <div className="flex gap-2">
        <Input
          type="time"
          value={value}
          onChange={onChange}
          className={error ? 'border-destructive' : ''}
        />
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="px-2 py-1 border rounded-md hover:bg-muted text-muted-foreground"
          title="クイック選択"
        >
          <Clock className="w-4 h-4" />
        </button>
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      {open && (
        <div className="absolute z-50 mt-1 bg-white border rounded-lg shadow-lg p-2 grid grid-cols-4 gap-1 w-64">
          {TIME_SLOTS.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => { onChange({ target: { value: t } }); setOpen(false); }}
              className={`text-xs px-2 py-1.5 rounded hover:bg-[#1a237e]/10 transition-colors ${value === t ? 'bg-[#1a237e] text-white' : ''}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FieldworkForm({ onBack, mode = 'create', initialReport = null }) {
  const { user, tenant } = useAuth();
  const { policy } = usePolicy();
  const navigate = useNavigate();

  // Load saved defaults (destination only — not date)
  // edit モード時は initialReport を優先するため、savedDefaults は読まない
  const savedDefaults = (() => {
    if (mode === 'edit') return {};
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  })();

  const [form, setForm] = useState(() => {
    if (mode === 'edit' && initialReport) {
      return {
        travel_date: initialReport.travel_date || '',
        destination_name: initialReport.destination_name || '',
        destination_address: initialReport.destination_address || '',
        work_start_time: initialReport.work_start_time || '',
        work_end_time: initialReport.work_end_time || '',
        business_content: initialReport.business_content || '',
        transport_methods: initialReport.transport_methods || [],
        driving_distance_km: initialReport.driving_distance_km || 0,
        remarks: initialReport.remarks || '',
      };
    }
    return {
      travel_date: new Date().toISOString().slice(0, 10), // default today
      destination_name: savedDefaults.destination_name || '',
      destination_address: savedDefaults.destination_address || '',
      work_start_time: savedDefaults.work_start_time || '',
      work_end_time: savedDefaults.work_end_time || '',
      business_content: '',
      transport_methods: savedDefaults.transport_methods || [],
      driving_distance_km: savedDefaults.driving_distance_km || 0,
      remarks: '',
    };
  });
  // Task I 案A: 手入力分(manualFees)と領収書認識分(receiptFees)を別管理し合算する。
  // edit → 既存fee項目をmanualFees初期値（過去内訳は復元しない）。
  // create → localStorage の記憶分（コワーキング/Wi-Fi/駐車場）をmanualFees初期値。
  const { manualFees, setManualFee, addReceiptFee, feeTotal, combinedFees } = useFeeState(
    ['coworking_fee', 'wifi_fee', 'parking_fee', 'meal_fee', 'other_work_fee'],
    mode === 'edit' && initialReport ? {
      coworking_fee: initialReport.coworking_fee || 0,
      wifi_fee: initialReport.wifi_fee || 0,
      parking_fee: initialReport.parking_fee || 0,
      meal_fee: initialReport.meal_fee || 0,
      other_work_fee: initialReport.other_work_fee || 0,
    } : {
      coworking_fee: savedDefaults.coworking_fee || 0,
      wifi_fee: savedDefaults.wifi_fee || 0,
      parking_fee: savedDefaults.parking_fee || 0,
      meal_fee: 0,
      other_work_fee: 0,
    },
  );

  // 領収書 AI 仕分けは useReceiptParser に集約（A4 で抽出）。
  // edit モード時は initialReceiptUrls 経由で復元。認識額は receiptFees へ加算（順序非依存）。
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
    categoryMap: CATEGORY_MAP_FIELDWORK,
    fallbackKey: FALLBACK_FIELDWORK,
    onAmountParsed,
  });
  const [errors, setErrors] = useState({});
  const [generating, setGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState(null);
  const [saving, setSaving] = useState(false);

  const hasCar = form.transport_methods.includes('マイカー');
  // A11: マイカー手当は allowanceCalculator に集約（規程→決定論）。実費は useFeeState。
  const { car_allowance: carAllowance } = calcAllowances({
    reportType: '外出作業',
    quantities: { drivingKm: form.driving_distance_km, hasCar },
    policy: resolvePolicy({ policy }),
  });
  const workOnlyExpense = feeTotal('coworking_fee') + feeTotal('wifi_fee') + feeTotal('parking_fee') + feeTotal('meal_fee') + feeTotal('other_work_fee');
  // 外出作業費合計 = 実費 + マイカー手当
  const totalWorkExpense = workOnlyExpense;
  const totalAmount = carAllowance + totalWorkExpense;

  const workHours = () => {
    if (!form.work_start_time || !form.work_end_time) return 0;
    const [sh, sm] = form.work_start_time.split(':').map(Number);
    const [eh, em] = form.work_end_time.split(':').map(Number);
    return (eh * 60 + em - sh * 60 - sm) / 60;
  };

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // Persist useful defaults on every form change
  // Task I 案A: 経費は手入力分(manualFees)のみ記憶する（領収書認識分は記憶しない）
  useEffect(() => {
    const defaults = {
      destination_name: form.destination_name,
      destination_address: form.destination_address,
      work_start_time: form.work_start_time,
      work_end_time: form.work_end_time,
      transport_methods: form.transport_methods,
      driving_distance_km: form.driving_distance_km,
      coworking_fee: manualFees.coworking_fee,
      wifi_fee: manualFees.wifi_fee,
      parking_fee: manualFees.parking_fee,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  }, [form, manualFees]);

  const validate = () => {
    const e = {};
    if (!form.travel_date) e.travel_date = '作業日を入力してください';
    if (!form.destination_name) e.destination_name = '施設名を入力してください';
    if (!form.destination_address) e.destination_address = '所在地を入力してください';
    if (!form.work_start_time) e.work_start_time = '開始時刻を入力してください';
    if (!form.work_end_time) e.work_end_time = '終了時刻を入力してください';
    const hours = workHours();
    if (form.work_start_time && form.work_end_time && hours < policy.min_work_hours) {
      e.work_time = `4時間以上の作業が必要です（現在: ${hours.toFixed(1)}時間）`;
    }
    if (form.transport_methods.length === 0) e.transport_methods = '交通手段を選択してください';
    if (workOnlyExpense > policy.max_work_expense) e.expense_limit = `上限5,000円を超えています（現在: ¥${workOnlyExpense.toLocaleString()}）`;
    // 領収書は任意（実費申請がある場合のみ推奨）
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleGenerate = async () => {
    if (!validate()) return;
    if (form.travel_date) {
      // A13: 重複チェックも会社スコープ（§4.6）。created_by_id で自分に限定済みだが防御的に company_id も注入。
      const existing = await base44.entities.Report.filter(buildScopedFilter(tenant, {
        created_by_id: user?.id,
        report_type: '外出作業',
        travel_date: form.travel_date,
      }));
      const conflicting = existing
        .filter(r => r.id !== initialReport?.id)  // edit 時は自身を除外
        .filter(r => r.status !== '差戻し');
      if (conflicting.length > 0) {
        setErrors(prev => ({ ...prev, travel_date: '同一日に既に外出作業レポートが存在します（1日1件まで）' }));
        return;
      }
    }
    setGenerating(true);
    try {
      const reportData = {
        ...form,
        ...combinedFees(),
        report_type: '外出作業',
        car_allowance: carAllowance,
        total_work_expense: totalWorkExpense,
        total_amount: totalAmount,
        receipt_urls: receiptUrls,
      };
      const result = await generateReport(reportData, user, policy);
      setGeneratedReport(result);
    } finally { setGenerating(false); }
  };

  const handleSubmit = async (status) => {
    setSaving(true);
    try {
      const data = {
        ...form, ...combinedFees(), report_type: '外出作業', status,
        report_number: mode === 'edit' ? initialReport.report_number : `RPT-${Date.now().toString().slice(-8)}`,
        created_by_name: mode === 'edit' ? initialReport.created_by_name : user?.full_name,
        created_by_email: mode === 'edit' ? initialReport.created_by_email : user?.email,
        car_allowance: carAllowance,
        total_work_expense: totalWorkExpense,
        total_amount: totalAmount,
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

  const hours = workHours();

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-2xl font-bold">外出作業レポート</h1>
          <p className="text-muted-foreground text-sm mt-0.5">必要事項を入力してレポートを生成してください</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* 基本情報 */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">基本情報</CardTitle>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">前回の入力を記憶済み</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormInput label="作業日" type="date" required value={form.travel_date}
              onChange={e => set('travel_date', e.target.value)} error={errors.travel_date} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput label="作業場所（施設名）" required placeholder="〇〇コワーキングスペース"
                value={form.destination_name} onChange={e => set('destination_name', e.target.value)}
                error={errors.destination_name} />
              <FormInput label="所在地" required placeholder="東京都渋谷区〇〇"
                value={form.destination_address} onChange={e => set('destination_address', e.target.value)}
                error={errors.destination_address} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TimePicker
                label={`作業開始時刻（${policy.min_work_hours}時間以上必要）`}
                value={form.work_start_time}
                onChange={e => set('work_start_time', e.target.value)}
                error={errors.work_start_time}
              />
              <TimePicker
                label="作業終了時刻"
                value={form.work_end_time}
                onChange={e => set('work_end_time', e.target.value)}
                error={errors.work_end_time}
              />
            </div>
            {/* 作業時間バッジ */}
            {form.work_start_time && form.work_end_time && (
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                hours >= policy.min_work_hours
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-destructive border border-red-200'
              }`}>
                {hours < policy.min_work_hours && <AlertTriangle className="w-3.5 h-3.5" />}
                <Clock className="w-3.5 h-3.5" />
                作業時間: {hours.toFixed(1)}時間
                {errors.work_time && <span className="ml-1">— {errors.work_time}</span>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 業務内容 */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4"><CardTitle className="text-base">業務内容</CardTitle></CardHeader>
          <CardContent>
            <FormTextarea label="業務内容" placeholder="具体的な業務内容を入力してください"
              value={form.business_content} onChange={e => set('business_content', e.target.value)}
              error={errors.business_content} />
            <p className="text-xs text-muted-foreground mt-1">{form.business_content.length}文字</p>
          </CardContent>
        </Card>

        {/* 交通手段 */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4"><CardTitle className="text-base">交通手段</CardTitle></CardHeader>
          <CardContent>
            <TransportSelector value={form.transport_methods} onChange={v => set('transport_methods', v)}
              drivingKm={form.driving_distance_km} onDrivingKmChange={v => set('driving_distance_km', v)}
              fieldworkMode error={errors.transport_methods} />
          </CardContent>
        </Card>

        {/* 経費 */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">経費（実費精算・領収書必須）</CardTitle>
              <span className="text-xs text-muted-foreground">上限: ¥{policy.max_work_expense.toLocaleString()}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {workOnlyExpense > policy.max_work_expense && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-destructive text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {errors.expense_limit}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ['coworking_fee', 'コワーキング/貸会議室（円）'],
                ['wifi_fee', 'Wi-Fi/通信費（円）'],
                ['parking_fee', '駐車場料金（円）'],
                ['meal_fee', '飲食代（円）'],
                ['other_work_fee', 'その他業務関連費（円）'],
              ].map(([key, label]) => (
                <FormField key={key} label={label}>
                  <Input type="number" min="0"
                    value={manualFees[key] || ''}
                    onChange={e => setManualFee(key, parseFloat(e.target.value) || 0)}
                    placeholder="0" />
                </FormField>
              ))}
            </div>

            {/* 経費小計バッジ */}
            <div className="bg-muted/50 rounded-lg px-4 py-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">実費合計</span>
              <span className={`font-semibold ${workOnlyExpense > policy.max_work_expense ? 'text-destructive' : 'text-foreground'}`}>
                ¥{workOnlyExpense.toLocaleString()}
                {workOnlyExpense > 0 && ` / ¥${policy.max_work_expense.toLocaleString()}`}
              </span>
            </div>

            {/* 領収書 — useReceiptParser + ReceiptUploaderSection（A4 で抽出） */}
            <ReceiptUploaderSection
              receipts={receipts}
              handleReceiptUpload={handleReceiptUpload}
              removeReceipt={removeReceipt}
              isUploading={isUploading}
              isAnalyzing={isAnalyzing}
            />
          </CardContent>
        </Card>

        {/* 備考 */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4"><CardTitle className="text-base">備考（任意）</CardTitle></CardHeader>
          <CardContent>
            <FormTextarea placeholder="その他の備考" value={form.remarks} onChange={e => set('remarks', e.target.value)} />
          </CardContent>
        </Card>

        {/* 支給額サマリー（項目別内訳付き） */}
        <AmountSummary
          items={[
            { label: `マイカー手当（${form.driving_distance_km || 0}km × ${policy.car_allowance_per_km}円）`, amount: carAllowance },
            { label: 'コワーキング/貸会議室', amount: feeTotal('coworking_fee') },
            { label: 'Wi-Fi/通信費', amount: feeTotal('wifi_fee') },
            { label: '駐車場料金', amount: feeTotal('parking_fee') },
            { label: '飲食代', amount: feeTotal('meal_fee') },
            { label: 'その他業務関連費', amount: feeTotal('other_work_fee') },
          ]}
          total={totalAmount}
        />

        {workOnlyExpense > 0 && receiptUrls.length === 0 && (
          <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-center">
            💡 実費申請がある場合は領収書の添付を推奨します（任意）
          </p>
        )}

        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full bg-[#1a237e] hover:bg-[#1a237e]/90 text-white h-12 text-base disabled:opacity-50"
        >
          {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />AI生成中...</> : 'レポートを生成する'}
        </Button>
      </div>
    </div>
  );
}