# Baseline A9 — テスト基盤 + lint クリーン化（運用前安定化）

策定日: 2026-06-20
保持者: Implementation Agent（Design Handoff A9 準拠）
適用: A9 以降（A0〜A8 完走後の拡張フェーズ＝守り）
ブランチ: `feature/a9-quality-stabilization`（`main` 直 commit 禁止）
実装: Vitest 最小導入 + `src/lib/__tests__/` 回帰テスト 2 ファイル + lint warning 3 件解消

---

## 目的

A0〜A8 で完成した Athos TravelMate の業務フロー（社員 → レポート作成 → AI 補完 → 承認 → 集計 → CSV → 旅費規定監査）を **壊さず**、実運用前に品質を固定する。

- **新機能ゼロ**。プロダクト挙動を変える変更は一切しない。
- **回帰防止が最優先**。A6〜A8 の純粋ロジックに自動テストを敷く。
- lint warning を 3 → 0 にし、クリーンなベースラインを確立する。

---

## テスト方針（厳守）

### 原則 1: 公開 API 経由でのみ検証する

`aggregation.js` / `policyImpactAnalyzer.js` の **本体は一切変更しない**（export を増やさない）。

CSV のエスケープ（`escapeCsvCell`）や列定義（`getHeaders`）、行整形（`buildRow` / `rowToCsvLine`）は **非 export の内部ヘルパー**である。これらをテストのために export 化すると「既存実装の凍結」が崩れるため、**公開 API 経由で間接的に検証する**。

| 検証したい内部挙動 | 経由する公開 API | 検証方法 |
|---|---|---|
| RFC 4180 エスケープ（カンマ） | `buildReportsCSV` | `destination_name: '東京, 日本'` → セルが `"東京, 日本"` |
| RFC 4180 エスケープ（引用符・改行） | `buildReportsCSVAsync({format:'audit'})` | `business_content: 'a"b\nc'` → `"a""b\nc"` |
| simple 8 列の列固定 | `buildReportsCSV` | 1 行目ヘッダの厳密一致 + 列数 8 |
| audit 33 列の列固定 | `buildReportsCSVAsync({format:'audit'})` | 1 行目ヘッダの厳密一致 + 列数 33 |
| chunk 分割と進捗 | `buildReportsCSVAsync({chunkSize})` | `vi.fn()` で `onProgress` 呼出回数・引数を assert |

### 原則 2: ロケール・タイムゾーン非依存

- 金額の整形は実装が `Number.prototype.toLocaleString()` を使うため、テスト期待値も **実行時に同じ `toLocaleString()` を呼んで突き合わせる**（`¥${(42000).toLocaleString()}`）。ICU/ロケール差による誤判定を避ける。
- 日付フィルタ（`getYear` / `getMonth`）テストの `created_date` は **正午ローカル時刻**（`'2026-03-15T12:00:00'`）を使い、タイムゾーン境界での月跨ぎを防ぐ。

### 原則 3: smoke ではなく回帰検知力

単なる「呼べる」確認ではなく、A6〜A8 の業務要件（4 種別の計算分岐 / 列固定 / RFC 4180 / 月フィルタ / null ガード / 実費の規程非依存性）を assert し、将来のリグレッションを検知できる粒度にする。

---

## カバレッジ範囲

### カバー対象（本フェーズで保護）

| モジュール | 由来 | テストファイル | 主な assert |
|---|---|---|---|
| `src/lib/aggregation.js` | A6/A7 | `src/lib/__tests__/aggregation.test.js`（13 ケース） | 月次集計フィルタ / `byType` / `byUser` / `totalAmount` / 空・null / `formatSummaryForEmail` 通常・該当なし / CSV 8 列・33 列固定 / simple≡async / `onProgress` / RFC 4180 |
| `src/lib/policyImpactAnalyzer.js` | A8 | `src/lib/__tests__/policyImpactAnalyzer.test.js`（11 ケース） | 4 種別再計算（日帰り/宿泊/海外=車手当0/外出作業=日当0宿泊0）/ 実費の規程非依存性 / 未知種別 / null ガード / `computeImpact` の `diff!==0` フィルタ / `totalDiff` / `affectedCount` / 空・同一 policy / null ガード |

合計 **24 テスト**（aggregation 13 + policyImpactAnalyzer 11）。

### 未カバー領域（誠実な明示 — 運用判断に使う）

本フェーズは **純粋関数のみ** を対象とする。以下は A9 では **守られない**:

