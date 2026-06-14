import { Component, inject } from '@angular/core';
import type { ExamParticipant, FieldErrors, StepId, WizardData } from '../../../../core/wizard.models';
import { WizardService } from '../../../../core/wizard.service';
import { FieldErrorComponent } from '../../../../shared/field-error/field-error.component';

type ParticipantReviewRow = {
  name: string;
  pointsByTask: (number | null)[];
  rawPoints: number;
  adjustedPoints: number;
  percent: number;
  grade: string;
};

type PrerequisiteIssue = {
  stepId: StepId;
  title: string;
  messages: string[];
};

@Component({
  selector: 'app-justierung-step',
  standalone: true,
  imports: [FieldErrorComponent],
  templateUrl: './justierung-step.component.html'
})
export class JustierungStepComponent {
  protected readonly wizard = inject(WizardService);
  protected readonly state = this.wizard.state;
  private readonly numberFormatter = new Intl.NumberFormat('de-DE', {
    maximumFractionDigits: 2
  });
  private readonly percentFormatter = new Intl.NumberFormat('de-DE', {
    maximumFractionDigits: 1
  });

  protected get data(): WizardData['justierung'] {
    return this.state().data.justierung;
  }

  protected get basis(): WizardData['basis'] {
    return this.state().data.basis;
  }

  protected get tasks(): WizardData['aufgaben']['tasks'] {
    return this.state().data.aufgaben.tasks;
  }

  protected get gradeThresholds(): WizardData['notenschema']['gradeThresholds'] {
    return this.state().data.notenschema.gradeThresholds;
  }

  protected get participants(): WizardData['teilnehmer']['participants'] {
    return this.state().data.teilnehmer.participants;
  }

  protected get errors() {
    return this.state().validation.errorsByStep.justierung;
  }

  protected get showErrors(): boolean {
    return Boolean(this.state().steps.find((item) => item.id === 'justierung')?.touched);
  }

  protected get canAdjust(): boolean {
    return this.state().steps
      .filter((step) => step.id !== 'justierung')
      .every((step) => step.validation.valid);
  }

  protected get prerequisiteIssues(): PrerequisiteIssue[] {
    return this.state().steps
      .filter((step) => step.id !== 'justierung' && !step.validation.valid)
      .map((step) => {
        const messages = this.collectStepValidationMessages(step.id, step.validation.errors);

        return {
          stepId: step.id,
          title: step.title,
          messages: messages.length > 0 ? messages : ['Bitte Angaben prüfen.']
        };
      });
  }

  protected get totalPoints(): number {
    return this.tasks.reduce((sum, task) => sum + (task.maxPoints ?? 0), 0);
  }

  protected get bestRawPoints(): number {
    return this.participants.reduce((best, participant) => Math.max(best, this.calculateRawPoints(participant)), 0);
  }

  protected get linearFactor(): number {
    if (this.totalPoints <= 0 || this.bestRawPoints <= 0) {
      return 1;
    }

    return this.totalPoints / this.bestRawPoints;
  }

  protected get adjustmentLabel(): string {
    if (this.data.method === 'bonus') {
      return 'Bonus-Justierung';
    }

    if (this.data.method === 'linear') {
      return 'Lineare Justierung';
    }

    return 'Ohne Justierung';
  }

  protected get adjustmentDescription(): string {
    if (this.data.method === 'bonus') {
      const bonus = this.data.bonusPoints ?? 0;

      return bonus > 0
        ? `Auf alle Rohpunktzahlen werden ${this.formatNumber(bonus)} Bonuspunkte addiert; Ergebnisse werden auf die erreichbare Gesamtpunktzahl begrenzt.`
        : 'Für die Bonus-Justierung ist noch eine Bonuspunktzahl größer als 0 erforderlich.';
    }

    if (this.data.method === 'linear') {
      if (this.totalPoints <= 0) {
        return 'Für die lineare Justierung sind erreichbare Gesamtpunkte erforderlich.';
      }

      if (this.bestRawPoints <= 0) {
        return 'Für die lineare Justierung ist mindestens ein erreichter Punkt erforderlich.';
      }

      return `Die lineare Justierung skaliert alle Ergebnisse mit Faktor ${this.formatNumber(this.linearFactor)}, sodass die beste Rohpunktzahl ${this.formatNumber(this.bestRawPoints)} von ${this.formatNumber(this.totalPoints)} Punkten auf die volle Punktzahl angehoben wird.`;
    }

    return 'Die Bewertung verwendet die erfassten Rohpunktzahlen ohne rechnerische Justierung.';
  }

  protected get reviewRows(): ParticipantReviewRow[] {
    return this.participants.map((participant, index) => {
      const rawPoints = this.calculateRawPoints(participant);
      const adjustedPoints = this.calculateAdjustedPoints(rawPoints);
      const percent = this.calculatePercent(adjustedPoints);

      return {
        name: this.displayText(participant.name) === '—' ? `Teilnehmer ${index + 1}` : this.displayText(participant.name),
        pointsByTask: this.tasks.map((_, taskIndex) => participant.pointsByTask[taskIndex] ?? null),
        rawPoints,
        adjustedPoints,
        percent,
        grade: this.gradeForPercent(percent)
      };
    });
  }

