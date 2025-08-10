import React from "react";
import { cn } from "@/lib/utils";

// ChartContainer: provides a wrapper that exposes CSS color variables for charts
// Pass a colorMap with slug keys, e.g. { 'temperature': '#14b8a6', 'feels-like': '#a78bfa' }
export default function ChartContainer({ className, colorMap = {}, style, children, ...props }) {
  const styleVars = Object.fromEntries(
    Object.entries(colorMap).map(([k, v]) => [`--color-${k}`, v])
  );
  return (
    <div
      className={cn("w-full", className)}
      style={{ ...(style || {}), ...styleVars }}
      {...props}
    >
      {children}
    </div>
  );
}
