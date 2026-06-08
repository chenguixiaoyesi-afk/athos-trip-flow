import { Upload, X, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

// 領収書アップロード UI セクション。
// FieldworkForm 現状の領収書 JSX を form 非依存に抽出したもの。
// 新規 UI 要素は追加していない。state は親 form / useReceiptParser で管理。
export default function ReceiptUploaderSection({
  receipts,
  handleReceiptUpload,
  removeReceipt,
  isUploading,
  isAnalyzing,
  title = '領収書アップロード',
  description = '写真を撮ってアップするだけで金額・カテゴリを自動判定して経費欄に反映します',
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium">
          {title} <span className="text-muted-foreground font-normal text-xs">（任意・写真でOK）</span>
        </p>
        <span className="flex items-center gap-1 text-xs text-[#1a237e]">
          <Sparkles className="w-3 h-3" />AI自動仕分け
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-2">{description}</p>
      <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-[#1a237e]/50 transition-colors">
        <Upload className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">領収書を撮影・選択（複数可）</span>
        <input
          type="file"
          multiple
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleReceiptUpload}
        />
      </label>
      {(isUploading || isAnalyzing) && (
        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          {isAnalyzing ? 'AIが領収書を解析中...' : 'アップロード中...'}
        </div>
      )}
      {receipts.length > 0 && (
        <div className="mt-2 space-y-2">
          {receipts.map((r) => (
            <div key={r.id} className="bg-muted/40 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="truncate flex-1 text-xs text-muted-foreground">{r.name}</span>
                <button
                  onClick={() => removeReceipt(r.id)}
                  className="text-muted-foreground hover:text-destructive ml-auto"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {r.parsed && (
                <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
                  {r.parsed.store && (
                    <span className="bg-white border rounded px-2 py-0.5">{r.parsed.store}</span>
                  )}
                  {r.parsed.category && (
                    <span className="bg-[#1a237e]/10 text-[#1a237e] rounded px-2 py-0.5">
                      {r.parsed.category}
                    </span>
                  )}
                  {r.parsed.amount > 0 && (
                    <span className="bg-green-50 text-green-700 border border-green-200 rounded px-2 py-0.5 font-semibold">
                      ¥{r.parsed.amount.toLocaleString()}
                    </span>
                  )}
                  {r.parsed.date && (
                    <span className="text-muted-foreground">{r.parsed.date}</span>
                  )}
                  <span className="text-green-600 flex items-center gap-0.5">
                    <Sparkles className="w-3 h-3" />自動反映済
                  </span>
                </div>
              )}
              {r.status === 'done' && !r.parsed && (
                <p className="text-xs text-muted-foreground mt-1">解析不可 — 手動で入力してください</p>
              )}
              {r.status === 'failed' && (
                <p className="text-xs text-destructive mt-1">アップロード後の解析に失敗 — 削除して再アップロードしてください</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
