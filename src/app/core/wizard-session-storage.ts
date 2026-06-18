import { cloneWizardData } from './wizard-defaults';
import {
  cloneWizardSessionSnapshot,
  createWizardSessionSnapshot,
  normalizeStoredWizardSession,
  type StoredWizardSession
} from './wizard-session-codec';
import type { WizardSessionSnapshot, WizardState } from './wizard.models';

export {
  createWizardSessionExport,
  parseWizardSessionJson,
  type StoredWizardSession,
  type WizardSessionExport
} from './wizard-session-codec';

const STORAGE_KEY = 'klausur-justierer:sessions';

function readStoredSessions(): StoredWizardSession[] {
  if (typeof localStorage === 'undefined') {
    return [];
  }

  let raw: string | null;

  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return [];
  }

  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(normalizeStoredWizardSession)
      .filter((session): session is StoredWizardSession => session !== null)
      .sort((left, right) => right.savedAt.localeCompare(left.savedAt));
  } catch {
    return [];
  }
}

function writeStoredSessions(sessions: StoredWizardSession[]): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function listWizardSessions(): StoredWizardSession[] {
  return readStoredSessions().map((session) => ({
    ...session,
    data: cloneWizardData(session.data),
    touchedStepIds: [...session.touchedStepIds]
  }));
}

export function saveWizardSession(name: string, state: WizardState): void {
  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new Error('Session-Name ist erforderlich.');
  }

  const snapshot = createWizardSessionSnapshot(state);
  const sessions = readStoredSessions().filter((session) => session.name !== normalizedName);

  writeStoredSessions([
    {
      name: normalizedName,
      savedAt: new Date().toISOString(),
      data: cloneWizardData(snapshot.data),
      touchedStepIds: [...snapshot.touchedStepIds],
      currentStepId: snapshot.currentStepId
    },
    ...sessions
  ]);
}

export function loadWizardSession(name: string): WizardSessionSnapshot | null {
  const session = readStoredSessions().find((item) => item.name === name);

  return session
    ? cloneWizardSessionSnapshot({
        data: session.data,
        touchedStepIds: session.touchedStepIds,
        currentStepId: session.currentStepId
      })
    : null;
}

export function createWizardSessionFilename(course: string, topic: string): string {
  const normalizedName =
    [course.trim(), topic.trim()].filter((value) => value.length > 0).join(' ') || 'klausur-session';
  const slug = normalizedName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${slug || 'klausur-session'}.json`;
}
