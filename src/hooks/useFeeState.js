import { useState } from 'react';

// Task I: 手入力(manualFees)と領収書AI認識(receiptFees)を別stateで管理し、
// 表示・保存はその合算(feeTotal)を使う。
// これにより「アップロードと手入力の順番」に関係なく金額が正しく合算され、
// 領収書反映が手入力を上書きする（またはその逆）不具合を構造的に防ぐ。
//
// signature:
//   useFeeState(feeKeys, initialManual = {})
//     feeKeys       : このフォームの経費項目キー配列（例: ['highway_fee', ...]）
//     initialManual : 手入力分の初期値（編集時は既存fee項目を初期値として渡す）
//
// 戻り値:
//   manualFees    : 手入力分 { key: number }
//   receiptFees   : 領収書認識分 { key: number }
//   setManualFee  : (key, value) => void   手入力欄の更新（上書き）
//   addReceiptFee : (key, amount) => void  領収書認識額の加算（順序非依存）
//   feeTotal      : (key) => number        合算（manual + receipt）
//   combinedFees  : () => { key: number }  全keyの合算オブジェクト（保存・生成用）
export function useFeeState(feeKeys, initialManual = {}) {
  const zero = () => Object.fromEntries(feeKeys.map(k => [k, 0]));

  const [manualFees, setManualFees] = useState(() => ({ ...zero(), ...initialManual }));
  const [receiptFees, setReceiptFees] = useState(zero);

  // 手入力: その項目の手入力分のみを上書き（領収書分には触れない）
  const setManualFee = (key, value) =>
    setManualFees(prev => ({ ...prev, [key]: value }));

  // 領収書: 加算（関数型更新で順序・並列に依存しない）。
  // 0円/失敗（有効な正数でない）場合は既存金額を変更しない。
  const addReceiptFee = (key, amount) => {
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return;
    setReceiptFees(prev => ({ ...prev, [key]: (prev[key] || 0) + amount }));
  };

  const feeTotal = (key) => (manualFees[key] || 0) + (receiptFees[key] || 0);

  const combinedFees = () =>
    Object.fromEntries(feeKeys.map(k => [k, feeTotal(k)]));

  return { manualFees, receiptFees, setManualFee, addReceiptFee, feeTotal, combinedFees };
}
