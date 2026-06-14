import { Component, inject } from '@angular/core';
import type { WizardStep } from '../../../../core/wizard.models';
import { WizardService } from '../../../../core/wizard.service';

@Component({
  selector: 'app-step-chain',
  standalone: true,
  templateUrl: './step-chain.component.html'
})
export class StepChainComponent {
  protected readonly wizard = inject(WizardService);
  protected readonly state = this.wizard.state;

  isAdjustmentStep(step: WizardStep): boolean {
    return step.id === 'justierung';
  }

  pearlClass(step: WizardStep, index: number, currentIndex: number): string {
    const current = index === currentIndex;
    const invalidTouched = step.touched && !step.validation.valid;
    const validTouched = step.touched && step.validation.valid;

    if (this.isAdjustmentStep(step)) {
      return this.adjustmentPearlClass(current, invalidTouched, validTouched);
    }

    if (current && invalidTouched) {
      return 'border-red-600 bg-red-600 text-white ring-4 ring-red-100 dark:border-red-500 dark:bg-red-600 dark:ring-red-950';
    }

    if (current) {
      return 'border-slate-950 bg-slate-950 text-white ring-4 ring-slate-200 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950 dark:ring-slate-700';
    }

    if (invalidTouched) {
      return 'border-red-600 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-950 dark:text-red-200';
    }

    if (validTouched) {
      return 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-200';
    }

    return 'border-slate-300 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400';
  }

  connectorClass(step: WizardStep): string {
    if (!step.touched) {
      return 'bg-slate-200 dark:bg-slate-700';
    }

    return step.validation.valid ? 'bg-emerald-500 dark:bg-emerald-500' : 'bg-red-400 dark:bg-red-500';
  }

  private adjustmentPearlClass(current: boolean, invalidTouched: boolean, validTouched: boolean): string {
    const base =
      'border-transparent bg-[linear-gradient(135deg,#7c3aed_0%,#d946ef_52%,#6d28d9_100%)] text-white shadow-lg shadow-fuchsia-500/25';

    if (current && invalidTouched) {
      return `${base} ring-4 ring-red-200 dark:ring-red-950`;
    }

    if (current) {
      return `${base} ring-4 ring-fuchsia-200 dark:ring-fuchsia-950`;
    }

    if (invalidTouched) {
      return `${base} ring-2 ring-red-300 dark:ring-red-800`;
    }

    if (validTouched) {
      return `${base} ring-2 ring-emerald-300 dark:ring-emerald-800`;
    }

    return `${base} opacity-95`;
  }
}
