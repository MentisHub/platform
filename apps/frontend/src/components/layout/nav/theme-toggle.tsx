"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const mounted = () => true;
const notMounted = () => false;

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isMounted = useSyncExternalStore(subscribe, mounted, notMounted);

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className={cn(
        "w-8 h-8 flex items-center justify-center rounded-sm border transition-colors duration-150",
        "border-border-subtle text-text-secondary hover:text-amber-primary hover:border-border-active",
        className
      )}
      aria-label="Toggle theme"
    >
      {isMounted && (resolvedTheme === "dark" ? <Sun size={14} /> : <Moon size={14} />)}
    </button>
  );
}
