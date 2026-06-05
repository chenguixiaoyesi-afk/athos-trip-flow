import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export function FormField({ label, required, error, children, className }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function FormInput({ label, required, error, className, ...props }) {
  return (
    <FormField label={label} required={required} error={error} className={className}>
      <Input {...props} className={cn(error && "border-destructive")} />
    </FormField>
  );
}

export function FormTextarea({ label, required, error, className, ...props }) {
  return (
    <FormField label={label} required={required} error={error} className={className}>
      <Textarea {...props} className={cn("min-h-[100px]", error && "border-destructive")} />
    </FormField>
  );
}