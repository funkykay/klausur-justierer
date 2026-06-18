import type { ExamParticipant, ExamTask, GradeThreshold, StepId, WizardData } from './wizard.models';

export const STEP_IDS: readonly StepId[] = ['basis', 'aufgaben', 'notenschema', 'teilnehmer', 'justierung'] as const;

export function cloneGradeThresholds(gradeThresholds: GradeThreshold[]): GradeThreshold[] {
  return gradeThresholds.map((threshold) => ({
    ...threshold
  }));
}

export function createDefaultTask(index: number): ExamTask {
  return {
    name: `Aufgabe ${index + 1}`,
    maxPoints: 0
  };
}

export function createDefaultParticipant(index: number, taskCount: number): ExamParticipant {
  return {
    name: `Teilnehmer ${index + 1}`,
    pointsByTask: Array.from({ length: taskCount }, () => 0)
  };
}

export function createDefaultAufgabenData(): WizardData['aufgaben'] {
  return {
    tasks: [createDefaultTask(0)]
  };
}

export function createDefaultTeilnehmerData(taskCount: number): WizardData['teilnehmer'] {
  return {
    participants: [createDefaultParticipant(0, taskCount)]
  };
}

export function createDefaultAdjustedMaxPointsByTask(tasks: ExamTask[]): (number | null)[] {
  return tasks.map((task) => task.maxPoints);
}

export function createDefaultJustierungData(
  gradeThresholds: GradeThreshold[],
  tasks: ExamTask[]
): WizardData['justierung'] {
  return {
    resultView: 'table',
    droppedTaskIndexes: [],
    adjustedMaxPointsByTask: createDefaultAdjustedMaxPointsByTask(tasks),
    gradeThresholds: cloneGradeThresholds(gradeThresholds)
  };
}

export function createInitialWizardData(): WizardData {
  const tasks = [createDefaultTask(0)];
  const gradeThresholds: GradeThreshold[] = [
    { grade: '1', minPercent: 92, failed: false },
    { grade: '2', minPercent: 81, failed: false },
    { grade: '3', minPercent: 67, failed: false },
    { grade: '4', minPercent: 50, failed: false },
    { grade: '5', minPercent: 30, failed: true },
    { grade: '6', minPercent: 0, failed: true }
  ];

  return {
    basis: {
      topic: '',
      course: ''
    },
    aufgaben: {
      tasks
    },
    notenschema: {
      gradeThresholds
    },
    teilnehmer: createDefaultTeilnehmerData(tasks.length),
    justierung: createDefaultJustierungData(gradeThresholds, tasks)
  };
}

export function cloneWizardData(data: WizardData): WizardData {
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
      adjustedMaxPointsByTask: [...data.justierung.adjustedMaxPointsByTask],
      gradeThresholds: cloneGradeThresholds(data.justierung.gradeThresholds)
    }
  };
}
