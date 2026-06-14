import { Component, inject } from '@angular/core';
import type { WizardData } from '../../../../core/wizard.models';
import { WizardService } from '../../../../core/wizard.service';
import { FieldErrorComponent } from '../../../../shared/field-error/field-error.component';

@Component({
  selector: 'app-basis-step',
  standalone: true,
  imports: [FieldErrorComponent],
  templateUrl: './basis-step.component.html'
})
export class BasisStepComponent {
  protected readonly wizard = inject(WizardService);
  protected readonly state = this.wizard.state;

  protected get data(): WizardData['basis'] {
    return this.state().data.basis;
  }

  protected get errors() {
    return this.state().validation.errorsByStep.basis;
  }

  protected get showErrors(): boolean {
    return Boolean(this.state().steps.find((item) => item.id === 'basis')?.touched);
  }

  textValue(event: Event): string {
    return (event.currentTarget as HTMLInputElement).value;
  }

  updateBasis<K extends keyof WizardData['basis']>(key: K, value: WizardData['basis'][K]): void {
    this.wizard.updateData((current) => ({
      ...current,
      basis: {
        ...current.basis,
        [key]: value
      }
    }));
  }
}
