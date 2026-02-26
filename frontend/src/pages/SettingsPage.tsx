import { useEffect, useMemo, useState } from "react";
import {
  Download,
  ExternalLink,
  ImagePlus,
  Pencil,
  Plus,
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
import { importNavConfig, verifyConfig } from "../services/api";
import { useAuthStore } from "../store/useAuthStore";
import { useCardStore } from "../store/useCardStore";
import { useSystemStore } from "../store/useSystemStore";
import { cn } from "../lib/utils";
import type { AdminConfigDTO, CardOpenMode, CardType, NavConfigImportPayload, SshAuthMode } from "../types";

const TAB_ITEMS = [
  { value: "services", label: "服务管理" },
  { value: "groups", label: "分组管理" },
  { value: "search", label: "搜索引擎" },
  { value: "security", label: "安全设置" },
  { value: "network", label: "网络模式" },
  { value: "daily-sentence", label: "每日一句" },
  { value: "background", label: "背景设置" }
];

const VERIFY_TOKEN_STORAGE_KEY = "nexusnav.config.verify-token";
const VERIFY_TOKEN_EXPIRES_STORAGE_KEY = "nexusnav.config.verify-token.expires-at";
const MAX_BACKGROUND_BYTES = 512 * 1024;
const MAX_SEARCH_ICON_LENGTH = 2048;

const MODAL_INPUT_CLASS =
  "h-9 border-white/15 bg-slate-900/80 text-sm text-slate-100 shadow-[0_0_0_0.5px_rgba(148,163,184,0.3)] placeholder:text-slate-400 focus:ring-1 focus:ring-sky-400/60";
const MODAL_SELECT_CLASS =
  "h-9 w-full rounded-md border border-white/15 bg-slate-900/80 px-3 text-sm text-slate-100 outline-none shadow-[0_0_0_0.5px_rgba(148,163,184,0.3)] focus:ring-1 focus:ring-sky-400/60";
const OUTLINE_DARK_BUTTON_CLASS =
  "border-white/20 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white";
const SECTION_CARD_CLASS =
  "border-white/10 bg-slate-950/55 text-slate-100 shadow-[0_12px_32px_rgba(2,6,23,0.45)] backdrop-blur-sm";
const SECTION_INPUT_CLASS =
  "border-white/20 bg-slate-950/70 text-slate-100 placeholder:text-slate-400 focus:ring-sky-400/60";
const SECTION_SELECT_CLASS =
  "h-10 w-full rounded-md border border-white/20 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-sky-400/60";

type CardForm = {
  id?: string;
  groupId: string;
  name: string;
  cardType: CardType;
  url: string;
  lanUrl: string;
  wanUrl: string;
  sshHost: string;
  sshPort: string;
  sshUsername: string;
  sshAuthMode: SshAuthMode;
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
  icon: string;
};

function cloneAdminConfig(config: AdminConfigDTO): AdminConfigDTO {
  return JSON.parse(JSON.stringify(config));
}

function hasValidConfigVerifyToken() {
  const token = window.localStorage.getItem(VERIFY_TOKEN_STORAGE_KEY);
  const expiresAt = Number(window.localStorage.getItem(VERIFY_TOKEN_EXPIRES_STORAGE_KEY) || "0");
  return Boolean(token) && Number.isFinite(expiresAt) && Date.now() < expiresAt;
}

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("read file failed"));
    reader.readAsDataURL(file);
  });
}

async function compressIconToDataUrl(file: File): Promise<string> {
  const baseDataUrl = await toDataUrl(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const instance = new Image();
    instance.onload = () => resolve(instance);
    instance.onerror = () => reject(new Error("load image failed"));
    instance.src = baseDataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return baseDataUrl;
  }
  const ratio = Math.min(32 / image.width, 32 / image.height);
  const width = image.width * ratio;
  const height = image.height * ratio;
  const x = (32 - width) / 2;
  const y = (32 - height) / 2;
  ctx.clearRect(0, 0, 32, 32);
  ctx.drawImage(image, x, y, width, height);
  return canvas.toDataURL("image/webp", 0.8);
}

