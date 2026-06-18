import type { FieldErrors, StepId, WizardData, WizardState } from './wizard.models';

export type PrerequisiteIssue = {
  stepId: StepId;
  title: string;
  messages: string[];
};

export function createPrerequisiteIssues(state: WizardState): PrerequisiteIssue[] {
  return state.steps
    .filter((step) => step.id !== 'justierung' && !step.validation.valid)
    .map((step) => {
      const messages = collectWizardValidationMessages(step.id, step.validation.errors, state.data);

      return {
        stepId: step.id,
        title: step.title,
        messages: messages.length > 0 ? messages : ['Bitte Angaben prüfen.']
      };
    });
}

export function collectWizardValidationMessages(
  stepId: StepId,
  fieldErrors: FieldErrors,
  data: WizardData
): string[] {
  return Object.entries(fieldErrors).flatMap(([field, messages]) =>
    messages.map((message) => `${formatWizardErrorField(stepId, field, data)}: ${message}`)
  );
}

export function formatWizardErrorField(stepId: StepId, field: string, data: WizardData): string {
  if (stepId === 'basis') {
    return formatBasisErrorField(field);
  }

  if (stepId === 'aufgaben') {
    return formatAufgabenErrorField(field, data);
  }

  if (stepId === 'notenschema') {
    return formatNotenschemaErrorField(field, data);
  }

  if (stepId === 'teilnehmer') {
    return formatTeilnehmerErrorField(field, data);
  }

  return field;
}

function formatBasisErrorField(field: string): string {
  if (field === 'course') {
    return 'Kurs';
  }

  if (field === 'topic') {
    return 'Thema';
  }

  return field;
}

function formatAufgabenErrorField(field: string, data: WizardData): string {
  if (field === 'tasks') {
    return 'Aufgaben';
  }

  const match = /^tasks\.(\d+)\.(name|maxPoints)$/.exec(field);

  if (!match) {
    return field;
  }

  const taskIndex = Number(match[1]);
  const taskName = data.aufgaben.tasks[taskIndex]?.name.trim() || `Aufgabe ${taskIndex + 1}`;
  const fieldName = match[2] === 'name' ? 'Name' : 'Punkte';

  return `${taskName}, ${fieldName}`;
}

function formatNotenschemaErrorField(field: string, data: WizardData): string {
  if (field === 'gradeThresholds') {
    return 'Notenschlüssel';
  }

  const match = /^gradeThresholds\.(\d+)\.(grade|minPercent)$/.exec(field);

  if (!match) {
    return field;
  }

  const thresholdIndex = Number(match[1]);
  const thresholdName = data.notenschema.gradeThresholds[thresholdIndex]?.grade.trim() || `Note ${thresholdIndex + 1}`;
  const fieldName = match[2] === 'grade' ? 'Bezeichnung' : 'Ab Prozent';

  return `${thresholdName}, ${fieldName}`;
}

function formatTeilnehmerErrorField(field: string, data: WizardData): string {
  if (field === 'participants') {
    return 'Teilnehmer';
  }

  const nameMatch = /^participants\.(\d+)\.name$/.exec(field);

  if (nameMatch) {
    return `Zeile ${Number(nameMatch[1]) + 1}, Teilnehmer`;
  }

  const pointsMatch = /^participants\.(\d+)\.pointsByTask\.(\d+)$/.exec(field);

  if (!pointsMatch) {
    return field;
  }

  const row = Number(pointsMatch[1]) + 1;
  const taskIndex = Number(pointsMatch[2]);
  const taskName = data.aufgaben.tasks[taskIndex]?.name.trim() || `Aufgabe ${taskIndex + 1}`;

  return `Zeile ${row}, ${taskName}`;
}
