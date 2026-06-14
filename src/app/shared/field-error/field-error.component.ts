import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-field-error',
  standalone: true,
  templateUrl: './field-error.component.html'
})
export class FieldErrorComponent {
  @Input() errors: string[] | undefined;
}
