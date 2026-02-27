import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EmbyStatsWindow } from "../components/EmbyStatsWindow";
import { FloatingWindow } from "../components/FloatingWindow";
import { SshTerminalWindow } from "../components/SshTerminalWindow";
import { ServiceCard } from "../components/ServiceCard";
import { loadEmbyStats } from "../services/emby";
import { useCardStore } from "../store/useCardStore";
import { useHealthStore } from "../store/useHealthStore";
import { useSystemStore } from "../store/useSystemStore";
import type { CardDTO, EmbyStatsDTO } from "../types";

type OpenIframeWindow = {
  id: string;
  cardId: string;
  title: string;
  icon?: string;
  type: "iframe";
  url: string;
  zIndex: number;
};

type OpenSshWindow = {
  id: string;
  cardId: string;
  title: string;
  icon?: string;
  type: "ssh";
  sshHost?: string;
  sshPort?: number;
  sshUsername?: string;
  sshAuthMode?: "password" | "privatekey";
  zIndex: number;
};

type OpenEmbyWindow = {
  id: string;
  cardId: string;
  title: string;
  icon?: string;
  type: "emby";
  card: CardDTO;
  zIndex: number;
};

type OpenWindow = OpenIframeWindow | OpenSshWindow | OpenEmbyWindow;

