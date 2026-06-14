import type {
  AdjustmentLayout,
  AdjustmentResultView,
  ExamParticipant,
  ExamTask,
  GradeThreshold,
  StepId,
  WizardData,
  WizardSessionSnapshot,
  WizardState
} from './wizard.models';

const STORAGE_KEY = 'klasur-justierer:sessions';
const STEP_IDS: StepId[] = ['basis', 'aufgaben', 'notenschema', 'teilnehmer', 'justierung'];

type LegacyAdjustmentMethod = 'none' | 'bonus' | 'linear';

export type StoredWizardSession = {
  name: string;
  savedAt: string;
  data: WizardData;
  touchedStepIds: StepId[];
  currentStepId: StepId;
};

export type WizardSessionExport = {
  format: 'klasur-justierer-session';
  version: 8;
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

function isLegacyAdjustmentMethod(value: unknown): value is LegacyAdjustmentMethod {
  return value === 'none' || value === 'bonus' || value === 'linear';
}

function isAdjustmentLayout(value: unknown): value is AdjustmentLayout {
  return value === 'sideBySide' || value === 'stacked';
}

function isAdjustmentResultView(value: unknown): value is AdjustmentResultView {
  return value === 'chart' || value === 'table';
}

function isStepId(value: unknown): value is StepId {
  return typeof value === 'string' && STEP_IDS.includes(value as StepId);
}

function cloneGradeThresholds(gradeThresholds: GradeThreshold[]): GradeThreshold[] {
  return gradeThresholds.map((threshold) => ({
    ...threshold
  }));
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

function createDefaultTeilnehmerData(taskCount: number): WizardData['teilnehmer'] {
  return {
    participants: [
      {
        name: 'Teilnehmer 1',
        pointsByTask: Array.from({ length: taskCount }, () => 0)
      }
    ]
  };
}

function createDefaultJustierungData(gradeThresholds: GradeThreshold[]): WizardData['justierung'] {
  return {
    layout: 'sideBySide',
    resultView: 'chart',
    droppedTaskIndexes: [],
    gradeThresholds: cloneGradeThresholds(gradeThresholds),
    reviewer: '',
    reason: ''
  };
}

function hasAdjustedGradeThresholds(data: WizardData): boolean {
  return data.notenschema.gradeThresholds.some((threshold, index) => {
    const adjustedThreshold = data.justierung.gradeThresholds[index];

    return adjustedThreshold !== undefined && adjustedThreshold.minPercent !== threshold.minPercent;
  });
}

function hasWizardStepData(stepId: StepId, data: WizardData): boolean {
  if (stepId === 'basis') {
    return data.basis.topic.trim().length > 0 || data.basis.course.trim().length > 0;
  }

  if (stepId === 'aufgaben') {
    return data.aufgaben.tasks.some((task) => task.name.trim().length > 0 || task.maxPoints !== null);
  }

  if (stepId === 'notenschema') {
    return data.notenschema.gradeThresholds.some(
      (threshold) => threshold.grade.trim().length > 0 || threshold.minPercent !== null
    );
  }

  if (stepId === 'teilnehmer') {
    return data.teilnehmer.participants.some(
      (participant) =>
        participant.name.trim().length > 0 || participant.pointsByTask.some((points) => points !== null)
    );
  }

  if (stepId === 'justierung') {
    return (
      data.justierung.droppedTaskIndexes.length > 0 ||
      hasAdjustedGradeThresholds(data) ||
      data.justierung.reviewer.trim().length > 0 ||
      data.justierung.reason.trim().length > 0
    );
  }

  return false;
}

function readTouchedStepIds(value: unknown, data: WizardData): StepId[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isStepId).filter((stepId) => hasWizardStepData(stepId, data));
}

function readCurrentStepId(value: unknown): StepId {
  if (isStepId(value)) {
    return value;
  }

  if (value === 'abschluss') {
    return 'justierung';
  }

  return 'basis';
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

function calculateTotalPoints(tasks: ExamTask[]): number {
  return tasks.reduce((sum, task) => sum + (task.maxPoints ?? 0), 0);
}

function readGradeThresholdPercent(value: Record<string, unknown>, totalPoints: number): number | null | undefined {
  if ('minPercent' in value) {
    return isNumberOrNull(value.minPercent) ? value.minPercent : undefined;
  }

  if (!('minPoints' in value) || !isNumberOrNull(value.minPoints)) {
    return undefined;
  }

  if (value.minPoints === null) {
    return null;
  }

  if (totalPoints <= 0) {
    return value.minPoints;
  }

  return Number(((value.minPoints / totalPoints) * 100).toFixed(2));
}

function readGradeThresholds(value: unknown, totalPoints: number): GradeThreshold[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const thresholds: GradeThreshold[] = [];

  for (const threshold of value) {
    if (!isRecord(threshold) || typeof threshold.grade !== 'string') {
      return null;
    }

    const minPercent = readGradeThresholdPercent(threshold, totalPoints);

    if (minPercent === undefined) {
      return null;
    }

    thresholds.push({
      grade: threshold.grade,
      minPercent
    });
  }

  return thresholds;
}

function readNotenschemaData(value: unknown, totalPoints: number): WizardData['notenschema'] | null {
  if (!isRecord(value)) {
    return null;
  }

  const gradeThresholds = readGradeThresholds(value.gradeThresholds, totalPoints);

  if (!gradeThresholds) {
    return null;
  }

  return {
    gradeThresholds
  };
}

function normalizeParticipantPoints(pointsByTask: (number | null)[], taskCount: number): (number | null)[] {
  return Array.from({ length: taskCount }, (_, index) => pointsByTask[index] ?? 0);
}

function readParticipantPoints(value: unknown): (number | null)[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  if (!value.every(isNumberOrNull)) {
    return null;
  }

  return value;
}

function readParticipants(value: unknown, taskCount: number): ExamParticipant[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const participants: ExamParticipant[] = [];

  for (const participant of value) {
    if (!isRecord(participant) || typeof participant.name !== 'string') {
      return null;
    }

    const pointsByTask = readParticipantPoints(participant.pointsByTask);

    if (!pointsByTask) {
      return null;
    }

    participants.push({
      name: participant.name,
      pointsByTask: normalizeParticipantPoints(pointsByTask, taskCount)
    });
  }

  return participants.length > 0 ? participants : createDefaultTeilnehmerData(taskCount).participants;
}

function readTeilnehmerData(value: unknown, taskCount: number): WizardData['teilnehmer'] | null {
  if (value === undefined) {
    return createDefaultTeilnehmerData(taskCount);
  }

  if (!isRecord(value)) {
    return null;
  }

  const participants = readParticipants(value.participants, taskCount);

  if (!participants) {
    return null;
  }

  return {
    participants
  };
}

function readAdjustmentLayout(value: unknown): AdjustmentLayout | null {
  if (value === undefined) {
    return 'sideBySide';
  }

  return isAdjustmentLayout(value) ? value : null;
}

function readAdjustmentResultView(value: unknown): AdjustmentResultView | null {
  if (value === undefined) {
    return 'chart';
  }

  return isAdjustmentResultView(value) ? value : null;
}

function readDroppedTaskIndexes(value: unknown): number[] | null {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const indexes: number[] = [];

  for (const item of value) {
    if (typeof item !== 'number' || !Number.isInteger(item) || item < 0) {
      return null;
    }

    if (!indexes.includes(item)) {
      indexes.push(item);
    }
  }

  return indexes.sort((left, right) => left - right);
}

function readAdjustedGradeThresholds(
  value: unknown,
  gradeThresholds: GradeThreshold[]
): GradeThreshold[] | null {
  if (value === undefined) {
    return cloneGradeThresholds(gradeThresholds);
  }

  return readGradeThresholds(value, 0);
}

function readJustierungData(value: unknown, gradeThresholds: GradeThreshold[]): WizardData['justierung'] | null {
  if (value === undefined) {
    return createDefaultJustierungData(gradeThresholds);
  }

  if (!isRecord(value)) {
    return null;
  }

  if (
    isLegacyAdjustmentMethod(value.method) &&
    isNumberOrNull(value.bonusPoints) &&
    typeof value.reviewer === 'string' &&
    typeof value.reason === 'string'
  ) {
    return {
      ...createDefaultJustierungData(gradeThresholds),
      reviewer: value.reviewer,
      reason: value.reason
    };
  }

  const layout = readAdjustmentLayout(value.layout);
  const resultView = readAdjustmentResultView(value.resultView);
  const droppedTaskIndexes = readDroppedTaskIndexes(value.droppedTaskIndexes);
  const adjustedGradeThresholds = readAdjustedGradeThresholds(value.gradeThresholds, gradeThresholds);

  if (
    !layout ||
    !resultView ||
    !droppedTaskIndexes ||
    !adjustedGradeThresholds ||
    typeof value.reviewer !== 'string' ||
    typeof value.reason !== 'string'
  ) {
    return null;
  }

  return {
    layout,
    resultView,
    droppedTaskIndexes,
    gradeThresholds: adjustedGradeThresholds,
    reviewer: value.reviewer,
    reason: value.reason
  };
}

function readWizardData(value: unknown): WizardData | null {
  if (!isRecord(value)) {
    return null;
  }

  const basis = readBasisData(value.basis);
  const aufgaben = readAufgabenData(value.aufgaben);

  if (!basis || !aufgaben) {
    return null;
  }

  const totalPoints = calculateTotalPoints(aufgaben.tasks);
  const notenschema = readNotenschemaData(value.notenschema, totalPoints);
  const teilnehmer = readTeilnehmerData(value.teilnehmer, aufgaben.tasks.length);

  if (!notenschema || !teilnehmer) {
    return null;
  }

  const justierung = readJustierungData(value.justierung, notenschema.gradeThresholds);

  if (!justierung) {
    return null;
  }

  return {
    basis,
    aufgaben,
    notenschema,
    teilnehmer,
    justierung
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
      gradeThresholds: cloneGradeThresholds(data.notenschema.gradeThresholds)
    },
    teilnehmer: {
      participants: data.teilnehmer.participants.map((participant) => ({
        name: participant.name,
        pointsByTask: [...participant.pointsByTask]
      }))
    },
    justierung: {
      ...data.justierung,
      droppedTaskIndexes: [...data.justierung.droppedTaskIndexes],
      gradeThresholds: cloneGradeThresholds(data.justierung.gradeThresholds)
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
    version: 8,
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
