import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Switch } from "@/components/ui/switch";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    if (typeof resolvedTheme === "string") {
      setIsDark(resolvedTheme === "dark");
    }
  }, [resolvedTheme]);

  const handleToggle = (checked: boolean) => {
    setIsDark(checked);
    setTheme(checked ? "dark" : "light");
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2">
      <div className="flex items-center gap-2">
        {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        <div>
          <p className="text-sm font-medium leading-none">Dark mode</p>
          <p className="text-xs text-muted-foreground">Toggle theme</p>
        </div>
      </div>
      <Switch checked={isDark} onCheckedChange={handleToggle} aria-label="Toggle dark mode" />
    </div>
  );
}

