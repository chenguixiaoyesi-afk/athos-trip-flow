# Roadmap — athos-trip-flow（A0〜A8）

保持者: Design Agent
策定日: 2026-06-05
改訂: 2026-06-05（業務フロー軸で全 9 フェーズを再設計）

**原則**: 本ファイルは Design Agent のみ更新可。各フェーズの詳細仕様は別ファイル（`handoff/design-handoff-A{n}.md`）に置く。

---

## 全 Agent・全フェーズ共通制約

### REPOSITORY ISOLATION RULE（最優先）
A0〜A8 のいずれのフェーズも、Athos TravelMate **このリポジトリのみ** を参照対象とする。詳細・参照禁止リスト・違反時の `FOREIGN CONTEXT DETECTED` 停止手順は **`goal.md` §0 を正本** とする。

### AUTO HANDOFF ORCHESTRATION RULE
A0〜A8 のすべてで二段ゲート運用を行う。詳細は `auto-handoff.md` 正本。

### IMPLEMENTATION SAFETY RULE
handoff の DO 項目着手前に対象 entity / role / route / feature の実コード grep 確認を実施。不在なら `ASSUMPTION DETECTED` で停止。

---

## 根拠ソース（このリポジトリのみ）

| ソース | 役割 |
|---|---|
| `src/HANDOFF.md` | 実装済 / 未実装 / 既知不具合 / P0〜P2 |
| `package.json` / `README.md` | 採用ライブラリ・起動手順 |
| `src/**` 実コード | HANDOFF.md と実装の差異検証（実コード優先） |

### 実コード検証で確定した差異（HANDOFF.md より優先）
- 1 日 1 件チェック実装は **`FieldworkForm` のみ**（`DayTripForm` にも未実装）
- 領収書 AI 仕分け実装は **`FieldworkForm` のみ**
- レポート編集は `canEdit` フラグはあるが `/edit` ルートも編集ボタンも未実装
- 認証画面に `Register.jsx` / `ForgotPassword.jsx` / `ResetPassword.jsx` が存在（HANDOFF.md の pages 表に未記載）

---

## 業務フロー全体像

```
社員 → レポート作成 → AI補完 → 承認 → 集計 → CSV → 旅費規定監査
 │       │            │       │      │      │       │
 A1      A2,A3        A4      A5     A6     A7      A8
```

A0 は全体の土台（環境凍結・3Agent インフラ）。

---

## フェーズ一覧（業務フロー軸）

| Phase | 業務フロー段 | テーマ | 状態 |
|---|---|---|---|
| **A0** | （メタ） | Foundation: 環境凍結 + チーム開発インフラ | 完了 |
| **A1** | 社員 | 社員入口の信頼性（受信データ整合性 / 既知不具合 #4） | 未着手 |
| **A2** | レポート作成 | 4 フォーム整合性（1 日 1 件チェック展開 / 既知不具合 #1） | 未着手 |
| **A3** | レポート作成 | レポート編集経路の追加（HANDOFF.md P0 #1） | 未着手 |
| **A4** | AI 補完 | 領収書 AI の全フォーム展開 + 精算書安定化 + 金額 0 ガード（P0 #2 + 既知 #2 #3） | 未着手 |
| **A5** | 承認 | メール通知（申請/承認/差戻し）（P0 #3） | 未着手 |
| **A6** | 集計 | 月次集計の自動配信（P1 #6） | 未着手 |
| **A7** | CSV | CSV 出力フォーマット固定 + 大量データ対応 | 未着手 |
| **A8** | 旅費規定監査 | 規程変更履歴 + 影響範囲追跡 | 未着手 |

### スコープ外（HANDOFF.md「将来要件」明記分）
- 複数会社マルチテナント対応
- 交通費 IC 連携
- 多段階承認（HANDOFF.md P2 #8、本ロードマップでは対象外）
- 一括申請 UI（HANDOFF.md P2 #7、本ロードマップでは対象外）
- PWA 化（HANDOFF.md P2 #9、本ロードマップでは対象外）

---

## MVP 達成定義

業務フローの **A1〜A5 完了時点** で MVP 完成。

1. 招待された社員がログインし、自分のレポートのみにアクセスできる（既存）
2. 4 種別すべてで「下書き → 編集 → 申請 → 承認/差戻し」が通る（A2, A3）
3. 4 種別すべてで領収書 AI 仕分けと AI 本文生成が動作（A4）
4. 申請/承認/差戻しの 3 イベントでメール通知が当事者に届く（A5）
5. 上記が既知不具合 4 件の影響を受けずに動作する（A1, A2, A4 で全件解消）

A6〜A8 は **MVP 完成後の運用品質向上**（自動配信・CSV 監査品質・規程履歴）。

---

## フェーズ別 完成 / 非実装 / レビュー条件

