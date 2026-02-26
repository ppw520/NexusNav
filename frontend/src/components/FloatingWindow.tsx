import { useEffect, useState } from "react";
import { ExternalLink, Maximize2, Minimize2, Minus, X } from "lucide-react";
import { Rnd } from "react-rnd";
import { AppIcon } from "./AppIcon";
import { Button } from "./ui/button";

type FloatingWindowProps = {
  id: string;
  title: string;
  icon?: string;
  url: string;
  zIndex: number;
  onClose: () => void;
  onFocus: () => void;
};

export function FloatingWindow({
  id,
  title,
  icon,
  url,
  zIndex,
  onClose,
  onFocus
}: FloatingWindowProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  if (isMinimized) {
    return (
      <div
        className="fixed bottom-4 left-4 cursor-pointer rounded-xl border border-white/25 bg-slate-900/90 px-3 py-2 text-white shadow-xl backdrop-blur-md"
        style={{ zIndex }}
        onClick={() => {
          setIsMinimized(false);
          onFocus();
        }}
      >
        <div className="flex items-center gap-2 text-sm">
          <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded bg-white/20">
            <AppIcon icon={icon} className="h-4 w-4 text-white" />
          </span>
          <span className="max-w-36 truncate">{title}</span>
        </div>
      </div>
    );
  }

  const content = (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/20 bg-slate-950/90 text-white shadow-[0_20px_50px_-20px_rgba(15,23,42,0.95)] backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-white/15 bg-slate-900/85 px-2 py-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-white/20">
              <AppIcon icon={icon} className="h-4 w-4 text-white" />
            </span>
            <span className="truncate">{title}</span>
          </div>
          <div className="hidden truncate text-[10px] text-white/70 md:block">{url}</div>
        </div>
        <div className="ml-2 flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white hover:bg-white/20 hover:text-white"
            onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          {!isMobile && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white hover:bg-white/20 hover:text-white"
                onClick={() => setIsMinimized(true)}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white hover:bg-white/20 hover:text-white"
                onClick={() => setIsMaximized((value) => !value)}
              >
                {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white hover:bg-rose-500/30 hover:text-white"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative flex-1 bg-slate-900">
        {iframeError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
            <div className="text-4xl">⚠️</div>
            <div className="text-sm text-white/80">当前页面不支持 iframe，请使用新标签页打开。</div>
            <Button onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>新标签页打开</Button>
          </div>
        ) : (
          <iframe
            src={url}
            className="h-full w-full border-0 bg-white"
            title={`${id}-${title}`}
            onError={() => setIframeError(true)}
            referrerPolicy="no-referrer"
          />
        )}
      </div>
    </div>
  );

  if (isMobile || isMaximized) {
    return (
      <div
        className="fixed left-0 top-[84px] h-[calc(100vh-84px)] w-full p-2 md:top-[88px] md:h-[calc(100vh-88px)]"
        style={{ zIndex }}
        onMouseDown={onFocus}
      >
        {content}
      </div>
    );
  }

  return (
    <Rnd
      default={{
        x: 80 + Math.random() * 160,
        y: 120 + Math.random() * 60,
        width: Math.min(window.innerWidth * 0.75, 1100),
        height: Math.min(window.innerHeight * 0.68, 720)
      }}
      minWidth={400}
      minHeight={300}
      bounds="window"
      style={{ zIndex }}
      onMouseDown={onFocus}
    >
      {content}
    </Rnd>
  );
}
