import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FloatingWindow } from "../components/FloatingWindow";
import { SearchBar } from "../components/SearchBar";
import { ServiceCard } from "../components/ServiceCard";
import { cn } from "../lib/utils";
import { useCardStore } from "../store/useCardStore";
import { useHealthStore } from "../store/useHealthStore";
import { useSystemStore } from "../store/useSystemStore";
import type { CardDTO } from "../types";

type OpenWindow = {
  id: string;
  cardId: string;
  title: string;
  icon?: string;
  url: string;
  zIndex: number;
};

const NETWORK_MODE_OPTIONS = [
  { value: "auto", label: "自动" },
  { value: "lan", label: "内网" },
  { value: "wan", label: "外网" }
] as const;

type RuntimeNetworkMode = (typeof NETWORK_MODE_OPTIONS)[number]["value"];

export function HomePage() {
  const groups = useCardStore((state) => state.groups);
  const cards = useCardStore((state) => state.cards);
  const loadCards = useCardStore((state) => state.load);
  const reorder = useCardStore((state) => state.reorder);

  const healthByCardId = useHealthStore((state) => state.byCardId);
  const probeCards = useHealthStore((state) => state.probeCards);
  const resetHealth = useHealthStore((state) => state.reset);

  const config = useSystemStore((state) => state.config);
  const selectedEngineId = useSystemStore((state) => state.selectedSearchEngineId);
  const loadSystem = useSystemStore((state) => state.load);
  const setSearchEngine = useSystemStore((state) => state.setSearchEngine);

  const [keyword, setKeyword] = useState("");
  const [cardFilter, setCardFilter] = useState("");
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [openWindows, setOpenWindows] = useState<OpenWindow[]>([]);
  const [maxZIndex, setMaxZIndex] = useState(1000);
  const [runtimeNetworkMode, setRuntimeNetworkMode] = useState<RuntimeNetworkMode>("auto");

  useEffect(() => {
    Promise.all([loadCards(), loadSystem()]).catch(() => {
      toast.error("加载首页数据失败");
    });
  }, [loadCards, loadSystem]);

  const cardsWithRuntimeMode = useMemo(() => {
    const resolveUrl = (card: CardDTO) => {
      if (runtimeNetworkMode === "lan") {
        return card.lanUrl || card.url || card.wanUrl || "";
      }
      if (runtimeNetworkMode === "wan") {
        return card.wanUrl || card.url || card.lanUrl || "";
      }
      return card.url || card.lanUrl || card.wanUrl || "";
    };
    return cards.map((card) => ({
      ...card,
      url: resolveUrl(card)
    }));
  }, [cards, runtimeNetworkMode]);

  useEffect(() => {
    probeCards(cardsWithRuntimeMode).catch(() => undefined);
    const timer = window.setInterval(() => {
      probeCards(cardsWithRuntimeMode).catch(() => undefined);
    }, 30000);
    return () => {
      window.clearInterval(timer);
      resetHealth();
    };
  }, [cardsWithRuntimeMode, probeCards, resetHealth]);

  const filteredCards = useMemo(() => {
    if (!cardFilter.trim()) {
      return cardsWithRuntimeMode;
    }
    const query = cardFilter.toLowerCase();
    return cardsWithRuntimeMode.filter(
      (card) =>
        card.name.toLowerCase().includes(query) ||
        card.description?.toLowerCase().includes(query) ||
        card.url.toLowerCase().includes(query)
    );
  }, [cardFilter, cardsWithRuntimeMode]);

  const groupedCards = useMemo(() => {
    const map: Record<string, CardDTO[]> = {};
    for (const card of filteredCards) {
      map[card.groupId] = map[card.groupId] || [];
      map[card.groupId].push(card);
    }
    Object.keys(map).forEach((groupId) => {
      map[groupId].sort((a, b) => a.orderIndex - b.orderIndex);
    });
    return map;
  }, [filteredCards]);

  const sortedGroups = useMemo(() => [...groups].sort((a, b) => a.orderIndex - b.orderIndex), [groups]);

  const focusWindow = (windowId: string) => {
    setOpenWindows((previous) =>
      previous.map((window) =>
        window.id === windowId
          ? {
              ...window,
              zIndex: maxZIndex + 1
            }
          : window
      )
    );
    setMaxZIndex((value) => value + 1);
  };

  const handleServiceCardClick = (card: CardDTO) => {
    const health = healthByCardId[card.id];
    if (card.openMode === "newtab" || (card.openMode === "auto" && health?.status === "down")) {
      window.open(card.url, "_blank", "noopener,noreferrer");
      return;
    }

    const existing = openWindows.find((window) => window.cardId === card.id);
    if (existing) {
      focusWindow(existing.id);
      return;
    }

    const next: OpenWindow = {
      id: `window-${card.id}-${Date.now()}`,
      cardId: card.id,
      title: card.name,
      icon: card.icon,
      url: card.url,
      zIndex: maxZIndex + 1
    };
    setOpenWindows((previous) => [...previous, next]);
    setMaxZIndex((value) => value + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="mx-auto max-w-7xl px-3 py-6 md:px-4 md:py-8">
        <SearchBar
          searchEngines={config?.searchEngines || []}
          selectedEngineId={selectedEngineId}
          keyword={keyword}
          onKeywordChange={setKeyword}
          onSelectEngine={setSearchEngine}
        />
        <div className="mx-auto mb-6 flex max-w-4xl flex-wrap items-center justify-center gap-2 px-2 text-xs md:px-0 md:text-sm">
          <span className="text-slate-500">临时网络：</span>
          {NETWORK_MODE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRuntimeNetworkMode(option.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-medium transition-all",
                runtimeNetworkMode === option.value
                  ? "border-blue-600 bg-blue-600 text-white shadow-[0_8px_18px_-10px_rgba(37,99,235,0.9)]"
                  : "border-slate-200 bg-slate-100/90 text-slate-600 hover:border-slate-300 hover:bg-slate-200"
              )}
            >
              {option.label}
            </button>
          ))}
          <span className="text-slate-400">
            仅当前页面生效（自动当前：{config ? (config.resolvedNetworkMode === "lan" ? "内网" : "外网") : "加载中"}）
          </span>
        </div>

        {cardsWithRuntimeMode.length > 6 && (
          <div className="mx-auto mb-8 max-w-md px-2 md:px-0">
            <input
              type="text"
              value={cardFilter}
              placeholder="过滤服务..."
              className="h-10 w-full rounded-md border border-input px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              onChange={(event) => setCardFilter(event.target.value)}
            />
          </div>
        )}

        {sortedGroups.map((group) => {
          const services = groupedCards[group.id] || [];
          if (!services.length) {
            return null;
          }

          return (
            <section key={group.id} className="mb-10">
              <h2 className="mb-4 px-1 text-xl font-semibold text-slate-800 md:text-2xl">{group.name}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    draggable
                    onDragStart={() => setDraggingCardId(service.id)}
                    onDrop={() => {
                      if (draggingCardId && draggingCardId !== service.id) {
                        reorder(draggingCardId, service.id)
                          .then(() => toast.success("卡片顺序已保存"))
                          .catch(() => toast.error("保存顺序失败"));
                      }
                      setDraggingCardId(null);
                    }}
                    onClick={() => handleServiceCardClick(service)}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {!filteredCards.length && (
          <div className="py-20 text-center">
            <div className="mb-4 text-5xl">🔍</div>
            <h3 className="mb-2 text-lg font-semibold text-slate-700">没有找到匹配服务</h3>
            <p className="text-sm text-slate-500">尝试更换关键词</p>
          </div>
        )}
      </div>

      {openWindows.map((window) => (
        <FloatingWindow
          key={window.id}
          id={window.id}
          title={window.title}
          icon={window.icon}
          url={window.url}
          zIndex={window.zIndex}
          onClose={() => setOpenWindows((previous) => previous.filter((item) => item.id !== window.id))}
          onFocus={() => focusWindow(window.id)}
        />
      ))}
    </div>
  );
}
