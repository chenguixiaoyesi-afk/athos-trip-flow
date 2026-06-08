# Verdict — Phase A4 (Implementation Verdict Gate)

From: Review Agent
To: Implementation Agent / Design Agent / Owner
Date: 2026-06-08
Gate: **実装後ゲート（Implementation Verdict Gate）**
対象: `.claude-team/review-packages/review-package-A4.md`
Handoff 正本: `.claude-team/handoff/design-handoff-A4.md`
Design Review Gate Verdict: `.claude-team/design-reviews/design-review-verdict-A4.md`（APPROVED_FOR_IMPLEMENTATION）
直近 verdict（前フェーズ）: `.claude-team/verdicts/verdict-A3.md`（APPROVED / PHASE COMPLETE / NEXT PHASE: A4）

---

## 1. 判定

```
APPROVED
PHASE COMPLETE
NEXT PHASE: A5
```

`current-phase.txt` を `A4` → `A5` に更新（handoff §[REVIEW POINTS] 判定欄の Review Agent 責務）。

**A1〜A5 = MVP 達成定義の Phase 1**（goal.md / roadmap.md）。本フェーズ完了で MVP 達成まで残り **A5（メール通知）1 フェーズ**。

---

## 2. 独立検証結果

### 2.1 `src/hooks/useReceiptParser.js`（新規 122 行）

| 観点 | Review Agent 実測 | 結果 |
|---|---|---|
| export 構造 | `export function useReceiptParser({...})` | ✅ |
| シグネチャ | `{ initialReceiptUrls = [], categoryMap, fallbackKey, onAmountParsed }` | ✅ handoff §[DO] 2 雛形と完全一致 |
| 戻り値 | `{ receipts, setReceipts, handleReceiptUpload, removeReceipt, isUploading, isAnalyzing, receiptUrls }` | ✅ |
| receipts state 構造 | `{ id, url, name, parsed, status: 'uploading'\|'analyzing'\|'done'\|'failed' }` | ✅ A1 の単一 SOT を踏襲 + 新規 `'failed'` |
| 初期化（edit モード復元） | `initialReceiptUrls?.length` 時に `existing-${i}` id で復元、status='done' | ✅ A3 と同等 |
| 新規アップロード id 発行 | `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` | ✅ 衝突確率ゼロ |
| ステータス遷移 | uploading → analyzing → done（成功）/ → failed（AI 失敗）/ filter 除去（upload 失敗） | ✅ |
| プロンプト 10 カテゴリ | コワーキング/貸会議室/Wi-Fi/駐車場/飲食/航空券/空港送迎/タクシー/高速道路/その他 | ✅ handoff 通り |
| 金額 0 ガード（既知 #3） | L73-76 `typeof === 'number' && Number.isFinite && > 0` の 3 条件 AND | ✅ NaN/Infinity/null/undefined/string/0/負数 すべて弾く |
| カテゴリマッチング | `Object.entries(categoryMap).find(([cat]) => parsed.category?.includes(cat))?.[1] \|\| fallbackKey` | ✅ form 非依存 |
| `onAmountParsed` callback | `if (isValidAmount) onAmountParsed?.(matchedKey, parsed.amount, parsed)` | ✅ form 側 setForm の疎結合化 |
| `e.target.value = ''` 改善 | L102 で実装、同じファイル再選択可能 | ✅ |

### 2.2 `src/components/forms/ReceiptUploaderSection.jsx`（新規 93 行）

| 観点 | Review Agent 実測 | 結果 |
|---|---|---|
| props 構造 | `{ receipts, handleReceiptUpload, removeReceipt, isUploading, isAnalyzing, title?, description? }` | ✅ handoff §[DO] 3 雛形と一致 |
| file input | `multiple accept="image/*" capture="environment"` 維持 | ✅ |
| 状態表示 | uploading/analyzing スピナー（L41-46）、done+parsed の経費プレビュー（L57-78）、done+!parsed の「解析不可」（L80）、failed の「アップロード後の解析に失敗」（L83） | ✅ design-review-verdict-A3 §4 Q2 で指摘した「復元 receipts の解析失敗 UI 衝突」が **構造的に解消** |
| 削除ボタン | X icon | ✅ |
| 既存 lucide-react / Tailwind | 流用 | ✅ |

### 2.3 4 form の対称な改修

