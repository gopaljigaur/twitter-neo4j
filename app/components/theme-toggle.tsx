'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Only render after hydration to avoid mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-1 sm:gap-2 p-1 bg-muted rounded-lg opacity-50">
        <button disabled className="px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium" aria-label="Light mode">
          <Sun className="w-4 h-4 inline sm:mr-1.5" />
          <span className="hidden sm:inline">Light</span>
        </button>
        <button disabled className="px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium" aria-label="Dark mode">
          <Moon className="w-4 h-4 inline sm:mr-1.5" />
          <span className="hidden sm:inline">Dark</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 sm:gap-2 p-1 bg-muted rounded-lg">
      <button
        onClick={() => setTheme('light')}
        className={`px-2 sm:px-3 py-1.5 rounded-md transition-all text-sm font-medium ${
          theme === 'light'
            ? 'bg-background shadow-xs'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-label="Light mode"
      >
        <Sun className="w-4 h-4 inline sm:mr-1.5" />
        <span className="hidden sm:inline">Light</span>
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`px-2 sm:px-3 py-1.5 rounded-md transition-all text-sm font-medium ${
          theme === 'dark'
            ? 'bg-background shadow-xs'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-label="Dark mode"
      >
        <Moon className="w-4 h-4 inline sm:mr-1.5" />
        <span className="hidden sm:inline">Dark</span>
      </button>
    </div>
  );
}
