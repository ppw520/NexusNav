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
      <div className="inline-flex h-9 min-w-max items-center rounded-[14px] bg-[#ececf0] p-1">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              "inline-flex h-7 items-center justify-center rounded-[14px] px-3 text-sm font-medium text-slate-900 transition",
              value === item.value ? "bg-white shadow-sm" : "hover:bg-white/60"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
