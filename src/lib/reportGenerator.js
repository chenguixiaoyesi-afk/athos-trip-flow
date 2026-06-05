import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

const STYLE_RULES = `
【文体・記述ルール（厳守）】
- 敬体（です・ます調）は使わず、常体（である調）で記載すること
- 業務内容は箇条書きではなく、段落形式で記載すること
- 成果・所見は入力された業務内容から論理的に推測できる範囲で簡潔に記載すること
- 推測が困難な場合は「[要記入]」と記載し、ユーザーに入力を促すこと
- 金額は全て自動計算値を使用し、手動で変更しないこと
`;

export async function generateReport(reportData, user, policy) {
  const today = format(new Date(), 'yyyy年MM月dd日', { locale: ja });

  let prompt = '';

  if (reportData.report_type === '日帰り出張') {
    prompt = `
株式会社Athosの旅費規程に基づく日帰り出張報告書を作成してください。
${STYLE_RULES}

【入力情報】
- 作成者: ${user?.full_name}（${user?.position || ''}）
- 出張日: ${reportData.travel_date}
- 目的地: ${reportData.destination_name}（${reportData.destination_address}）
- 片道距離: ${reportData.one_way_distance_km}km
- 業務内容: ${reportData.business_content}
- 交通手段: ${(reportData.transport_methods || []).join('、')}
- 走行距離: ${reportData.driving_distance_km || 0}km
- 備考: ${reportData.remarks || 'なし'}

【支給額（変更不可）】
- 日当: ¥${(reportData.daily_allowance || 0).toLocaleString()}
- マイカー手当: ¥${(reportData.car_allowance || 0).toLocaleString()}
- 合計支給額: ¥${(reportData.total_amount || 0).toLocaleString()}

以下のフォーマットで出張報告書を作成してください：

## 出張報告書

**会社名**: 株式会社Athos  
**作成者**: ${user?.full_name}  
**作成日**: ${today}  
**種別**: 日帰り出張

---

### 1. 出張概要
（出張日、目的地、距離などを常体で簡潔にまとめること）

### 2. 業務内容・成果
（入力された業務内容を段落形式・常体で整形すること。成果は論理的に推測できる範囲で記載し、不明な場合は[要記入]とすること）

### 3. 所見・今後の展望
（出張の成果から推測できる今後のアクションを常体で記載すること。不明な場合は[要記入]とすること）

---

## 旅費精算書

| 項目 | 金額 |
|------|------|
| 日当 | ¥${(reportData.daily_allowance || 0).toLocaleString()} |
| マイカー手当 | ¥${(reportData.car_allowance || 0).toLocaleString()} |
| 高速道路料金 | ¥${(reportData.highway_fee || 0).toLocaleString()} |
| 駐車場料金 | ¥${(reportData.parking_fee || 0).toLocaleString()} |
| タクシー料金 | ¥${(reportData.taxi_fee || 0).toLocaleString()} |
| その他交通費 | ¥${(reportData.other_transport_fee || 0).toLocaleString()} |
| **合計支給額** | **¥${(reportData.total_amount || 0).toLocaleString()}** |

---

※本レポートは株式会社Athos旅費規程に基づき作成されている。
    `;
  } else if (reportData.report_type === '宿泊出張') {
    prompt = `
株式会社Athosの旅費規程に基づく宿泊出張報告書を作成してください。
${STYLE_RULES}

【入力情報】
- 作成者: ${user?.full_name}（${user?.position || ''}）
- 出張期間: ${reportData.start_date} ～ ${reportData.end_date}（${reportData.num_days}日間・${reportData.num_nights}泊）
- 目的地: ${reportData.destination_name}（${reportData.destination_address}）
- 片道距離: ${reportData.one_way_distance_km}km
- 業務内容: ${reportData.business_content}
- 交通手段: ${(reportData.transport_methods || []).join('、')}
- 新幹線利用理由: ${reportData.shinkansen_reason || 'なし'}
- 備考: ${reportData.remarks || 'なし'}

【支給額（変更不可）】
- 日当: ¥${(reportData.daily_allowance || 0).toLocaleString()}（¥${policy.daily_allowance_overnight.toLocaleString()} × ${reportData.num_days}日）
- 宿泊費: ¥${(reportData.accommodation_fee || 0).toLocaleString()}（¥${policy.accommodation_domestic.toLocaleString()} × ${reportData.num_nights}泊）
- マイカー手当: ¥${(reportData.car_allowance || 0).toLocaleString()}
- 合計支給額: ¥${(reportData.total_amount || 0).toLocaleString()}

## 出張報告書

**会社名**: 株式会社Athos  
**作成者**: ${user?.full_name}  
**作成日**: ${today}  
**種別**: 宿泊出張

---

### 1. 出張概要
（出張期間、目的地、日程などを常体で簡潔にまとめること）

### 2. 業務内容・成果
（入力された業務内容を段落形式・常体で整形すること。成果は論理的に推測できる範囲で記載し、不明な場合は[要記入]とすること）

### 3. 所見・今後の展望
（常体で記載すること。不明な場合は[要記入]とすること）

---

## 旅費精算書

| 項目 | 単価 | 数量 | 金額 |
|------|------|------|------|
| 日当 | ¥${policy.daily_allowance_overnight.toLocaleString()} | ${reportData.num_days}日 | ¥${(reportData.daily_allowance || 0).toLocaleString()} |
| 宿泊費 | ¥${policy.accommodation_domestic.toLocaleString()} | ${reportData.num_nights}泊 | ¥${(reportData.accommodation_fee || 0).toLocaleString()} |
| マイカー手当 | ¥${policy.car_allowance_per_km}円/km | ${reportData.driving_distance_km || 0}km | ¥${(reportData.car_allowance || 0).toLocaleString()} |
| **合計支給額** | | | **¥${(reportData.total_amount || 0).toLocaleString()}** |

---

※本レポートは株式会社Athos旅費規程に基づき作成されている。
    `;
  } else if (reportData.report_type === '海外出張') {
    prompt = `
株式会社Athosの旅費規程に基づく海外出張報告書を作成してください。
${STYLE_RULES}

【入力情報】
- 作成者: ${user?.full_name}（${user?.position || ''}）
- 出張期間: ${reportData.start_date} ～ ${reportData.end_date}（${reportData.num_days}日間・${reportData.num_nights}泊）
- 渡航先: ${reportData.country_name} ${reportData.city_name}
- 業務内容: ${reportData.business_content}
- 備考: ${reportData.remarks || 'なし'}

【支給額（変更不可）】
- 日当: ¥${(reportData.daily_allowance || 0).toLocaleString()}（¥${policy.daily_allowance_overseas.toLocaleString()} × ${reportData.num_days}日）
- 宿泊費: ¥${(reportData.accommodation_fee || 0).toLocaleString()}（¥${policy.accommodation_overseas.toLocaleString()} × ${reportData.num_nights}泊）
- 合計支給額: ¥${(reportData.total_amount || 0).toLocaleString()}

## 海外出張報告書

**会社名**: 株式会社Athos  
**作成者**: ${user?.full_name}  
**作成日**: ${today}  
**種別**: 海外出張

---

### 1. 出張概要
（常体で記載すること）

### 2. 訪問先・渡航目的
（常体で記載すること）

### 3. 業務内容・成果
（入力された業務内容を段落形式・常体で整形すること。成果は論理的に推測できる範囲で記載し、不明な場合は[要記入]とすること）

### 4. 所見・今後の展望
（常体で記載すること。不明な場合は[要記入]とすること）

---

## 旅費精算書

| 項目 | 単価 | 数量 | 金額 |
|------|------|------|------|
| 日当（海外） | ¥${policy.daily_allowance_overseas.toLocaleString()} | ${reportData.num_days}日 | ¥${(reportData.daily_allowance || 0).toLocaleString()} |
| 宿泊費（海外） | ¥${policy.accommodation_overseas.toLocaleString()} | ${reportData.num_nights}泊 | ¥${(reportData.accommodation_fee || 0).toLocaleString()} |
| 航空券代 | - | - | ¥${(reportData.flight_fee || 0).toLocaleString()} |
| 空港までの交通費 | - | - | ¥${(reportData.airport_transport_fee || 0).toLocaleString()} |
| **合計支給額** | | | **¥${(reportData.total_amount || 0).toLocaleString()}** |

---

※本レポートは株式会社Athos旅費規程に基づき作成されている。
    `;
  } else if (reportData.report_type === '外出作業') {
    prompt = `
株式会社Athosの旅費規程に基づく外出作業報告書を作成してください。
${STYLE_RULES}

【入力情報】
- 作成者: ${user?.full_name}（${user?.position || ''}）
- 作業日: ${reportData.travel_date}
- 作業場所: ${reportData.destination_name}（${reportData.destination_address}）
- 作業時間: ${reportData.work_start_time} ～ ${reportData.work_end_time}
- 業務内容: ${reportData.business_content}
- 交通手段: ${(reportData.transport_methods || []).join('、')}
- 備考: ${reportData.remarks || 'なし'}

【支給額（変更不可）】
- マイカー手当: ¥${(reportData.car_allowance || 0).toLocaleString()}
- 外出作業費合計: ¥${(reportData.total_work_expense || 0).toLocaleString()}
- 合計支給額: ¥${(reportData.total_amount || 0).toLocaleString()}

## 外出作業報告書

**会社名**: 株式会社Athos  
**作成者**: ${user?.full_name}  
**作成日**: ${today}  
**種別**: 外出作業

---

### 1. 作業概要
（作業日時・場所・時間を常体で簡潔にまとめること）

### 2. 業務内容・実施事項
（入力された業務内容を段落形式・常体で整形すること。箇条書きは使用しないこと）

### 3. 成果・所見
（業務内容から論理的に推測できる成果・所見を常体で記載すること。推測困難な場合は[要記入]とすること）

---

## 経費精算書

| 項目 | 金額 |
|------|------|
| マイカー手当 | ¥${(reportData.car_allowance || 0).toLocaleString()} |
| コワーキング/貸会議室 | ¥${(reportData.coworking_fee || 0).toLocaleString()} |
| Wi-Fi/通信費 | ¥${(reportData.wifi_fee || 0).toLocaleString()} |
| 駐車場料金 | ¥${(reportData.parking_fee || 0).toLocaleString()} |
| 飲食代 | ¥${(reportData.meal_fee || 0).toLocaleString()} |
| その他業務関連費 | ¥${(reportData.other_work_fee || 0).toLocaleString()} |
| **合計支給額** | **¥${(reportData.total_amount || 0).toLocaleString()}** |

---

※本レポートは株式会社Athos旅費規程に基づき作成されている。
    `;
  }

  const result = await base44.integrations.Core.InvokeLLM({ prompt });

  const parts = result.split('## 旅費精算書');
  const settlementPart = result.includes('## 旅費精算書')
    ? '## 旅費精算書' + parts[1]
    : result.includes('## 経費精算書')
      ? '## 経費精算書' + result.split('## 経費精算書')[1]
      : '';

  return {
    reportText: result,
    reportBodyText: result.split('## 旅費精算書')[0].split('## 経費精算書')[0] || result,
    settlementText: settlementPart,
    rawData: reportData,
  };
}