  textValue(event: Event): string {
    return (event.currentTarget as HTMLInputElement | HTMLTextAreaElement).value;
  }

  numberValue(event: Event): number | null {
    const value = (event.currentTarget as HTMLInputElement).value;

    return value === '' ? null : Number(value);
  }

  updateJustierung<K extends keyof WizardData['justierung']>(
    key: K,
    value: WizardData['justierung'][K]
  ): void {
    this.wizard.updateData((current) => ({
      ...current,
      justierung: {
        ...current.justierung,
        [key]: value
      }
    }));
  }

  goToFirstInvalidPrerequisite(): void {
    const firstInvalidStepIndex = this.state().steps.findIndex(
      (step) => step.id !== 'justierung' && !step.validation.valid
    );

    if (firstInvalidStepIndex >= 0) {
      this.wizard.goTo(firstInvalidStepIndex);
    }
  }

  displayText(value: string): string {
    const normalized = value.trim();

    return normalized.length > 0 ? normalized : '—';
  }

  formatNumber(value: number): string {
    return this.numberFormatter.format(value);
  }

  formatPercent(value: number): string {
    return `${this.percentFormatter.format(value)} %`;
  }

  formatOptionalNumber(value: number | null): string {
    return value === null ? '—' : this.formatNumber(value);
  }

  formatOptionalPercent(value: number | null): string {
    return value === null ? '—' : this.formatPercent(value);
  }

  private calculateRawPoints(participant: ExamParticipant): number {
    return this.tasks.reduce((sum, _, taskIndex) => sum + (participant.pointsByTask[taskIndex] ?? 0), 0);
  }

  private calculateAdjustedPoints(rawPoints: number): number {
    if (this.totalPoints <= 0) {
      return rawPoints;
    }

    if (this.data.method === 'bonus') {
      return Math.min(rawPoints + Math.max(this.data.bonusPoints ?? 0, 0), this.totalPoints);
    }

    if (this.data.method === 'linear') {
      return Math.min(rawPoints * this.linearFactor, this.totalPoints);
    }

    return Math.min(rawPoints, this.totalPoints);
  }

  private calculatePercent(points: number): number {
    if (this.totalPoints <= 0) {
      return 0;
    }

    return (points / this.totalPoints) * 100;
  }

  private gradeForPercent(percent: number): string {
    const threshold = this.gradeThresholds
      .filter((item) => item.minPercent !== null)
      .sort((left, right) => (right.minPercent ?? 0) - (left.minPercent ?? 0))
      .find((item) => percent >= (item.minPercent ?? 0));

    return threshold ? this.displayText(threshold.grade) : '—';
  }

  private collectStepValidationMessages(stepId: StepId, fieldErrors: FieldErrors): string[] {
    return Object.entries(fieldErrors).flatMap(([field, messages]) =>
      messages.map((message) => `${this.formatStepErrorField(stepId, field)}: ${message}`)
    );
  }

  private formatStepErrorField(stepId: StepId, field: string): string {
    if (stepId === 'basis') {
      return this.formatBasisErrorField(field);
    }

    if (stepId === 'aufgaben') {
      return this.formatAufgabenErrorField(field);
    }

    if (stepId === 'notenschema') {
      return this.formatNotenschemaErrorField(field);
    }

    if (stepId === 'teilnehmer') {
      return this.formatTeilnehmerErrorField(field);
    }

    return field;
  }

  private formatBasisErrorField(field: string): string {
    if (field === 'course') {
      return 'Kurs';
    }

    if (field === 'topic') {
      return 'Thema';
    }

    return field;
  }

  private formatAufgabenErrorField(field: string): string {
    if (field === 'tasks') {
      return 'Aufgaben';
    }

    const match = /^tasks\.(\d+)\.(name|maxPoints)$/.exec(field);

    if (!match) {
      return field;
    }

    const taskIndex = Number(match[1]);
    const taskName = this.tasks[taskIndex]?.name.trim() || `Aufgabe ${taskIndex + 1}`;
    const fieldName = match[2] === 'name' ? 'Name' : 'Punkte';

    return `${taskName}, ${fieldName}`;
  }

  private formatNotenschemaErrorField(field: string): string {
    if (field === 'gradeThresholds') {
      return 'Notenschlüssel';
    }

    const match = /^gradeThresholds\.(\d+)\.(grade|minPercent)$/.exec(field);

    if (!match) {
      return field;
    }

    const thresholdIndex = Number(match[1]);
    const thresholdName = this.gradeThresholds[thresholdIndex]?.grade.trim() || `Note ${thresholdIndex + 1}`;
    const fieldName = match[2] === 'grade' ? 'Bezeichnung' : 'Ab Prozent';

    return `${thresholdName}, ${fieldName}`;
  }

  private formatTeilnehmerErrorField(field: string): string {
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
    const taskName = this.tasks[taskIndex]?.name.trim() || `Aufgabe ${taskIndex + 1}`;

    return `Zeile ${row}, ${taskName}`;
  }
}
