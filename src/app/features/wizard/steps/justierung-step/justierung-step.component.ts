import { Component, ElementRef, OnDestroy, ViewChild, computed, effect, inject } from '@angular/core';
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
import { createAdjustmentEvaluation, type AdjustmentTrend, type FailureComparison, type GradeDistributionRow, type StatusReviewGroup } from '../../../../core/wizard-evaluation';
import { createPrerequisiteIssues, type PrerequisiteIssue } from '../../../../core/wizard-error-labels';
import { ThemeService } from '../../../../core/theme.service';
import type { AdjustmentResultView, WizardData } from '../../../../core/wizard.models';
import { WizardService } from '../../../../core/wizard.service';
import { FieldErrorComponent } from '../../../../shared/field-error/field-error.component';

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
  protected readonly evaluation = computed(() => createAdjustmentEvaluation(this.state().data));
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
    this.theme.theme();
    JSON.stringify(this.evaluation().gradeDistributionRows);

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

  protected get adjustedMaxPointsByTask(): WizardData['justierung']['adjustedMaxPointsByTask'] {
    return this.data.adjustedMaxPointsByTask;
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
    return createPrerequisiteIssues(this.state());
  }

  protected get resultTitle(): string {
    return 'Justiert';
  }

  protected get adjustmentSummary(): string {
    return this.evaluation().adjustmentSummary;
  }

  protected get failureComparison(): FailureComparison {
    return this.evaluation().failureComparison;
  }

  protected get gradeDistributionRows(): GradeDistributionRow[] {
    return this.evaluation().gradeDistributionRows;
  }

  protected get groupedStatusReviewRows(): StatusReviewGroup[] {
    return this.evaluation().groupedStatusReviewRows;
  }

  ngOnDestroy(): void {
    this.chartEffect.destroy();
    this.destroyChart();
  }

  resultViewButtonClass(active: boolean): string {
    return active
      ? 'inline-flex h-8 items-center justify-center rounded-md bg-slate-950 px-3 text-xs font-semibold text-white shadow-sm dark:bg-slate-100 dark:text-slate-950'
      : 'inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-semibold text-slate-600 transition hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-100';
  }

  numberValue(event: Event): number | null {
    const value = (event.currentTarget as HTMLInputElement).value;

    return value === '' ? null : Number(value);
  }

  checkboxValue(event: Event): boolean {
    return (event.currentTarget as HTMLInputElement).checked;
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

  updateAdjustedMaxPoints(index: number, maxPoints: number | null): void {
    this.wizard.updateData((current) => ({
      ...current,
      justierung: {
        ...current.justierung,
        adjustedMaxPointsByTask: current.justierung.adjustedMaxPointsByTask.map((value, taskIndex) =>
          taskIndex === index ? maxPoints : value
        )
      }
    }));
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

  statusGroupHeaderClass(failed: boolean): string {
    return failed
      ? 'border-t-2 border-red-300 bg-red-100/90 dark:border-red-800 dark:bg-red-950/70'
      : 'border-t-2 border-emerald-300 bg-emerald-100/90 dark:border-emerald-800 dark:bg-emerald-950/60';
  }

  gradeGroupHeaderClass(_failed: boolean): string {
    return 'bg-slate-50 dark:bg-slate-950';
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
}