| 観点 | DayTrip | Overnight | Overseas | Fieldwork |
|---|---|---|---|---|
| `import { useReceiptParser }` | ✅ L16 | ✅ L16 | ✅ L15 | ✅ L16 |
| `import ReceiptUploaderSection` | ✅ L13 | ✅ L13 | ✅ L12 | ✅ L13 |
| CATEGORY_MAP_* 定義 | `_TRIP` L19 | `_TRIP` L20（重複定義） | `_OVERSEAS` L19 | `_FIELDWORK` L19 |
| FALLBACK_* 定義 | `'other_transport_fee'` L24 | `'other_transport_fee'` L25 | `'other_transport_fee'` L24 | `'other_work_fee'` L26 |
| `onAmountParsed` callback | ✅ | ✅ | ✅ | ✅ |
| `useReceiptParser({ ... })` 呼出 | ✅ L79-83 | ✅ L80-84 | ✅ L70-74 | ✅ L133-137 |
| `handleGenerate` の reportData に `receipt_urls: receiptUrls` | ✅ L136 | ✅ L133 | ✅ L115 | ✅ L219 |
| `handleSubmit` の data に `receipt_urls: receiptUrls` | ✅ L161 | ✅ L151 | ✅ L131 | ✅ L237 |
| `<ReceiptUploaderSection ... />` JSX | ✅ L271 | ✅ L246 | ✅ L208 | ✅ L383 |

→ **4 form すべて対称な改修パターンで実装、handoff §[REVIEW POINTS] 3「展開対称性」を完全満足**。

#### 2.3.1 FieldworkForm の旧コード削除確認

`grep` で確認:
- inline `CATEGORY_MAP = {` 定義（旧 L165-172）→ 削除済 ✅
- `const handleReceiptUpload = async` 関数（旧 L174-244）→ 削除済 ✅
- `const removeReceipt = (idx)` 関数（旧 L242-244）→ 削除済 ✅

→ FieldworkForm から旧 receipts ロジックが完全に hook に移譲され、二重実装なし。

### 2.4 `src/lib/reportGenerator.js`（+25 行 / -8 行）

| 観点 | Review Agent 実測 | 結果 |
|---|---|---|
| STYLE_RULES への見出しルール追加 | 5 行（出張 3 種は「## 旅費精算書」/ 外出作業は「## 経費精算書」/ 表記揺れ厳禁 / 見出し前後余分文字禁止） | ✅ |
| `SETTLEMENT_HEADING_RE` 定数 | `/^##\s*(旅費精算書\|経費精算書)\s*$/m` | ✅ handoff §[DO] 6.2 雛形と完全一致 |
| 分割ロジック regex 化 | 旧素朴 `.split('## 旅費精算書')` → 新 `result.match(SETTLEMENT_HEADING_RE)` + `result.slice(match.index)` | ✅ 既知 #2 解消 |
| フォールバック挙動 | `match === null` → `settlementText: ''`, `reportBodyText: result`（全文） | ✅ 安全 |
| 旧コード削除 | 旧 9 行が新 7 行に置換 | ✅ |

### 2.5 A5 / A8 領域への侵食チェック

| 観点 | 実測 | 結果 |
|---|---|---|
| A5 侵食（SendEmail / 通知機構） | `git diff src/` に該当語彙ヒット 0 | ✅ |
| A8 侵食（規程 PDF 解析 / PolicyManagement.jsx） | `git diff src/pages/PolicyManagement.jsx` 空 | ✅ |
| `useCanEdit` 抽出（DO NOT 明示） | 不在、A3 で確立した意図的複製を維持 | ✅ |

### 2.6 ビルド / lint 検証

| 項目 | Review Agent 実測 | 結果 |
|---|---|---|
| `npm run lint` | exit 0、出力なし | ✅ errors=0 |
| `npx eslint .` | 0 errors / **3 warnings**（Login.jsx err / ReportDetail.jsx isAdmin / ReportNew.jsx navigate） | ✅ A3 baseline と完全一致、A4 新規コード由来の warning ゼロ |
| `npm run build` | exit 0 | ✅ |

### 2.7 ファイル状態

