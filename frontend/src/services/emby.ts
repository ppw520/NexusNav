import type { CardDTO, EmbyStatsDTO, EmbyTaskDTO, EmbyTaskRunResultDTO } from "../types";
import { fetchEmbyStatsViaProxy, fetchEmbyTasksViaProxy, runEmbyTaskViaProxy } from "./api";

export async function loadEmbyStats(card: CardDTO): Promise<EmbyStatsDTO> {
  const stats = await fetchEmbyStatsViaProxy(card.id);
  return { ...stats, source: "proxy" };
}

export async function loadEmbyTasks(card: CardDTO): Promise<EmbyTaskDTO[]> {
  return fetchEmbyTasksViaProxy(card.id);
}

export async function triggerEmbyTask(card: CardDTO, taskId: string, _taskName?: string): Promise<EmbyTaskRunResultDTO> {
  const result = await runEmbyTaskViaProxy(card.id, taskId);
  return { ...result, source: "proxy" };
}
