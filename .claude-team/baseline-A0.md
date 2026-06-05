# Baseline A0 — 凍結ベースライン文書

Phase: A0  
作成日時: 2026-06-05  
作成者: Implementation Agent  
出典: `package.json`, `src/HANDOFF.md`, `grep -rn "base44\." src` 実行結果

本書は事実台帳である。解釈・提案・改善案は一切含めない。

---

## 1. ビルド検証結果

| 項目 | コマンド | 結果 | 備考 |
|---|---|---|---|
| 依存解決 | `npm install` | 成功（exit 0） | 625 packages audited / 20 vulnerabilities (12 moderate, 8 high) |
| Lint | `npm run lint` | exit 0 だが **errors=12, warnings=0** | DONE CRITERIA「errors=0」未達。詳細は下記 |
| Build | `npm run build` | 成功（exit 0） | `dist/index.html` 生成確認済 |

完了時刻（ローカル）: 2026-06-05（Implementation Agent 実行時点）

### Lint エラー詳細（出力そのまま転記）

```
/Users/taaa_14/Desktop/システム開発/athos-trip-flow/src/components/forms/DayTripForm.jsx
  8:10  error  'Label' is defined but never used  unused-imports/no-unused-imports

/Users/taaa_14/Desktop/システム開発/athos-trip-flow/src/pages/Approval.jsx
  2:10  error  'Link' is defined but never used          unused-imports/no-unused-imports
  9:41  error  'ChevronRight' is defined but never used  unused-imports/no-unused-imports

/Users/taaa_14/Desktop/システム開発/athos-trip-flow/src/pages/Dashboard.jsx
  8:10  error  'Badge' is defined but never used  unused-imports/no-unused-imports

/Users/taaa_14/Desktop/システム開発/athos-trip-flow/src/pages/PolicyManagement.jsx
  10:40  error  'AlertTriangle' is defined but never used  unused-imports/no-unused-imports
  11:10  error  'format' is defined but never used         unused-imports/no-unused-imports
  12:8   error  'ReactMarkdown' is defined but never used  unused-imports/no-unused-imports

/Users/taaa_14/Desktop/システム開発/athos-trip-flow/src/pages/ReportNew.jsx
  3:10  error  'Card' is defined but never used         unused-imports/no-unused-imports
  3:16  error  'CardContent' is defined but never used  unused-imports/no-unused-imports
  3:29  error  'CardHeader' is defined but never used   unused-imports/no-unused-imports
  3:41  error  'CardTitle' is defined but never used    unused-imports/no-unused-imports
  4:10  error  'Button' is defined but never used       unused-imports/no-unused-imports

✖ 12 problems (12 errors, 0 warnings)
  12 errors and 0 warnings potentially fixable with the `--fix` option.
```

### Build 出力（そのまま転記）

```
> base44-app@0.0.0 build
> vite build

[base44] Proxy not enabled (VITE_BASE44_APP_BASE_URL not set)
```

dist 直下の生成物（`ls -la dist/`）:
```
drwxr-xr-x   4 taaa_14  staff   128  6  5 15:50 .
drwx------@ 21 taaa_14  staff   672  6  5 15:50 ..
drwxr-xr-x   4 taaa_14  staff   128  6  5 15:50 assets
-rw-r--r--   1 taaa_14  staff  1508  6  5 15:50 index.html
```

---

## 2. 主要依存バージョン

出典: `/Users/taaa_14/Desktop/システム開発/athos-trip-flow/package.json` の `dependencies` および `devDependencies`

| パッケージ | バージョン指定 |
|---|---|
| `@base44/sdk` | `^0.8.31` |
| `react` | `^18.2.0` |
| `vite` | `^6.1.0`（devDependencies） |
| `tailwindcss` | `^3.4.17`（devDependencies） |
| `@tanstack/react-query` | `^5.84.1` |
| `react-router-dom` | `^6.26.0` |

---

## 3. 現状実装インベントリ

出典: `/Users/taaa_14/Desktop/システム開発/athos-trip-flow/src/HANDOFF.md` 「✅ 実装済み」表（原文そのまま引用）