- **React コンポーネント全般**（pages / components / forms の描画・状態・イベント）。`@testing-library/react` + `jsdom` 等の追加が必要なため別フェーズ。
- **Base44 SDK 呼出**（`entities.*.filter/create/update`、`auth`、`UploadFile`、`SendEmail`）。外部 IO 依存でモック基盤が必要。
- **`src/lib/reportGenerator.js` の LLM 依存部分**（`InvokeLLM` を介す本文生成）。整形ロジックの一部は将来テスト可能だが本フェーズ対象外。
- **`src/lib/notifications.js`**（`SendEmail` ラッパ。副作用あり）。
- **CSV のブラウザ層**（BOM 付与・`Blob`・ダウンロード）。UI 層のため対象外。
- **Base44 Automation**（月次配信 cron `0 9 1 * *`）。ダッシュボード設定で、コード外。

→ 「テストが green = 全機能保証」ではない。守っているのは集計・CSV・規程影響の **純粋計算ロジック** のみ。

---

## 実行手順

```bash
npm test            # = vitest run（CI / 1 回実行、全 green を確認）
npm run test:watch  # = vitest（開発時のウォッチ実行）
npm run lint        # = eslint . --quiet（errors のみ。0 を確認）
npx eslint .        # warnings 込み（0 errors / 0 warnings を確認）
npm run build       # = vite build（dist 生成成功を確認）
```

テストは相対 import（`../aggregation.js`）で記述。`globals: false` のため各テストは `import { describe, it, expect, vi } from 'vitest'` を明示する（`eslint.config.js` への global 追加が不要 = 設定ファイル無改変）。`eslint.config.js` の `ignores: ["src/lib/**/*"]` によりテストファイル自身は lint 対象外で、新たな warning を生まない。

---

## ブランチ運用

- 全変更は `feature/a9-quality-stabilization`（`origin/main` 起点）に閉じる。
- **`main` への直接 commit / merge / push を行わない**。
- 実 commit は Review verdict 後の Owner 操作（Review Package §7 に staging 一覧 + メッセージ案を記載）。
- Base44 2-way sync 競合回避: A9 作業ファイル（テスト / 設定 / lint 3 ファイル）と同じ箇所を Base44 UI 側で同時編集しない（Owner 確認事項）。

---

## lint 3 件修正の挙動不変性（根拠）

| ファイル:行 | 修正 | 挙動不変の根拠 |
|---|---|---|
| `src/pages/Login.jsx:23` | `} catch (err) {` → `} catch {` | catch 本体は固定文言を `setError` するのみで `err` を参照しない。任意 catch バインディング（ES2019+、`eslint.config.js` は ecmaVersion 2022）。表示・分岐・副作用に変化なし。state の `error`（L14/81/82）とは別物 |
| `src/pages/ReportDetail.jsx:66` | `const isAdmin = ...` 1 行削除 | grep で参照が当該宣言 1 箇所のみと確認後に削除。JSX / 分岐に未使用のため挙動不変 |
| `src/pages/ReportNew.jsx:2,46` | `const navigate = useNavigate();` 削除 + `useNavigate` import 除去 | grep で `navigate` 参照が当該宣言 1 箇所のみと確認。import を残すと `no-unused-imports`（error）が再発するため import 行も同時除去。描画・遷移ロジックに `navigate` 不使用のため挙動不変 |

- いずれも表示・挙動を変えない。JSX / スタイル / ロジック未変更。
- `eslint --fix` の一括適用は行わず、上記 3 箇所のみ手動修正。

---

## 既存実装の凍結保証

| 対象 | 保証 |
|---|---|
| `src/lib/aggregation.js` | `git diff` 差分ゼロ（export 追加なし） |
| `src/lib/policyImpactAnalyzer.js` | `git diff` 差分ゼロ（export 追加なし） |
| A0〜A8 成果物（lint 3 ファイル以外の `src/**`） | touch なし |
| `vite.config.js` / `eslint.config.js` / `tailwind.config.js` 等 | 無改変 |
| `package.json` | `vitest` devDependency + `test` / `test:watch` scripts のみ追加（既存依存・バージョン不変） |

---

## A9 完了で確立されるもの

- A6/A7 の集計・CSV ロジック、A8 の規程影響ロジックが回帰テストで保護される。
- lint warnings が 0 になり、クリーンなベースラインが確立。
- 以降の機能追加・リファクタが「テストで守られた状態」で着手可能になる。

A9 単体は「品質固定」で完結し、後続フェーズを強制しない。NEXT PHASE は Owner が決定する（候補は handoff §[NEXT PHASE DEPENDENCY]: 運用受け入れ / テスト拡張 / 新機能ロードマップ）。

---

## 参照

- Handoff 正本: `.claude-team/handoff/design-handoff-A9.md`
- Review Package: `.claude-team/review-packages/review-package-A9.md`
- 凍結対象コード: `src/lib/aggregation.js`（A6/A7）/ `src/lib/policyImpactAnalyzer.js`（A8）
- 集計 / CSV 仕様の根拠: `.claude-team/baseline-A6.md` / `baseline-A7.md`
- 規程監査の根拠: `.claude-team/baseline-A8.md`
- 直近 verdict: `.claude-team/verdicts/verdict-A8.md`（PROJECT COMPLETE）
