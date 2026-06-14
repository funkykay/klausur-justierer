import type { FieldErrors, ValidationResult, WizardData } from './wizard.models';

function createValidationResult(errors: FieldErrors): ValidationResult {
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

function addError(errors: FieldErrors, field: string, message: string): void {
  errors[field] = [...(errors[field] ?? []), message];
}

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

function hasNonNegativeNumber(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function hasPercentNumber(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}

function validateBasis(data: WizardData): ValidationResult {
  const errors: FieldErrors = {};
  const { basis } = data;

  if (isBlank(basis.topic)) {
    addError(errors, 'topic', 'Thema ist erforderlich.');
  }

  if (isBlank(basis.course)) {
    addError(errors, 'course', 'Kurs ist erforderlich.');
  }

  return createValidationResult(errors);
}

function validateAufgaben(data: WizardData): ValidationResult {
  const errors: FieldErrors = {};
  const { tasks } = data.aufgaben;

  if (tasks.length === 0) {
    addError(errors, 'tasks', 'Mindestens eine Aufgabe ist erforderlich.');
  }

  tasks.forEach((task, index) => {
    if (isBlank(task.name)) {
      addError(errors, `tasks.${index}.name`, 'Aufgabenname ist erforderlich.');
    }

    if (!hasNonNegativeNumber(task.maxPoints)) {
      addError(errors, `tasks.${index}.maxPoints`, 'Punkte müssen mindestens 0 sein.');
    }
  });

  return createValidationResult(errors);
}

function validateNotenschema(data: WizardData): ValidationResult {
  const errors: FieldErrors = {};
  const { gradeThresholds } = data.notenschema;

  if (gradeThresholds.length === 0) {
    addError(errors, 'gradeThresholds', 'Mindestens eine Note ist erforderlich.');
  }

  gradeThresholds.forEach((threshold, index) => {
    if (isBlank(threshold.grade)) {
      addError(errors, `gradeThresholds.${index}.grade`, 'Note ist erforderlich.');
    }

    if (!hasPercentNumber(threshold.minPercent)) {
      addError(errors, `gradeThresholds.${index}.minPercent`, 'Prozentwert muss zwischen 0 und 100 liegen.');
    }
  });

  for (let index = 1; index < gradeThresholds.length; index += 1) {
    const previous = gradeThresholds[index - 1];
    const current = gradeThresholds[index];

    if (
      hasPercentNumber(previous.minPercent) &&
      hasPercentNumber(current.minPercent) &&
      previous.minPercent <= current.minPercent
    ) {
      addError(
        errors,
        `gradeThresholds.${index}.minPercent`,
        `${current.grade || 'Diese Note'} muss unterhalb der vorherigen Schwelle liegen.`
      );
    }
  }

  return createValidationResult(errors);
}

function validateTeilnehmer(data: WizardData): ValidationResult {
  const errors: FieldErrors = {};
  const { participants } = data.teilnehmer;
  const { tasks } = data.aufgaben;

  if (participants.length === 0) {
    addError(errors, 'participants', 'Mindestens ein Teilnehmer ist erforderlich.');
  }

  participants.forEach((participant, participantIndex) => {
    if (isBlank(participant.name)) {
      addError(errors, `participants.${participantIndex}.name`, 'Name ist erforderlich.');
    }

    tasks.forEach((task, taskIndex) => {
      const points = participant.pointsByTask[taskIndex] ?? null;

      if (!hasNonNegativeNumber(points)) {
        addError(
          errors,
          `participants.${participantIndex}.pointsByTask.${taskIndex}`,
          'Punkte sind erforderlich und müssen mindestens 0 sein.'
        );
        return;
      }

      if (hasNonNegativeNumber(task.maxPoints) && points > task.maxPoints) {
        addError(
          errors,
          `participants.${participantIndex}.pointsByTask.${taskIndex}`,
          `Punkte dürfen höchstens ${task.maxPoints} sein.`
        );
      }
    });
  });

  return createValidationResult(errors);
}

function validateJustierung(data: WizardData): ValidationResult {
  const errors: FieldErrors = {};
  const { justierung } = data;

  if (data.aufgaben.tasks.length > 0 && justierung.droppedTaskIndexes.length >= data.aufgaben.tasks.length) {
    addError(errors, 'droppedTaskIndexes', 'Mindestens eine Aufgabe muss in der justierten Bewertung bleiben.');
  }

  justierung.adjustedMaxPointsByTask.forEach((maxPoints, index) => {
    if (!hasNonNegativeNumber(maxPoints)) {
      addError(errors, `adjustedMaxPointsByTask.${index}`, 'Justierte Punkte müssen mindestens 0 sein.');
    }
  });

  justierung.gradeThresholds.forEach((threshold, index) => {
    if (!hasPercentNumber(threshold.minPercent)) {
      addError(errors, `gradeThresholds.${index}.minPercent`, 'Prozentwert muss zwischen 0 und 100 liegen.');
    }
  });

  for (let index = 1; index < justierung.gradeThresholds.length; index += 1) {
    const previous = justierung.gradeThresholds[index - 1];
    const current = justierung.gradeThresholds[index];

    if (
      hasPercentNumber(previous.minPercent) &&
      hasPercentNumber(current.minPercent) &&
      previous.minPercent <= current.minPercent
    ) {
      const grade = data.notenschema.gradeThresholds[index]?.grade || 'Diese Note';

      addError(
        errors,
        `gradeThresholds.${index}.minPercent`,
        `${grade} muss unterhalb der vorherigen justierten Schwelle liegen.`
      );
    }
  }

  return createValidationResult(errors);
}

export { validateAufgaben, validateBasis, validateJustierung, validateNotenschema, validateTeilnehmer };
