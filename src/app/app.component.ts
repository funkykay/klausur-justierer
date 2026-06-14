import { Component } from '@angular/core';
import { WizardShellComponent } from './features/wizard/components/wizard-shell/wizard-shell.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [WizardShellComponent],
  templateUrl: './app.component.html'
})
export class AppComponent {}