| 項目 | Review Agent 実測 |
|---|---|
| `git log --oneline` HEAD | `cba5861 feat(A2)`（A2 が直近 commit、A3+A4 は working tree 累積、handoff §[DO] 11 / §[DO NOT]「`git commit` の実行」遵守） |
| `git status` working tree | M: current-phase.txt + App.jsx + 4 form + reportGenerator.js + ReportDetail.jsx（8 件、うち App / ReportDetail は A3 由来）/ untracked: ReportEdit.jsx, useReceiptParser.js, ReceiptUploaderSection.jsx, review-package-A3.md, review-package-A4.md + 過去フェーズメタファイル群 |
| `current-phase.txt` | `A4\n`（本判定により直後に `A5\n` へ更新） |
| `git rev-list --count @{u}..HEAD` | **0**（A2 commit は Owner push 済、A3+A4 未積み） |
| AUTO-FILL チェック | handoff DONE CRITERIA #19 のシェル `grep -c "AUTO-""FILL:" review-package-A4.md` は文字列連結で実質 `grep -c "AUTO-FILL:" ...`、結果 **0**（verdict-A3 §6.1 改善提案の分割表記運用が正常機能、§7.4 の検証コマンド例自身は `AUTO-""FILL:` リテラルで埋め込まれているが grep `AUTO-FILL:` には自己マッチしない） | ✅ false positive 完全回避 |

---

## 3. handoff §[DONE CRITERIA] 21 項目の判定

| # | 項目 | 結果 |
|---|---|---|
| 1 | `npm run lint` errors=0、warnings は A3 完了時点（3 件）から増加していない | ✅ 0 errors / 3 warnings 完全一致 |
| 2 | `npm run build` 成功 | ✅ |
| 3 | `useReceiptParser.js` 存在、handoff §[DO] 2 シグネチャ準拠 | ✅ |
| 4 | `ReceiptUploaderSection.jsx` 存在 | ✅ |
| 5 | 4 form すべてに hook の import + 呼出 | ✅ |
| 6 | 3 form に form 固有 CATEGORY_MAP_* と FALLBACK_* 定義 | ✅ |
| 7 | 3 form の handleSubmit data に `receipt_urls: receiptUrls` | ✅ |
| 8 | 3 form の JSX に `<ReceiptUploaderSection />` | ✅ |
| 9 | FieldworkForm から旧コード削除 | ✅ inline CATEGORY_MAP / handleReceiptUpload / removeReceipt すべて削除 |
| 10 | hook 内 isValidAmount に typeof/isFinite/>0 3 条件 | ✅ |
| 11 | form 側で金額 0 ガード重複チェックなし（DRY） | ✅ 4 form で `if (parsed.amount...)` 不在 |
| 12 | reportGenerator プロンプトに見出し固定指示 | ✅ STYLE_RULES に追加 |
| 13 | reportGenerator 分割が regex ベース | ✅ `SETTLEMENT_HEADING_RE` 採用 |
| 14 | `git diff --stat` が許容範囲 | ✅ 4 form + reportGenerator.js + 2 新規 + current-phase.txt + review-package-A4.md（A3 由来の App.jsx / ReportDetail.jsx / ReportEdit.jsx / review-package-A3.md は §6 Q1 の A3+A4 同一 commit 方針で吸収） |
| 15 | create / edit 両モードの 4 form 領収書 AI 動作が §4 に記録 | ✅ §4.2-§4.4 |
| 16 | 精算書見出し安定性が §4 に記録 | ✅ §4.5 で 7 ケース論理確認 |
| 17 | 金額 0 ガードが §4 に記録（5 ケース） | ✅ §4.6 で 8 ケース論理確認 |
| 18 | review-package §1〜§7 すべて存在 | ✅ |
| 19 | `grep -c "AUTO-""FILL:" review-package-A4.md` = 0 | ✅ シェル展開後 `grep -c "AUTO-FILL:" ...` = 0、§2.7 参照 |
| 20 | `current-phase.txt` = `A4` | ✅（本判定により直後に `A5` へ更新） |
| 21 | `git push` 未実行 | ✅ |
| 22 | commit 未実行 | ✅ |

**合格: 22 / 22**（DONE CRITERIA は実際 22 項目）。

---

## 4. handoff §[REVIEW POINTS] 15 項目の判定

