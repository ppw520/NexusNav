import { create } from "zustand";
import type { CardDTO, HealthStatusDTO } from "../types";

const PROBE_TIMEOUT_MS = 5000;
const DOWN_THRESHOLD = 2;

type HealthStore = {
  list: HealthStatusDTO[];
  byCardId: Record<string, HealthStatusDTO>;
  failureStreakByCard: Record<string, number>;
  probing: boolean;
  probeCards: (cards: CardDTO[]) => Promise<void>;
  reset: () => void;
};

function isValidProbeTarget(card: CardDTO): boolean {
  if (!card.enabled || !card.healthCheckEnabled) {
    return false;
  }
  return /^https?:\/\//i.test(card.url || "");
}

async function probeUrl(url: string): Promise<{ ok: boolean; latencyMs: number; message?: string }> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    await fetch(url, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal
    });
    return { ok: true, latencyMs: Date.now() - startedAt };
  } catch (error) {
    const err = error as Error;
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      message: err?.message || "probe failed"
    };
  } finally {
    window.clearTimeout(timer);
  }
}

export const useHealthStore = create<HealthStore>((set, get) => ({
  list: [],
  byCardId: {},
  failureStreakByCard: {},
  probing: false,
  probeCards: async (cards) => {
    const previousByCardId = get().byCardId;
    const previousFailureStreaks = get().failureStreakByCard;
    const nextFailureStreaks: Record<string, number> = {};

    const nextByCardId: Record<string, HealthStatusDTO> = {};
    cards.forEach((card) => {
      if (isValidProbeTarget(card)) {
        nextByCardId[card.id] = previousByCardId[card.id] || { cardId: card.id, status: "unknown" };
        nextFailureStreaks[card.id] = previousFailureStreaks[card.id] || 0;
        return;
      }
      nextByCardId[card.id] = { cardId: card.id, status: "unknown" };
      nextFailureStreaks[card.id] = 0;
    });

    const targets = cards.filter(isValidProbeTarget);
    if (!targets.length) {
      const list = Object.values(nextByCardId);
      set({ byCardId: nextByCardId, list, failureStreakByCard: nextFailureStreaks, probing: false });
      return;
    }

    set({ probing: true });
    const results = await Promise.all(targets.map((card) => probeUrl(card.url)));
    const checkedAt = Date.now();

    results.forEach((result, index) => {
      const card = targets[index];
      const previous = previousByCardId[card.id];
      const previousFailures = nextFailureStreaks[card.id] || 0;
      if (result.ok) {
        nextFailureStreaks[card.id] = 0;
        nextByCardId[card.id] = {
          cardId: card.id,
          status: "up",
          latencyMs: result.latencyMs,
          checkedAt
        };
        return;
      }

      const nextFailures = previousFailures + 1;
      nextFailureStreaks[card.id] = nextFailures;
      nextByCardId[card.id] = {
        cardId: card.id,
        status: nextFailures >= DOWN_THRESHOLD ? "down" : previous?.status || "unknown",
        latencyMs: result.latencyMs,
        checkedAt,
        message: result.message
      };
    });

    const list = Object.values(nextByCardId);
    set({ byCardId: nextByCardId, list, failureStreakByCard: nextFailureStreaks, probing: false });
  },
  reset: () => set({ byCardId: {}, list: [], failureStreakByCard: {}, probing: false })
}));
