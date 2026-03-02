import type { CardDTO, TorrentStatsDTO } from "../types";
import { fetchQbittorrentStatsViaProxy, fetchTransmissionStatsViaProxy } from "./api";

export async function loadQbittorrentStats(card: CardDTO): Promise<TorrentStatsDTO> {
  const stats = await fetchQbittorrentStatsViaProxy(card.id);
  return { ...stats, source: "proxy" };
}

export async function loadTransmissionStats(card: CardDTO): Promise<TorrentStatsDTO> {
  const stats = await fetchTransmissionStatsViaProxy(card.id);
  return { ...stats, source: "proxy" };
}