| # | 観点 | 結果 |
|---|---|---|
| 1 | スコープ厳守 | ✅ 5 modified + 2 new + メタ任意 |
| 2 | hook の等価性 | ✅（軽微差 1 点: 新 `'failed'` status は意図的改善、§5 Q2 参照） |
| 3 | 3 form の展開対称性 | ✅ §2.3 表で全項目対称 |
| 4 | CATEGORY_MAP の form 別適合 | ✅ Fieldwork=業務系、Trip=国内交通系、Overseas=国際航空系 |
| 5 | 金額 0 ガードの型安全性 | ✅ 3 条件 AND |
| 6 | 見出し固定指示の追加 | ✅ STYLE_RULES |
| 7 | 分割ロジックの regex 化 | ✅ |
| 8 | edit モード（A3 成果）維持 | ✅ 4 form で `mode === 'edit' && initialReport?.receipt_urls ? ... : []` を hook に渡す |
| 9 | create モードの不変性 | ✅ デフォルト時 `initialReceiptUrls: []`、既存挙動完全保証 |
| 10 | A5 領域への侵食なし | ✅ |
| 11 | A8 領域への侵食なし | ✅ |
| 12 | REPOSITORY ISOLATION RULE 違反なし | ✅ |
| 13 | プレースホルダ完全充填 | ✅ |
| 14 | `git push` 未実行 | ✅ |
| 15 | commit 未実行 | ✅ |

**合格: 15 / 15**。

---

## 5. Review Agent からの判断（Implementation Agent §6 質問への回答）

### Q1. A3 + A4 を 1 commit にまとめる方針

**判定: (a) 採用 = A3+A4 を 1 commit に集約**。

根拠:
- A3 commit が verdict-A3 APPROVED 後に未実行のまま A4 が積まれた既成事実
- A4 の FieldworkForm 改修は A3 の `existing-${i}` 復元実装を hook 内に移譲する形で **A3 を前提に積まれる**
- 別 commit に分割すると、A3 commit 時点で FieldworkForm に旧 inline receipts ロジック + edit モード復元が混在、A4 commit でそれを hook に置換する 2 段階となり、レビュー時の差分理解が複雑化
- A0+A0.1 bootstrap commit と同じ構造的判断（複数フェーズの累積を 1 commit に集約することが妥当な状況）

§7.1 staging 案、§7.2 メッセージ案を採用することを推奨。

### Q2. 解析失敗時の `'done'` → `'failed'` への status 変更

**判定: (a) 現状維持 = UX 改善として承認**。

根拠:
- design-review-verdict-A4 §4 Q1 で「`'failed'` status 導入は意図的改善であり、design-review-verdict-A3 §4 Q2 で指摘した『復元 receipt が解析失敗と誤表示される副作用』を **本フェーズで構造的に解消** する」と Review Agent が予め承認
- ReceiptUploaderSection の表示分岐:
  - `done + parsed あり` → 経費プレビュー（store/category/amount/date）
  - `done + parsed null` → 「解析不可 — 手動で入力してください」（復元 entry または AI 成功で内容空）
  - `failed` → 「アップロード後の解析に失敗 — 削除して再アップロードしてください」（新規 AI 失敗）
- ステータス意味論が拡張され、ユーザーが「既存復元」と「新規アップロード後失敗」を区別できる UX 改善
- 旧挙動との外部互換（receipts 配列の存在、`receipt_urls` 送信、削除操作）は完全に保たれる

### Q3. ReceiptUploaderSection の挿入位置（「備考」直後 / `<AmountSummary />` 直前）

**判定: 採用承認**。

根拠:
- 「備考」と「領収書」はどちらも任意入力で UI 並び順が自然
- `<AmountSummary />` 直前で「入力 → 金額確定」のフローが視覚的に保たれる
- 既存「経費」Card に inline 挿入する代替案は handoff §[DO NOT]「既存 4 form の表示 JSX 本体への touch」と抵触する可能性があり、新規独立 Card 案の方が安全
- 4 form すべてで同じ位置に挿入 → 対称性が UX で確保される

### Q4. CATEGORY_MAP_TRIP の DayTrip / Overnight 重複定義

**判定: 採用承認**。handoff §[DO NOT]「CATEGORY_MAP の form 横断共通化」遵守。将来要件化時に `src/lib/categoryMaps.js` 等への集約は A5 以降の Design Agent 判断対象。

### Q5. 5 サンプリング検証は静的・論理確認のみ

**判定: 静的・論理確認で合格**。

