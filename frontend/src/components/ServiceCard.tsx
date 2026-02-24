import { ExternalLink } from "lucide-react";
import type { CardDTO } from "../types";
import { AppIcon } from "./AppIcon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

type ServiceCardProps = {
  service: CardDTO;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDrop?: () => void;
};

export function ServiceCard({ service, onClick, draggable, onDragStart, onDrop }: ServiceCardProps) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      onClick={onClick}
    >
      <Card
        className="group relative cursor-pointer overflow-hidden transition hover:shadow-lg"
        style={{
          borderTop: `3px solid ${service.enabled ? "#3b82f6" : "#9ca3af"}`
        }}
      >
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-blue-50 text-blue-600">
              <AppIcon icon={service.icon} className="h-5 w-5" emojiClassName="text-xl" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate">{service.name}</CardTitle>
              <CardDescription className="mt-1 truncate">{service.description || "暂无描述"}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="mr-2 truncate">{service.url}</span>
            {service.openMode === "newtab" && <ExternalLink className="h-3 w-3 flex-shrink-0" />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
