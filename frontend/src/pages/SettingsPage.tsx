import { useEffect, useMemo, useState } from "react";
import {
  Download,
  ExternalLink,
  Pencil,
  Plus,
  Search,
  Shield,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { toast } from "sonner";
import { AppIcon } from "../components/AppIcon";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Tabs } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { importNavConfig } from "../services/api";
import { useAuthStore } from "../store/useAuthStore";
import { useCardStore } from "../store/useCardStore";
import { useSystemStore } from "../store/useSystemStore";
import { cn } from "../lib/utils";
import type { AdminConfigDTO, CardOpenMode, NavConfigImportPayload } from "../types";

const TAB_ITEMS = [
  { value: "services", label: "服务管理" },
  { value: "groups", label: "分组管理" },
  { value: "search", label: "搜索引擎" },
  { value: "security", label: "安全设置" },
  { value: "network", label: "网络模式" }
];

const MODAL_INPUT_CLASS =
  "h-9 border-transparent bg-[#f3f3f5] text-sm shadow-[0_0_0_0.5px_rgba(161,161,161,0.15)] focus:ring-1 focus:ring-slate-300";
const MODAL_SELECT_CLASS =
  "h-9 w-full rounded-md border border-transparent bg-[#f3f3f5] px-3 text-sm outline-none shadow-[0_0_0_0.5px_rgba(161,161,161,0.15)] focus:ring-1 focus:ring-slate-300";

type CardForm = {
  id?: string;
  groupId: string;
  name: string;
  url: string;
  lanUrl: string;
  wanUrl: string;
  icon: string;
  description: string;
  openMode: CardOpenMode;
  orderIndex: string;
  enabled: boolean;
  healthCheckEnabled: boolean;
};

type GroupForm = {
  id?: string;
  name: string;
  orderIndex: string;
};

type SearchForm = {
  id?: string;
  name: string;
  searchUrlTemplate: string;
};

function cloneAdminConfig(config: AdminConfigDTO): AdminConfigDTO {
  return JSON.parse(JSON.stringify(config));
}

function ModalField({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-[13px] font-medium text-slate-900">{label}</span>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </label>
  );
}

