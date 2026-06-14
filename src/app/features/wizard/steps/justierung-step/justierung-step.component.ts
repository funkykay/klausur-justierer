import { Component, ElementRef, OnDestroy, ViewChild, effect, inject } from '@angular/core';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  Tooltip,
  type ChartOptions
} from 'chart.js';
import { ThemeService } from '../../../../core/theme.service';
import type {
  AdjustmentLayout,
  AdjustmentResultView,
  ExamParticipant,
  FieldErrors,
  GradeThreshold,
  StepId,
  WizardData
} from '../../../../core/wizard.models';
import { WizardService } from '../../../../core/wizard.service';
import { FieldErrorComponent } from '../../../../shared/field-error/field-error.component';

type AdjustmentTrend = 'better' | 'worse' | 'same';

type ParticipantReviewRow = {
  name: string;
  rawPoints: number;
  rawPercent: number;
  rawGrade: string;
  adjustedPoints: number;
  adjustedPercent: number;
  adjustedGrade: string;
  trend: AdjustmentTrend;
};

type GradeDistributionRow = {
  grade: string;
  raw: number;
  adjusted: number;
};

type PrerequisiteIssue = {
  stepId: StepId;
  title: string;
  messages: string[];
};

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Legend, Tooltip);

@Component({
  selector: 'app-justierung-step',
  standalone: true,
  imports: [FieldErrorComponent],
  templateUrl: './justierung-step.component.html'
})
export class JustierungStepComponent implements OnDestroy {
  @ViewChild('gradeChart')
  set gradeChart(element: ElementRef<HTMLCanvasElement> | undefined) {
    this.chartCanvas = element;

    if (element) {
      this.createChart();
      return;
    }

    this.destroyChart();
  }

  protected readonly wizard = inject(WizardService);
  protected readonly state = this.wizard.state;
  private readonly theme = inject(ThemeService);
  private chartCanvas: ElementRef<HTMLCanvasElement> | undefined;
  private chart: Chart<'bar', number[], string> | null = null;
  private readonly numberFormatter = new Intl.NumberFormat('de-DE', {
    maximumFractionDigits: 2
  });
  private readonly percentFormatter = new Intl.NumberFormat('de-DE', {
    maximumFractionDigits: 1
  });

  private readonly chartEffect = effect(() => {
    const state = this.state();

    this.theme.theme();
    JSON.stringify({
      tasks: state.data.aufgaben.tasks,
      participants: state.data.teilnehmer.participants,
      gradeThresholds: state.data.notenschema.gradeThresholds,
      justierung: state.data.justierung
    });

    if (this.chart) {
      this.updateChart();
    }
  });

  protected get data(): WizardData['justierung'] {
    return this.state().data.justierung;
  }

  protected get tasks(): WizardData['aufgaben']['tasks'] {
    return this.state().data.aufgaben.tasks;
  }

  protected get gradeThresholds(): WizardData['notenschema']['gradeThresholds'] {
    return this.state().data.notenschema.gradeThresholds;
  }