export function HomePage() {
  const groups = useCardStore((state) => state.groups);
  const cards = useCardStore((state) => state.cards);
  const loadCards = useCardStore((state) => state.load);
  const reorder = useCardStore((state) => state.reorder);

  const healthByCardId = useHealthStore((state) => state.byCardId);
  const probeCards = useHealthStore((state) => state.probeCards);
  const resetHealth = useHealthStore((state) => state.reset);

  const config = useSystemStore((state) => state.config);
  const loadSystem = useSystemStore((state) => state.load);
  const runtimeNetworkMode = useSystemStore((state) => state.runtimeNetworkMode);

  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [openWindows, setOpenWindows] = useState<OpenWindow[]>([]);
  const [maxZIndex, setMaxZIndex] = useState(1000);
  const [embyStatsByCardId, setEmbyStatsByCardId] = useState<Record<string, EmbyStatsDTO>>({});

  useEffect(() => {
    Promise.all([loadCards(), loadSystem()]).catch(() => {
      toast.error("加载首页数据失败");
    });
  }, [loadCards, loadSystem]);

  const cardsWithRuntimeMode = useMemo(() => {
    const effectiveMode =
      runtimeNetworkMode === "auto" ? (config?.resolvedNetworkMode || "wan") : runtimeNetworkMode;

    const resolveUrl = (card: CardDTO) => {
      if (effectiveMode === "lan") {
        return card.lanUrl || card.url || card.wanUrl || "";
      }
      return card.wanUrl || card.url || card.lanUrl || "";
    };

    return cards.map((card) => ({ ...card, url: resolveUrl(card) }));
  }, [cards, config?.resolvedNetworkMode, runtimeNetworkMode]);

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

  useEffect(() => {
    let cancelled = false;
    const embyCards = cardsWithRuntimeMode.filter((card) => card.cardType === "emby");
    if (!embyCards.length) {
      setEmbyStatsByCardId({});
      return;
    }

    const refresh = async () => {
      const next: Record<string, EmbyStatsDTO> = {};
      await Promise.all(
        embyCards.map(async (card) => {
          try {
            next[card.id] = await loadEmbyStats(card);
          } catch {
            // keep previous snapshot when refresh fails
          }
        })
      );

      if (cancelled) {
        return;
      }
      setEmbyStatsByCardId((previous) => ({ ...previous, ...next }));
    };

    refresh().catch(() => undefined);
    const timer = window.setInterval(() => {
      refresh().catch(() => undefined);
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [cardsWithRuntimeMode]);

  const groupedCards = useMemo(() => {
    const grouped: Record<string, CardDTO[]> = {};
    for (const card of cardsWithRuntimeMode) {
      grouped[card.groupId] = grouped[card.groupId] || [];
      grouped[card.groupId].push(card);
    }
    Object.keys(grouped).forEach((groupId) => {
      grouped[groupId].sort((a, b) => a.orderIndex - b.orderIndex);
    });
    return grouped;
  }, [cardsWithRuntimeMode]);

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
    if (card.cardType === "emby") {
      const existingEmby = openWindows.find((window) => window.cardId === card.id);
      if (existingEmby) {
        focusWindow(existingEmby.id);
        return;
      }

      const nextEmby: OpenEmbyWindow = {
        id: `window-${card.id}-${Date.now()}`,
        cardId: card.id,
        title: card.name,
        icon: card.icon,
        type: "emby",
        card,
        zIndex: maxZIndex + 1
      };
      setOpenWindows((previous) => [...previous, nextEmby]);
      setMaxZIndex((value) => value + 1);
      return;
    }

    if (card.cardType === "ssh") {
      const existingSsh = openWindows.find((window) => window.cardId === card.id);
      if (existingSsh) {
        focusWindow(existingSsh.id);
        return;
      }

      const nextSsh: OpenSshWindow = {
        id: `window-${card.id}-${Date.now()}`,
        cardId: card.id,
        title: card.name,
        icon: card.icon,
        type: "ssh",
        sshHost: card.sshHost,
        sshPort: card.sshPort,
        sshUsername: card.sshUsername,
        sshAuthMode: card.sshAuthMode,
        zIndex: maxZIndex + 1
      };
      setOpenWindows((previous) => [...previous, nextSsh]);
      setMaxZIndex((value) => value + 1);
      return;
    }

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

    const next: OpenIframeWindow = {
      id: `window-${card.id}-${Date.now()}`,
      cardId: card.id,
      title: card.name,
      icon: card.icon,
      type: "iframe",
      url: card.url,
      zIndex: maxZIndex + 1
    };
    setOpenWindows((previous) => [...previous, next]);
    setMaxZIndex((value) => value + 1);
  };

  return (
    <>
      <div className="mx-auto max-w-7xl px-3 py-4 md:px-4 md:py-8">
        {sortedGroups.map((group) => {
          const services = groupedCards[group.id] || [];
          if (!services.length) {
            return null;
          }
          return (
            <div key={group.id} className="mb-8 md:mb-12">
              <h2 className="mb-4 px-2 text-xl font-semibold text-white md:mb-6 md:px-0 md:text-2xl">{group.name}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    health={healthByCardId[service.id]}
                    embyMediaTotal={embyStatsByCardId[service.id]?.mediaTotal}
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
            </div>
          );
        })}

        {cardsWithRuntimeMode.length === 0 && (
          <div className="py-20 text-center">
            <div className="mb-4 text-6xl">🔍</div>
            <h3 className="mb-2 text-xl font-medium text-gray-300">没有找到匹配的服务</h3>
            <p className="text-base text-gray-400">尝试使用不同的关键词搜索</p>
          </div>
        )}
      </div>

      {openWindows.map((window) => {
        if (window.type === "ssh") {
          return (
            <SshTerminalWindow
              key={window.id}
              id={window.id}
              title={window.title}
              icon={window.icon}
              cardId={window.cardId}
              sshHost={window.sshHost}
              sshPort={window.sshPort}
              sshUsername={window.sshUsername}
              sshAuthMode={window.sshAuthMode}
              zIndex={window.zIndex}
              onClose={() => setOpenWindows((previous) => previous.filter((item) => item.id !== window.id))}
              onFocus={() => focusWindow(window.id)}
            />
          );
        }
        if (window.type === "emby") {
          return (
            <EmbyStatsWindow
              key={window.id}
              id={window.id}
              title={window.title}
              icon={window.icon}
              card={window.card}
              initialStats={embyStatsByCardId[window.cardId]}
              zIndex={window.zIndex}
              onStatsUpdate={(stats) =>
                setEmbyStatsByCardId((previous) => ({
                  ...previous,
                  [window.cardId]: stats
                }))
              }
              onClose={() => setOpenWindows((previous) => previous.filter((item) => item.id !== window.id))}
              onFocus={() => focusWindow(window.id)}
            />
          );
        }
        return (
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
        );
      })}
    </>
  );
}
