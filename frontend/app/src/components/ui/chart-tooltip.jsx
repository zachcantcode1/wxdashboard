import React from "react";
import { Tooltip } from "recharts";
import { cn } from "@/lib/utils";

export function ChartTooltip({ className, unit, content, ...props }) {
  return (
    <Tooltip
      cursor={{ stroke: "#334155", strokeWidth: 1, strokeOpacity: 0.4 }}
      wrapperStyle={{ outline: "none" }}
      content={(p) => (content ? content(p) : <ChartTooltipContent {...p} unit={unit} />)}
      {...props}
    />
  );
}

export function ChartTooltipContent({ active, label, payload, unit, className }) {
  if (!active || !payload || payload.length === 0) return null;

  // Deduplicate by dataKey so the same series (e.g., Area + Line with same key)
  // is only shown once. Prefer the last occurrence (usually the Line) over Area.
  const map = new Map();
  for (const p of payload) {
    if (!p || p.value == null) continue;
    const key = p.dataKey ?? p.name ?? Math.random();
    if (map.has(key)) map.delete(key); // move to end
    map.set(key, p);
  }
  const items = Array.from(map.values());

  return (
    <div
      className={cn(
        "rounded-md border bg-background/90 backdrop-blur px-3 py-2 text-sm shadow-md",
        className
      )}
    >
      {label ? (
        <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      ) : null}
      <div className="grid gap-1">
        {items.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: entry.color || "currentColor" }}
            />
            <span className="text-foreground">{entry.name}</span>
            <span className="ml-auto font-medium text-foreground">
              {entry.value}
              {unit ? ` ${unit}` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