根拠:
- 見出し regex `/^##\s*(旅費精算書\|経費精算書)\s*$/m` の挙動は §4.5 で 7 ケースの論理確認済
- プロンプト STYLE_RULES への明示的見出し固定指示で AI 出力の安定性は構造的に強化
- 実機 5 サンプリングは LLM コスト発生のため Owner が `npm run dev` 実機確認時に追認するのが現実的
- design-review-verdict-A4 §3.5 でも「論理確認で許容」と承認済

### Q6. lint warnings 3 件 A3 baseline 不変

**判定: A4 スコープ外で OK**。前 verdict と同判定を引き継ぐ。

### Q7. hook 内の `e.target.value = ''` の妥当性

**判定: UX 改善として承認**。handoff §[DO] 2 注意点で意図的改善と明示済、4 form 共通の自然な挙動。

### Q8. `useCanEdit` 抽出の非対応

**判定: A4 スコープ外で OK**。design-review-verdict-A4 §4 Q5 と一致。

---

## 6. 観察された軽微な仕様逸脱（非ブロッキング）

### 6.1 `FALLBACK_OVERSEAS` の handoff 雛形からの変更

| 項目 | handoff §[DO] 5.1 雛形 | 実装 |
|---|---|---|
| `FALLBACK_OVERSEAS` | `'airport_transport_fee'` | **`'other_transport_fee'`** |

**Review Agent 判定: 承認**（Implementation Agent の判断は妥当）。

根拠:
- design-review-verdict-A4 §4 Q3 で Review Agent が「Implementation Agent が懸念を持つ場合は Review Package §2 で代替案として `'other_transport_fee'` を提示する余地はある」と既に容認
- 「不明なカテゴリ → other」のセマンティクスは「airport_transport」より自然
- 業務的に擁護可能な選択肢

**軽微な改善余地**: Implementation Agent が Review Package §2.3 または §6 で「handoff 雛形からの変更点」として明示的に説明していれば、Review プロセスでの追跡性が向上した。次フェーズ以降の Review Package テンプレで「handoff 雛形からの逸脱があれば §x.y に明示」を組み込むことを推奨（任意）。

---

## 7. 任意の改善提案（非ブロッキング、A5 以降のテンプレ向上）

1. **Review Package で handoff 雛形からの逸脱明示**: §6.1 の通り、`FALLBACK_OVERSEAS` 変更が暗黙的に行われた。次フェーズ以降は Review Package §2 / §3 で「handoff 雛形と異なる選択」を明示すると Review プロセスの追跡性向上
2. **5 サンプリング検証の Owner 実機分担**: 見出し安定性の実機検証は Owner が `npm run dev` で AI 生成を 5 回程度試行することで追認可能（Design Agent と Implementation Agent の作業範囲外で確認）
3. **lint warnings 3 件 (`unused-vars`) の処遇**: A1〜A4 通算 4 フェーズで「baseline 不変」扱い。次回 roadmap 改訂時に A8 等で扱うか別途軽量フェーズで扱うかを Design Agent が判断することを強く推奨
4. **`useCanEdit` 抽出**: design-review-verdict-A3 §6.3 / design-review-verdict-A4 §4 Q5 で繰り返し議論。A5 以降の roadmap 改訂時に独立小フェーズとして起案することを推奨
5. **CATEGORY_MAP_TRIP の共通化検討**: §5 Q4 の通り、A5 以降で `src/lib/categoryMaps.js` 集約を Design Agent が判断

---

## 8. MVP 達成までの位置

`goal.md` の MVP 達成定義（A1〜A5 完了）に対する本フェーズの位置:

| 項目 | 達成フェーズ | 状態 |
|---|---|---|
| 1. 全 4 種別フォームで領収書 AI 仕分けが使える | A4 ← **本フェーズで達成** | ✅ |
| 2. 申請・承認・差戻しのライフサイクル変化が当事者にメール通知される | A5（次フェーズ） | ⏳ |
| 3. 申請中/承認済レポートを申請者が編集できる | A3 | ✅ |
| 4. 既知の `receiptData` 並列不整合が解消されている | A1 | ✅ |

**MVP 達成まで A5（メール通知）のみ**。本フェーズで MVP 4 要件のうち 3 要件達成済。

---

## 9. 次のトリガー

本ゲートは通過した。Review Agent のアクション:

1. `current-phase.txt` を `A4` → `A5` に更新
2. Owner への申し送り（§10）

