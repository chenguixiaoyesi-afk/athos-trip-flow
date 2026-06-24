import { base44 } from '@/api/base44Client';
import { resolveCompanyId } from '@/lib/tenantScope';

// 通知ヘルパー集約モジュール（A5 で新規導入 / A13 で会社スコープ化）。
// 設計原則:
//   - すべてのヘルパーは throw しない（呼出元の status 遷移を破壊しない）
//   - SendEmail / User.filter の失敗は try-catch で吸収して log のみ
//   - fire-and-forget セマンティクス（呼出元は await するが戻り値や例外を待たない）
//   - DRY: 呼出元から base44.integrations.Core.SendEmail を直接呼ばない（必ずこのモジュール経由）
//   - A13: 通知先は「その会社の承認者（companyAdmin / manager）」に限定。
//          会社をまたいで管理者へ漏れないようにする（テナント分離）。

// 共通: ある会社の通知先（承認者）メール一覧。company_id でサーバ絞り込み（RLS とも整合）。
//   app_role が companyAdmin / manager の User を対象。レガシー role:'admin'（app_role 未設定）も後方互換で含む。
//   失敗時は空配列を返し、呼出元の status 遷移をブロックしない。
async function getCompanyApproverEmails(companyId) {
  if (!companyId) return [];
  try {
    const users = await base44.entities.User.filter({ company_id: companyId });
    return (users || [])
      .filter(u => {
        const role = u?.app_role;
        if (role === 'companyAdmin' || role === 'manager' || role === 'systemOwner') return true;
        // 後方互換: app_role 未設定の旧 admin
        if (!role && u?.role === 'admin') return true;
        return false;
      })
      .map(u => u?.email)
      .filter(email => typeof email === 'string' && email.includes('@'));
  } catch (e) {
    console.warn('[notifications] Failed to fetch company approver emails', e);
    return [];
  }
}

// 共通: 安全な SendEmail 呼出（throw しない、log のみ）
async function safeSend({ to, subject, body }) {
  if (!to || (Array.isArray(to) && to.length === 0)) {
    console.warn('[notifications] Skipped: empty recipient list');
    return;
  }
  try {
    await base44.integrations.Core.SendEmail({ to, subject, body });
  } catch (e) {
    console.warn('[notifications] SendEmail failed', e);
    // 意図的に rethrow しない（呼出元の status 遷移を守る）
  }
}

// 申請通知（申請者 → 全管理者）
// 件名: [申請] RPT-XXXXXXXX 種別 - 申請者名
export async function notifySubmitted({ report }) {
  // A13: 申請者の会社の承認者のみに通知（resolveCompanyId は表示補助フォールバック）。
  const adminEmails = await getCompanyApproverEmails(resolveCompanyId(report));
  const subject = `[申請] ${report.report_number} ${report.report_type} - ${report.created_by_name}`;
  const body = `${report.created_by_name} さんから ${report.report_type} の申請がありました。

報告書番号: ${report.report_number}
種別: ${report.report_type}
申請者: ${report.created_by_name}
合計支給額: ¥${(report.total_amount || 0).toLocaleString()}

承認管理画面でご確認ください。`;
  await safeSend({ to: adminEmails, subject, body });
}

// 承認通知（承認者 → 申請者）
// 件名: [承認] RPT-XXXXXXXX 種別
export async function notifyApproved({ report, approverName }) {
  const to = report?.created_by_email;
  const subject = `[承認] ${report.report_number} ${report.report_type}`;
  const body = `${report.created_by_name} さん

${report.report_type}（${report.report_number}）の申請が承認されました。

承認者: ${approverName || '（不明）'}
合計支給額: ¥${(report.total_amount || 0).toLocaleString()}

詳細は申請詳細画面でご確認ください。`;
  await safeSend({ to, subject, body });
}

// 差戻し通知（承認者 → 申請者、差戻し理由を本文に含む）
// 件名: [差戻し] RPT-XXXXXXXX 種別
export async function notifyRejected({ report, approverName, rejectionReason }) {
  const to = report?.created_by_email;
  const subject = `[差戻し] ${report.report_number} ${report.report_type}`;
  const body = `${report.created_by_name} さん

${report.report_type}（${report.report_number}）の申請が差戻されました。

差戻し理由:
${rejectionReason || '（理由未指定）'}

承認者: ${approverName || '（不明）'}
合計支給額: ¥${(report.total_amount || 0).toLocaleString()}

申請詳細画面から内容を修正し、再申請してください。`;
  await safeSend({ to, subject, body });
}

// 月次集計通知（システム → 全管理者）— A6 で追加
// 件名: [月次集計] YYYY年M月 旅費精算サマリ
// 本文: aggregation.js の formatSummaryForEmail 由来の plain text + CSV を末尾埋め込み
// （Base44 SendEmail の添付ファイルサポート未検証のため A6 最小実装。添付化は A7+ で再検討）
export async function notifyMonthlySummary({ year, month, summary, csvContent, companyId }) {
  // A13: 集計対象会社の承認者のみに送信（呼出元 Summary が effectiveCompanyId を渡す）。
  const adminEmails = await getCompanyApproverEmails(companyId);
  const subject = `[月次集計] ${year}年${month}月 旅費精算サマリ`;
  const body = summary || `${year}年${month}月の集計データを送信します。`;
  const bodyWithCsv = csvContent
    ? `${body}

--- CSV データ（コピーしてファイル保存可） ---
${csvContent}`
    : body;
  await safeSend({ to: adminEmails, subject, body: bodyWithCsv });
}
