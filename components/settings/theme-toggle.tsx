"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant={mounted && theme === "light" ? "default" : "outline"}
        onClick={() => setTheme("light")}
        aria-pressed={mounted && theme === "light"}
      >
        <Sun className="h-4 w-4" />
        Light
      </Button>
      <Button
        type="button"
        variant={mounted && theme === "dark" ? "default" : "outline"}
        onClick={() => setTheme("dark")}
        aria-pressed={mounted && theme === "dark"}
      >
        <Moon className="h-4 w-4" />
        Dark
      </Button>
    </div>
  );
}