### A0 — Foundation（完了）
**完成**: `.claude-team/` 二段ゲート運用、ベースライン文書、lint/build 緑
**非実装**: `src/**` への変更一切
**レビュー条件**: src 無変更 / lint errors 0 / build 成功 / baseline-A0.md 5 章揃い

### A1 — 社員入口の信頼性
**完成**:
- `FieldworkForm` の `receiptData` / `receiptFiles` / `receiptUrls` 並列整合性確保（既知不具合 #4）
- 認証エラー表示分岐（`UserNotRegisteredError` / `auth_required`）の挙動確認

**非実装**:
- 領収書 AI 他フォーム展開（A4）
- 1 日 1 件チェック他フォーム展開（A2）
- レポート編集経路（A3）
- メール通知（A5）
- 新規ルート / 新規ページ
- 認証方式の変更

**レビュー条件**:
- 並列 3 枚アップロードで `receiptData[i]` と `receiptFiles[i]` が常に一致
- 招待されていないメールで `UserNotRegisteredError` が表示
- 既存 4 フォームの単件作成・申請に regression なし
- lint/build 緑

### A2 — レポート作成・整合性（4 フォーム 1 日 1 件チェック展開）
**完成**:
- `DayTripForm` / `OvernightTripForm` / `OverseasTripForm` の 3 フォームに 1 日 1 件チェック追加（既知不具合 #1）
- `FieldworkForm` と等価な重複判定（`existing.filter(r => r.status !== '差戻し')`）
- 4 フォームのバリデーションエラー表示統一

**非実装**:
- レポート編集経路（A3）
- 領収書 AI 他フォーム展開（A4）
- AI 精算書見出し安定化（A4）
- 重複検知ロジックの共通フック化（3 度目の重複が出るまで素朴複製でよい）
- 新規ルート / 新規エンティティ

**レビュー条件**:
- 4 種別で同一日 2 件目作成が拒否される（種別ごとに 1 パス）
- 「差戻し」状態のレポートは重複判定から除外
- 既存単件作成・申請に regression なし
- lint/build 緑

### A3 — レポート編集経路
**完成**:
- 新規ルート `/reports/:id/edit`（`src/App.jsx`）
- 新規ページ `src/pages/ReportEdit.jsx`
- 4 種別フォームに `mode` prop（`create` / `edit`）分岐
- 編集可能 status は `ReportDetail.jsx` の `canEdit` 定義に従う（下書き / 差戻し）
- 保存は `base44.entities.Report.update(id, data)`
- `ReportDetail` に編集ボタン追加（`canEdit` 真）

**非実装**:
- 申請中・承認済の編集
- 編集履歴 / 差分可視化
- 楽観ロック / 競合検知
- メール通知（A5）

**レビュー条件**:
- 4 種別で「下書き → 編集 → 申請」「差戻し → 編集 → 再申請」のサイクル通過
- 申請中・承認済で編集ボタン非表示
- 削除→再作成不要で修正可能（手動 E2E）
- 過去レポート表示が壊れない
- lint/build 緑

### A4 — AI 補完（領収書 AI 全フォーム展開 + 精算書安定化 + 金額 0 ガード）
**完成**:
- `src/hooks/useReceiptParser.js` 新規（`FieldworkForm` の領収書 AI ロジックを抽出）
- 3 フォーム（DayTrip / Overnight / Overseas）に展開
- `lib/reportGenerator.js` のプロンプト強化で精算書見出し名固定（既知 #2）
- 金額 0 加算ガード強化（既知 #3）
- CATEGORY_MAP の共通化または種別別拡張の判断を文書化

**非実装**:
- 新規 AI モデル接続
- 編集中の領収書差し替え UI
- 規程 PDF 解析改善（A8）
- メール通知（A5）

**レビュー条件**:
- 4 フォームで領収書アップロード→経費欄自動反映（種別ごとに 1 パス）
- 並列 3 枚で添字崩れなし（A1 成果踏襲）
- 精算書見出しが「## 旅費精算書」または「## 経費精算書」に固定（10 サンプル）
- 金額 0 の領収書を加算しない
- `FieldworkForm` 既存機能の劣化なし
- lint/build 緑

### A5 — 承認（メール通知）
**完成**:
- `base44.integrations.Core.SendEmail` による 3 イベント通知
  - 申請: 申請者 → 承認者
  - 承認: 承認者 → 申請者
  - 差戻し: 承認者 → 申請者（差戻し理由を本文に）
- 件名・本文に `report_number`, `report_type`, `total_amount`, `created_by_name` 埋め込み
- メール失敗時もレポート status 遷移は成立

**非実装**:
- 多段階承認
- メール通知 ON/OFF UI
- メール送信履歴の DB 永続化
- 通知テンプレ管理 UI
- Slack/Teams 連携

