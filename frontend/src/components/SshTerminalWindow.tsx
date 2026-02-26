import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2, Minus, Plug, PlugZap, X } from "lucide-react";
import { Rnd } from "react-rnd";
import { AppIcon } from "./AppIcon";
import { Button } from "./ui/button";
import type { SshAuthMode } from "../types";

type SshTerminalWindowProps = {
  id: string;
  title: string;
  icon?: string;
  cardId: string;
  sshHost?: string;
  sshPort?: number;
  sshUsername?: string;
  sshAuthMode?: SshAuthMode;
  zIndex: number;
  onClose: () => void;
  onFocus: () => void;
};

type ConnectionState = "idle" | "connecting" | "connected" | "error";

export function SshTerminalWindow({
  id,
  title,
  icon,
  cardId,
  sshHost,
  sshPort,
  sshUsername,
  sshAuthMode,
  zIndex,
  onClose,
  onFocus
}: SshTerminalWindowProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [state, setState] = useState<ConnectionState>("idle");
  const [password, setPassword] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [command, setCommand] = useState("");
  const [output, setOutput] = useState("$ NexusNav SSH terminal\n");

  const wsRef = useRef<WebSocket | null>(null);
  const outputRef = useRef<HTMLPreElement | null>(null);
  const authMode = sshAuthMode || "password";
  const connectionLabel = useMemo(() => {
    if (state === "connected") return "Connected";
    if (state === "connecting") return "Connecting...";
    if (state === "error") return "Error";
    return "Idle";
  }, [state]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  });

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  useEffect(() => () => disconnectSocket(), []);

  const appendOutput = (chunk: string) => {
    setOutput((previous) => previous + chunk);
  };

  const connectSocket = () => {
    if (!sshHost || !sshUsername) {
      appendOutput("\n[error] SSH host/username is missing in card config.\n");
      setState("error");
      return;
    }
    if (authMode === "password" && !password) {
      appendOutput("\n[error] Password is required.\n");
      setState("error");
      return;
    }
    if (authMode === "privatekey" && !privateKey.trim()) {
      appendOutput("\n[error] Private key is required.\n");
      setState("error");
      return;
    }

    disconnectSocket();
    setState("connecting");

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws/ssh?cardId=${encodeURIComponent(cardId)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "connect",
          password: authMode === "password" ? password : undefined,
          privateKey: authMode === "privatekey" ? privateKey : undefined,
          passphrase: authMode === "privatekey" ? passphrase : undefined,
          cols: 120,
          rows: 36
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data)) as {
          type?: string;
          data?: string;
          message?: string;
        };
        if (message.type === "connected") {
          setState("connected");
          appendOutput("\n[connected]\n");
          return;
        }
        if (message.type === "output") {
          appendOutput(message.data || "");
          return;
        }
        if (message.type === "error") {
          setState("error");
          appendOutput(`\n[error] ${message.message || "unknown"}\n`);
          return;
        }
        if (message.type === "closed") {
          if (state === "connected" || state === "connecting") {
            appendOutput("\n[disconnected]\n");
          }
          setState("idle");
        }
      } catch {
        appendOutput(String(event.data));
      }
    };

    ws.onerror = () => {
      setState("error");
      appendOutput("\n[error] WebSocket connection error.\n");
    };

    ws.onclose = () => {
      if (state === "connected" || state === "connecting") {
        appendOutput("\n[closed]\n");
      }
      setState("idle");
    };
  };

  const disconnectSocket = () => {
    const ws = wsRef.current;
    wsRef.current = null;
    if (!ws) return;
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "disconnect" }));
      }
      ws.close();
    } catch {
      // no-op
    }
    setState("idle");
  };

  const submitCommand = (event: React.FormEvent) => {
    event.preventDefault();
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || state !== "connected" || !command.trim()) {
      return;
    }
    ws.send(
      JSON.stringify({
        type: "input",
        data: `${command}\n`
      })
    );
    setCommand("");
  };

  const handleClose = () => {
    disconnectSocket();
    onClose();
  };

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
          <span className="max-w-36 truncate">{title} (SSH)</span>
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
            <span className="truncate">{title} / SSH</span>
          </div>
          <div className="hidden truncate text-[10px] text-white/70 md:block">
            {sshUsername || "user"}@{sshHost || "host"}:{sshPort || 22} ({connectionLabel})
          </div>
        </div>
        <div className="ml-2 flex items-center gap-1">
          {state === "connected" ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white hover:bg-white/20 hover:text-white"
              onClick={disconnectSocket}
              title="Disconnect"
            >
              <Plug className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-emerald-300 hover:bg-white/20 hover:text-emerald-200"
              onClick={connectSocket}
              title="Connect"
            >
              <PlugZap className="h-4 w-4" />
            </Button>
          )}
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
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col bg-slate-900 p-2">
        {state !== "connected" && (
          <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-2">
            {authMode === "password" ? (
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="SSH password"
                className="h-9 rounded-md border border-white/15 bg-slate-950/80 px-3 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-sky-400/60"
              />
            ) : (
              <>
                <textarea
                  value={privateKey}
                  onChange={(event) => setPrivateKey(event.target.value)}
                  placeholder="Paste private key"
                  className="min-h-20 rounded-md border border-white/15 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-sky-400/60 md:col-span-2"
                />
                <input
                  type="password"
                  value={passphrase}
                  onChange={(event) => setPassphrase(event.target.value)}
                  placeholder="Key passphrase (optional)"
                  className="h-9 rounded-md border border-white/15 bg-slate-950/80 px-3 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-sky-400/60"
                />
              </>
            )}
            <Button
              onClick={connectSocket}
              disabled={state === "connecting"}
              className="h-9 border border-sky-400/20 bg-sky-500/85 text-slate-950 hover:bg-sky-400"
            >
              {state === "connecting" ? "Connecting..." : "Connect"}
            </Button>
          </div>
        )}

        <pre
          ref={outputRef}
          className="flex-1 overflow-auto rounded-md border border-white/10 bg-[#050816] p-3 font-mono text-xs text-emerald-200"
        >
          {output}
        </pre>

        <form className="mt-2 flex items-center gap-2" onSubmit={submitCommand}>
          <input
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            placeholder={state === "connected" ? "Type command and press Enter" : "Connect first"}
            disabled={state !== "connected"}
            className="h-9 flex-1 rounded-md border border-white/15 bg-slate-950/80 px-3 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-sky-400/60 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Button
            type="submit"
            disabled={state !== "connected" || !command.trim()}
            className="h-9 border border-emerald-400/20 bg-emerald-500/85 text-slate-950 hover:bg-emerald-400"
          >
            Send
          </Button>
        </form>
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
        x: 110 + Math.random() * 140,
        y: 130 + Math.random() * 60,
        width: Math.min(window.innerWidth * 0.8, 1120),
        height: Math.min(window.innerHeight * 0.74, 760)
      }}
      minWidth={480}
      minHeight={380}
      bounds="window"
      style={{ zIndex }}
      onMouseDown={onFocus}
    >
      {content}
    </Rnd>
  );
}
