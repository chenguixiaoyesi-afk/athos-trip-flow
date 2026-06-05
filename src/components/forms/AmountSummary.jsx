import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator } from 'lucide-react';

export default function AmountSummary({ items, total }) {
  return (
    <Card className="border-[#1a237e]/20 bg-[#1a237e]/5">
      <CardHeader className="pb-3 pt-4 px-5">
        <CardTitle className="text-sm font-semibold text-[#1a237e] flex items-center gap-2">
          <Calculator className="w-4 h-4" />
          自動計算結果
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4 space-y-2">
        {items.filter(i => i.amount !== undefined && i.amount !== null && i.amount !== 0).map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium text-foreground">¥{(item.amount || 0).toLocaleString()}</span>
          </div>
        ))}
        <div className="border-t border-[#1a237e]/20 pt-2 mt-2 flex justify-between">
          <span className="font-semibold text-foreground">合計支給額</span>
          <span className="font-bold text-[#1a237e] text-lg">¥{(total || 0).toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}