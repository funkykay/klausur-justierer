import type { WizardData } from './types';

const STORAGE_KEY = 'klasur-justierer:sessions';

export type StoredWizardSession = {
  name: string;
  savedAt: string;
  data: WizardData;
};

export type WizardSessionExport = {
  format: 'klasur-justierer-session';
  version: 1;
  exportedAt: string;
  data: WizardData;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}

function isMethod(value: unknown): value is WizardData['justierung']['method'] {
  return value === 'none' || value === 'bonus' || value === 'linear';
}

function isWizardData(value: unknown): value is WizardData {
  if (!isRecord(value)) {
    return false;
  }

  const { basis, notenschema, justierung, abschluss } = value;

  if (!isRecord(basis)) {
    return false;
  }

  if (
    typeof basis.title !== 'string' ||
    typeof basis.course !== 'string' ||
    typeof basis.examDate !== 'string' ||
    !isNumberOrNull(basis.maxPoints) ||
    !isNumberOrNull(basis.participantCount)
  ) {
    return false;
  }

  if (!isRecord(notenschema) || !isNumberOrNull(notenschema.passingPoints)) {
    return false;
  }

  if (!Array.isArray(notenschema.gradeThresholds)) {
    return false;
  }

  const validThresholds = notenschema.gradeThresholds.every(
    (threshold) =>
      isRecord(threshold) && typeof threshold.grade === 'string' && isNumberOrNull(threshold.minPoints)
  );

  if (!validThresholds) {
    return false;
  }

  if (!isRecord(justierung)) {
    return false;
  }

  if (
    !isMethod(justierung.method) ||
    !isNumberOrNull(justierung.bonusPoints) ||
    typeof justierung.capAtMaxPoints !== 'boolean' ||
    typeof justierung.reviewer !== 'string' ||
    typeof justierung.reason !== 'string'
  ) {
    return false;
  }

  if (!isRecord(abschluss) || typeof abschluss.confirmed !== 'boolean') {
    return false;
  }

  return true;
}

function isStoredWizardSession(value: unknown): value is StoredWizardSession {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    typeof value.savedAt === 'string' &&
    isWizardData(value.data)
  );
}

function cloneWizardData(data: WizardData): WizardData {
  return {
    basis: {
      ...data.basis
    },
    notenschema: {
      passingPoints: data.notenschema.passingPoints,
      gradeThresholds: data.notenschema.gradeThresholds.map((threshold) => ({
        ...threshold
      }))
    },
    justierung: {
      ...data.justierung
    },
    abschluss: {
      ...data.abschluss
    }
  };
}

function readStoredSessions(): StoredWizardSession[] {
  if (typeof localStorage === 'undefined') {
    return [];
  }

  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isStoredWizardSession).sort((left, right) => right.savedAt.localeCompare(left.savedAt));
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
    data: cloneWizardData(session.data)
  }));
}

export function saveWizardSession(name: string, data: WizardData): void {
  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new Error('Session-Name ist erforderlich.');
  }

  const sessions = readStoredSessions().filter((session) => session.name !== normalizedName);

  writeStoredSessions([
    {
      name: normalizedName,
      savedAt: new Date().toISOString(),
      data: cloneWizardData(data)
    },
    ...sessions
  ]);
}

export function loadWizardSession(name: string): WizardData | null {
  const session = readStoredSessions().find((item) => item.name === name);

  return session ? cloneWizardData(session.data) : null;
}

export function createWizardSessionExport(data: WizardData): WizardSessionExport {
  return {
    format: 'klasur-justierer-session',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: cloneWizardData(data)
  };
}

export function parseWizardSessionJson(content: string): WizardData {
  const parsed: unknown = JSON.parse(content);

  if (isWizardData(parsed)) {
    return cloneWizardData(parsed);
  }

  if (isRecord(parsed) && isWizardData(parsed.data)) {
    return cloneWizardData(parsed.data);
  }

  throw new Error('Die Datei enthält keine gültige Klasur-Justierer-Session.');
}

export function createWizardSessionFilename(title: string): string {
  const normalizedTitle = title.trim() || 'klasur-session';
  const slug = normalizedTitle
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${slug || 'klasur-session'}.json`;
}