import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const ALL_METHODS = ['マイカー', '電車', 'バス', 'タクシー', '新幹線'];
const FIELDWORK_METHODS = ['マイカー', '電車', 'バス', 'タクシー'];

export default function TransportSelector({ value = [], onChange, drivingKm, onDrivingKmChange, fieldworkMode = false, error }) {
  const methods = fieldworkMode ? FIELDWORK_METHODS : ALL_METHODS;

  const toggle = (method) => {
    if (value.includes(method)) {
      onChange(value.filter(m => m !== method));
    } else {
      onChange([...value, method]);
    }
  };

  const hasCar = value.includes('マイカー');

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-foreground">
        交通手段<span className="text-destructive ml-1">*</span>
      </Label>
      <div className="flex flex-wrap gap-2">
        {methods.map(m => (
          <button
            key={m}
            type="button"
            onClick={() => toggle(m)}
            className={cn(
              "px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
              value.includes(m)
                ? "bg-[#1a237e] text-white border-[#1a237e]"
                : "bg-white text-foreground border-border hover:border-[#1a237e]/50"
            )}
          >
            {m}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {hasCar && (
        <div className="mt-2">
          <Label className="text-sm font-medium text-foreground">
            走行距離（km）<span className="text-destructive ml-1">*</span>
          </Label>
          <Input
            type="number"
            min="0"
            value={drivingKm || ''}
            onChange={e => onDrivingKmChange(parseFloat(e.target.value) || 0)}
            placeholder="走行距離を入力"
            className="mt-1.5 max-w-[200px]"
          />
        </div>
      )}
    </div>
  );
}