| 機能 | 場所 |
|---|---|
| 4種類レポート作成（日帰り/宿泊/海外/外出作業） | `components/forms/*Form.jsx` |
| AI自動レポート文章生成（常体・段落形式） | `lib/reportGenerator.js` |
| 領収書アップロード + AI自動仕分け・経費反映 | `components/forms/FieldworkForm.jsx` |
| 承認ワークフロー（申請→承認/差戻し/再申請） | `pages/Approval.jsx` |
| 支給額内訳テーブル | `pages/ReportDetail.jsx` |
| 管理者集計ダッシュボード（月次・年次・ユーザー別） | `pages/Summary.jsx` |
| CSVエクスポート | `pages/Summary.jsx` |
| 旅費規程PDF取込 + AI解析 + diff適用 | `pages/PolicyManagement.jsx` |
| 規程値グローバル参照（PolicyContext） | `lib/policyContext.jsx` |
| バリデーション（距離・時間・経費上限・1日1件） | 各Formコンポーネント |
| localStorage入力永続化 | `FieldworkForm`, `OvernightTripForm` 等 |
| ロールベース表示切り替え（admin/user） | `components/Layout.jsx` |

---

## 4. 既知の不具合

出典: `/Users/taaa_14/Desktop/システム開発/athos-trip-flow/src/HANDOFF.md` 「🐛 既知の不具合」表（原文そのまま引用）

| 不具合 | 詳細 | 対処 |
|---|---|---|
| 宿泊・海外フォームの1日1件チェック未実装 | 日帰り・外出作業のみチェックあり | 各Formに同様のチェック追加が必要 |
| AI生成レポートの精算書分割が不安定 | `## 旅費精算書` or `## 経費精算書` で分割しているが、AIが見出し名を変えることがある | `reportGenerator.js` のプロンプトに見出し名を固定で指定済みだが稀に崩れる |
| 領収書AI解析で金額0を反映する場合がある | AIが金額を0と読み取った場合もフォームに加算される | `if (parsed.amount && parsed.amount > 0)` のチェックは入っているが、認識精度依存 |
| FieldworkForm の receiptData が receiptFiles と添字ずれする可能性 | 複数ファイルを同時アップロードした際の非同期競合 | 現状は順次処理だが並列になると崩れる |

---

## 5. Base44 SDK 呼び出し一覧

出典: `grep -rn "base44\." src` 実行結果（ファイル単位で集計）

### コードファイル（`.jsx` / `.js`）

| ファイル | 出現件数 |
|---|---|
| `src/pages/PolicyManagement.jsx` | 6 |
| `src/pages/Register.jsx` | 5 |
| `src/pages/Approval.jsx` | 4 |
| `src/lib/AuthContext.jsx` | 4 |
| `src/components/forms/FieldworkForm.jsx` | 4 |
| `src/pages/ReportDetail.jsx` | 3 |
| `src/pages/Summary.jsx` | 2 |
| `src/pages/ReportList.jsx` | 2 |
| `src/pages/Dashboard.jsx` | 2 |
| `src/pages/ResetPassword.jsx` | 1 |
| `src/pages/Login.jsx` | 1 |
| `src/pages/ForgotPassword.jsx` | 1 |
| `src/lib/reportGenerator.js` | 1 |
| `src/lib/policyContext.jsx` | 1 |
| `src/lib/PageNotFound.jsx` | 1 |
| `src/components/Layout.jsx` | 1 |
| `src/components/forms/OverseasTripForm.jsx` | 1 |
| `src/components/forms/OvernightTripForm.jsx` | 1 |
| `src/components/forms/DayTripForm.jsx` | 1 |
| **コード合計** | **42** |

### 文書ファイル（参考、SDK 実呼び出しではない）

| ファイル | 出現件数 |
|---|---|
| `src/HANDOFF.md` | 7 |
| `src/README.md` | 3 |

### grep 生出力（コードファイル分のみ抜粋・行番号付き）

