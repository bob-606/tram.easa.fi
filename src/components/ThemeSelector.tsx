import { Sun, Moon, Monitor } from 'lucide-react';
import type { ThemeMode } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

const options: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

interface ThemeSelectorProps {
  value: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}

export function ThemeSelector({ value, onChange }: ThemeSelectorProps) {
  return (
    <div className="flex items-center gap-0.5 bg-card/60 border border-border/60 rounded-xl p-0.5">
      {options.map(({ value: v, label, icon: Icon }) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer',
            value === v
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
          aria-label={`${label} mode`}
        >
          <Icon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