function ModalField({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-[13px] font-medium text-slate-200">{label}</span>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
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
      <div className="relative w-full max-w-[512px] rounded-[10px] border border-white/15 bg-slate-950/95 shadow-xl backdrop-blur">
        <button
          type="button"
          className="absolute right-3 top-3 rounded p-1 text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
          onClick={onClose}
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="px-6 pb-6 pt-5">
          <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
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
    cardType: "generic",
    url: "",
    lanUrl: "",
    wanUrl: "",
    sshHost: "",
    sshPort: "22",
    sshUsername: "",
    sshAuthMode: "password",
    icon: "",
    description: "",
    openMode: "iframe",
    orderIndex: "0",
    enabled: true,
    healthCheckEnabled: true
  });
  const [groupForm, setGroupForm] = useState<GroupForm>({ name: "", orderIndex: "0" });
  const [searchForm, setSearchForm] = useState<SearchForm>({ name: "", searchUrlTemplate: "", icon: "" });
  const [securityEnabledDraft, setSecurityEnabledDraft] = useState(false);
  const [requireAuthForConfigDraft, setRequireAuthForConfigDraft] = useState(false);
  const [sessionTimeoutDraft, setSessionTimeoutDraft] = useState("480");
  const [dailySentenceEnabledDraft, setDailySentenceEnabledDraft] = useState(true);
  const [backgroundTypeDraft, setBackgroundTypeDraft] = useState<"gradient" | "image">("gradient");
  const [backgroundImageDraft, setBackgroundImageDraft] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [verifyPassword, setVerifyPassword] = useState("");
  const [verifiedForConfig, setVerifiedForConfig] = useState(() => hasValidConfigVerifyToken());
  const [verifying, setVerifying] = useState(false);
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
    setRequireAuthForConfigDraft(adminConfig.security.requireAuthForConfig);
    setSessionTimeoutDraft(String(adminConfig.security.sessionTimeoutMinutes || 480));
    setDailySentenceEnabledDraft(adminConfig.dailySentenceEnabled);
    setBackgroundTypeDraft(adminConfig.backgroundType || "gradient");
    setBackgroundImageDraft(adminConfig.backgroundImageDataUrl || "");
    setVerifiedForConfig(!adminConfig.security.requireAuthForConfig || hasValidConfigVerifyToken());
  }, [adminConfig]);

  const resetCardForm = (cardType: CardType = "generic") =>
    setCardForm({
      groupId: sortedGroups[0]?.id || "",
      name: "",
      cardType,
      url: "",
      lanUrl: "",
      wanUrl: "",
      sshHost: "",
      sshPort: "22",
      sshUsername: "",
      sshAuthMode: "password",
      icon: "",
      description: "",
      openMode: "iframe",
      orderIndex: "0",
      enabled: true,
      healthCheckEnabled: cardType !== "ssh"
    });

  const resetGroupForm = () => setGroupForm({ name: "", orderIndex: "0" });
  const resetSearchForm = () => setSearchForm({ name: "", searchUrlTemplate: "", icon: "" });

  const openCreateServiceModal = (cardType: CardType = "generic") => {
    resetCardForm(cardType);
    setServiceModalOpen(true);
  };

  const openEditServiceModal = (card: (typeof sortedCards)[number]) => {
    setCardForm({
      id: card.id,
      groupId: card.groupId,
      name: card.name,
      cardType: card.cardType || "generic",
      url: card.url || "",
      lanUrl: card.lanUrl || "",
      wanUrl: card.wanUrl || "",
      sshHost: card.sshHost || "",
      sshPort: String(card.sshPort || 22),
      sshUsername: card.sshUsername || "",
      sshAuthMode: card.sshAuthMode || "password",
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
      searchUrlTemplate: engine.searchUrlTemplate,
      icon: engine.icon || ""
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

  const verifySettingsAccess = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!verifyPassword.trim()) {
      toast.error("请输入管理员密码");
      return;
    }
    setVerifying(true);
    try {
      const result = await verifyConfig(verifyPassword.trim());
      window.localStorage.setItem(VERIFY_TOKEN_STORAGE_KEY, result.verifyToken);
      window.localStorage.setItem(
        VERIFY_TOKEN_EXPIRES_STORAGE_KEY,
        String(Date.now() + result.expiresInSeconds * 1000)
      );
      setVerifiedForConfig(true);
      setVerifyPassword("");
      toast.success("二次验证通过");
    } catch {
      toast.error("验证失败，请检查密码");
    } finally {
      setVerifying(false);
    }
  };

  const uploadSearchIcon = async (file: File) => {
    try {
      const dataUrl = await compressIconToDataUrl(file);
      if (dataUrl.length > MAX_SEARCH_ICON_LENGTH) {
        toast.error("图标过大，请使用更小的图片");
        return;
      }
      setSearchForm((previous) => ({ ...previous, icon: dataUrl }));
    } catch {
      toast.error("图标读取失败");
    }
  };

  const uploadBackgroundImage = async (file: File) => {
    if (file.size > MAX_BACKGROUND_BYTES) {
      toast.error("背景图不能超过 512KB");
      return;
    }
    try {
      const dataUrl = await toDataUrl(file);
      setBackgroundImageDraft(dataUrl);
      setBackgroundTypeDraft("image");
    } catch {
      toast.error("背景图读取失败");
    }
  };

  const submitCard = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (cardForm.cardType === "ssh" && (!cardForm.sshHost.trim() || !cardForm.sshUsername.trim())) {
      toast.error("SSH 卡片需要填写主机和用户名");
      return;
    }
    setSaving(true);
    try {
      const normalizedOrderIndex = Number.isNaN(Number(cardForm.orderIndex))
        ? 0
        : Number(cardForm.orderIndex || 0);
      const normalizedSshPort = Number.isNaN(Number(cardForm.sshPort))
        ? 22
        : Math.min(65535, Math.max(1, Number(cardForm.sshPort || 22)));
      const payload = {
        groupId: cardForm.groupId,
        name: cardForm.name,
        cardType: cardForm.cardType,
        url: cardForm.cardType === "ssh" ? undefined : cardForm.url || undefined,
        lanUrl: cardForm.cardType === "ssh" ? undefined : cardForm.lanUrl || undefined,
        wanUrl: cardForm.cardType === "ssh" ? undefined : cardForm.wanUrl || undefined,
        sshHost: cardForm.cardType === "ssh" ? cardForm.sshHost || undefined : undefined,
        sshPort: cardForm.cardType === "ssh" ? normalizedSshPort : undefined,
        sshUsername: cardForm.cardType === "ssh" ? cardForm.sshUsername || undefined : undefined,
        sshAuthMode: cardForm.cardType === "ssh" ? cardForm.sshAuthMode : undefined,
        icon: cardForm.icon || undefined,
        description: cardForm.description || undefined,
        openMode: cardForm.cardType === "ssh" ? "iframe" : cardForm.openMode,
        orderIndex: normalizedOrderIndex,
        enabled: cardForm.enabled,
        healthCheckEnabled: cardForm.cardType === "ssh" ? false : cardForm.healthCheckEnabled
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
              searchUrlTemplate: searchForm.searchUrlTemplate,
              icon: searchForm.icon || undefined
            };
          }
        } else {
          const id = searchForm.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || `engine-${Date.now()}`;
          draft.searchEngines.push({
            id,
            name: searchForm.name,
            searchUrlTemplate: searchForm.searchUrlTemplate,
            icon: searchForm.icon || undefined
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
          cardType?: unknown;
          sshHost?: unknown;
          sshPort?: unknown;
          sshUsername?: unknown;
          sshAuthMode?: unknown;
          icon?: unknown;
          description?: unknown;
          orderIndex?: unknown;
          enabled?: unknown;
          healthCheckEnabled?: unknown;
        }>;
      };

      const hasNavPayload = Array.isArray(payload.groups) && Array.isArray(payload.cards);
      if (!hasNavPayload) {
        if (!adminConfig) {
          throw new Error("admin config not ready");
        }
        const imported = parsed as Partial<AdminConfigDTO>;
        const merged: AdminConfigDTO = {
          ...cloneAdminConfig(adminConfig),
          ...imported,
          security: {
            ...adminConfig.security,
            ...(imported.security || {})
          },
          searchEngines: imported.searchEngines || adminConfig.searchEngines
        };
        await saveAdminConfig(merged);
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

  const requiresSecondVerify = Boolean(adminConfig?.security.requireAuthForConfig);
  const gated = requiresSecondVerify && !verifiedForConfig;

  return (
    <div className="min-h-screen text-slate-100">
      <div className={cn("mx-auto max-w-7xl px-4 py-8", gated && "pointer-events-none blur-[2px]")}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">配置管理</h1>
            <p className="text-sm text-slate-300">管理你的服务卡片、分组和系统设置</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className={cn("h-9 rounded-lg", OUTLINE_DARK_BUTTON_CLASS)} onClick={exportConfig}>
              <Download className="mr-2 h-4 w-4" />
              导出配置
            </Button>
            <label className={cn("inline-flex h-9 cursor-pointer items-center rounded-lg border px-4 text-sm", OUTLINE_DARK_BUTTON_CLASS)}>
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
              <p className="text-sm text-slate-300">共 {sortedCards.length} 个服务</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className={cn("h-9 rounded-lg px-4", OUTLINE_DARK_BUTTON_CLASS)}
                  onClick={() => openCreateServiceModal("ssh")}
                >
                  SSH 模板
                </Button>
                <Button
                  variant="default"
                  className="h-9 rounded-lg border border-sky-400/20 bg-sky-500/85 px-4 text-slate-950 hover:bg-sky-400"
                  onClick={() => openCreateServiceModal("generic")}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  添加服务
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sortedCards.map((card) => (
                <div
                  key={card.id}
                  className="overflow-hidden rounded-[14px] border border-white/10 bg-slate-950/55 p-5 shadow-[0_12px_24px_rgba(2,6,23,0.35)] backdrop-blur-sm"
                  style={{ borderTopWidth: 3, borderTopColor: card.enabled ? "#2563eb" : "#9ca3af" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[10px] border border-white/10 bg-white/5">
                          <AppIcon icon={card.icon} className="h-5 w-5 text-slate-200" emojiClassName="text-xl" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-base font-medium text-slate-100">{card.name}</p>
                          <p className="truncate text-sm text-slate-400">{card.description || "暂无描述"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-300 transition hover:bg-white/10"
                        onClick={() => openEditServiceModal(card)}
                        aria-label="编辑服务"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-red-400/40 bg-red-500/10 text-red-300 transition hover:bg-red-500/20"
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

                  <div className="mt-5 flex items-center justify-between text-xs text-slate-400">
                    <span className="mr-2 truncate">{card.url}</span>
                    {card.cardType === "ssh" && (
                      <span className="rounded border border-emerald-400/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-300">
                        SSH
                      </span>
                    )}
                    {card.cardType !== "ssh" && card.openMode === "newtab" && (
                      <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {sortedCards.length === 0 && (
              <div className="rounded-[14px] border border-dashed border-white/20 bg-slate-950/45 p-8 text-center text-sm text-slate-400">
                暂无服务，点击右上角「添加服务」开始创建。
              </div>
            )}
          </div>
        )}

        {activeTab === "groups" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-300">共 {sortedGroups.length} 个分组</p>
              <Button
                variant="default"
                className="h-9 rounded-lg border border-sky-400/20 bg-sky-500/85 px-4 text-slate-950 hover:bg-sky-400"
                onClick={openCreateGroupModal}
              >
                <Plus className="mr-2 h-4 w-4" />
                添加分组
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {sortedGroups.map((group) => (
                <div key={group.id} className="rounded-[14px] border border-white/10 bg-slate-950/55 p-6 shadow-[0_12px_24px_rgba(2,6,23,0.35)] backdrop-blur-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-base font-medium text-slate-100">{group.name}</p>
                      <p className="text-sm text-slate-400">排序: {group.orderIndex}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className={cn("h-8 rounded-lg", OUTLINE_DARK_BUTTON_CLASS)} onClick={() => openEditGroupModal(group)}>
                        编辑
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg border-red-400/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200"
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
                  <p className="mt-4 text-sm text-slate-300">{groupCardCount[group.id] || 0} 个服务</p>
                </div>
              ))}
            </div>

            {sortedGroups.length === 0 && (
              <div className="rounded-[14px] border border-dashed border-white/20 bg-slate-950/45 p-8 text-center text-sm text-slate-400">
                暂无分组，点击右上角「添加分组」开始创建。
              </div>
            )}
          </div>
        )}

        {activeTab === "search" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-300">共 {searchEngines.length} 个搜索引擎</p>
              <Button
                variant="default"
                className="h-9 rounded-lg border border-sky-400/20 bg-sky-500/85 px-4 text-slate-950 hover:bg-sky-400"
                onClick={openCreateSearchModal}
              >
                <Plus className="mr-2 h-4 w-4" />
                添加搜索引擎
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {searchEngines.map((engine) => (
                <div key={engine.id} className="rounded-[14px] border border-white/10 bg-slate-950/55 p-6 shadow-[0_12px_24px_rgba(2,6,23,0.35)] backdrop-blur-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded border border-white/10 bg-white/5">
                          <AppIcon icon={engine.icon} className="h-4 w-4 text-slate-200" />
                        </span>
                        <p className="truncate text-base font-medium text-slate-100">{engine.name}</p>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-400">{engine.searchUrlTemplate}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className={cn("h-8 rounded-lg", OUTLINE_DARK_BUTTON_CLASS)} onClick={() => openEditSearchModal(engine)}>
                        编辑
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg border-red-400/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200"
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
              <div className="rounded-[14px] border border-dashed border-white/20 bg-slate-950/45 p-8 text-center text-sm text-slate-400">
                暂无搜索引擎，点击右上角「添加搜索引擎」开始创建。
              </div>
            )}
          </div>
        )}

        {activeTab === "security" && (
          <Card className={SECTION_CARD_CLASS}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <Shield className="h-5 w-5" />
                安全与访问控制
              </CardTitle>
              <CardDescription className="text-slate-300">安全开关、会话超时、配置页二次验证与管理员密码更新</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={securityEnabledDraft}
                  onChange={(event) => setSecurityEnabledDraft(event.target.checked)}
                />
                启用登录保护
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={requireAuthForConfigDraft}
                  onChange={(event) => setRequireAuthForConfigDraft(event.target.checked)}
                />
                进入配置页需要二次验证
              </label>
              <div className="space-y-1">
                <label className="text-sm text-slate-200">会话超时（分钟）</label>
                <Input
                  className={SECTION_INPUT_CLASS}
                  type="number"
                  min={1}
                  value={sessionTimeoutDraft}
                  onChange={(event) => setSessionTimeoutDraft(event.target.value)}
                  aria-invalid={sessionTimeoutInvalid}
                />
                {sessionTimeoutInvalid && <p className="text-xs text-red-500">请输入大于 0 的整数</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm text-slate-200">修改管理员密码（留空不修改）</label>
                <Input
                  className={SECTION_INPUT_CLASS}
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="输入新密码（留空不修改）"
                  aria-invalid={passwordTooShort}
                />
                {passwordTooShort && <p className="text-xs text-red-500">密码长度至少 8 位</p>}
              </div>
              <Button
                className="border border-sky-400/20 bg-sky-500/85 text-slate-950 hover:bg-sky-400"
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
                      draft.security.requireAuthForConfig = requireAuthForConfigDraft;
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
          <Card className={SECTION_CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-slate-100">网络模式偏好</CardTitle>
              <CardDescription className="text-slate-300">自动识别内网与外网环境，为服务选择合适的访问地址</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm text-slate-200">当前网络模式</label>
                <select
                  className={SECTION_SELECT_CLASS}
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
              <div className="rounded-md border border-sky-400/30 bg-sky-500/10 p-4 text-sm text-slate-200">
                <p className="mb-2 font-medium text-slate-100">网络模式说明：</p>
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

        {activeTab === "daily-sentence" && (
          <Card className={SECTION_CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-slate-100">每日一句</CardTitle>
              <CardDescription className="text-slate-300">控制首页顶部是否显示第三方每日一句文案</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={dailySentenceEnabledDraft}
                  onChange={(event) => setDailySentenceEnabledDraft(event.target.checked)}
                />
                启用每日一句
              </label>
              <Button
                className="border border-sky-400/20 bg-sky-500/85 text-slate-950 hover:bg-sky-400"
                disabled={saving || !adminConfig}
                onClick={() =>
                  saveAdmin(
                    (draft) => {
                      draft.dailySentenceEnabled = dailySentenceEnabledDraft;
                    },
                    { successMessage: "每日一句设置已保存" }
                  )
                }
              >
                保存设置
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTab === "background" && (
          <Card className={SECTION_CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-slate-100">背景设置</CardTitle>
              <CardDescription className="text-slate-300">支持渐变背景或上传背景图（data URL，最大 512KB）</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">背景类型</label>
                <div className="flex items-center gap-4 text-sm text-slate-200">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="backgroundType"
                      checked={backgroundTypeDraft === "gradient"}
                      onChange={() => setBackgroundTypeDraft("gradient")}
                    />
                    渐变
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="backgroundType"
                      checked={backgroundTypeDraft === "image"}
                      onChange={() => setBackgroundTypeDraft("image")}
                    />
                    图片
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">背景预览</label>
                <div
                  className="h-28 w-full rounded-xl border border-white/15"
                  style={{
                    background:
                      backgroundTypeDraft === "image" && backgroundImageDraft
                        ? `center/cover no-repeat url(${backgroundImageDraft})`
                        : "radial-gradient(circle at 0% 0%, rgba(56,189,248,0.25), transparent 35%), radial-gradient(circle at 100% 0%, rgba(168,85,247,0.24), transparent 32%), linear-gradient(160deg, #0f172a 0%, #111827 55%, #020617 100%)"
                  }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className={cn("inline-flex h-9 cursor-pointer items-center rounded-lg border px-4 text-sm", OUTLINE_DARK_BUTTON_CLASS)}>
                  <ImagePlus className="mr-2 h-4 w-4" />
                  上传背景图
                  <input
                    className="hidden"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        uploadBackgroundImage(file).catch(() => undefined);
                      }
                      event.target.value = "";
                    }}
                  />
                </label>
                <Button
                  variant="outline"
                  className={OUTLINE_DARK_BUTTON_CLASS}
                  onClick={() => {
                    setBackgroundTypeDraft("gradient");
                    setBackgroundImageDraft("");
                  }}
                >
                  重置为渐变
                </Button>
              </div>

              <Button
                className="border border-sky-400/20 bg-sky-500/85 text-slate-950 hover:bg-sky-400"
                disabled={saving || !adminConfig}
                onClick={() =>
                  saveAdmin(
                    (draft) => {
                      draft.backgroundType = backgroundTypeDraft;
                      draft.backgroundImageDataUrl =
                        backgroundTypeDraft === "image" ? backgroundImageDraft || undefined : undefined;
                    },
                    { successMessage: "背景设置已保存" }
                  )
                }
              >
                保存设置
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {gated && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
          <Card className={cn("w-full max-w-md", SECTION_CARD_CLASS)}>
            <CardHeader>
              <CardTitle className="text-slate-100">配置页二次验证</CardTitle>
              <CardDescription className="text-slate-300">已开启安全门禁，请再次输入管理员密码后继续。</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={verifySettingsAccess}>
                <Input
                  className={SECTION_INPUT_CLASS}
                  type="password"
                  value={verifyPassword}
                  onChange={(event) => setVerifyPassword(event.target.value)}
                  placeholder="请输入管理员密码"
                  autoFocus
                />
                <Button className="w-full border border-sky-400/20 bg-sky-500/85 text-slate-950 hover:bg-sky-400" disabled={verifying || !verifyPassword.trim()}>
                  {verifying ? "验证中..." : "验证并继续"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

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

          <ModalField label="卡片类型">
            <select
              className={MODAL_SELECT_CLASS}
              value={cardForm.cardType}
              onChange={(event) => {
                const nextType = event.target.value as CardType;
                setCardForm((prev) => ({
                  ...prev,
                  cardType: nextType,
                  openMode: "iframe",
                  healthCheckEnabled: nextType === "ssh" ? false : prev.healthCheckEnabled
                }));
              }}
            >
              <option value="generic">通用</option>
              <option value="ssh">SSH 终端</option>
            </select>
          </ModalField>

          {cardForm.cardType === "generic" && (
            <>
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
            </>
          )}

          {cardForm.cardType === "ssh" && (
            <>
              <ModalField label="SSH 主机">
                <Input
                  className={MODAL_INPUT_CLASS}
                  value={cardForm.sshHost}
                  onChange={(event) => setCardForm((prev) => ({ ...prev, sshHost: event.target.value }))}
                  placeholder="例如 192.168.1.10 或 server.example.com"
                  required
                />
              </ModalField>

              <ModalField label="SSH 端口">
                <Input
                  className={MODAL_INPUT_CLASS}
                  type="number"
                  min={1}
                  max={65535}
                  value={cardForm.sshPort}
                  onChange={(event) => setCardForm((prev) => ({ ...prev, sshPort: event.target.value }))}
                />
              </ModalField>

              <ModalField label="SSH 用户名">
                <Input
                  className={MODAL_INPUT_CLASS}
                  value={cardForm.sshUsername}
                  onChange={(event) => setCardForm((prev) => ({ ...prev, sshUsername: event.target.value }))}
                  required
                />
              </ModalField>

              <ModalField label="认证方式" hint="密码/私钥在打开终端时输入，不会保存">
                <select
                  className={MODAL_SELECT_CLASS}
                  value={cardForm.sshAuthMode}
                  onChange={(event) => setCardForm((prev) => ({ ...prev, sshAuthMode: event.target.value as SshAuthMode }))}
                >
                  <option value="password">密码</option>
                  <option value="privatekey">私钥</option>
                </select>
              </ModalField>
            </>
          )}

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
              className="min-h-16 border-white/15 bg-slate-900/80 text-slate-100 shadow-[0_0_0_0.5px_rgba(148,163,184,0.3)] placeholder:text-slate-400 focus:ring-1 focus:ring-sky-400/60"
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

          {cardForm.cardType !== "ssh" && (
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
          )}

          <ModalField label="排序">
            <Input
              className={MODAL_INPUT_CLASS}
              type="number"
              value={cardForm.orderIndex}
              onChange={(event) => setCardForm((prev) => ({ ...prev, orderIndex: event.target.value }))}
            />
          </ModalField>

          <label className="flex items-center gap-2 pt-1 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={cardForm.enabled}
              onChange={(event) => setCardForm((prev) => ({ ...prev, enabled: event.target.checked }))}
            />
            启用服务
          </label>

          {cardForm.cardType !== "ssh" && (
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={cardForm.healthCheckEnabled}
                onChange={(event) => setCardForm((prev) => ({ ...prev, healthCheckEnabled: event.target.checked }))}
              />
              参与健康探测
            </label>
          )}

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

          <ModalField label="图标（可选）" hint="支持 Iconify、Emoji、图片 data URL 或 http(s) 地址">
            <Input
              className={MODAL_INPUT_CLASS}
              value={searchForm.icon}
              onChange={(event) => setSearchForm((prev) => ({ ...prev, icon: event.target.value }))}
              placeholder="例如 tabler:world-search 或 https://..."
            />
          </ModalField>
          <div className="flex items-center gap-2">
            <label className={cn("inline-flex h-9 cursor-pointer items-center rounded-lg border px-3 text-xs", OUTLINE_DARK_BUTTON_CLASS)}>
              上传图标
              <input
                className="hidden"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    uploadSearchIcon(file).catch(() => undefined);
                  }
                  event.target.value = "";
                }}
              />
            </label>
            {searchForm.icon && (
              <span className="inline-flex items-center gap-1 rounded border border-white/15 bg-white/10 px-2 py-1 text-xs text-slate-200">
                <AppIcon icon={searchForm.icon} className="h-3.5 w-3.5 text-slate-100" />
                已设置图标
              </span>
            )}
          </div>

          <Button type="submit" variant="default" className="h-9 w-full rounded-lg" disabled={saving}>
            {searchForm.id ? "保存修改" : "添加"}
          </Button>
        </form>
      </FormModal>
    </div>
  );
}