```
src/components/Layout.jsx:29:    base44.auth.logout('/login');
src/components/forms/FieldworkForm.jsx:146:        const { file_url } = await base44.integrations.Core.UploadFile({ file });
src/components/forms/FieldworkForm.jsx:154:          const parsed = await base44.integrations.Core.InvokeLLM({
src/components/forms/FieldworkForm.jsx:214:      const existing = await base44.entities.Report.filter({
src/components/forms/FieldworkForm.jsx:254:      const saved = await base44.entities.Report.create(data);
src/pages/Summary.jsx:37:        data = await base44.entities.Report.filter({ status: '承認済' }, '-created_date', 500);
src/pages/Summary.jsx:39:        data = await base44.entities.Report.filter({ created_by_id: user?.id, status: '承認済' }, '-created_date', 200);
src/pages/ReportList.jsx:39:        data = await base44.entities.Report.list('-created_date', 100);
src/pages/ReportList.jsx:41:        data = await base44.entities.Report.filter({ created_by_id: user?.id }, '-created_date', 100);
src/pages/ResetPassword.jsx:28:      await base44.auth.resetPassword({ resetToken, newPassword });
src/pages/Login.jsx:21:      await base44.auth.loginViaEmailPassword(email, password);
src/pages/Approval.jsx:35:    const data = await base44.entities.Report.filter({ status: '申請中' }, '-created_date', 100);
src/pages/Approval.jsx:42:    await base44.entities.Report.update(reportId, {
src/pages/Approval.jsx:55:    await base44.entities.Report.update(selected.id, {
src/pages/Approval.jsx:70:      await base44.entities.Report.update(id, {
src/components/forms/OverseasTripForm.jsx:75:      const saved = await base44.entities.Report.create(data);
src/components/forms/DayTripForm.jsx:105:      const saved = await base44.entities.Report.create(data);
src/components/forms/OvernightTripForm.jsx:90:      const saved = await base44.entities.Report.create(data);
src/lib/AuthContext.jsx:96:      const currentUser = await base44.auth.me();
src/lib/AuthContext.jsx:123:      base44.auth.logout(window.location.href);
src/lib/AuthContext.jsx:126:      base44.auth.logout();
src/lib/AuthContext.jsx:132:    base44.auth.redirectToLogin(window.location.href);
src/lib/reportGenerator.js:242:  const result = await base44.integrations.Core.InvokeLLM({ prompt });
src/lib/PageNotFound.jsx:14:                const user = await base44.auth.me();
src/lib/policyContext.jsx:22:    base44.entities.TravelPolicyMaster.filter({ is_active: true }, '-created_date', 1)
src/pages/ForgotPassword.jsx:19:      await base44.auth.resetPasswordRequest(email);
src/pages/PolicyManagement.jsx:35:    const data = await base44.entities.TravelPolicyMaster.list('-created_date', 20);
src/pages/PolicyManagement.jsx:45:      const { file_url } = await base44.integrations.Core.UploadFile({ file });
src/pages/PolicyManagement.jsx:49:      const result = await base44.integrations.Core.InvokeLLM({
src/pages/PolicyManagement.jsx:115:      if (p.is_active) await base44.entities.TravelPolicyMaster.update(p.id, { is_active: false });
src/pages/PolicyManagement.jsx:118:    await base44.entities.TravelPolicyMaster.update(policyId, { is_active: true });
src/pages/PolicyManagement.jsx:134:      await base44.entities.TravelPolicyMaster.create(data);
src/pages/Dashboard.jsx:41:        data = await base44.entities.Report.list('-created_date', 50);
src/pages/Dashboard.jsx:43:        data = await base44.entities.Report.filter({ created_by_id: user?.id }, '-created_date', 50);
src/pages/ReportDetail.jsx:58:    base44.entities.Report.filter({ id }).then(results => {
src/pages/ReportDetail.jsx:70:    await base44.entities.Report.update(id, { status: '申請中' });
src/pages/ReportDetail.jsx:77:    await base44.entities.Report.delete(id);
src/pages/Register.jsx:31:      await base44.auth.register({ email, password });
src/pages/Register.jsx:44:      const result = await base44.auth.verifyOtp({ email, otpCode });
src/pages/Register.jsx:46:        base44.auth.setToken(result.access_token);
src/pages/Register.jsx:59:      await base44.auth.resendOtp(email);
src/pages/Register.jsx:70:    base44.auth.loginWithProvider("google", "/");
```