次の動作:
- Owner が `npm run dev` で localhost を起動し、A4 成果物（4 種別領収書 AI、見出し安定、金額 0 ガード）を実機確認（強く推奨）
- Owner が Review Package §7.1-§7.2 の **A3+A4 集約 commit** を作成
- A4 commit 後、Design Agent が `design-handoff-A5.md` + `design-review-request-A5.md` を起案（MVP 達成最終フェーズ）
- Design Review Gate を経て A5 実装フェーズへ

---

## 10. Owner への申し送り

1. **A4 PHASE COMPLETE 確定**。HANDOFF.md P0 #2 / 既知不具合 #2 #3 がすべて構造的に解消。MVP 達成まで A5（メール通知）1 フェーズ
2. **A3+A4 集約 commit の推奨**: Review Package §7.1 staging + §7.2 メッセージで実行:
   ```
   git add src/App.jsx src/pages/ReportEdit.jsx src/pages/ReportDetail.jsx \
           src/components/forms/DayTripForm.jsx \
           src/components/forms/OvernightTripForm.jsx \
           src/components/forms/OverseasTripForm.jsx \
           src/components/forms/FieldworkForm.jsx \
           src/components/forms/ReceiptUploaderSection.jsx \
           src/hooks/useReceiptParser.js \
           src/lib/reportGenerator.js \
           .claude-team/current-phase.txt \
           .claude-team/review-packages/review-package-A3.md \
           .claude-team/review-packages/review-package-A4.md
   git commit -m "..."  # §7.2 の feat(A3+A4) メッセージ案
   ```
3. **実機確認を強く推奨**: 本フェーズは AI 振る舞い変更（プロンプト強化、10 カテゴリ拡張）と見出し regex 化を含む。以下を `npm run dev` で確認願いたい:
   - 4 種別で領収書アップロード → 経費欄自動反映
   - 並列 3 枚アップロード時の整合性（A1 成果踏襲）
   - edit モードでの receipts 復元（`existing-N` 表示）
   - AI レポート生成の見出し（5 回程度試行で「## 旅費精算書」/「## 経費精算書」固定確認、§5 Q5 の Owner 実機分担）
   - 金額 0 / 負数の領収書で経費欄に加算されないこと
4. **累積する未トラックメタファイル**: design-handoff A1-A4 + design-review-request A1-A4 + design-review-verdict A1-A4 + verdict-A0.1-r2/A1/A2/A3/A4 が未トラック。A3+A4 commit と同時に取り込むか、フォローアップ commit にするかは運用判断
5. **`.claude-team/orchestrator/` は untracked 維持**（一貫した方針）
6. **次フェーズは A5（メール通知）= MVP 達成最終**

---

## 11. 参照根拠

- 設計仕様: `.claude-team/handoff/design-handoff-A4.md`
- 実装前ゲート判定: `.claude-team/design-reviews/design-review-verdict-A4.md`
- 実装証跡: `.claude-team/review-packages/review-package-A4.md`
- 前フェーズ verdict: `.claude-team/verdicts/verdict-A3.md`
- /goal: `.claude-team/goal.md` §0 / 非ゴール / 制約 / MVP 達成定義 #1-#4
- ロードマップ: `.claude-team/roadmap.md` A4 行 / A5 行 / MVP 達成定義
- 運用ルール: `.claude-team/auto-handoff.md`
- HANDOFF.md P0 #2 / 既知不具合 #2 #3
- 実コード検証:
  - `src/hooks/useReceiptParser.js`（122 行全文 Read）
  - `src/components/forms/ReceiptUploaderSection.jsx`（93 行全文 cat）
  - `git diff src/lib/reportGenerator.js`（+25 行 / -8 行）
  - 4 form の hook 連携 grep（import / CATEGORY_MAP / FALLBACK / useReceiptParser 呼出 / receipt_urls / ReceiptUploaderSection）
  - FieldworkForm の旧コード削除確認 grep
- 実検証コマンド: `npm run lint` / `npx eslint .` / `npm run build` / `git log --oneline` / `git status` / `git diff --stat` / `git rev-list --count @{u}..HEAD` / `xxd current-phase.txt` / `grep -c AUTO-FILL` / `grep -c "AUTO-""FILL:"`（シェル展開後）

---

## 12. 最終出力

```
APPROVED
PHASE COMPLETE
NEXT PHASE: A5
```
