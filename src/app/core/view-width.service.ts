import { computed, Injectable, signal } from '@angular/core';

export type ViewWidthMode = 'narrow' | 'wide';

const STORAGE_KEY = 'klausur-justierer:view-width';

function isViewWidthMode(value: unknown): value is ViewWidthMode {
  return value === 'narrow' || value === 'wide';
}

function readStoredViewWidth(): ViewWidthMode | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const value = localStorage.getItem(STORAGE_KEY);

    return isViewWidthMode(value) ? value : null;
  } catch {
    return null;
  }
}

function readInitialViewWidth(): ViewWidthMode {
  return readStoredViewWidth() ?? 'narrow';
}

function writeStoredViewWidth(viewWidth: ViewWidthMode): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, viewWidth);
  } catch {
    return;
  }
}

@Injectable({
  providedIn: 'root'
})
export class ViewWidthService {
  private readonly viewWidthValue = signal<ViewWidthMode>(readInitialViewWidth());

  readonly viewWidth = this.viewWidthValue.asReadonly();
  readonly isWide = computed(() => this.viewWidthValue() === 'wide');

  setViewWidth(viewWidth: ViewWidthMode): void {
    this.viewWidthValue.set(viewWidth);
    writeStoredViewWidth(viewWidth);
  }

  setWide(wide: boolean): void {
    this.setViewWidth(wide ? 'wide' : 'narrow');
  }

  toggle(): void {
    this.setWide(!this.isWide());
  }
}
