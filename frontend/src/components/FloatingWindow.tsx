import { useMemo, useState } from "react";
import { Maximize2, Minimize2, Minus, X, ExternalLink } from "lucide-react";
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

  const isMobile = useMemo(() => window.innerWidth < 768, []);

  if (isMinimized) {
    return (
      <div
        className="fixed bottom-4 left-4 z-50 cursor-pointer rounded-lg border bg-white px-3 py-2 shadow-lg"
        style={{ zIndex }}
        onClick={() => {
          setIsMinimized(false);
          onFocus();
        }}
      >
        <div className="flex items-center gap-2 text-sm">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-slate-700">
            <AppIcon icon={icon} className="h-4 w-4" />
          </span>
          <span className="max-w-36 truncate">{title}</span>
        </div>
      </div>
    );
  }

  const windowContent = (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border bg-white shadow-2xl">
      <div className="flex items-center justify-between bg-blue-600 px-2 py-1.5 text-white">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-white/15">
              <AppIcon icon={icon} className="h-4 w-4" />
            </span>
            <span className="truncate">{title}</span>
          </div>
          <div className="hidden truncate text-[10px] opacity-90 md:block">{url}</div>
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
            className="h-7 w-7 text-white hover:bg-white/20 hover:text-white"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative flex-1 bg-slate-50">
        {iframeError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
            <div className="text-4xl">⚠️</div>
            <div className="text-sm text-slate-600">当前页面不支持 iframe，已建议新标签页打开。</div>
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
        className="fixed left-0 top-14 h-[calc(100vh-56px)] w-full md:top-16 md:h-[calc(100vh-64px)]"
        style={{ zIndex }}
        onMouseDown={onFocus}
      >
        {windowContent}
      </div>
    );
  }

  return (
    <Rnd
      default={{
        x: 80 + Math.random() * 180,
        y: 90 + Math.random() * 60,
        width: Math.min(window.innerWidth * 0.75, 1100),
        height: Math.min(window.innerHeight * 0.65, 700)
      }}
      minWidth={420}
      minHeight={300}
      bounds="window"
      style={{ zIndex }}
      onMouseDown={onFocus}
    >
      {windowContent}
    </Rnd>
  );
}