**レビュー条件**:
- 3 イベントで `SendEmail` が呼ばれる（Base44 サンドボックスで検証）
- メール本文に正しい Report 値
- メール失敗時も status 正常遷移
- 既存承認/差戻し動作に regression なし
- lint/build 緑

> **A5 完了時点で MVP 達成**

### A6 — 集計（月次自動配信）
**完成**:
- Base44 Automation scheduled trigger で毎月 1 日に管理者へ前月集計メール
- 既存 `Summary.jsx` ロジック再利用（月次・ユーザー別・種別別小計）
- メール本文に集計表 + CSV 添付（または DL URL）
- 失敗時リトライ方針を `baseline-A6.md` に文書化

**非実装**:
- `Summary.jsx` UI 変更
- 年次自動配信
- 配信履歴の DB 永続化
- 配信先カスタマイズ UI

**レビュー条件**:
- 手動トリガで配信
- スケジュール起動が Base44 ダッシュボードで確認可能
- 集計値が手動 `Summary.jsx` 表示と一致
- 既存 Summary に regression なし
- lint/build 緑

### A7 — CSV 出力（フォーマット固定 + 大量データ）
**完成**:
- CSV 列順・ヘッダ名を監査要件で固定（`baseline-A7.md` に明示）
- 任意期間 + 対象（全件/ユーザー別/種別別）絞り込み
- 500 件超でフリーズしない（実装手段は Implementation Agent 判断）
- BOM 付き UTF-8（Excel 直接開封）

**非実装**:
- PDF 出力
- 列カスタマイズ UI
- CSV 出力履歴 DB 保存
- 集計ロジック再設計

**レビュー条件**:
- 新フォーマットで出力（列名 baseline 一致）
- Excel で文字化けなし
- 500 件・1000 件で動作
- 任意 1 月で既存集計値と一致
- lint/build 緑

### A8 — 旅費規定監査（規程変更履歴 + 影響範囲追跡）
**完成**:
- `TravelPolicyMaster` 差分履歴の時系列閲覧（既存 `is_active` + `created_date` を活用）
- 規程適用前後で計算値が変わる過去レポート抽出ビュー（`PolicyManagement.jsx` 拡張）
- PDF 取込時の AI 解析と適用前 diff 表示
- 規程変更時の影響サマリ（件数 + 金額差）

**非実装**:
- 過去レポートへの遡及計算反映（業務ルール）
- 規程承認ワークフロー（多段階）
- 規程比較の外部公開
- 新規 `AuditLog` エンティティ（HANDOFF.md に要求なし）

**レビュー条件**:
- 規程一覧で過去バージョン閲覧可
- 影響範囲（件数 + 金額差）表示
- 既存 PDF 取込・適用フロー不破壊
- 監査担当が CSV と規程履歴で監査完結（業務シナリオ 1 パス）
- lint/build 緑

---

## 補助ロードマップ（軸別）

### DB
- A0 既存スキーマ凍結 / A1〜A7 スキーマ変更なし / A8 スキーマ変更なし（既存 `TravelPolicyMaster` の `created_date` 履歴活用）

### 権限
- A0〜A8 を通じて `admin` / `user` 2 ロールを維持

### RLS
- A0〜A8 を通じて Base44 既定挙動に依存。本ロードマップで独自 RLS フェーズは設けない

### UI
- A0 変更なし / A1 既存維持 / A2 バリデーション表示統一 / A3 `ReportEdit.jsx` + 編集ボタン / A4 `useReceiptParser` 抽出（UI 表面の変化なし） / A5 トースト文言調整のみ / A6 変更なし / A7 CSV フィルタ UI 追加（既存 Summary 内） / A8 規程履歴ビューア追加（既存 PolicyManagement 内）

### Review
各フェーズの「レビュー条件」セクションが正本。lint/build 緑は全フェーズ共通の最低要件。

---

## 進行管理

- 現在フェーズ: `.claude-team/current-phase.txt`
- 仕様正本: `.claude-team/handoff/design-handoff-A{n}.md`
- 設計レビュー: `.claude-team/design-reviews/`
- 実装証跡: `.claude-team/review-packages/review-package-A{n}.md`
- 判定: `.claude-team/verdicts/verdict-A{n}.md`

Review Agent の宣言形式（実装後ゲート、合格時のみ）:
```
APPROVED
PHASE COMPLETE
NEXT PHASE: A{n+1}
```

---

## 改訂履歴
- 2026-06-05 初版（汎用フェーズ案）
- 2026-06-05 Athos TravelMate 専用に再定義（HANDOFF.md P0/P1/P2 対応）
- 2026-06-05 業務フロー軸で全 9 フェーズを再設計。MVP を A1〜A5 完了として再定義。A6〜A8 は MVP 後の運用品質向上に位置づけ。多段階承認/一括申請/PWA をスコープ外として明記
