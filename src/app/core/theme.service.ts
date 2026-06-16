import { computed, Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'klausur-justierer:theme';

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

function readStoredTheme(): ThemeMode | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const value = localStorage.getItem(STORAGE_KEY);

    return isThemeMode(value) ? value : null;
  } catch {
    return null;
  }
}

function readSystemTheme(): ThemeMode {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}

function readInitialTheme(): ThemeMode {
  return readStoredTheme() ?? readSystemTheme();
}

function writeStoredTheme(theme: ThemeMode): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_KEY, theme);
}

function applyDocumentTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly themeValue = signal<ThemeMode>(readInitialTheme());

  readonly theme = this.themeValue.asReadonly();
  readonly isDark = computed(() => this.themeValue() === 'dark');

  constructor() {
    applyDocumentTheme(this.themeValue());
  }

  setTheme(theme: ThemeMode): void {
    this.themeValue.set(theme);
    writeStoredTheme(theme);
    applyDocumentTheme(theme);
  }

  toggle(): void {
    this.setTheme(this.isDark() ? 'light' : 'dark');
  }
}
