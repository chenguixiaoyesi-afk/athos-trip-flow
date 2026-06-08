import { useState } from 'react';
import { base44 } from '@/api/base44Client';

// 領収書 AI 仕分けの共通フック。
// A1 で確立した FieldworkForm の単一 receipts SOT を form 非依存に抽出したもの。
// 並列アップロード / batched setState 耐性は id 一致更新により構造的に保証される。
//
// signature:
//   useReceiptParser({
//     initialReceiptUrls = [],       // edit モード復元用
//     categoryMap,                    // { 'コワーキング': 'coworking_fee', ... } 等
//     fallbackKey,                    // 既知カテゴリに当てはまらない場合のフォーム key
//     onAmountParsed,                 // (mapKey, amount, parsedFull) => void  ← 金額加算コールバック
//   })
//
// 戻り値:
//   { receipts, setReceipts, handleReceiptUpload, removeReceipt,
//     isUploading, isAnalyzing, receiptUrls }
//
// receipts 配列の各要素:
//   { id, url, name, parsed, status: 'uploading'|'analyzing'|'done'|'failed' }
export function useReceiptParser({
  initialReceiptUrls = [],
  categoryMap,
  fallbackKey,
  onAmountParsed,
}) {
  const [receipts, setReceipts] = useState(() => {
    if (initialReceiptUrls?.length) {
      return initialReceiptUrls.map((url, i) => ({
        id: `existing-${i}`,
        url,
        name: `領収書${i + 1}`,
        parsed: null,
        status: 'done',
      }));
    }
    return [];
  });

  const handleReceiptUpload = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setReceipts(prev => [
        ...prev,
        { id, url: null, name: file.name, parsed: null, status: 'uploading' },
      ]);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setReceipts(prev => prev.map(r =>
          r.id === id ? { ...r, url: file_url, status: 'analyzing' } : r
        ));

        try {
          const parsed = await base44.integrations.Core.InvokeLLM({
            prompt: `この領収書画像を読み取り、以下のJSON形式で情報を抽出してください。
カテゴリは「コワーキング」「貸会議室」「Wi-Fi」「駐車場」「飲食」「航空券」「空港送迎」「タクシー」「高速道路」「その他」のいずれかに分類してください。`,
            file_urls: [file_url],
            response_json_schema: {
              type: 'object',
              properties: {
                store: { type: 'string', description: '店舗・施設名' },
                amount: { type: 'number', description: '合計金額（円）' },
                date: { type: 'string', description: '日付 YYYY-MM-DD' },
                category: { type: 'string', description: 'カテゴリ' },
              },
            },
          });

          // 金額 0 ガード強化（既知不具合 #3 — 型安全チェックを hook 内 1 箇所に集約）
          // form 側で再チェックしない（DRY）。
          const isValidAmount =
            typeof parsed.amount === 'number' &&
            Number.isFinite(parsed.amount) &&
            parsed.amount > 0;

          setReceipts(prev => prev.map(r =>
            r.id === id ? { ...r, parsed, status: 'done' } : r
          ));

          if (isValidAmount) {
            const matchedKey =
              Object.entries(categoryMap).find(([cat]) =>
                parsed.category?.includes(cat)
              )?.[1] || fallbackKey;
            onAmountParsed?.(matchedKey, parsed.amount, parsed);
          }
        } catch {
          // 解析失敗時は entry を残し失敗状態にする（UI が再アップロード/削除を促す）
          setReceipts(prev => prev.map(r =>
            r.id === id ? { ...r, parsed: null, status: 'failed' } : r
          ));
        }
      } catch (err) {
        // アップロード失敗時は entry を除去（既存 FieldworkForm の挙動と等価）
        console.error(err);
        setReceipts(prev => prev.filter(r => r.id !== id));
      }
    }
    // 同じファイルを再選択可能にする
    if (e?.target) e.target.value = '';
  };

  const removeReceipt = (id) => {
    setReceipts(prev => prev.filter(r => r.id !== id));
  };

  const isUploading = receipts.some(r => r.status === 'uploading');
  const isAnalyzing = receipts.some(r => r.status === 'analyzing');
  const receiptUrls = receipts.map(r => r.url).filter(Boolean);

  return {
    receipts,
    setReceipts,
    handleReceiptUpload,
    removeReceipt,
    isUploading,
    isAnalyzing,
    receiptUrls,
  };
}
