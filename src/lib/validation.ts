import type { FieldErrors, ValidationResult, WizardData } from './types';

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

function hasPositiveNumber(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
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

function validateJustierung(data: WizardData): ValidationResult {
  const errors: FieldErrors = {};
  const { justierung } = data;

  if (justierung.method === 'bonus' && !hasPositiveNumber(justierung.bonusPoints)) {
    addError(errors, 'bonusPoints', 'Bonus muss größer als 0 sein.');
  }

  if (justierung.method !== 'none' && isBlank(justierung.reason)) {
    addError(errors, 'reason', 'Begründung ist für eine Justierung erforderlich.');
  }

  if (isBlank(justierung.reviewer)) {
    addError(errors, 'reviewer', 'Prüfer ist erforderlich.');
  }

  return createValidationResult(errors);
}

export { validateAufgaben, validateBasis, validateJustierung, validateNotenschema };