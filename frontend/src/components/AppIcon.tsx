import { Icon as IconifyIcon } from "@iconify/react";
import {
  AppWindow,
  Cloud,
  Database,
  Globe,
  Home,
  LayoutDashboard,
  Link2,
  Monitor,
  Router,
  Server,
  Shield,
  type LucideIcon,
  Video
} from "lucide-react";
import { cn } from "../lib/utils";

type AppIconProps = {
  icon?: string;
  className?: string;
  emojiClassName?: string;
};

const LEGACY_ICON_MAP: Record<string, LucideIcon> = {
  app: AppWindow,
  application: AppWindow,
  cloud: Cloud,
  dashboard: LayoutDashboard,
  data: Database,
  database: Database,
  globe: Globe,
  global: Globe,
  home: Home,
  internet: Globe,
  monitor: Monitor,
  router: Router,
  security: Shield,
  server: Server,
  video: Video,
  "video-camera": Video,
  world: Globe
};

function normalizeLegacyIcon(value: string): string {
  return value.trim().toLowerCase().replace(/[_\s]+/g, "-");
}

function isIconifyIcon(value: string): boolean {
  const [prefix, name] = value.split(":");
  if (!prefix || !name) {
    return false;
  }
  return /^[a-z0-9-]+$/i.test(prefix) && /^[a-z0-9-]+$/i.test(name);
}

function isEmojiLike(value: string): boolean {
  return Array.from(value).length <= 4 && !/[a-z0-9:_-]/i.test(value);
}

function isImageSource(value: string): boolean {
  return value.startsWith("data:image/") || value.startsWith("http://") || value.startsWith("https://");
}

export function AppIcon({ icon, className, emojiClassName }: AppIconProps) {
  const value = (icon || "").trim();

  if (!value) {
    return <Link2 className={className} />;
  }

  if (isIconifyIcon(value)) {
    return <IconifyIcon icon={value} className={className} />;
  }

  const legacyIcon = LEGACY_ICON_MAP[normalizeLegacyIcon(value)];
  if (legacyIcon) {
    const LegacyIcon = legacyIcon;
    return <LegacyIcon className={className} />;
  }

  if (isEmojiLike(value)) {
    return <span className={cn("inline-flex items-center justify-center text-lg leading-none", emojiClassName)}>{value}</span>;
  }

  if (isImageSource(value)) {
    return <img src={value} alt="" className={cn("h-full w-full object-contain", className)} loading="lazy" />;
  }

  return <Link2 className={className} />;
}
