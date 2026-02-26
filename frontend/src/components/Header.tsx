import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Grid3x3, Search } from "lucide-react";
import { useSystemStore } from "../store/useSystemStore";
import { AppIcon } from "./AppIcon";
import { cn } from "../lib/utils";

const FALLBACK_SENTENCE = "\"在这样的世界中，你从爱人的怀抱中起身，走出几步，就与他隔开千万年。\" —— 三体3";

function formatTime(date: Date) {
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

function formatDate(date: Date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  const weekday = weekdays[date.getDay()];
  return `${month}-${day} ${weekday}`;
}

export function Header() {
  const config = useSystemStore((state) => state.config);
  const loadSystem = useSystemStore((state) => state.load);
  const setSearchEngine = useSystemStore((state) => state.setSearchEngine);
  const getSelectedEngine = useSystemStore((state) => state.getSelectedEngine);
  const selectedSearchEngineId = useSystemStore((state) => state.selectedSearchEngineId);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [dailySentence, setDailySentence] = useState(FALLBACK_SENTENCE);

  const selectedEngine = getSelectedEngine();

  useEffect(() => {
    if (!config) {
      loadSystem().catch(() => undefined);
    }
  }, [config, loadSystem]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (config?.dailySentenceEnabled !== true) {
      setDailySentence("");
      return;
    }

    const controller = new AbortController();
    const fetchDailySentence = async () => {
      try {
        const response = await fetch("https://v1.hitokoto.cn/?c=a&c=b&c=d&c=i&c=k", {
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error("request failed");
        }
        const payload = (await response.json()) as {
          hitokoto?: string;
          from?: string;
          from_who?: string;
        };
        if (!payload.hitokoto) {
          throw new Error("empty");
        }
        const text = payload.from_who
          ? `\"${payload.hitokoto}\" —— ${payload.from_who}，《${payload.from || "未知"}》`
          : payload.from
            ? `\"${payload.hitokoto}\" —— 《${payload.from}》`
            : `\"${payload.hitokoto}\"`;
        setDailySentence(text);
      } catch {
        setDailySentence(FALLBACK_SENTENCE);
      }
    };

    fetchDailySentence().catch(() => undefined);
    return () => controller.abort();
  }, [config?.dailySentenceEnabled]);

  const handleSearch = () => {
    if (!searchQuery.trim() || !selectedEngine) {
      return;
    }
    const encoded = encodeURIComponent(searchQuery.trim());
    const template = selectedEngine.searchUrlTemplate;
    const searchUrl = template.includes("%s")
      ? template.split("%s").join(encoded)
      : template.includes("{query}")
        ? template.split("{query}").join(encoded)
        : template;
    window.open(searchUrl, "_blank", "noopener,noreferrer");
    setSearchQuery("");
  };

  return (
    <header className="w-full bg-transparent py-8 backdrop-blur-sm md:py-12">
      <div className="mx-auto w-full max-w-7xl px-4">
        <div className="mb-6 flex flex-col items-center justify-center md:mb-8">
          <div className="mb-3 flex w-full items-center justify-center gap-6 md:mb-4 md:gap-12">
            <Link to="/" className="group flex items-center gap-2">
              <Grid3x3 className="h-6 w-6 text-blue-400 transition-colors group-hover:text-blue-300 md:h-8 md:w-8" />
              <span className="text-2xl font-bold tracking-wider text-white md:text-5xl">NexusNav</span>
            </Link>
            <div className="flex flex-col items-start border-l-2 border-gray-500 pl-6 md:pl-8">
              <div className="tabular-nums text-2xl font-bold text-white md:text-5xl">{formatTime(currentTime)}</div>
              <div className="text-xs text-gray-300 md:text-sm">{formatDate(currentTime)}</div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-4xl">
          <div className="space-y-3">
            <div className="relative">
              <div className="flex items-center gap-3 rounded-full border-2 border-white/20 bg-white/10 px-5 py-3 shadow-lg transition-all hover:border-white/30 hover:bg-white/15 focus-within:border-blue-400/50 focus-within:bg-white/20 md:px-6 md:py-4">
                <div className="flex-shrink-0">
                  <AppIcon
                    icon={selectedEngine?.icon}
                    className="h-5 w-5 text-gray-300 md:h-6 md:w-6"
                    emojiClassName="text-xl md:text-2xl"
                  />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={dailySentence}
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-400 outline-none md:text-base"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleSearch();
                    }
                  }}
                />
                <button
                  type="button"
                  className="flex-shrink-0 rounded-full p-2 transition-colors hover:bg-white/10"
                  onClick={handleSearch}
                >
                  <Search className="h-5 w-5 text-gray-300 transition-colors hover:text-white md:h-6 md:w-6" />
                </button>
              </div>
            </div>

            {(config?.searchEngines?.length || 0) > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="hidden text-xs text-gray-400 md:inline">快速切换：</span>
                {(config?.searchEngines || []).map((engine) => (
                  <button
                    key={engine.id}
                    type="button"
                    onClick={() => setSearchEngine(engine.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all md:px-4 md:py-2 md:text-sm",
                      selectedSearchEngineId === engine.id
                        ? "scale-105 bg-blue-500 text-white shadow-md"
                        : "border border-white/20 bg-white/10 text-gray-300 hover:scale-105 hover:bg-white/20"
                    )}
                  >
                    <AppIcon icon={engine.icon} className="h-4 w-4" emojiClassName="text-sm" />
                    <span>{engine.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
