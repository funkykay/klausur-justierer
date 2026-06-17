import { createDefaultParticipant } from './wizard-defaults';
import type { ExamTask, GradeThreshold, WizardData } from './wizard.models';

function normalizeDroppedTaskIndexes(droppedTaskIndexes: number[], taskCount: number): number[] {
  return Array.from(new Set(droppedTaskIndexes))
    .filter((index) => Number.isInteger(index) && index >= 0 && index < taskCount)
    .sort((left, right) => left - right);
}

function normalizeAdjustedMaxPointsByTask(
  tasks: ExamTask[],
  adjustedMaxPointsByTask: (number | null)[]
): (number | null)[] {
  return tasks.map((task, index) => adjustedMaxPointsByTask[index] ?? task.maxPoints);
}

function normalizeAdjustedGradeThresholds(
  gradeThresholds: GradeThreshold[],
  adjustedGradeThresholds: GradeThreshold[]
): GradeThreshold[] {
  return gradeThresholds.map((threshold, index) => {
    const adjustedThreshold = adjustedGradeThresholds[index];

    return {
      grade: threshold.grade,
      minPercent: adjustedThreshold ? adjustedThreshold.minPercent : threshold.minPercent,
      failed: threshold.failed
    };
  });
}

export function normalizeWizardData(data: WizardData): WizardData {
  const taskCount = data.aufgaben.tasks.length;
  const participants =
    data.teilnehmer.participants.length > 0
      ? data.teilnehmer.participants
      : [createDefaultParticipant(0, taskCount)];

  return {
    ...data,
    teilnehmer: {
      participants: participants.map((participant) => ({
        ...participant,
        pointsByTask: Array.from({ length: taskCount }, (_, index) => participant.pointsByTask[index] ?? 0)
      }))
    },
    justierung: {
      ...data.justierung,
      droppedTaskIndexes: normalizeDroppedTaskIndexes(data.justierung.droppedTaskIndexes, taskCount),
      adjustedMaxPointsByTask: normalizeAdjustedMaxPointsByTask(
        data.aufgaben.tasks,
        data.justierung.adjustedMaxPointsByTask
      ),
      gradeThresholds: normalizeAdjustedGradeThresholds(
        data.notenschema.gradeThresholds,
        data.justierung.gradeThresholds
      )
    }
  };
}