function FormModal({
  open,
  title,
  onClose,
  children
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-[512px] rounded-[10px] border border-black/10 bg-white shadow-xl">
        <button
          type="button"
          className="absolute right-3 top-3 rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          onClick={onClose}
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="px-6 pb-6 pt-5">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState("services");
  const [cardForm, setCardForm] = useState<CardForm>({
    groupId: "",
    name: "",
    url: "",
    lanUrl: "",
    wanUrl: "",
    icon: "",
    description: "",
    openMode: "iframe",
    orderIndex: "0",
    enabled: true,
    healthCheckEnabled: true
  });
  const [groupForm, setGroupForm] = useState<GroupForm>({ name: "", orderIndex: "0" });
  const [searchForm, setSearchForm] = useState<SearchForm>({ name: "", searchUrlTemplate: "" });
  const [securityEnabledDraft, setSecurityEnabledDraft] = useState(false);
  const [sessionTimeoutDraft, setSessionTimeoutDraft] = useState("480");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  const groups = useCardStore((state) => state.groups);
  const cards = useCardStore((state) => state.cards);
  const loadCards = useCardStore((state) => state.load);
  const createCard = useCardStore((state) => state.createCard);
  const updateCard = useCardStore((state) => state.updateCard);
  const deleteCard = useCardStore((state) => state.deleteCard);
  const createGroup = useCardStore((state) => state.createGroup);
  const updateGroup = useCardStore((state) => state.updateGroup);
  const deleteGroup = useCardStore((state) => state.deleteGroup);

  const doLogout = useAuthStore((state) => state.doLogout);
  const checkSession = useAuthStore((state) => state.checkSession);

  const adminConfig = useSystemStore((state) => state.adminConfig);
  const loadAdminConfig = useSystemStore((state) => state.loadAdminConfig);
  const saveAdminConfig = useSystemStore((state) => state.saveAdminConfig);

  const sortedGroups = useMemo(() => [...groups].sort((a, b) => a.orderIndex - b.orderIndex), [groups]);
  const sortedCards = useMemo(() => [...cards].sort((a, b) => a.orderIndex - b.orderIndex), [cards]);
  const searchEngines = adminConfig?.searchEngines || [];
  const trimmedNewPassword = newPassword.trim();
  const passwordTooShort = trimmedNewPassword.length > 0 && trimmedNewPassword.length < 8;
  const parsedSessionTimeout = Number(sessionTimeoutDraft.trim());
  const sessionTimeoutInvalid =
    sessionTimeoutDraft.trim().length === 0 || !Number.isInteger(parsedSessionTimeout) || parsedSessionTimeout < 1;
  const groupCardCount = useMemo(() => {
    const counts: Record<string, number> = {};
    cards.forEach((card) => {
      counts[card.groupId] = (counts[card.groupId] || 0) + 1;
    });
    return counts;
  }, [cards]);

  useEffect(() => {
    Promise.all([loadCards(), loadAdminConfig()]).catch(() => {
      toast.error("加载配置数据失败");
    });
  }, [loadAdminConfig, loadCards]);

  useEffect(() => {
    if (!cardForm.groupId && sortedGroups.length) {
      setCardForm((previous) => ({ ...previous, groupId: sortedGroups[0].id }));
    }
  }, [cardForm.groupId, sortedGroups]);

  useEffect(() => {
    if (!adminConfig) {
      return;
    }
    setSecurityEnabledDraft(adminConfig.security.enabled);
    setSessionTimeoutDraft(String(adminConfig.security.sessionTimeoutMinutes || 480));
  }, [adminConfig]);

  const resetCardForm = () =>
    setCardForm({
      groupId: sortedGroups[0]?.id || "",
      name: "",
      url: "",
      lanUrl: "",
      wanUrl: "",
      icon: "",
      description: "",
      openMode: "iframe",
      orderIndex: "0",
      enabled: true,
      healthCheckEnabled: true
    });

  const resetGroupForm = () => setGroupForm({ name: "", orderIndex: "0" });
  const resetSearchForm = () => setSearchForm({ name: "", searchUrlTemplate: "" });

  const openCreateServiceModal = () => {
    resetCardForm();
    setServiceModalOpen(true);
  };

  const openEditServiceModal = (card: (typeof sortedCards)[number]) => {
    setCardForm({
      id: card.id,
      groupId: card.groupId,
      name: card.name,
      url: card.url || "",
      lanUrl: card.lanUrl || "",
      wanUrl: card.wanUrl || "",
      icon: card.icon || "",
      description: card.description || "",
      openMode: card.openMode,
      orderIndex: String(card.orderIndex),
      enabled: card.enabled,
      healthCheckEnabled: card.healthCheckEnabled
    });
    setServiceModalOpen(true);
  };

  const openCreateGroupModal = () => {
    resetGroupForm();
    setGroupModalOpen(true);
  };

  const openEditGroupModal = (group: (typeof sortedGroups)[number]) => {
    setGroupForm({ id: group.id, name: group.name, orderIndex: String(group.orderIndex) });
    setGroupModalOpen(true);
  };

  const openCreateSearchModal = () => {
    resetSearchForm();
    setSearchModalOpen(true);
  };

  const openEditSearchModal = (engine: (typeof searchEngines)[number]) => {
    setSearchForm({
      id: engine.id,
      name: engine.name,
      searchUrlTemplate: engine.searchUrlTemplate
    });
    setSearchModalOpen(true);
  };

  const saveAdmin = async (
    updater: (draft: AdminConfigDTO) => void,
    options?: { successMessage?: string; newAdminPassword?: string }
  ): Promise<boolean> => {
    if (!adminConfig) {
      return false;
    }
    setSaving(true);
    try {
      const next = cloneAdminConfig(adminConfig);
      updater(next);
      await saveAdminConfig({
        ...next,
        newAdminPassword: options?.newAdminPassword || undefined
      });
      await checkSession().catch(() => undefined);
      toast.success(options?.successMessage || "保存成功");
      return true;
    } catch {
      toast.error("保存失败");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const submitCard = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const normalizedOrderIndex = Number.isNaN(Number(cardForm.orderIndex))
        ? 0
        : Number(cardForm.orderIndex || 0);
      const payload = {
        groupId: cardForm.groupId,
        name: cardForm.name,
        url: cardForm.url || undefined,
        lanUrl: cardForm.lanUrl || undefined,
        wanUrl: cardForm.wanUrl || undefined,
        icon: cardForm.icon || undefined,
        description: cardForm.description || undefined,
        openMode: cardForm.openMode,
        orderIndex: normalizedOrderIndex,
        enabled: cardForm.enabled,
        healthCheckEnabled: cardForm.healthCheckEnabled
      };
      if (cardForm.id) {
        await updateCard(cardForm.id, payload);
        toast.success("服务更新成功");
      } else {
        await createCard({ ...payload, id: undefined });
        toast.success("服务创建成功");
      }
      resetCardForm();
      setServiceModalOpen(false);
    } catch {
      toast.error("保存服务失败");
    } finally {
      setSaving(false);
    }
  };

  const submitGroup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const normalizedOrderIndex = Number.isNaN(Number(groupForm.orderIndex))
        ? 0
        : Number(groupForm.orderIndex || 0);
      const payload = {
        id: groupForm.id || undefined,
        name: groupForm.name,
        orderIndex: normalizedOrderIndex
      };
      if (groupForm.id) {
        await updateGroup(groupForm.id, payload);
        toast.success("分组更新成功");
      } else {
        await createGroup(payload);
        toast.success("分组创建成功");
      }
      resetGroupForm();
      setGroupModalOpen(false);
    } catch {
      toast.error("保存分组失败");
    } finally {
      setSaving(false);
    }
  };

  const submitSearchEngine = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const saved = await saveAdmin(
      (draft) => {
        if (searchForm.id) {
          const index = draft.searchEngines.findIndex((engine) => engine.id === searchForm.id);
          if (index >= 0) {
            draft.searchEngines[index] = {
              id: searchForm.id,
              name: searchForm.name,
              searchUrlTemplate: searchForm.searchUrlTemplate
            };
          }
        } else {
          const id = searchForm.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || `engine-${Date.now()}`;
          draft.searchEngines.push({
            id,
            name: searchForm.name,
            searchUrlTemplate: searchForm.searchUrlTemplate
          });
          if (!draft.defaultSearchEngineId) {
            draft.defaultSearchEngineId = id;
          }
        }
      },
      { successMessage: searchForm.id ? "搜索引擎更新成功" : "搜索引擎创建成功" }
    );
    if (saved) {
      resetSearchForm();
      setSearchModalOpen(false);
    }
  };

  const exportConfig = () => {
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      groups: sortedGroups,
      cards: sortedCards
    };
    const data = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "nexusnav-nav-config.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importConfig = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setSaving(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const payload = parsed as {
        groups?: Array<{ id?: unknown; name?: unknown; orderIndex?: unknown }>;
        cards?: Array<{
          id?: unknown;
          groupId?: unknown;
          name?: unknown;
          url?: unknown;
          lanUrl?: unknown;
          wanUrl?: unknown;
          openMode?: unknown;
          icon?: unknown;
          description?: unknown;
          orderIndex?: unknown;
          enabled?: unknown;
          healthCheckEnabled?: unknown;
        }>;
      };

      const hasNavPayload = Array.isArray(payload.groups) && Array.isArray(payload.cards);
      if (!hasNavPayload) {
        await saveAdminConfig(parsed as AdminConfigDTO);
        toast.success("配置导入成功");
        return;
      }
      const navPayload = payload as NavConfigImportPayload;
      const result = await importNavConfig(navPayload);
      await loadCards();
      toast.success(`配置导入成功（${result.groups} 个分组，${result.cards} 个服务）`);
    } catch {
      toast.error("配置导入失败");
    } finally {
      event.target.value = "";
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">配置管理</h1>
            <p className="text-sm text-slate-600">管理你的服务卡片、分组和系统设置</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="h-9 rounded-lg" onClick={exportConfig}>
              <Download className="mr-2 h-4 w-4" />
              导出配置
            </Button>
            <label className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-border px-4 text-sm text-slate-700 hover:bg-slate-50">
              <Upload className="mr-2 h-4 w-4" />
              导入配置
              <input className="hidden" type="file" accept=".json" onChange={importConfig} />
            </label>
          </div>
        </div>

        <Tabs value={activeTab} onChange={setActiveTab} items={TAB_ITEMS} className="mb-6" />

        {activeTab === "services" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">共 {sortedCards.length} 个服务</p>
              <Button
                variant="default"
                className="h-9 rounded-lg px-4"
                onClick={openCreateServiceModal}
              >
                <Plus className="mr-2 h-4 w-4" />
                添加服务
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sortedCards.map((card) => (
                <div
                  key={card.id}
                  className="overflow-hidden rounded-[14px] border border-black/10 bg-white p-5 shadow-sm"
                  style={{ borderTopWidth: 3, borderTopColor: card.enabled ? "#2563eb" : "#9ca3af" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[10px] bg-slate-100">
                          <AppIcon icon={card.icon} className="h-5 w-5 text-slate-700" emojiClassName="text-xl" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-base font-medium text-slate-900">{card.name}</p>
                          <p className="truncate text-sm text-slate-500">{card.description || "暂无描述"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-black/10 bg-white text-slate-600 transition hover:bg-slate-100"
                        onClick={() => openEditServiceModal(card)}
                        aria-label="编辑服务"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-black/10 bg-white text-red-500 transition hover:bg-red-50"
                        onClick={() => {
                          if (!confirm("确认删除该服务？")) return;
                          deleteCard(card.id)
                            .then(() => toast.success("删除成功"))
                            .catch(() => toast.error("删除失败"));
                        }}
                        aria-label="删除服务"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
                    <span className="mr-2 truncate">{card.url}</span>
                    {card.openMode === "newtab" && <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />}
                  </div>
                </div>
              ))}
            </div>

            {sortedCards.length === 0 && (
              <div className="rounded-[14px] border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                暂无服务，点击右上角「添加服务」开始创建。
              </div>
            )}
          </div>
        )}

        {activeTab === "groups" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">共 {sortedGroups.length} 个分组</p>
              <Button
                variant="default"
                className="h-9 rounded-lg px-4"
                onClick={openCreateGroupModal}
              >
                <Plus className="mr-2 h-4 w-4" />
                添加分组
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {sortedGroups.map((group) => (
                <div key={group.id} className="rounded-[14px] border border-black/10 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-base font-medium text-slate-900">{group.name}</p>
                      <p className="text-sm text-slate-500">排序: {group.orderIndex}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-8 rounded-lg" onClick={() => openEditGroupModal(group)}>
                        编辑
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() => {
                          if (!confirm("确认删除分组？分组下服务会被一起删除。")) return;
                          deleteGroup(group.id)
                            .then(() => toast.success("删除成功"))
                            .catch(() => toast.error("删除失败"));
                        }}
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-slate-600">{groupCardCount[group.id] || 0} 个服务</p>
                </div>
              ))}
            </div>

            {sortedGroups.length === 0 && (
              <div className="rounded-[14px] border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                暂无分组，点击右上角「添加分组」开始创建。
              </div>
            )}
          </div>
        )}

        {activeTab === "search" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">共 {searchEngines.length} 个搜索引擎</p>
              <Button
                variant="default"
                className="h-9 rounded-lg px-4"
                onClick={openCreateSearchModal}
              >
                <Plus className="mr-2 h-4 w-4" />
                添加搜索引擎
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {searchEngines.map((engine) => (
                <div key={engine.id} className="rounded-[14px] border border-black/10 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-slate-500" />
                        <p className="truncate text-base font-medium text-slate-900">{engine.name}</p>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">{engine.searchUrlTemplate}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-8 rounded-lg" onClick={() => openEditSearchModal(engine)}>
                        编辑
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() =>
                          saveAdmin(
                            (draft) => {
                              draft.searchEngines = draft.searchEngines.filter((item) => item.id !== engine.id);
                              if (draft.defaultSearchEngineId === engine.id && draft.searchEngines.length > 0) {
                                draft.defaultSearchEngineId = draft.searchEngines[0].id;
                              }
                            },
                            { successMessage: "删除成功" }
                          )
                        }
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {searchEngines.length === 0 && (
              <div className="rounded-[14px] border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                暂无搜索引擎，点击右上角「添加搜索引擎」开始创建。
              </div>
            )}
          </div>
        )}

        {activeTab === "security" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                安全与访问控制
              </CardTitle>
              <CardDescription>安全开关、会话超时与管理员密码更新</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={securityEnabledDraft}
                  onChange={(event) => setSecurityEnabledDraft(event.target.checked)}
                />
                启用登录保护
              </label>
              <div className="space-y-1">
                <label className="text-sm">会话超时（分钟）</label>
                <Input
                  type="number"
                  min={1}
                  value={sessionTimeoutDraft}
                  onChange={(event) => setSessionTimeoutDraft(event.target.value)}
                  aria-invalid={sessionTimeoutInvalid}
                />
                {sessionTimeoutInvalid && <p className="text-xs text-red-500">请输入大于 0 的整数</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm">修改管理员密码（留空不修改）</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="输入新密码（留空不修改）"
                  aria-invalid={passwordTooShort}
                />
                {passwordTooShort && <p className="text-xs text-red-500">密码长度至少 8 位</p>}
              </div>
              <Button
                disabled={saving || passwordTooShort || sessionTimeoutInvalid || !adminConfig}
                onClick={() => {
                  if (!adminConfig) {
                    return;
                  }
                  const shouldForceRelogin = !adminConfig.security.enabled && securityEnabledDraft;
                  return saveAdmin(
                    (draft) => {
                      draft.security.enabled = securityEnabledDraft;
                      draft.security.sessionTimeoutMinutes = parsedSessionTimeout;
                    },
                    {
                      successMessage: trimmedNewPassword ? "密码已更新" : "安全设置已保存",
                      newAdminPassword: trimmedNewPassword || undefined
                    }
                  ).then((saved) => {
                    if (saved && trimmedNewPassword) {
                      setNewPassword("");
                    }
                    if (saved && shouldForceRelogin) {
                      toast.info("已启用登录保护，请重新登录");
                      doLogout().catch(() => undefined);
                    }
                  });
                }}
              >
                保存安全设置
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTab === "network" && (
          <Card>
            <CardHeader>
              <CardTitle>网络模式偏好</CardTitle>
              <CardDescription>自动识别内网与外网环境，为服务选择合适的访问地址</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm">当前网络模式</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
                  value={adminConfig?.networkModePreference || "auto"}
                  onChange={(event) =>
                    saveAdmin(
                      (draft) => {
                        draft.networkModePreference = event.target.value as "auto" | "lan" | "wan";
                      },
                      { successMessage: "网络模式已更新" }
                    )
                  }
                >
                  <option value="auto">auto（自动识别）</option>
                  <option value="lan">lan（强制内网）</option>
                  <option value="wan">wan（强制外网）</option>
                </select>
              </div>
              <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700">
                <p className="mb-2 font-medium text-slate-800">网络模式说明：</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    <span className="font-medium">自动识别：</span>
                    根据访问 IP 自动选择内网或外网地址
                  </li>
                  <li>
                    <span className="font-medium">强制内网：</span>
                    始终使用内网地址（LAN URL）
                  </li>
                  <li>
                    <span className="font-medium">强制外网：</span>
                    始终使用外网地址（WAN URL）
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <FormModal
        open={serviceModalOpen}
        title={cardForm.id ? "编辑服务" : "添加服务"}
        onClose={() => setServiceModalOpen(false)}
      >
        <form className="space-y-3" onSubmit={submitCard}>
          <ModalField label="服务名称">
            <Input
              className={MODAL_INPUT_CLASS}
              value={cardForm.name}
              onChange={(event) => setCardForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </ModalField>

          <ModalField label="默认地址">
            <Input
              className={MODAL_INPUT_CLASS}
              value={cardForm.url}
              onChange={(event) => setCardForm((prev) => ({ ...prev, url: event.target.value }))}
              required
            />
          </ModalField>

          <ModalField label="内网地址（可选）">
            <Input
              className={MODAL_INPUT_CLASS}
              value={cardForm.lanUrl}
              onChange={(event) => setCardForm((prev) => ({ ...prev, lanUrl: event.target.value }))}
            />
          </ModalField>

          <ModalField label="外网地址（可选）">
            <Input
              className={MODAL_INPUT_CLASS}
              value={cardForm.wanUrl}
              onChange={(event) => setCardForm((prev) => ({ ...prev, wanUrl: event.target.value }))}
            />
          </ModalField>

          <ModalField label="图标（Emoji / Iconify）">
            <Input
              className={MODAL_INPUT_CLASS}
              value={cardForm.icon}
              onChange={(event) => setCardForm((prev) => ({ ...prev, icon: event.target.value }))}
              placeholder="例如 🔗 或 mdi:router-wireless"
            />
          </ModalField>

          <ModalField label="描述">
            <Textarea
              className={cn("min-h-16 border-transparent bg-[#f3f3f5] shadow-[0_0_0_0.5px_rgba(161,161,161,0.15)] focus:ring-1 focus:ring-slate-300")}
              value={cardForm.description}
              onChange={(event) => setCardForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </ModalField>

          <ModalField label="所属分组">
            <select
              className={MODAL_SELECT_CLASS}
              value={cardForm.groupId}
              onChange={(event) => setCardForm((prev) => ({ ...prev, groupId: event.target.value }))}
              required
            >
              {sortedGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </ModalField>

          <ModalField label="打开方式">
            <select
              className={MODAL_SELECT_CLASS}
              value={cardForm.openMode}
              onChange={(event) => setCardForm((prev) => ({ ...prev, openMode: event.target.value as CardOpenMode }))}
            >
              <option value="iframe">iframe 小窗</option>
              <option value="newtab">新标签页</option>
              <option value="auto">自动</option>
            </select>
          </ModalField>

          <ModalField label="排序">
            <Input
              className={MODAL_INPUT_CLASS}
              type="number"
              value={cardForm.orderIndex}
              onChange={(event) => setCardForm((prev) => ({ ...prev, orderIndex: event.target.value }))}
            />
          </ModalField>

          <label className="flex items-center gap-2 pt-1 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={cardForm.enabled}
              onChange={(event) => setCardForm((prev) => ({ ...prev, enabled: event.target.checked }))}
            />
            启用服务
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={cardForm.healthCheckEnabled}
              onChange={(event) => setCardForm((prev) => ({ ...prev, healthCheckEnabled: event.target.checked }))}
            />
            参与健康探测
          </label>

          <Button type="submit" variant="default" className="h-9 w-full rounded-lg" disabled={saving}>
            {cardForm.id ? "保存修改" : "添加"}
          </Button>
        </form>
      </FormModal>

      <FormModal open={groupModalOpen} title={groupForm.id ? "编辑分组" : "添加分组"} onClose={() => setGroupModalOpen(false)}>
        <form className="space-y-3" onSubmit={submitGroup}>
          <ModalField label="分组名称">
            <Input
              className={MODAL_INPUT_CLASS}
              value={groupForm.name}
              onChange={(event) => setGroupForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </ModalField>

          <ModalField label="排序">
            <Input
              className={MODAL_INPUT_CLASS}
              type="number"
              value={groupForm.orderIndex}
              onChange={(event) => setGroupForm((prev) => ({ ...prev, orderIndex: event.target.value }))}
            />
          </ModalField>

          <Button type="submit" variant="default" className="h-9 w-full rounded-lg" disabled={saving}>
            {groupForm.id ? "保存修改" : "添加"}
          </Button>
        </form>
      </FormModal>

      <FormModal
        open={searchModalOpen}
        title={searchForm.id ? "编辑搜索引擎" : "添加搜索引擎"}
        onClose={() => setSearchModalOpen(false)}
      >
        <form className="space-y-3" onSubmit={submitSearchEngine}>
          <ModalField label="名称">
            <Input
              className={MODAL_INPUT_CLASS}
              value={searchForm.name}
              onChange={(event) => setSearchForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </ModalField>

          <ModalField label="搜索 URL" hint="使用 %s 或 {query} 作为搜索关键词占位符">
            <Input
              className={MODAL_INPUT_CLASS}
              value={searchForm.searchUrlTemplate}
              onChange={(event) => setSearchForm((prev) => ({ ...prev, searchUrlTemplate: event.target.value }))}
              required
            />
          </ModalField>

          <Button type="submit" variant="default" className="h-9 w-full rounded-lg" disabled={saving}>
            {searchForm.id ? "保存修改" : "添加"}
          </Button>
        </form>
      </FormModal>
    </div>
  );
}
