# Athos TravelMate — Claude Code 引き継ぎ資料

作成日: 2026-06-05  
開発環境: Base44 (base44.com) ← GitHub 2-way sync → Claude Code  
リポジトリ: https://github.com/[YOUR_ORG]/athos-travelmate

---

## アプリ目的

株式会社Athos 社内向け **旅費・外出作業経費精算システム**。

- 社員が出張・外出作業のレポートをスマホ/PCから作成・申請
- 管理者が承認/差戻しを行う
- AI（GPT-4o-mini）がレポート文章を自動生成
- 旅費規程（PDF）をAIが読み取り、規程値を自動更新
- 領収書写真をAIが自動仕分けして経費欄に反映

---

## 現在の実装状況

### ✅ 実装済み

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

### 🔲 未実装

| 機能 | 優先度 | 備考 |
|---|---|---|
| メール通知（申請・承認・差戻し時） | 高 | `base44.integrations.Core.SendEmail` で実装可 |
| 月次集計の自動レポート送信（定期） | 中 | Base44 Automation (scheduled) で実装可 |
| 申請時のプッシュ通知 | 中 | - |
| 宿泊出張フォームへの領収書AI仕分け | 中 | FieldworkFormと同様の実装が必要 |
| 日帰り出張フォームへの領収書AI仕分け | 中 | 同上 |
| レポート編集機能（下書き修正） | 高 | 現状は削除→再作成が必要 |
| モバイルカメラ起動の最適化 | 低 | `capture="environment"` は実装済み |
| 複数会社マルチテナント対応 | 低 | 将来要件 |
| 交通費IC連携 | 低 | 将来要件 |

### 🐛 既知の不具合

| 不具合 | 詳細 | 対処 |
|---|---|---|
| 宿泊・海外フォームの1日1件チェック未実装 | 日帰り・外出作業のみチェックあり | 各Formに同様のチェック追加が必要 |
| AI生成レポートの精算書分割が不安定 | `## 旅費精算書` or `## 経費精算書` で分割しているが、AIが見出し名を変えることがある | `reportGenerator.js` のプロンプトに見出し名を固定で指定済みだが稀に崩れる |
| 領収書AI解析で金額0を反映する場合がある | AIが金額を0と読み取った場合もフォームに加算される | `if (parsed.amount && parsed.amount > 0)` のチェックは入っているが、認識精度依存 |
| FieldworkForm の receiptData が receiptFiles と添字ずれする可能性 | 複数ファイルを同時アップロードした際の非同期競合 | 現状は順次処理だが並列になると崩れる |

---

## ディレクトリ構成

```
athos-travelmate/
├── index.html
├── index.css                     # Tailwind + CSS変数（デザイントークン）
├── tailwind.config.js
├── main.jsx                      # Reactエントリーポイント
├── App.jsx                       # React Router ルート定義
├── HANDOFF.md                    # ← このファイル
├── README.md
├── .env.example
│
├── api/
│   └── base44Client.js           # Base44 SDK 初期化 (base44 export)
│
├── lib/
│   ├── AuthContext.jsx            # 認証コンテキスト・useAuth()
│   ├── policyContext.jsx          # 旅費規程コンテキスト・usePolicy()
│   ├── reportGenerator.js         # AI レポート生成プロンプト + 実行
│   ├── app-params.js              # Base44 appId / token 取得ユーティリティ
│   ├── query-client.js            # TanStack Query クライアント
│   └── utils.js                   # cn() など共通ユーティリティ
│
├── pages/
│   ├── Login.jsx                  # ログイン画面
│   ├── Dashboard.jsx              # マイダッシュボード
│   ├── ReportNew.jsx              # 種別選択 → フォーム切替
│   ├── ReportList.jsx             # レポート一覧・検索・フィルタ
│   ├── ReportDetail.jsx           # 詳細・申請・削除
│   ├── Approval.jsx               # 管理者承認画面
│   ├── Summary.jsx                # 集計・CSV出力
│   └── PolicyManagement.jsx       # 旅費規程管理（PDF取込）
│
├── components/
│   ├── Layout.jsx                 # サイドバーレイアウト（ロールベースナビ）
│   ├── ReportPreview.jsx          # AI生成レポートプレビュー
│   ├── UserNotRegisteredError.jsx
│   ├── AuthLayout.jsx
│   ├── ProtectedRoute.jsx
│   ├── ScrollToTop.jsx
│   │
│   ├── forms/
│   │   ├── DayTripForm.jsx        # 日帰り出張
│   │   ├── OvernightTripForm.jsx  # 宿泊出張
│   │   ├── OverseasTripForm.jsx   # 海外出張
│   │   ├── FieldworkForm.jsx      # 外出作業（AI領収書仕分け）
│   │   ├── AmountSummary.jsx      # 支給額サマリーカード
│   │   ├── FormField.jsx          # 汎用ラベル付きフィールド
│   │   └── TransportSelector.jsx  # 交通手段チェックボックス
│   │
│   └── ui/                        # shadcn/ui（button, card, input, select ...）
│
├── entities/                       # Base44 DB スキーマ (JSON Schema)
│   ├── Report.json
│   └── TravelPolicyMaster.json
│
├── hooks/
│   └── use-mobile.jsx
│
└── utils/
    └── index.ts
```

