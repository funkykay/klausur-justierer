import { Component, inject } from '@angular/core';
import type { WizardData } from '../../../../core/wizard.models';
import { WizardService } from '../../../../core/wizard.service';
import { FieldErrorComponent } from '../../../../shared/field-error/field-error.component';

@Component({
  selector: 'app-justierung-step',
  standalone: true,
  imports: [FieldErrorComponent],
  templateUrl: './justierung-step.component.html'
})
export class JustierungStepComponent {
  protected readonly wizard = inject(WizardService);
  protected readonly state = this.wizard.state;

  protected get data(): WizardData['justierung'] {
    return this.state().data.justierung;
  }

  protected get errors() {
    return this.state().validation.errorsByStep.justierung;
  }

  protected get showErrors(): boolean {
    return Boolean(this.state().steps.find((item) => item.id === 'justierung')?.touched);
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
}
