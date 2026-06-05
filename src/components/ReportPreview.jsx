import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Send, Loader2, Edit2, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function ReportPreview({ report, onBack, onSaveDraft, onSubmit, saving, totalAmount, receiptUrls }) {
  const [editMode, setEditMode] = useState(false);
  const [editedText, setEditedText] = useState(report.reportText);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">AIレポートプレビュー</h1>
          <p className="text-muted-foreground text-sm mt-0.5">内容を確認・編集してから申請してください</p>
        </div>
        <button
          onClick={() => setEditMode(!editMode)}
          className="flex items-center gap-2 text-sm text-[#1a237e] hover:underline"
        >
          {editMode ? <><Eye className="w-4 h-4" />プレビュー</> : <><Edit2 className="w-4 h-4" />編集</>}
        </button>
      </div>

      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-6">
          {editMode ? (
            <Textarea
              value={editedText}
              onChange={e => setEditedText(e.target.value)}
              className="min-h-[500px] font-mono text-sm"
            />
          ) : (
            <div className="prose prose-sm max-w-none prose-headings:text-[#1a237e] prose-table:text-sm">
              <ReactMarkdown>{editedText}</ReactMarkdown>
            </div>
          )}
        </CardContent>
      </Card>

      {receiptUrls && receiptUrls.length > 0 && (
        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-5">
            <h3 className="font-semibold text-sm mb-3">添付領収書（{receiptUrls.length}枚）</h3>
            <div className="flex flex-wrap gap-3">
              {receiptUrls.map((url, idx) => (
                <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                  className="w-20 h-20 border rounded-lg overflow-hidden hover:opacity-80 transition-opacity">
                  <img src={url} alt={`領収書${idx + 1}`} className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="bg-primary/5 rounded-xl p-4 mb-6 flex items-center justify-between">
        <span className="font-semibold text-foreground">合計支給額</span>
        <span className="text-2xl font-bold text-[#1a237e]">¥{(totalAmount || 0).toLocaleString()}</span>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onSaveDraft}
          disabled={saving}
          className="flex-1 h-12"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          下書き保存
        </Button>
        <Button
          onClick={onSubmit}
          disabled={saving}
          className="flex-1 h-12 bg-[#1a237e] hover:bg-[#1a237e]/90 text-white"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          申請する
        </Button>
      </div>
    </div>
  );
}