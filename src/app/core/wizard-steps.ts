import type { FieldErrors, StepId, WizardStep, WizardValidationState } from './wizard.models';
import {
  validateAufgaben,
  validateBasis,
  validateJustierung,
  validateNotenschema,
  validateTeilnehmer
} from './wizard-validation';

export function createWizardSteps(): WizardStep[] {
  return [
    {
      id: 'basis',
      title: 'Basisdaten',
      validate: validateBasis,
      touched: false,
      validation: { valid: true, errors: {} }
    },
    {
      id: 'aufgaben',
      title: 'Aufgaben',
      validate: validateAufgaben,
      touched: false,
      validation: { valid: true, errors: {} }
    },
    {
      id: 'notenschema',
      title: 'Notenschema',
      validate: validateNotenschema,
      touched: false,
      validation: { valid: true, errors: {} }
    },
    {
      id: 'teilnehmer',
      title: 'Teilnehmer',
      validate: validateTeilnehmer,
      touched: false,
      validation: { valid: true, errors: {} }
    },
    {
      id: 'justierung',
      title: 'Justierung',
      validate: validateJustierung,
      touched: false,
      validation: { valid: true, errors: {} }
    }
  ];
}

export function createInitialWizardValidation(): WizardValidationState {
  return {
    valid: true,
    errorsByStep: {
      basis: {},
      aufgaben: {},
      notenschema: {},
      teilnehmer: {},
      justierung: {}
    }
  };
}

export function buildWizardValidation(steps: WizardStep[]): WizardValidationState {
  const errorsByStep = steps.reduce((accumulator, step) => {
    accumulator[step.id] = step.validation.errors;

    return accumulator;
  }, {} as Record<StepId, FieldErrors>);

  return {
    valid: steps.every((step) => step.validation.valid),
    errorsByStep
  };
}