---

## 主要ページ

| ページ | パス | 権限 | 説明 |
|---|---|---|---|
| Dashboard | `/` | 全員 | 申請状況・最近のレポート・月次統計 |
| ReportNew | `/reports/new` | 全員 | 種別選択 → 対応フォームを表示 |
| ReportList | `/reports` | 全員 | レポート一覧。adminは全件、userは自分のみ |
| ReportDetail | `/reports/:id` | 全員 | 詳細表示・申請・削除 |
| Approval | `/approval` | admin | 申請中レポートの承認/差戻し |
| Summary | `/summary` | admin | 集計・グラフ・CSV出力 |
| PolicyManagement | `/policy` | admin | 旅費規程PDF取込・AI解析・適用 |

---

## 主要コンポーネント

### `lib/reportGenerator.js`
- `generateReport(reportData, user, policy)` を export
- 報告書種別ごとに LLM プロンプトを構築して `InvokeLLM` を呼ぶ
- 返り値: `{ reportText, reportBodyText, settlementText, rawData }`
- 文体ルール: 常体（である調）・段落形式・金額は入力値固定

### `lib/policyContext.jsx`
- `TravelPolicyMaster` から `is_active: true` のレコードを取得してグローバル共有
- デフォルト値にフォールバックあり
- `usePolicy()` で `{ policy, setPolicy }` を取得

### `components/forms/FieldworkForm.jsx`
- 領収書アップロード → `UploadFile` → `InvokeLLM` で店舗名・金額・カテゴリを解析
- カテゴリ→フォームフィールドのマッピング (`CATEGORY_MAP`) で自動反映
- `receiptData` stateでAI解析結果を追跡・表示

---

## 使用DB

**Base44 内蔵 NoSQL DB**（MongoDB互換）

外部DBは現時点で**未使用**（Supabase / Firebase / PostgreSQL いずれも未接続）

---

## テーブル/コレクション構成

### `Report`（出張・外出作業レポート）

