import { Search } from "lucide-react";
import type { SearchEngineDTO } from "../types";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

type SearchBarProps = {
  searchEngines: SearchEngineDTO[];
  selectedEngineId?: string;
  keyword: string;
  onKeywordChange: (value: string) => void;
  onSelectEngine: (engineId: string) => void;
};

export function SearchBar({
  searchEngines,
  selectedEngineId,
  keyword,
  onKeywordChange,
  onSelectEngine
}: SearchBarProps) {
  const selectedEngine =
    searchEngines.find((engine) => engine.id === selectedEngineId) || searchEngines[0];

  const doSearch = () => {
    if (!selectedEngine || !keyword.trim()) {
      return;
    }
    const encodedKeyword = encodeURIComponent(keyword.trim());
    const template = selectedEngine.searchUrlTemplate;
    const url = template.includes("%s")
      ? template.split("%s").join(encodedKeyword)
      : template.includes("{query}")
        ? template.split("{query}").join(encodedKeyword)
        : template;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!searchEngines.length) {
    return null;
  }

  return (
    <div className="mx-auto mb-8 max-w-4xl px-2 md:mb-10 md:px-0">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 md:h-5 md:w-5" />
        <Input
          className="h-12 rounded-xl border-2 pl-10 pr-24 shadow-md md:h-14 md:rounded-2xl md:pl-12"
          placeholder={`使用 ${selectedEngine.name} 搜索`}
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              doSearch();
            }
          }}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <Button size="sm" onClick={doSearch}>
            搜索
          </Button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs md:text-sm">
        <span className="text-slate-500">快速切换：</span>
        {searchEngines.map((engine) => (
          <button
            key={engine.id}
            type="button"
            onClick={() => onSelectEngine(engine.id)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-3 py-1 font-medium transition-all",
              engine.id === selectedEngine?.id
                ? "border-blue-600 bg-blue-600 text-white shadow-[0_8px_18px_-10px_rgba(37,99,235,0.9)]"
                : "border-slate-200 bg-slate-100/90 text-slate-600 hover:border-slate-300 hover:bg-slate-200"
            )}
          >
            <Search className="h-3.5 w-3.5" />
            {engine.name}
          </button>
        ))}
      </div>
    </div>
  );
}
