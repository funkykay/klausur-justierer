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

type GradeAssessment = {
  grade: string;
  failed: boolean;
  rank: number;
};

type GradeDescriptor = {
  grade: string;
  failed: boolean;
  rank: number;
};

type ParticipantReviewRow = {
  name: string;
  rawPoints: number;
  rawPercent: number;
  rawGrade: string;
  rawFailed: boolean;
  adjustedPoints: number;
  adjustedPercent: number;
  adjustedGrade: string;
  adjustedFailed: boolean;
  adjustedRank: number;
  trend: AdjustmentTrend;
};

type GradeReviewGroup = {
  key: string;
  grade: string;
  failed: boolean;
  rank: number;
  averageAdjustedPercent: number;
  rows: ParticipantReviewRow[];
};

type GradeDistributionRow = {
  grade: string;
  failed: boolean;
  raw: number;
  adjusted: number;
};

type FailureComparison = {
  participantCount: number;
  rawCount: number;
  rawPercent: number;
  adjustedCount: number;
  adjustedPercent: number;
  deltaCount: number;
  deltaPercentPoints: number;
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
  private readonly collator = new Intl.Collator('de-DE', {
    numeric: true,
    sensitivity: 'base'
  });
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

  protected get actionLayoutClass(): string {
    return this.data.layout === 'sideBySide'
      ? 'grid gap-6 xl:grid-cols-[minmax(18rem,1fr)_minmax(16rem,0.75fr)] xl:items-start'
      : 'space-y-6';
  }

  protected get resultTitle(): string {
    return 'Justiert';
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

  protected get failureComparison(): FailureComparison {
    const rows = this.reviewRows;
    const participantCount = rows.length;
    const rawCount = rows.filter((row) => row.rawFailed).length;
    const adjustedCount = rows.filter((row) => row.adjustedFailed).length;
    const rawPercent = this.calculatePercent(rawCount, participantCount);
    const adjustedPercent = this.calculatePercent(adjustedCount, participantCount);

    return {
      participantCount,
      rawCount,
      rawPercent,
      adjustedCount,
      adjustedPercent,
      deltaCount: adjustedCount - rawCount,
      deltaPercentPoints: adjustedPercent - rawPercent
    };
  }

  protected get gradeDistributionRows(): GradeDistributionRow[] {
    const rows = new Map<string, GradeDistributionRow>();

    this.gradeDescriptors.forEach((descriptor) => {
      rows.set(descriptor.grade, {
        grade: descriptor.grade,
        failed: descriptor.failed,
        raw: 0,
        adjusted: 0
      });
    });

    this.reviewRows.forEach((row) => {
      if (!rows.has(row.rawGrade)) {
        rows.set(row.rawGrade, {
          grade: row.rawGrade,
          failed: row.rawFailed,
          raw: 0,
          adjusted: 0
        });
      }

      if (!rows.has(row.adjustedGrade)) {
        rows.set(row.adjustedGrade, {
          grade: row.adjustedGrade,
          failed: row.adjustedFailed,
          raw: 0,
          adjusted: 0
        });
      }

      rows.get(row.rawGrade)!.raw += 1;
      rows.get(row.adjustedGrade)!.adjusted += 1;
    });

    return [...rows.values()];
  }

  protected get groupedReviewRows(): GradeReviewGroup[] {
    const groups = new Map<string, Omit<GradeReviewGroup, 'averageAdjustedPercent'>>();

    this.reviewRows.forEach((row) => {
      const key = `${row.adjustedRank}:${row.adjustedGrade}:${row.adjustedFailed}`;

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          grade: row.adjustedGrade,
          failed: row.adjustedFailed,
          rank: row.adjustedRank,
          rows: []
        });
      }

      groups.get(key)!.rows.push(row);
    });

    return [...groups.values()]
      .map((group) => {
        const rows = [...group.rows].sort((left, right) => this.compareReviewRows(left, right));

        return {
          ...group,
          rows,
          averageAdjustedPercent: this.calculateAverageAdjustedPercent(rows)
        };
      })
      .sort((left, right) => {
        const rankComparison = this.compareRanks(left.rank, right.rank);

        return rankComparison !== 0 ? rankComparison : this.collator.compare(left.grade, right.grade);
      });
  }

  protected get reviewRows(): ParticipantReviewRow[] {
    return this.participants.map((participant, index) => {
      const rawPoints = this.calculateRawPoints(participant);
      const rawPercent = this.calculatePercent(rawPoints, this.rawTotalPoints);
      const rawAssessment = this.assessGradeForPercent(rawPercent, this.gradeThresholds);
      const adjustedPoints = this.calculateAdjustedPoints(participant);
      const adjustedPercent = this.calculatePercent(adjustedPoints, this.adjustedTotalPoints);
      const adjustedAssessment = this.assessGradeForPercent(adjustedPercent, this.adjustedGradeThresholds);

      return {
        name: this.displayText(participant.name) === '—' ? `Teilnehmer ${index + 1}` : this.displayText(participant.name),
        rawPoints,
        rawPercent,
        rawGrade: rawAssessment.grade,
        rawFailed: rawAssessment.failed,
        adjustedPoints,
        adjustedPercent,
        adjustedGrade: adjustedAssessment.grade,
        adjustedFailed: adjustedAssessment.failed,
        adjustedRank: adjustedAssessment.rank,
        trend: this.trendForAssessments(rawAssessment, adjustedAssessment)
      };
    });
  }

  private get gradeDescriptors(): GradeDescriptor[] {
    const descriptors: GradeDescriptor[] = [];

    this.gradeThresholds.forEach((threshold) => {
      const grade = this.displayText(threshold.grade);

      if (descriptors.some((descriptor) => descriptor.grade === grade)) {
        return;
      }

      descriptors.push({
        grade,
        failed: threshold.failed,
        rank: descriptors.length
      });
    });

    return descriptors;
  }

  private get gradeLabels(): string[] {
    return this.gradeDescriptors.map((descriptor) => descriptor.grade);
  }

  ngOnDestroy(): void {
    this.chartEffect.destroy();
    this.destroyChart();
  }

  optionButtonClass(active: boolean): string {
    return active
      ? 'inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-950 text-white shadow-sm dark:bg-slate-100 dark:text-slate-950'
      : 'inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-100';
  }

  resultViewButtonClass(active: boolean): string {
    return active
      ? 'inline-flex h-8 items-center justify-center rounded-md bg-slate-950 px-3 text-xs font-semibold text-white shadow-sm dark:bg-slate-100 dark:text-slate-950'
      : 'inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-semibold text-slate-600 transition hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-100';
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

  formatCountComparison(before: number, after: number): string {
    return `${before} → ${after}`;
  }

  formatNumberComparison(before: number, after: number): string {
    return `${this.formatNumber(before)} → ${this.formatNumber(after)}`;
  }

  formatPercentComparison(before: number, after: number): string {
    return `${this.formatPercent(before)} → ${this.formatPercent(after)}`;
  }

  formatSignedPercentPoints(value: number): string {
    const sign = value > 0 ? '+' : '';

    return `${sign}${this.percentFormatter.format(value)} %-Punkte`;
  }

  formatOptionalNumber(value: number | null): string {
    return value === null ? '—' : this.formatNumber(value);
  }

  formatOptionalPercent(value: number | null): string {
    return value === null ? '—' : this.formatPercent(value);
  }

  statusLabel(failed: boolean): string {
    return failed ? 'durchgefallen' : 'bestanden';
  }

  statusClass(failed: boolean): string {
    return failed
      ? 'inline-flex w-fit rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-200'
      : 'inline-flex w-fit rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200';
  }

  gradeGroupHeaderClass(failed: boolean): string {
    return failed
      ? 'border-t-2 border-red-200 bg-red-50/80 dark:border-red-900 dark:bg-red-950/50'
      : 'border-t-2 border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/40';
  }

  failureDeltaClass(): string {
    const delta = this.failureComparison.deltaCount;

    if (delta > 0) {
      return 'text-red-700 dark:text-red-300';
    }

    if (delta < 0) {
      return 'text-emerald-700 dark:text-emerald-300';
    }

    return 'text-slate-950 dark:text-slate-100';
  }

  failureDeltaLabel(): string {
    const delta = this.failureComparison.deltaCount;

    if (delta > 0) {
      return `${delta} mehr durchgefallen`;
    }

    if (delta < 0) {
      return `${Math.abs(delta)} weniger durchgefallen`;
    }

    return 'Anzahl unverändert';
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

  distributionComparisonClass(row: GradeDistributionRow): string {
    if (row.adjusted === row.raw) {
      return 'font-medium text-slate-500 dark:text-slate-400';
    }

    const improves = row.failed ? row.adjusted < row.raw : row.adjusted > row.raw;

    return improves
      ? 'font-semibold text-emerald-700 dark:text-emerald-300'
      : 'font-semibold text-red-700 dark:text-red-300';
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
            label: 'Vorher',
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

  private calculateAverageAdjustedPercent(rows: ParticipantReviewRow[]): number {
    if (rows.length === 0) {
      return 0;
    }

    return rows.reduce((sum, row) => sum + row.adjustedPercent, 0) / rows.length;
  }

  private assessGradeForPercent(percent: number, gradeThresholds: GradeThreshold[]): GradeAssessment {
    const threshold = gradeThresholds
      .filter((item) => item.minPercent !== null)
      .sort((left, right) => (right.minPercent ?? 0) - (left.minPercent ?? 0))
      .find((item) => percent >= (item.minPercent ?? 0));

    if (!threshold) {
      return {
        grade: '—',
        failed: false,
        rank: Number.POSITIVE_INFINITY
      };
    }

    const grade = this.displayText(threshold.grade);
    const rank = this.gradeLabels.indexOf(grade);

    return {
      grade,
      failed: threshold.failed,
      rank: rank >= 0 ? rank : Number.POSITIVE_INFINITY
    };
  }

  private trendForAssessments(rawAssessment: GradeAssessment, adjustedAssessment: GradeAssessment): AdjustmentTrend {
    if (rawAssessment.failed !== adjustedAssessment.failed) {
      return adjustedAssessment.failed ? 'worse' : 'better';
    }

    if (
      !Number.isFinite(rawAssessment.rank) ||
      !Number.isFinite(adjustedAssessment.rank) ||
      rawAssessment.rank === adjustedAssessment.rank
    ) {
      return 'same';
    }

    return adjustedAssessment.rank < rawAssessment.rank ? 'better' : 'worse';
  }

  private compareRanks(left: number, right: number): number {
    if (Number.isFinite(left) && Number.isFinite(right)) {
      return left - right;
    }

    if (Number.isFinite(left)) {
      return -1;
    }

    if (Number.isFinite(right)) {
      return 1;
    }

    return 0;
  }

  private compareReviewRows(left: ParticipantReviewRow, right: ParticipantReviewRow): number {
    const rankComparison = this.compareRanks(left.adjustedRank, right.adjustedRank);

    if (rankComparison !== 0) {
      return rankComparison;
    }

    const adjustedPercentComparison = right.adjustedPercent - left.adjustedPercent;

    if (adjustedPercentComparison !== 0) {
      return adjustedPercentComparison;
    }

    const rawPercentComparison = right.rawPercent - left.rawPercent;

    if (rawPercentComparison !== 0) {
      return rawPercentComparison;
    }

    return this.collator.compare(left.name, right.name);
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
