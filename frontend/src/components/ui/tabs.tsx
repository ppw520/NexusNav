import { cn } from "../../lib/utils";

type TabsProps = {
  value: string;
  onChange: (value: string) => void;
  items: Array<{ value: string; label: string }>;
  className?: string;
};

export function Tabs({ value, onChange, items, className }: TabsProps) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <div className="inline-flex h-10 min-w-max items-center rounded-[14px] border border-white/10 bg-slate-950/60 p-1 backdrop-blur-sm">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              "inline-flex h-8 items-center justify-center rounded-[12px] px-3 text-sm font-medium text-slate-300 transition-colors",
              value === item.value ? "bg-white/12 text-white shadow-sm" : "hover:bg-white/6 hover:text-slate-100"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