```
id                    string   Built-in 自動採番
created_date          datetime Built-in
updated_date          datetime Built-in
created_by_id         string   Built-in（Userへの参照）

report_number         string   "RPT-XXXXXXXX"
report_type           enum     日帰り出張|宿泊出張|海外出張|外出作業
status                enum     下書き|申請中|承認済|差戻し
created_by_name       string
created_by_email      string
approver_name         string
approved_date         date
rejection_reason      string

travel_date           date     日帰り・外出作業用
start_date            date     宿泊・海外用
end_date              date     宿泊・海外用
destination_name      string
destination_address   string
one_way_distance_km   number   出張基準距離（50km以上）
num_nights            number
num_days              number
business_content      string   50文字以上必須
transport_methods     array
driving_distance_km   number
work_start_time       string   外出作業用 "HH:MM"
work_end_time         string   外出作業用 "HH:MM"

highway_fee           number   default 0
parking_fee           number   default 0
taxi_fee              number   default 0
other_transport_fee   number   default 0
flight_fee            number   default 0
airport_transport_fee number   default 0
coworking_fee         number   default 0
wifi_fee              number   default 0
meal_fee              number   default 0
other_work_fee        number   default 0

daily_allowance       number   計算値
accommodation_fee     number   計算値
car_allowance         number   計算値
total_work_expense    number   計算値
total_amount          number   計算値（合計支給額）

receipt_urls          array    画像URL一覧
remarks               string
shinkansen_reason     string
country_name          string   海外用
city_name             string   海外用

generated_report_text      string   AI生成レポート本文（Markdown）
generated_settlement_text  string   AI生成精算書テキスト
```

### `TravelPolicyMaster`（旅費規程マスター）

```
id                         string   Built-in
version                    string   "第4版" など
effective_date             date
is_active                  boolean  有効フラグ（同時に1件のみtrue）
pdf_url                    string
policy_content             string

min_distance_km            number   default 50
daily_allowance_daytrip    number   default 5000
daily_allowance_overnight  number   default 5000
daily_allowance_overseas   number   default 10000
accommodation_domestic     number   default 15000
accommodation_overseas     number   default 20000
car_allowance_per_km       number   default 30
max_work_expense           number   default 5000
min_work_hours             number   default 4
```

### `User`（Built-in）

```
id          string   自動採番
email       string   ユニーク
full_name   string
role        enum     admin | user
created_date datetime
```

---

## 認証方式

- **方式**: Base44 Platform Auth（メール + パスワード）
- **セッション**: JWT（Base44内蔵、Cookieで管理）
- **ユーザー追加**: 招待制（`base44.users.inviteUser(email, role)`）
- **ロール**:
  - `admin` — 全レポート閲覧・承認・集計・規程管理
  - `user` — 自分のレポートのみ

**AuthContextの動作フロー:**
1. アプリ起動時に `base44.auth.me()` でユーザー取得
2. 403 `auth_required` → `/login` へリダイレクト
3. 403 `user_not_registered` → `UserNotRegisteredError` 表示
4. `useAuth()` hook で `{ user, isAuthenticated, logout }` を参照

---

## 外部API / サービス

| サービス | 用途 | 呼び出し方 | 料金 |
|---|---|---|---|
| **Base44 InvokeLLM** (OpenAI GPT-4o-mini) | レポート生成・領収書解析・規程PDF解析 | `base44.integrations.Core.InvokeLLM(...)` | インテグレーションクレジット消費 |
| **Base44 UploadFile** | 領収書・PDF アップロード | `base44.integrations.Core.UploadFile({file})` | ストレージ |

**未接続サービス**: Supabase, Firebase, Google Maps, Stripe, Anthropic（直接） — いずれも未使用

---

## 環境変数

Base44プラットフォーム側で管理されるため、フロントエンドコードに直接APIキーは存在しない。

| 変数名 | 説明 | 管理場所 |
|---|---|---|
| `BASE44_APP_ID` | Base44アプリID（自動設定） | Base44 Platform |
| `VITE_APP_ENV` | 環境識別用（任意） | `.env.local` |

Claude Code でローカル開発する場合は `.env.local` を作成すること（`.env.example` 参照）。  
Base44の内蔵インテグレーション（LLM等）はBase44ランタイムでのみ動作する点に注意。

---

## 次にClaude Codeで実装すべき優先順位

### P0（すぐやるべき）

1. **レポート編集機能**  
   `/reports/:id/edit` ルートを追加し、既存レポートデータをフォームに戻す。  
   現状は「下書き削除→再作成」しか手段がない。

2. **宿泊・日帰りフォームへの領収書AI仕分け追加**  
   `FieldworkForm.jsx` の `handleReceiptUpload` ロジックをコンポーネント化して再利用。