  protected get adjustedGradeThresholds(): WizardData['justierung']['gradeThresholds'] {
    return this.data.gradeThresholds;
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

  protected get layoutClass(): string {
    return this.data.layout === 'sideBySide'
      ? 'grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]'
      : 'space-y-6';
  }

  protected get resultTitle(): string {
    return this.data.resultView === 'chart' ? 'Notenverteilung' : 'Teilnehmervergleich';
  }

  protected get rawTotalPoints(): number {
    return this.tasks.reduce((sum, task) => sum + (task.maxPoints ?? 0), 0);
  }

  protected get adjustedTotalPoints(): number {
    return this.tasks.reduce(
      (sum, task, index) => (this.data.droppedTaskIndexes.includes(index) ? sum : sum + (task.maxPoints ?? 0)),
      0
    );
  }

  protected get changedThresholdCount(): number {
    return this.gradeThresholds.filter((threshold, index) => {
      const adjustedThreshold = this.adjustedGradeThresholds[index];

      return adjustedThreshold !== undefined && adjustedThreshold.minPercent !== threshold.minPercent;
    }).length;
  }

  protected get adjustmentSummary(): string {
    const adjustments: string[] = [];

    if (this.data.droppedTaskIndexes.length > 0) {
      adjustments.push(`${this.data.droppedTaskIndexes.length} Aufgabe(n) gestrichen`);
    }

    if (this.changedThresholdCount > 0) {
      adjustments.push(`${this.changedThresholdCount} Schwelle(n) angepasst`);
    }

    return adjustments.length > 0
      ? adjustments.join(' · ')
      : 'Noch keine rechnerische Justierung aktiv.';
  }

  protected get gradeDistributionRows(): GradeDistributionRow[] {
    const rows = new Map<string, GradeDistributionRow>();

    this.gradeLabels.forEach((grade) => {
      rows.set(grade, {
        grade,
        raw: 0,
        adjusted: 0
      });
    });

    this.reviewRows.forEach((row) => {
      if (!rows.has(row.rawGrade)) {
        rows.set(row.rawGrade, {
          grade: row.rawGrade,
          raw: 0,
          adjusted: 0
        });
      }

      if (!rows.has(row.adjustedGrade)) {
        rows.set(row.adjustedGrade, {
          grade: row.adjustedGrade,
          raw: 0,
          adjusted: 0
        });
      }

      rows.get(row.rawGrade)!.raw += 1;
      rows.get(row.adjustedGrade)!.adjusted += 1;
    });

    return [...rows.values()];
  }

  protected get reviewRows(): ParticipantReviewRow[] {
    return this.participants.map((participant, index) => {
      const rawPoints = this.calculateRawPoints(participant);
      const rawPercent = this.calculatePercent(rawPoints, this.rawTotalPoints);
      const rawGrade = this.gradeForPercent(rawPercent, this.gradeThresholds);
      const adjustedPoints = this.calculateAdjustedPoints(participant);
      const adjustedPercent = this.calculatePercent(adjustedPoints, this.adjustedTotalPoints);
      const adjustedGrade = this.gradeForPercent(adjustedPercent, this.adjustedGradeThresholds);

      return {
        name: this.displayText(participant.name) === '—' ? `Teilnehmer ${index + 1}` : this.displayText(participant.name),
        rawPoints,
        rawPercent,
        rawGrade,
        adjustedPoints,
        adjustedPercent,
        adjustedGrade,
        trend: this.trendForGrades(rawGrade, adjustedGrade)
      };
    });
  }

  private get gradeLabels(): string[] {
    const labels = this.gradeThresholds.map((threshold) => this.displayText(threshold.grade));

    return labels.filter((label, index) => labels.indexOf(label) === index);
  }

  ngOnDestroy(): void {
    this.chartEffect.destroy();
    this.destroyChart();
  }

  optionButtonClass(active: boolean): string {
    return active
      ? 'rounded-md bg-slate-950 px-3 py-1.5 text-sm font-medium text-white shadow-sm dark:bg-slate-100 dark:text-slate-950'
      : 'rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-100';
  }

  textValue(event: Event): string {
    return (event.currentTarget as HTMLInputElement | HTMLTextAreaElement).value;
  }

  numberValue(event: Event): number | null {
    const value = (event.currentTarget as HTMLInputElement).value;

    return value === '' ? null : Number(value);
  }

  checkboxValue(event: Event): boolean {
    return (event.currentTarget as HTMLInputElement).checked;
  }

  setLayout(layout: AdjustmentLayout): void {
    this.updateJustierung('layout', layout);
  }

  setResultView(resultView: AdjustmentResultView): void {
    this.updateJustierung('resultView', resultView);
  }

  toggleDroppedTask(index: number, dropped: boolean): void {
    this.wizard.updateData((current) => {
      const droppedTaskIndexes = new Set(current.justierung.droppedTaskIndexes);

      if (dropped) {
        droppedTaskIndexes.add(index);
      } else {
        droppedTaskIndexes.delete(index);
      }

      return {
        ...current,
        justierung: {
          ...current.justierung,
          droppedTaskIndexes: [...droppedTaskIndexes].sort((left, right) => left - right)
        }
      };
    });
    this.wizard.markCurrentTouched();
  }

  updateAdjustedThreshold(index: number, minPercent: number | null): void {
    this.wizard.updateData((current) => ({
      ...current,
      justierung: {
        ...current.justierung,
        gradeThresholds: current.justierung.gradeThresholds.map((threshold, thresholdIndex) =>
          thresholdIndex === index
            ? {
                ...threshold,
                minPercent
              }
            : threshold
        )
      }
    }));
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

  trendClass(trend: AdjustmentTrend): string {
    if (trend === 'better') {
      return 'inline-flex items-center justify-end gap-1 font-semibold text-emerald-700 dark:text-emerald-300';
    }

    if (trend === 'worse') {
      return 'inline-flex items-center justify-end gap-1 font-semibold text-red-700 dark:text-red-300';
    }

    return 'inline-flex items-center justify-end gap-1 font-medium text-slate-500 dark:text-slate-400';
  }

  trendSymbol(trend: AdjustmentTrend): string {
    if (trend === 'better') {
      return '↗';
    }

    if (trend === 'worse') {
      return '↘';
    }

    return '→';
  }

  trendLabel(trend: AdjustmentTrend): string {
    if (trend === 'better') {
      return 'verbessert';
    }

    if (trend === 'worse') {
      return 'verschlechtert';
    }

    return 'gleich';
  }

  private createChart(): void {
    if (!this.chartCanvas) {
      return;
    }

    this.destroyChart();
    this.chart = new Chart(this.chartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Roh',
            data: [],
            backgroundColor: 'rgba(71, 85, 105, 0.72)',
            borderColor: 'rgb(51, 65, 85)',
            borderWidth: 1
          },
          {
            label: 'Justiert',
            data: [],
            backgroundColor: 'rgba(124, 58, 237, 0.72)',
            borderColor: 'rgb(109, 40, 217)',
            borderWidth: 1
          }
        ]
      },
      options: this.createChartOptions()
    });
    this.updateChart();
  }

  private updateChart(): void {
    if (!this.chart) {
      return;
    }

    const rows = this.gradeDistributionRows;

    this.chart.data.labels = rows.map((row) => row.grade);
    this.chart.data.datasets[0].data = rows.map((row) => row.raw);
    this.chart.data.datasets[1].data = rows.map((row) => row.adjusted);
    this.chart.options = this.createChartOptions();
    this.chart.update();
  }

  private destroyChart(): void {
    this.chart?.destroy();
    this.chart = null;
  }

  private createChartOptions(): ChartOptions<'bar'> {
    const textColor = this.theme.isDark() ? '#e2e8f0' : '#334155';
    const gridColor = this.theme.isDark() ? '#334155' : '#e2e8f0';

    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            color: textColor
          },
          grid: {
            color: gridColor
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: textColor,
            precision: 0
          },
          grid: {
            color: gridColor
          }
        }
      },
      plugins: {
        legend: {
          labels: {
            color: textColor
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${context.parsed.y}`
          }
        }
      }
    };
  }

  private calculateRawPoints(participant: ExamParticipant): number {
    return this.tasks.reduce((sum, _, taskIndex) => sum + (participant.pointsByTask[taskIndex] ?? 0), 0);
  }

  private calculateAdjustedPoints(participant: ExamParticipant): number {
    return this.tasks.reduce((sum, _, taskIndex) => {
      if (this.data.droppedTaskIndexes.includes(taskIndex)) {
        return sum;
      }

      return sum + (participant.pointsByTask[taskIndex] ?? 0);
    }, 0);
  }

  private calculatePercent(points: number, totalPoints: number): number {
    if (totalPoints <= 0) {
      return 0;
    }

    return (points / totalPoints) * 100;
  }

  private gradeForPercent(percent: number, gradeThresholds: GradeThreshold[]): string {
    const threshold = gradeThresholds
      .filter((item) => item.minPercent !== null)
      .sort((left, right) => (right.minPercent ?? 0) - (left.minPercent ?? 0))
      .find((item) => percent >= (item.minPercent ?? 0));

    return threshold ? this.displayText(threshold.grade) : '—';
  }

  private trendForGrades(rawGrade: string, adjustedGrade: string): AdjustmentTrend {
    const rawRank = this.gradeLabels.indexOf(rawGrade);
    const adjustedRank = this.gradeLabels.indexOf(adjustedGrade);

    if (rawRank < 0 || adjustedRank < 0 || rawRank === adjustedRank) {
      return 'same';
    }

    return adjustedRank < rawRank ? 'better' : 'worse';
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
