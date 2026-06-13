import type { StepId, WizardData, WizardSessionSnapshot, WizardState } from './types';

const STORAGE_KEY = 'klasur-justierer:sessions';
const STEP_IDS: StepId[] = ['basis', 'notenschema', 'justierung', 'abschluss'];

export type StoredWizardSession = {
  name: string;
  savedAt: string;
  data: WizardData;
  touchedStepIds: StepId[];
  currentStepId: StepId;
};

export type WizardSessionExport = {
  format: 'klasur-justierer-session';
  version: 2;
  exportedAt: string;
  data: WizardData;
  touchedStepIds: StepId[];
  currentStepId: StepId;
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

function isStepId(value: unknown): value is StepId {
  return typeof value === 'string' && STEP_IDS.includes(value as StepId);
}

function hasWizardStepData(stepId: StepId, data: WizardData): boolean {
  if (stepId === 'basis') {
    return (
      data.basis.title.trim().length > 0 ||
      data.basis.course.trim().length > 0 ||
      data.basis.examDate.trim().length > 0 ||
      data.basis.maxPoints !== null ||
      data.basis.participantCount !== null
    );
  }

  if (stepId === 'notenschema') {
    return (
      data.notenschema.passingPoints !== null ||
      data.notenschema.gradeThresholds.some((threshold) => threshold.minPoints !== null)
    );
  }

  if (stepId === 'justierung') {
    return (
      data.justierung.method !== 'none' ||
      data.justierung.bonusPoints !== null ||
      data.justierung.capAtMaxPoints !== true ||
      data.justierung.reviewer.trim().length > 0 ||
      data.justierung.reason.trim().length > 0
    );
  }

  return data.abschluss.confirmed;
}

function readTouchedStepIds(value: unknown, data: WizardData): StepId[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isStepId).filter((stepId) => hasWizardStepData(stepId, data));
}

function readCurrentStepId(value: unknown): StepId {
  return isStepId(value) ? value : 'basis';
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

function readWizardSessionSnapshot(value: unknown): WizardSessionSnapshot | null {
  if (isWizardData(value)) {
    return {
      data: cloneWizardData(value),
      touchedStepIds: [],
      currentStepId: 'basis'
    };
  }

  if (!isRecord(value) || !isWizardData(value.data)) {
    return null;
  }

  const data = cloneWizardData(value.data);

  return {
    data,
    touchedStepIds: readTouchedStepIds(value.touchedStepIds, data),
    currentStepId: readCurrentStepId(value.currentStepId)
  };
}

function isStoredWizardSession(value: unknown): value is StoredWizardSession {
  return isRecord(value) && typeof value.name === 'string' && typeof value.savedAt === 'string' && isWizardData(value.data);
}

function normalizeStoredWizardSession(value: unknown): StoredWizardSession | null {
  if (!isStoredWizardSession(value)) {
    return null;
  }

  const data = cloneWizardData(value.data);

  return {
    name: value.name,
    savedAt: value.savedAt,
    data,
    touchedStepIds: readTouchedStepIds(value.touchedStepIds, data),
    currentStepId: readCurrentStepId(value.currentStepId)
  };
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

function cloneWizardSessionSnapshot(snapshot: WizardSessionSnapshot): WizardSessionSnapshot {
  return {
    data: cloneWizardData(snapshot.data),
    touchedStepIds: [...snapshot.touchedStepIds],
    currentStepId: snapshot.currentStepId
  };
}

function createWizardSessionSnapshot(state: WizardState): WizardSessionSnapshot {
  return {
    data: cloneWizardData(state.data),
    touchedStepIds: state.steps
      .filter((step) => step.touched && hasWizardStepData(step.id, state.data))
      .map((step) => step.id),
    currentStepId: state.steps[state.currentStepIndex]?.id ?? 'basis'
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

export function createWizardSessionExport(state: WizardState): WizardSessionExport {
  const snapshot = createWizardSessionSnapshot(state);

  return {
    format: 'klasur-justierer-session',
    version: 2,
    exportedAt: new Date().toISOString(),
    data: cloneWizardData(snapshot.data),
    touchedStepIds: [...snapshot.touchedStepIds],
    currentStepId: snapshot.currentStepId
  };
}

export function parseWizardSessionJson(content: string): WizardSessionSnapshot {
  const parsed: unknown = JSON.parse(content);
  const snapshot = readWizardSessionSnapshot(parsed);

  if (snapshot) {
    return cloneWizardSessionSnapshot(snapshot);
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