# Baseline A7 — CSV 出力フォーマット定義

策定日: 2026-06-08
保持者: Design Agent
適用: A7 以降のフェーズ
実装: A7 で `src/lib/aggregation.js` に `escapeCsvCell` / `getHeaders` / `buildRow` / `rowToCsvLine` / `buildReportsCSVAsync` を追加

---

## simple フォーマット（既存 8 列、A6 から不変）

A6 月次メール配信および Summary.jsx の既存「CSV 出力」ボタンで使用。

| 列順 | ヘッダ | データソース |
|---|---|---|
| 1 | レポートID | `report_number \|\| id?.slice(-6) \|\| ''` |
| 2 | 種別 | `report_type \|\| ''` |
| 3 | 作成者 | `created_by_name \|\| ''` |
| 4 | 年月 | `created_date` ? `format(new Date(created_date), 'yyyy/MM')` : `''` |
| 5 | 日付 | `travel_date \|\| start_date \|\| format(created_date, 'yyyy-MM-dd')` |
| 6 | 目的地 | `destination_name \|\| 'country_name city_name'.trim() \|\| ''` |
| 7 | ステータス | `status \|\| ''` |
| 8 | 合計金額 | `total_amount \|\| 0` |

---

## audit フォーマット（A7 で導入、33 列）

監査用 CSV エクスポート、admin 限定、Summary.jsx の新規「監査用 CSV 出力」ボタンで使用。

| 列順 | ヘッダ | データソース |
|---|---|---|
| 1 | レポートID | `report_number \|\| id?.slice(-6) \|\| ''` |
| 2 | 種別 | `report_type \|\| ''` |
| 3 | ステータス | `status \|\| ''` |
| 4 | 作成者 | `created_by_name \|\| ''` |
| 5 | 作成者メール | `created_by_email \|\| ''` |
| 6 | 作成日 | `created_date` ? `format(new Date(created_date), 'yyyy-MM-dd')` : `''` |
| 7 | 承認日 | `approved_date \|\| ''` |
| 8 | 承認者 | `approver_name \|\| ''` |
| 9 | 出張日_開始 | `travel_date \|\| start_date \|\| ''` |
| 10 | 出張日_終了 | `end_date \|\| ''`（出張系のみ） |
| 11 | 泊数 | `num_nights ?? ''` |
| 12 | 日数 | `num_days ?? ''` |
| 13 | 目的地 | `destination_name \|\| ''` |
| 14 | 住所 | `destination_address \|\| ''` |
| 15 | 国 | `country_name \|\| ''`（海外） |
| 16 | 都市 | `city_name \|\| ''`（海外） |
| 17 | 業務内容 | `business_content \|\| ''` |
| 18 | 片道距離_km | `one_way_distance_km ?? ''` |
| 19 | 走行距離_km | `driving_distance_km ?? ''` |
| 20 | 日当 | `daily_allowance \|\| 0` |
| 21 | 宿泊費 | `accommodation_fee \|\| 0` |
| 22 | 車手当 | `car_allowance \|\| 0` |
| 23 | 高速道路料金 | `highway_fee \|\| 0` |
| 24 | 駐車場料金 | `parking_fee \|\| 0` |
| 25 | タクシー料金 | `taxi_fee \|\| 0` |
| 26 | その他交通費 | `other_transport_fee \|\| 0` |
| 27 | 航空券代 | `flight_fee \|\| 0` |
| 28 | 空港送迎費 | `airport_transport_fee \|\| 0` |
| 29 | コワーキング_会議室 | `coworking_fee \|\| 0` |
| 30 | WiFi_通信費 | `wifi_fee \|\| 0` |
| 31 | 食事代 | `meal_fee \|\| 0` |
| 32 | その他業務費 | `other_work_fee \|\| 0` |
| 33 | 合計金額 | `total_amount \|\| 0` |

---

## エスケープ仕様（RFC 4180 準拠）

`escapeCsvCell(value)`:

1. `value == null` → 空文字 `''`
2. それ以外 → `String(value)` で文字列化
3. セルが `,` / `"` / `\n` / `\r` を含む場合:
   - セル全体を `"..."` で囲む
   - セル内の `"` は `""` にエスケープ

例:
| 入力 | 出力 |
|---|---|
| `'山田太郎'` | `山田太郎` |
| `'東京都港区, 渋谷'` | `"東京都港区, 渋谷"` |
| `'前年度比 "+10%" 増'` | `"前年度比 ""+10%"" 増"` |
| `'第一行\n第二行'` | `"第一行\n第二行"` |
| `null` / `undefined` | `''` |
| `12345` | `12345` |

---

## エンコーディング

UTF-8 with BOM（先頭に `﻿` = `'﻿'`）。Excel で直接開封時の文字化けを防ぐ。

BOM 付与は **UI 層（`Summary.jsx`）の責務**:
```js
const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
```

`buildReportsCSV` / `buildReportsCSVAsync` 自体は **BOM なし** の純粋 CSV 文字列を返す（責務分離、A6 確立）。

---

## chunked async 仕様

`buildReportsCSVAsync(reports, { format, chunkSize, onProgress })`:

| 項目 | 仕様 |
|---|---|
| デフォルト `format` | `'simple'` |
| デフォルト `chunkSize` | `200`（UI thread 解放と速度のバランス、handoff §[DO] 2.3 設計判断） |
| `onProgress` callback | chunk ごとに `{ done: number, total: number }` を呼出 |
| UI thread 解放 | chunk 間で `await new Promise(r => setTimeout(r, 0))`（最後の chunk 後は待機なし） |
| callback throw | try-catch で吸収（aggregate を継続） |
| 戻り値 | `Promise<string>`（BOM なし CSV 文字列） |

---

## 大量データ動作確認手順（Owner 分担）

### 500 件想定の確認
1. Base44 sandbox で 500 件以上の承認済レポートを準備（または既存運用データで近似）
2. admin ロールで `/summary` ページを開く
3. 「監査用 CSV 出力」ボタン押下 → ダイアログ表示
4. 絞り込みなし（全期間・全員・全種別）→「ダウンロード」押下
5. 「生成中: N / 500 件...」progress 表示が更新される（chunk ごと）
6. ブラウザがフリーズしない（クリック可能 / スクロール可能）
7. ダウンロード完了 → ファイル名 `旅費精算_監査用_all_all.csv`

### 1000 件想定の確認
- 500 件と同様の手順で件数を増やす
- 完了まで 5 秒以内を目安（200 件 chunk × 5 chunks ≈ 5 × setTimeout(0)）
- progress 表示が 5 段階で更新される

### Excel 開封検証
1. ダウンロードした CSV を Excel で開く
2. 文字化けなし（BOM が効いている）
3. カンマを含むセル（destination_address 等）が正しく 1 セルに表示される
4. 改行を含むセル（business_content 等）が正しく 1 セル内で改行表示される
5. 引用符を含むセル（業務内容に「"」が含まれる等）が正しく表示される
6. ヘッダ行が baseline-A7.md の audit フォーマット定義と一致する

### フィルタ動作確認
1. 開始日 / 終了日: 範囲外のレポートが除外される
2. ユーザー: 指定者のレポートのみ抽出
3. 種別: 指定種別のみ抽出
4. 複合フィルタ: AND で適用される
5. 0 件絞り込み: アラート表示 + Dialog は閉じない

---

## simple vs audit の使い分け

| 用途 | format | 呼出元 |
|---|---|---|
| A6 月次メール配信（メール本文末尾埋め込み、可読性優先） | `simple` | `notifyMonthlySummary` |
| Summary 画面の既存「CSV 出力」ボタン（年フィルタ、ファイル名 `旅費精算_${year}年_経理用.csv`） | `simple` | `exportCSV`（`buildReportsCSV` 経由） |
| Summary 画面の新規「監査用 CSV 出力」ボタン（admin 限定、絞り込みダイアログ、ファイル名 `旅費精算_監査用_${start}_${end}.csv`） | `audit` | `exportAuditCSV`（`buildReportsCSVAsync` 経由） |

---

## 既存挙動への影響（A6 → A7 移行）

- `buildReportsCSV(reports)` の戻り値は **エスケープ追加** のみが差分
- 通常データ（カンマ・改行・引用符を含まないセル）では出力結果は **完全に同一**
- カンマ・改行・引用符を含むセル（`destination_address` / `business_content` 等）では出力に引用符が追加される（**CSV 規格準拠の改善、回帰ではない**）
- A6 月次メール配信もこの改善を受ける（業務目的に合致、既存メール形式が壊れることはない）

---

## 監査要件マッピング

audit フォーマットの 33 列は以下の監査観点を網羅:

| 観点 | カバーする列 |
|---|---|
| Who（誰が） | 4. 作成者, 5. 作成者メール |
| When（いつ） | 6. 作成日, 7. 承認日, 9. 出張日_開始, 10. 出張日_終了 |
| Where（どこで） | 13. 目的地, 14. 住所, 15. 国, 16. 都市 |
| What（何をした） | 17. 業務内容 |
| How much（いくら） | 20-33. 経費内訳 13 列 + 合計金額 |
| Approval（誰が承認） | 3. ステータス, 8. 承認者 |
| Traceability（追跡可能性） | 1. レポートID, 18-19. 距離（マイカー手当算出根拠） |

---

## A7 で意図的に扱わなかった項目（A8+ で再検討）

- **規程変更履歴の列追加**: 「適用規程バージョン」「規程変更前後の計算差分」等は A8 で扱う
- **列カスタマイズ UI**: roadmap 非実装、固定 simple / audit の 2 種類のみ
- **PDF 出力**: roadmap 非実装
- **CSV 出力履歴の DB 保存**: 新規エンティティ作成は禁止、roadmap 改訂時判断
- **メール添付ファイル化**: A6 月次メール本文末尾埋め込み維持、roadmap 改訂時に独立フェーズ
- **Web Worker / WASM**: chunked async（setTimeout(0)）で十分、A7 では導入せず

---

## 参照

- Implementation コード: `src/lib/aggregation.js` / `src/pages/Summary.jsx`
- Handoff 正本: `.claude-team/handoff/design-handoff-A7.md`
- Design Review: `.claude-team/design-reviews/design-review-verdict-A7.md`（§4 Q1 で `format` 引数シャドー指摘）
- Review Package: `.claude-team/review-packages/review-package-A7.md`
- HANDOFF.md Report スキーマ L177-231
- roadmap.md A7 行
- A6 baseline: `.claude-team/baseline-A6.md`
