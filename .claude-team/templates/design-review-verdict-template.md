# Design Review Verdict — Phase A{n}

From: Review Agent
To: Design Agent
Date: YYYY-MM-DD
Gate: **実装前ゲート（Design Review Gate）**
対象: `.claude-team/handoff/design-handoff-A{n}.md`
依頼: `.claude-team/design-reviews/design-review-request-A{n}.md`

---

## 1. 判定

以下のいずれか **1 つだけ** を最終結論として記載する。

```
APPROVED_FOR_IMPLEMENTATION
```

または

```
REJECTED_DESIGN
```

または（REPOSITORY ISOLATION RULE 違反検出時のみ）

```
REJECTED
FOREIGN CONTEXT DETECTED
```

> Review Agent はこのゲートで `PHASE COMPLETE` を絶対に宣言しない（実装すらしていないため）。

---

## 2. 観点別チェック結果

依頼テンプレ §3 のチェックリストに 1 対 1 で対応させる。

### 2.1 ルール遵守
| 観点 | 結果 | コメント |
|---|---|---|
| REPOSITORY ISOLATION RULE 違反なし | ✅ / ❌ | … |
| CURRENT PHASE のみ対象 | ✅ / ❌ | … |
| 9 ブロック揃い | ✅ / ❌ | … |
| /goal の非ゴール・制約に違反なし | ✅ / ❌ | … |

### 2.2 自リポ整合性
| 観点 | 結果 | コメント |
|---|---|---|
| 言及対象が実コードに実在 | ✅ / ❌ | grep 検証コマンドを記録 |
| HANDOFF.md と実コードの乖離認識 | ✅ / ❌ | … |

### 2.3 スコープ妥当性
| 観点 | 結果 | コメント |
|---|---|---|
| DO のサイズ妥当 | ✅ / ❌ | … |
| DO NOT が DO と矛盾しない | ✅ / ❌ | … |
| DONE CRITERIA が客観検証可能 | ✅ / ❌ | … |
| REVIEW POINTS が DONE CRITERIA を網羅 | ✅ / ❌ | … |

### 2.4 依存と影響
| 観点 | 結果 | コメント |
|---|---|---|
| NEXT PHASE DEPENDENCY が roadmap と整合 | ✅ / ❌ | … |
| 既存フェーズ成果物への破壊なし | ✅ / ❌ | … |

---

## 3. Design Agent の質問への回答

依頼テンプレ §4 で挙げられた質問に対し、Review Agent の見解を1質問1段落で回答する。

- Q1: …
  - A1: …

---

## 4. 修正要求（`REJECTED_DESIGN` の場合のみ必須）

不合格の場合、Design Agent が次イテレーションで修正すべき箇所を箇条書きで列挙する。

- [ ] `design-handoff-A{n}.md` § … : … を … に修正
- [ ] DO 項目 … を削除（理由: …）
- [ ] DONE CRITERIA に … を追加（理由: …）

修正後は `design-handoff-A{n}-r2.md` ＋ `design-review-request-A{n}-r2.md` として再申請（元ファイルは履歴として残す）。

---

## 5. `FOREIGN CONTEXT DETECTED` の場合のみ必須セクション

```
出典: 参照されていた前提
検出箇所: design-handoff-A{n}.md の該当ブロック / 行
不一致内容: 現リポジトリで存在しない・定義が異なる点
```

このケースでは §2 以下は省略可。判定は `REJECTED + FOREIGN CONTEXT DETECTED` のみ。

---

## 6. 次のトリガー

- 合格時: 人間が `templates/implementation-go-template.md` を使って Implementation Agent を起動
- 不合格時: Design Agent が § 4 を反映した改訂版を作成し、再度 Design Review Request を出す
- 違反時: Design Agent が原因を除去するまで全工程停止
