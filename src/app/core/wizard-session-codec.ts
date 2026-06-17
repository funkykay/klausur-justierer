import { normalizeWizardData } from './wizard-data-normalization';
import { cloneWizardData, STEP_IDS } from './wizard-defaults';
import { hasWizardStepData } from './wizard-step-data';
import type {
  AdjustmentResultView,
  ExamParticipant,
  ExamTask,
  GradeThreshold,
  StepId,
  WizardData,
  WizardSessionSnapshot,
  WizardState
} from './wizard.models';

export const WIZARD_SESSION_FORMAT = 'klausur-justierer-session';
export const WIZARD_SESSION_VERSION = 1;

export type StoredWizardSession = {
  name: string;
  savedAt: string;
  data: WizardData;
  touchedStepIds: StepId[];
  currentStepId: StepId;
};

export type WizardSessionExport = {
  format: typeof WIZARD_SESSION_FORMAT;
  version: typeof WIZARD_SESSION_VERSION;
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

function isStepId(value: unknown): value is StepId {
  return typeof value === 'string' && STEP_IDS.includes(value as StepId);
}

function isAdjustmentResultView(value: unknown): value is AdjustmentResultView {
  return value === 'chart' || value === 'table';
}

function readBasisData(value: unknown): WizardData['basis'] | null {
  if (!isRecord(value) || typeof value.topic !== 'string' || typeof value.course !== 'string') {
    return null;
  }

  return {
    topic: value.topic,
    course: value.course
  };
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

  const thresholds: GradeThreshold[] = [];

  for (const threshold of value) {
    if (
      !isRecord(threshold) ||
      typeof threshold.grade !== 'string' ||
      !isNumberOrNull(threshold.minPercent) ||
      typeof threshold.failed !== 'boolean'
    ) {
      return null;
    }

    thresholds.push({
      grade: threshold.grade,
      minPercent: threshold.minPercent,
      failed: threshold.failed
    });
  }

  return thresholds;
}

function readNotenschemaData(value: unknown): WizardData['notenschema'] | null {
  if (!isRecord(value)) {
    return null;
  }

  const gradeThresholds = readGradeThresholds(value.gradeThresholds);

  if (!gradeThresholds) {
    return null;
  }

  return {
    gradeThresholds
  };
}

function readParticipantPoints(value: unknown): (number | null)[] | null {
  if (!Array.isArray(value) || !value.every(isNumberOrNull)) {
    return null;
  }

  return value;
}

function readParticipants(value: unknown): ExamParticipant[] | null {
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
      pointsByTask
    });
  }

  return participants;
}

function readTeilnehmerData(value: unknown): WizardData['teilnehmer'] | null {
  if (!isRecord(value)) {
    return null;
  }

  const participants = readParticipants(value.participants);

  if (!participants) {
    return null;
  }

  return {
    participants
  };
}

function readDroppedTaskIndexes(value: unknown): number[] | null {
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

function readAdjustedMaxPointsByTask(value: unknown, tasks: ExamTask[]): (number | null)[] | null {
  if (!Array.isArray(value) || !value.every(isNumberOrNull)) {
    return null;
  }

  return tasks.map((task, index) => (value[index] === undefined ? task.maxPoints : value[index]));
}

function readAdjustedGradeThresholds(
  value: unknown,
  gradeThresholds: GradeThreshold[]
): GradeThreshold[] | null {
  const adjustedGradeThresholds = readGradeThresholds(value);

  if (!adjustedGradeThresholds) {
    return null;
  }

  return gradeThresholds.map((threshold, index) => ({
    grade: threshold.grade,
    minPercent: adjustedGradeThresholds[index]?.minPercent ?? threshold.minPercent,
    failed: threshold.failed
  }));
}

function readJustierungData(
  value: unknown,
  gradeThresholds: GradeThreshold[],
  tasks: ExamTask[]
): WizardData['justierung'] | null {
  if (!isRecord(value)) {
    return null;
  }

  const resultView = isAdjustmentResultView(value.resultView) ? value.resultView : null;
  const droppedTaskIndexes = readDroppedTaskIndexes(value.droppedTaskIndexes);
  const adjustedMaxPointsByTask = readAdjustedMaxPointsByTask(value.adjustedMaxPointsByTask, tasks);
  const adjustedGradeThresholds = readAdjustedGradeThresholds(value.gradeThresholds, gradeThresholds);

  if (!resultView || !droppedTaskIndexes || !adjustedMaxPointsByTask || !adjustedGradeThresholds) {
    return null;
  }

  return {
    resultView,
    droppedTaskIndexes,
    adjustedMaxPointsByTask,
    gradeThresholds: adjustedGradeThresholds
  };
}

function readWizardData(value: unknown): WizardData | null {
  if (!isRecord(value)) {
    return null;
  }

  const basis = readBasisData(value.basis);
  const aufgaben = readAufgabenData(value.aufgaben);
  const notenschema = readNotenschemaData(value.notenschema);
  const teilnehmer = readTeilnehmerData(value.teilnehmer);

  if (!basis || !aufgaben || !notenschema || !teilnehmer) {
    return null;
  }

  const justierung = readJustierungData(value.justierung, notenschema.gradeThresholds, aufgaben.tasks);

  if (!justierung) {
    return null;
  }

  return normalizeWizardData({
    basis,
    aufgaben,
    notenschema,
    teilnehmer,
    justierung
  });
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

export function cloneWizardSessionSnapshot(snapshot: WizardSessionSnapshot): WizardSessionSnapshot {
  return {
    data: cloneWizardData(snapshot.data),
    touchedStepIds: [...snapshot.touchedStepIds],
    currentStepId: snapshot.currentStepId
  };
}

export function createWizardSessionSnapshot(state: WizardState): WizardSessionSnapshot {
  return {
    data: cloneWizardData(state.data),
    touchedStepIds: state.steps
      .filter((step) => step.touched && hasWizardStepData(step.id, state.data))
      .map((step) => step.id),
    currentStepId: state.steps[state.currentStepIndex]?.id ?? 'basis'
  };
}

export function createWizardSessionExport(state: WizardState): WizardSessionExport {
  const snapshot = createWizardSessionSnapshot(state);

  return {
    format: WIZARD_SESSION_FORMAT,
    version: WIZARD_SESSION_VERSION,
    exportedAt: new Date().toISOString(),
    data: cloneWizardData(snapshot.data),
    touchedStepIds: [...snapshot.touchedStepIds],
    currentStepId: snapshot.currentStepId
  };
}

export function parseWizardSessionJson(content: string): WizardSessionSnapshot {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Die Datei enthält kein gültiges JSON.');
  }

  if (
    !isRecord(parsed) ||
    parsed.format !== WIZARD_SESSION_FORMAT ||
    parsed.version !== WIZARD_SESSION_VERSION
  ) {
    throw new Error('Die Datei enthält keine gültige Klausur-Justierer-Session.');
  }

  const data = readWizardData(parsed.data);

  if (!data) {
    throw new Error('Die Datei enthält keine gültige Klausur-Justierer-Session.');
  }

  return cloneWizardSessionSnapshot({
    data,
    touchedStepIds: readTouchedStepIds(parsed.touchedStepIds, data),
    currentStepId: readCurrentStepId(parsed.currentStepId)
  });
}

export function normalizeStoredWizardSession(value: unknown): StoredWizardSession | null {
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
