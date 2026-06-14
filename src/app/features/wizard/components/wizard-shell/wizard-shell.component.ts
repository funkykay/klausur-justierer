import { Component, inject } from '@angular/core';
import { ViewWidthService } from '../../../../core/view-width.service';
import { WizardService } from '../../../../core/wizard.service';
import { AufgabenStepComponent } from '../../steps/aufgaben-step/aufgaben-step.component';
import { BasisStepComponent } from '../../steps/basis-step/basis-step.component';
import { JustierungStepComponent } from '../../steps/justierung-step/justierung-step.component';
import { NotenschemaStepComponent } from '../../steps/notenschema-step/notenschema-step.component';
import { TeilnehmerStepComponent } from '../../steps/teilnehmer-step/teilnehmer-step.component';
import { SessionActionsComponent } from '../session-actions/session-actions.component';
import { StepChainComponent } from '../step-chain/step-chain.component';
import { WizardNavigationComponent } from '../wizard-navigation/wizard-navigation.component';

@Component({
  selector: 'app-wizard-shell',
  standalone: true,
  imports: [
    AufgabenStepComponent,
    BasisStepComponent,
    JustierungStepComponent,
    NotenschemaStepComponent,
    TeilnehmerStepComponent,
    SessionActionsComponent,
    StepChainComponent,
    WizardNavigationComponent
  ],
  templateUrl: './wizard-shell.component.html'
})
export class WizardShellComponent {
  protected readonly wizard = inject(WizardService);
  protected readonly viewWidth = inject(ViewWidthService);
  protected readonly state = this.wizard.state;
  protected readonly currentStep = this.wizard.currentStep;
}
