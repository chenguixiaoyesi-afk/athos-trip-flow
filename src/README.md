# Athos TravelMate

株式会社Athos 社内向け旅費・外出作業経費精算システム

> **開発体制**: Base44 ⇄ GitHub 2-way sync ⇄ Claude Code  
> 詳細な引き継ぎ情報は [HANDOFF.md](./HANDOFF.md) を参照

---

## 機能概要

- 📝 4種類のレポート作成（日帰り出張 / 宿泊出張 / 海外出張 / 外出作業）
- 🤖 AI自動レポート文章生成（常体・段落形式）
- 📷 領収書写真のAI自動仕分け・経費欄への自動反映
- ✅ 承認ワークフロー（申請 → 承認 / 差戻し）
- 📊 管理者向け集計ダッシュボード・CSVエクスポート
- 📄 旅費規程PDFのAI解析・自動適用

---

## 技術スタック

| 項目 | 技術 |
|---|---|
| フレームワーク | React 18 + Vite |
| スタイリング | Tailwind CSS + shadcn/ui |
| 状態管理 | React Context + TanStack Query v5 |
| ルーティング | React Router DOM v6 |
| バックエンド | Base44 BaaS |
| AI | Base44 InvokeLLM (GPT-4o-mini) |

---

## ローカル開発セットアップ

```bash
# 1. クローン
git clone https://github.com/[YOUR_ORG]/athos-travelmate.git
cd athos-travelmate

# 2. 依存関係インストール
npm install

# 3. 環境変数設定
cp .env.example .env.local
# .env.local を編集（Base44 App IDを設定）

# 4. 開発サーバー起動
npm run dev
```

> ⚠️ **注意**: `base44.integrations.Core.InvokeLLM` や `base44.entities.*` などのBase44 SDK機能は、
> Base44プラットフォーム上（または認証済みセッション）でのみ動作します。
> ローカル開発では Base44 のプレビュー環境経由での確認を推奨します。

---

## ディレクトリ構成

```
├── pages/          # ページコンポーネント
├── components/     # 共通コンポーネント
│   └── forms/      # レポート入力フォーム
├── lib/            # ビジネスロジック・コンテキスト
├── entities/       # Base44 DBスキーマ (JSON)
├── api/            # Base44 SDK初期化
└── hooks/          # カスタムフック
```

---

## 開発フロー

```
Base44 UIエディタ
      ↕ 2-way sync
  GitHub (main)
      ↕ clone/push
  Claude Code
```

### ブランチ戦略

```
main        ← Base44 本番と同期
feature/*   ← 機能追加
fix/*       ← バグ修正
```

### コミットプレフィックス

```
[base44]  Base44エディタからの変更
[claude]  Claude Codeからの変更
feat:     新機能
fix:      バグ修正
refactor: リファクタ
docs:     ドキュメント
```

---

## 旅費規程 デフォルト値

| 項目 | 金額 |
|---|---|
| 出張基準距離 | 片道50km以上 |
| 日帰り出張 日当 | ¥5,000/日 |
| 宿泊出張 日当 | ¥5,000/日 |
| 海外出張 日当 | ¥10,000/日 |
| 国内宿泊費 | ¥15,000/泊 |
| 海外宿泊費 | ¥20,000/泊 |
| マイカー手当 | ¥30/km |
| 外出作業費上限 | ¥5,000/日 |
| 外出作業 最低時間 | 4時間以上 |

---

## 権限

| ロール | 権限 |
|---|---|
| `admin` | 全レポート閲覧・承認・集計・規程管理・ユーザー管理 |
| `user` | 自分のレポートのみ作成・閲覧・申請 |

---

## 関連リンク

- [HANDOFF.md](./HANDOFF.md) — Claude Code引き継ぎ詳細
- [Base44 Dashboard](https://app.base44.com) — DBデータ・ユーザー管理・Automation
- [shadcn/ui](https://ui.shadcn.com) — UIコンポーネントライブラリ
- [Base44 SDK Docs](https://docs.base44.com) — SDK使用方法