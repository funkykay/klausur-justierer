import type { Component } from 'svelte';

export type StepId = 'basis' | 'notenschema' | 'justierung' | 'abschluss';

export type FieldErrors = Record<string, string[]>;

export type ValidationResult = {
  valid: boolean;
  errors: FieldErrors;
};

export type GradeThreshold = {
  grade: string;
  minPoints: number | null;
};

export type WizardData = {
  basis: {
    title: string;
    course: string;
    examDate: string;
    maxPoints: number | null;
    participantCount: number | null;
  };
  notenschema: {
    passingPoints: number | null;
    gradeThresholds: GradeThreshold[];
  };
  justierung: {
    method: 'none' | 'bonus' | 'linear';
    bonusPoints: number | null;
    capAtMaxPoints: boolean;
    reviewer: string;
    reason: string;
  };
  abschluss: {
    confirmed: boolean;
  };
};

export type WizardStep = {
  id: StepId;
  title: string;
  view: Component;
  validate: (data: WizardData) => ValidationResult;
  touched: boolean;
  validation: ValidationResult;
};

export type WizardValidationState = {
  valid: boolean;
  errorsByStep: Record<StepId, FieldErrors>;
};

export type WizardState = {
  title: string;
  data: WizardData;
  steps: WizardStep[];
  currentStepIndex: number;
  validation: WizardValidationState;
  submitted: boolean;
};