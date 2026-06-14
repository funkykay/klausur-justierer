import type { Type } from '@angular/core';

export type StepId = 'basis' | 'aufgaben' | 'notenschema' | 'teilnehmer' | 'justierung';

export type FieldErrors = Record<string, string[]>;

export type ValidationResult = {
  valid: boolean;
  errors: FieldErrors;
};

export type ExamTask = {
  name: string;
  maxPoints: number | null;
};

export type GradeThreshold = {
  grade: string;
  minPercent: number | null;
  failed: boolean;
};

export type ExamParticipant = {
  name: string;
  pointsByTask: (number | null)[];
};

export type AdjustmentResultView = 'chart' | 'table';

export type WizardData = {
  basis: {
    topic: string;
    course: string;
  };
  aufgaben: {
    tasks: ExamTask[];
  };
  notenschema: {
    gradeThresholds: GradeThreshold[];
  };
  teilnehmer: {
    participants: ExamParticipant[];
  };
  justierung: {
    resultView: AdjustmentResultView;
    droppedTaskIndexes: number[];
    gradeThresholds: GradeThreshold[];
  };
};

export type WizardSessionSnapshot = {
  data: WizardData;
  touchedStepIds: StepId[];
  currentStepId: StepId;
};

export type WizardStep = {
  id: StepId;
  title: string;
  view?: Type<unknown>;
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
};
