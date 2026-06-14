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

  pearlClass(step: WizardStep, index: number, currentIndex: number): string {
    const current = index === currentIndex;
    const invalidTouched = step.touched && !step.validation.valid;
    const validTouched = step.touched && step.validation.valid;

    if (current && invalidTouched) {
      return 'border-red-600 bg-red-600 text-white ring-4 ring-red-100';
    }

    if (current) {
      return 'border-slate-950 bg-slate-950 text-white ring-4 ring-slate-200';
    }

    if (invalidTouched) {
      return 'border-red-600 bg-red-50 text-red-700';
    }

    if (validTouched) {
      return 'border-emerald-600 bg-emerald-50 text-emerald-700';
    }

    return 'border-slate-300 bg-white text-slate-500';
  }

  connectorClass(step: WizardStep): string {
    if (!step.touched) {
      return 'bg-slate-200';
    }

    return step.validation.valid ? 'bg-emerald-500' : 'bg-red-400';
  }
}
