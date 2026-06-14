import { Component, inject } from '@angular/core';
import type { GradeThreshold, WizardData } from '../../../../core/wizard.models';
import { WizardService } from '../../../../core/wizard.service';
import { FieldErrorComponent } from '../../../../shared/field-error/field-error.component';

@Component({
  selector: 'app-notenschema-step',
  standalone: true,
  imports: [FieldErrorComponent],
  templateUrl: './notenschema-step.component.html'
})
export class NotenschemaStepComponent {
  protected readonly wizard = inject(WizardService);
  protected readonly state = this.wizard.state;

  protected get data(): WizardData['notenschema'] {
    return this.state().data.notenschema;
  }

  protected get errors() {
    return this.state().validation.errorsByStep.notenschema;
  }

  protected get showErrors(): boolean {
    return Boolean(this.state().steps.find((item) => item.id === 'notenschema')?.touched);
  }

  textValue(event: Event): string {
    return (event.currentTarget as HTMLInputElement).value;
  }

  numberValue(event: Event): number | null {
    const value = (event.currentTarget as HTMLInputElement).value;

    return value === '' ? null : Number(value);
  }

  updateThreshold<K extends keyof GradeThreshold>(index: number, key: K, value: GradeThreshold[K]): void {
    this.wizard.updateData((current) => ({
      ...current,
      notenschema: {
        gradeThresholds: current.notenschema.gradeThresholds.map((threshold, thresholdIndex) =>
          thresholdIndex === index
            ? {
                ...threshold,
                [key]: value
              }
            : threshold
        )
      }
    }));
  }

  addThreshold(): void {
    this.wizard.updateData((current) => ({
      ...current,
      notenschema: {
        gradeThresholds: [
          ...current.notenschema.gradeThresholds,
          {
            grade: `${current.notenschema.gradeThresholds.length + 1}`,
            minPercent: null
          }
        ]
      }
    }));
  }

  removeThreshold(index: number): void {
    this.wizard.updateData((current) => ({
      ...current,
      notenschema: {
        gradeThresholds: current.notenschema.gradeThresholds.filter((_, thresholdIndex) => thresholdIndex !== index)
      },
      justierung: {
        ...current.justierung,
        gradeThresholds: current.justierung.gradeThresholds.filter((_, thresholdIndex) => thresholdIndex !== index)
      }
    }));
  }
}
