import { create } from "zustand";
import {
  createCard,
  createGroup,
  deleteCard,
  deleteGroup,
  fetchCards,
  fetchGroups,
  saveCardOrder,
  updateCard,
  updateGroup
} from "../services/api";
import type { CardDTO, CardPayload, GroupDTO, GroupPayload } from "../types";

type CardStore = {
  groups: GroupDTO[];
  cards: CardDTO[];
  loading: boolean;
  query: string;
  selectedGroupId?: string;
  setQuery: (query: string) => void;
  setSelectedGroupId: (groupId?: string) => void;
  load: () => Promise<void>;
  createGroup: (payload: GroupPayload) => Promise<void>;
  updateGroup: (groupId: string, payload: GroupPayload) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  createCard: (payload: CardPayload) => Promise<void>;
  updateCard: (cardId: string, payload: CardPayload) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  reorder: (sourceId: string, targetId: string) => Promise<void>;
};

function reorderCards(cards: CardDTO[], sourceId: string, targetId: string): CardDTO[] {
  const sourceIndex = cards.findIndex((item) => item.id === sourceId);
  const targetIndex = cards.findIndex((item) => item.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return cards;
  }

  const next = [...cards];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next.map((card, index) => ({ ...card, orderIndex: index + 1 }));
}

export const useCardStore = create<CardStore>((set, get) => ({
  groups: [],
  cards: [],
  loading: false,
  query: "",
  selectedGroupId: undefined,

  setQuery: (query) => set({ query }),
  setSelectedGroupId: (groupId) => set({ selectedGroupId: groupId }),

  load: async () => {
    set({ loading: true });
    try {
      const [groups, cards] = await Promise.all([
        fetchGroups(),
        fetchCards({
          groupId: get().selectedGroupId,
          q: get().query
        })
      ]);
      set({ groups, cards, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  createGroup: async (payload) => {
    await createGroup(payload);
    await get().load();
  },

  updateGroup: async (groupId, payload) => {
    await updateGroup(groupId, payload);
    await get().load();
  },

  deleteGroup: async (groupId) => {
    await deleteGroup(groupId);
    await get().load();
  },

  createCard: async (payload) => {
    await createCard(payload);
    await get().load();
  },

  updateCard: async (cardId, payload) => {
    await updateCard(cardId, payload);
    await get().load();
  },

  deleteCard: async (cardId) => {
    await deleteCard(cardId);
    await get().load();
  },

  reorder: async (sourceId, targetId) => {
    const current = get().cards;
    const next = reorderCards(current, sourceId, targetId);
    if (next === current) {
      return;
    }

    set({ cards: next });
    try {
      await saveCardOrder(next.map((card) => ({ id: card.id, orderIndex: card.orderIndex })));
    } catch (error) {
      set({ cards: current });
      throw error;
    }
  }
}));
