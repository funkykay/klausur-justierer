import type { ExamTask, GradeThreshold, StepId, WizardData, WizardSessionSnapshot, WizardState } from './types';

const STORAGE_KEY = 'klasur-justierer:sessions';
const STEP_IDS: StepId[] = ['basis', 'aufgaben', 'notenschema', 'justierung', 'abschluss'];

export type StoredWizardSession = {
  name: string;
  savedAt: string;
  data: WizardData;
  touchedStepIds: StepId[];
  currentStepId: StepId;
};

export type WizardSessionExport = {
  format: 'klasur-justierer-session';
  version: 4;
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

function createDefaultAufgabenData(): WizardData['aufgaben'] {
  return {
    tasks: [
      {
        name: 'Aufgabe 1',
        maxPoints: 0
      }
    ]
  };
}

function hasWizardStepData(stepId: StepId, data: WizardData): boolean {
  if (stepId === 'basis') {
    return data.basis.topic.trim().length > 0 || data.basis.course.trim().length > 0;
  }

  if (stepId === 'aufgaben') {
    return data.aufgaben.tasks.some((task) => task.name.trim().length > 0 || task.maxPoints !== null);
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

function readBasisData(value: unknown): WizardData['basis'] | null {
  if (!isRecord(value) || typeof value.course !== 'string') {
    return null;
  }

  if (typeof value.topic === 'string') {
    return {
      topic: value.topic,
      course: value.course
    };
  }

  if (typeof value.name === 'string') {
    return {
      topic: value.name,
      course: value.course
    };
  }

  if (typeof value.title === 'string') {
    return {
      topic: value.title,
      course: value.course
    };
  }

  return null;
}

function readTasks(value: unknown): ExamTask[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const validTasks = value.every(
    (task) => isRecord(task) && typeof task.name === 'string' && isNumberOrNull(task.maxPoints)
  );

  if (!validTasks) {
    return null;
  }

  return value.map((task) => ({
    name: task.name as string,
    maxPoints: task.maxPoints as number | null
  }));
}

function readAufgabenData(value: unknown): WizardData['aufgaben'] | null {
  if (value === undefined) {
    return createDefaultAufgabenData();
  }

  if (!isRecord(value)) {
    return null;
  }

  const tasks = readTasks(value.tasks);

  if (!tasks) {
    return null;
  }

  return {
    tasks
  };
}

function readGradeThresholds(value: unknown): GradeThreshold[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const validThresholds = value.every(
    (threshold) =>
      isRecord(threshold) && typeof threshold.grade === 'string' && isNumberOrNull(threshold.minPoints)
  );

  if (!validThresholds) {
    return null;
  }

  return value.map((threshold) => ({
    grade: threshold.grade as string,
    minPoints: threshold.minPoints as number | null
  }));
}

function readNotenschemaData(value: unknown): WizardData['notenschema'] | null {
  if (!isRecord(value) || !isNumberOrNull(value.passingPoints)) {
    return null;
  }

  const gradeThresholds = readGradeThresholds(value.gradeThresholds);

  if (!gradeThresholds) {
    return null;
  }

  return {
    passingPoints: value.passingPoints,
    gradeThresholds
  };
}

function readJustierungData(value: unknown): WizardData['justierung'] | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    !isMethod(value.method) ||
    !isNumberOrNull(value.bonusPoints) ||
    typeof value.reviewer !== 'string' ||
    typeof value.reason !== 'string'
  ) {
    return null;
  }

  return {
    method: value.method,
    bonusPoints: value.bonusPoints,
    reviewer: value.reviewer,
    reason: value.reason
  };
}

function readAbschlussData(value: unknown): WizardData['abschluss'] | null {
  if (!isRecord(value) || typeof value.confirmed !== 'boolean') {
    return null;
  }

  return {
    confirmed: value.confirmed
  };
}

function readWizardData(value: unknown): WizardData | null {
  if (!isRecord(value)) {
    return null;
  }

  const basis = readBasisData(value.basis);
  const aufgaben = readAufgabenData(value.aufgaben);
  const notenschema = readNotenschemaData(value.notenschema);
  const justierung = readJustierungData(value.justierung);
  const abschluss = readAbschlussData(value.abschluss);

  if (!basis || !aufgaben || !notenschema || !justierung || !abschluss) {
    return null;
  }

  return {
    basis,
    aufgaben,
    notenschema,
    justierung,
    abschluss
  };
}

function readWizardSessionSnapshot(value: unknown): WizardSessionSnapshot | null {
  const directData = readWizardData(value);

  if (directData) {
    return {
      data: cloneWizardData(directData),
      touchedStepIds: [],
      currentStepId: 'basis'
    };
  }

  if (!isRecord(value)) {
    return null;
  }

  const data = readWizardData(value.data);

  if (!data) {
    return null;
  }

  return {
    data,
    touchedStepIds: readTouchedStepIds(value.touchedStepIds, data),
    currentStepId: readCurrentStepId(value.currentStepId)
  };
}

function normalizeStoredWizardSession(value: unknown): StoredWizardSession | null {
  if (!isRecord(value) || typeof value.name !== 'string' || typeof value.savedAt !== 'string') {
    return null;
  }

  const data = readWizardData(value.data);

  if (!data) {
    return null;
  }

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
    aufgaben: {
      tasks: data.aufgaben.tasks.map((task) => ({
        ...task
      }))
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
    version: 4,
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

export function createWizardSessionFilename(course: string, topic: string): string {
  const normalizedName =
    [course.trim(), topic.trim()].filter((value) => value.length > 0).join(' ') || 'klasur-session';
  const slug = normalizedName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${slug || 'klasur-session'}.json`;
}