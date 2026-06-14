import { Component, inject } from '@angular/core';
import { ViewWidthService } from '../../../../core/view-width.service';
import { WizardService } from '../../../../core/wizard.service';

@Component({
  selector: 'app-wizard-navigation',
  standalone: true,
  templateUrl: './wizard-navigation.component.html'
})
export class WizardNavigationComponent {
  protected readonly wizard = inject(WizardService);
  protected readonly viewWidth = inject(ViewWidthService);
  protected readonly isFirst = this.wizard.isFirst;
  protected readonly isLast = this.wizard.isLast;
}
