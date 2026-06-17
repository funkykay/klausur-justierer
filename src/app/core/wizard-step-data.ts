import type { StepId, WizardData } from './wizard.models';

function hasAdjustedGradeThresholds(data: WizardData): boolean {
  return data.notenschema.gradeThresholds.some((threshold, index) => {
    const adjustedThreshold = data.justierung.gradeThresholds[index];

    return adjustedThreshold !== undefined && adjustedThreshold.minPercent !== threshold.minPercent;
  });
}

function hasAdjustedTaskMaxPoints(data: WizardData): boolean {
  return data.aufgaben.tasks.some((task, index) => data.justierung.adjustedMaxPointsByTask[index] !== task.maxPoints);
}

export function hasWizardStepData(stepId: StepId, data: WizardData): boolean {
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
    return data.justierung.droppedTaskIndexes.length > 0 || hasAdjustedTaskMaxPoints(data) || hasAdjustedGradeThresholds(data);
  }

  return false;
}