3. **申請・承認時のメール通知**  
   `base44.integrations.Core.SendEmail` を使い、申請者→承認者、承認者→申請者へ通知。

### P1（次のスプリント）

4. **宿泊・海外フォームの1日1件チェック追加**  
   `DayTripForm`, `OvernightTripForm` にも既存チェックロジックを移植。

5. **AI生成精算書の見出し安定化**  
   `reportGenerator.js` のプロンプトで見出し名をより厳格に固定指示。

6. **月次集計の自動レポート送信**  
   Base44 Automation (scheduled) + SendEmail で毎月1日に管理者へ集計メール。

### P2（余裕があれば）

7. 複数レポートの一括申請UI  
8. 承認フローの多段階化（上長承認 → 経理承認）  
9. PWA化（オフライン対応）

---

## Base44で今後触るべき範囲

Base44ダッシュボードで直接操作すべき領域:

| 作業 | 場所 |
|---|---|
| ユーザー招待・ロール変更 | Dashboard → Users |
| 旅費規程の初期データ投入 | Dashboard → Data → TravelPolicyMaster |
| 環境変数の設定 | Dashboard → Settings → Environment Variables |
| Automation（定期メール等）の設定 | Dashboard → Automations |
| GitHub 2-way Sync の管理 | Dashboard → Code → GitHub Sync |
| カスタムドメイン設定 | Dashboard → Settings → Custom Domain |

**Base44のUIエディタで触って良い範囲**:
- UIデザインの微調整（色・レイアウト・テキスト）
- 新規ページ・コンポーネントの追加
- エンティティスキーマの追加フィールド

---

## Claude Codeで今後触るべき範囲

GitHubリポジトリをcloneしてClaude Codeで作業すべき領域:

| 作業 | ファイル |
|---|---|
| ビジネスロジックの変更 | `lib/reportGenerator.js`, `lib/policyContext.jsx` |
| フォームバリデーションの改修 | `components/forms/*Form.jsx` |
| レポート編集機能の実装 | 新規 `pages/ReportEdit.jsx` + 各Formの改修 |
| API連携・外部サービス接続 | `functions/` 配下（Deno backend functions） |
| 認証ロジックの変更 | `lib/AuthContext.jsx` |
| ルーティング追加 | `App.jsx` |
| テストの作成 | `__tests__/` 配下（未作成） |

**Claude Codeで触ってはいけない範囲**:
- `api/base44Client.js` — Base44 SDKの初期化、変更不要
- `components/ui/*` — shadcn/uiの生成物、再生成で上書きされる
- Base44のDB設定（`entities/*.json`はスキーマ定義のみ、データはBase44側）

---

## GitHub 共同開発フロー

```
Base44 (UIエディタ)
       ↓ 自動プッシュ (2-way sync)
   GitHub main ブランチ
       ↓ clone / pull
  Claude Code (ローカル)
       ↓ push
   GitHub main ブランチ
       ↓ 自動反映 (2-way sync)
Base44 (本番反映)
```

### 競合回避ルール

1. Base44のUIエディタとClaude Codeで**同じファイルを同時に編集しない**
2. Claude Codeで作業する前に必ず `git pull` する
3. 大きな変更はfeatureブランチで作業し、PRでマージ
4. Base44側でUI変更後はコミットメッセージに `[base44]` プレフィックスをつける

---

## 技術スタック まとめ

| 項目 | 技術 |
|---|---|
| フレームワーク | React 18 + Vite |
| スタイリング | Tailwind CSS v3 + shadcn/ui |
| 状態管理 | React Context + TanStack Query v5 |
| ルーティング | React Router DOM v6 |
| AI | Base44 InvokeLLM (GPT-4o-mini) |
| DB | Base44 BaaS (NoSQL) |
| 認証 | Base44 Auth (JWT) |
| ファイルストレージ | Base44 UploadFile |
| ホスティング | Base44 CDN |
| フォント | Noto Sans JP + Inter |
| アイコン | Lucide React |
| チャート | Recharts |
| Markdown | react-markdown |
| アニメーション | Framer Motion |