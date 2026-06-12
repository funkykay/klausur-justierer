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

function isInteger(value: number | null): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function validateBasis(data: WizardData): ValidationResult {
  const errors: FieldErrors = {};
  const { basis } = data;

  if (isBlank(basis.title)) {
    addError(errors, 'title', 'Titel ist erforderlich.');
  }

  if (isBlank(basis.course)) {
    addError(errors, 'course', 'Kurs ist erforderlich.');
  }

  if (isBlank(basis.examDate)) {
    addError(errors, 'examDate', 'Datum ist erforderlich.');
  }

  if (!hasPositiveNumber(basis.maxPoints)) {
    addError(errors, 'maxPoints', 'Maximalpunktzahl muss größer als 0 sein.');
  }

  if (!isInteger(basis.participantCount) || !hasPositiveNumber(basis.participantCount)) {
    addError(errors, 'participantCount', 'Teilnehmerzahl muss eine positive ganze Zahl sein.');
  }

  return createValidationResult(errors);
}

function validateNotenschema(data: WizardData): ValidationResult {
  const errors: FieldErrors = {};
  const { maxPoints } = data.basis;
  const { passingPoints, gradeThresholds } = data.notenschema;

  if (!hasPositiveNumber(passingPoints)) {
    addError(errors, 'passingPoints', 'Bestehensgrenze muss größer als 0 sein.');
  }

  if (hasPositiveNumber(maxPoints) && hasPositiveNumber(passingPoints) && passingPoints > maxPoints) {
    addError(errors, 'passingPoints', 'Bestehensgrenze darf nicht über der Maximalpunktzahl liegen.');
  }

  gradeThresholds.forEach((threshold, index) => {
    const field = `gradeThresholds.${index}.minPoints`;

    if (!hasNonNegativeNumber(threshold.minPoints)) {
      addError(errors, field, `Mindestpunktzahl für ${threshold.grade} ist erforderlich.`);
    }

    if (
      hasPositiveNumber(maxPoints) &&
      hasNonNegativeNumber(threshold.minPoints) &&
      threshold.minPoints > maxPoints
    ) {
      addError(errors, field, `Mindestpunktzahl für ${threshold.grade} liegt über der Maximalpunktzahl.`);
    }
  });

  for (let index = 1; index < gradeThresholds.length; index += 1) {
    const previous = gradeThresholds[index - 1];
    const current = gradeThresholds[index];

    if (
      hasNonNegativeNumber(previous.minPoints) &&
      hasNonNegativeNumber(current.minPoints) &&
      previous.minPoints <= current.minPoints
    ) {
      addError(
        errors,
        `gradeThresholds.${index}.minPoints`,
        `${current.grade} muss unterhalb der vorherigen Schwelle liegen.`
      );
    }
  }

  return createValidationResult(errors);
}

function validateJustierung(data: WizardData): ValidationResult {
  const errors: FieldErrors = {};
  const { justierung, basis } = data;

  if (justierung.method === 'bonus') {
    if (!hasPositiveNumber(justierung.bonusPoints)) {
      addError(errors, 'bonusPoints', 'Bonus muss größer als 0 sein.');
    }

    if (
      hasPositiveNumber(justierung.bonusPoints) &&
      hasPositiveNumber(basis.maxPoints) &&
      justierung.bonusPoints > basis.maxPoints * 0.2
    ) {
      addError(errors, 'bonusPoints', 'Bonus darf höchstens 20 % der Maximalpunktzahl betragen.');
    }
  }

  if (justierung.method !== 'none' && isBlank(justierung.reason)) {
    addError(errors, 'reason', 'Begründung ist für eine Justierung erforderlich.');
  }

  if (isBlank(justierung.reviewer)) {
    addError(errors, 'reviewer', 'Prüfer ist erforderlich.');
  }

  return createValidationResult(errors);
}

function validateAbschluss(data: WizardData): ValidationResult {
  const errors: FieldErrors = {};

  if (!data.abschluss.confirmed) {
    addError(errors, 'confirmed', 'Bestätigung ist erforderlich.');
  }

  return createValidationResult(errors);
}

export { validateAbschluss, validateBasis, validateJustierung, validateNotenschema };