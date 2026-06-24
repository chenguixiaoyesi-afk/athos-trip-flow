import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { assertSameTenant } from '@/lib/tenantScope';
import DayTripForm from '@/components/forms/DayTripForm';
import OvernightTripForm from '@/components/forms/OvernightTripForm';
import OverseasTripForm from '@/components/forms/OverseasTripForm';
import FieldworkForm from '@/components/forms/FieldworkForm';

export default function ReportEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, tenant } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // A13: テナント未確定（無所属など）は fail-closed で編集不可。
    if (!tenant) {
      setReport(null);
      setLoading(false);
      return;
    }
    base44.entities.Report.filter({ id }).then(results => {
      const found = results?.[0] || null;
      // A13: 別テナントのレポートは「見つからない」扱い（UX 早期遮断。最終防御は RLS）。
      setReport(found && assertSameTenant(tenant, found) ? found : null);
      setLoading(false);
    });
  }, [id, tenant]);

  if (loading) return <div className="p-8 text-center text-muted-foreground">読み込み中...</div>;
  if (!report) return <div className="p-8 text-center text-muted-foreground">レポートが見つかりません</div>;

  // canEdit は ReportDetail.jsx と完全に同一の真理値式（敢えて複製、共通化は将来）
  const isOwner = report.created_by_id === user?.id;
  const canEdit = isOwner && (report.status === '下書き' || report.status === '差戻し');
  if (!canEdit) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        このレポートは編集できません（申請中または承認済、または所有者ではありません）
      </div>
    );
  }

  const onBack = () => navigate(`/reports/${id}`);

  if (report.report_type === '日帰り出張') return <DayTripForm onBack={onBack} mode="edit" initialReport={report} />;
  if (report.report_type === '宿泊出張') return <OvernightTripForm onBack={onBack} mode="edit" initialReport={report} />;
  if (report.report_type === '海外出張') return <OverseasTripForm onBack={onBack} mode="edit" initialReport={report} />;
  if (report.report_type === '外出作業') return <FieldworkForm onBack={onBack} mode="edit" initialReport={report} />;

  return (
    <div className="p-8 text-center text-muted-foreground">
      不明なレポート種別です: {report.report_type}
    </div>
  );
}
