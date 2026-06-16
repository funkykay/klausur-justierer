import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, effect, inject, signal } from '@angular/core';
import Handsontable from 'handsontable/base';
import type { CellProperties } from 'handsontable/settings';
import { registerAllModules } from 'handsontable/registry';
import type { ExamParticipant, FieldErrors } from '../../../../core/wizard.models';
import { WizardService } from '../../../../core/wizard.service';
import { FieldErrorComponent } from '../../../../shared/field-error/field-error.component';

type InputEditorMode = 'mobile' | 'desktop';

registerAllModules();

@Component({
  selector: 'app-teilnehmer-step',
  standalone: true,
  imports: [FieldErrorComponent],
  templateUrl: './teilnehmer-step.component.html',
  styleUrl: './teilnehmer-step.component.css'
})
export class TeilnehmerStepComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gridElement') private gridElement: ElementRef<HTMLDivElement> | undefined;

  protected readonly wizard = inject(WizardService);
  private readonly finePointerQuery = typeof window !== 'undefined' ? window.matchMedia('(any-pointer: fine)') : null;
  private readonly coarsePointerQuery = typeof window !== 'undefined' ? window.matchMedia('(any-pointer: coarse)') : null;
  protected readonly inputEditorMode = signal<InputEditorMode>(this.readInputEditorMode());
  private hotTable: Handsontable | null = null;
  private isSyncingGrid = false;

  private readonly handleInputModeChange = (): void => {
    this.inputEditorMode.set(this.readInputEditorMode());
    window.setTimeout(() => this.hotTable?.render());
  };

  private readonly gridEffect = effect(() => {
    const state = this.wizard.state();

    JSON.stringify({
      tasks: state.data.aufgaben.tasks,
      participants: state.data.teilnehmer.participants,
      errors: state.validation.errorsByStep.teilnehmer,
      showErrors: Boolean(state.steps.find((item) => item.id === 'teilnehmer')?.touched)
    });

    if (this.hotTable) {
      this.updateGrid();
    }
  });

  protected get tasks() {
    return this.wizard.state().data.aufgaben.tasks;
  }

  protected get participants() {
    return this.wizard.state().data.teilnehmer.participants;
  }

  protected get errors() {
    return this.wizard.state().validation.errorsByStep.teilnehmer;
  }

  protected get showErrors(): boolean {
    return Boolean(this.wizard.state().steps.find((item) => item.id === 'teilnehmer')?.touched);
  }

  protected get validationMessages(): string[] {
    return this.collectValidationMessages(this.errors);
  }

  ngAfterViewInit(): void {
    this.addInputModeListeners();

    if (!this.gridElement) {
      return;
    }

    this.hotTable = new Handsontable(this.gridElement.nativeElement, {
      data: this.createGridData(),
      colHeaders: this.createColumnHeaders(),
      columns: this.createColumns(),
      rowHeaders: true,
      height: 'auto',
      stretchH: 'all',
      autoWrapRow: true,
      autoWrapCol: true,
      enterBeginsEditing: true,
      contextMenu: ['remove_row', 'undo', 'redo'],
      manualColumnResize: true,
      manualRowResize: true,
      themeName: 'ht-theme-main',
      licenseKey: 'non-commercial-and-evaluation',
      cells: (row, column) => this.createCellSettings(row, column),
      afterChange: (changes, source) => {
        if (!changes || source === 'loadData') {
          return;
        }

        this.syncFromGrid();
      },
      afterRemoveRow: () => {
        this.syncFromGrid();
      }
    });
  }

  ngOnDestroy(): void {
    this.gridEffect.destroy();
    this.removeInputModeListeners();
    this.hotTable?.destroy();
    this.hotTable = null;
  }

  createParticipant(index = this.participants.length): ExamParticipant {
    return {
      name: `Teilnehmer ${index + 1}`,
      pointsByTask: this.tasks.map(() => 0)
    };
  }

  createGridData(): (string | number | null)[][] {
    const rows = this.participants.map((participant) => [
      participant.name,
      ...this.tasks.map((_, taskIndex) => participant.pointsByTask[taskIndex] ?? 0)
    ]);

    if (rows.length === 0) {
      const participant = this.createParticipant(0);

      return [[participant.name, ...participant.pointsByTask]];
    }

    return rows;
  }

  createColumnHeaders(): string[] {
    return [
      'Teilnehmer',
      ...this.tasks.map((task, index) => {
        const name = task.name.trim() || `Aufgabe ${index + 1}`;
        const maxPoints = task.maxPoints ?? 0;

        return `${name} (${maxPoints} P.)`;
      })
    ];
  }

  createColumns(): Handsontable.ColumnSettings[] {
    return [
      {
        type: 'text'
      },
      ...this.tasks.map(() => ({
        type: 'numeric',
        allowInvalid: true
      }))
    ];
  }

  normalizeText(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    if (value === null || value === undefined) {
      return '';
    }

    return String(value);
  }

  normalizePoints(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }

    const normalized = String(value).trim().replace(',', '.');

    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : null;
  }

  readGridParticipants(): ExamParticipant[] {
    if (!this.hotTable) {
      return [];
    }

    return this.hotTable
      .getData()
      .map((row) => ({
        name: this.normalizeText(row[0]).trim(),
        pointsByTask: this.tasks.map((_, taskIndex) => this.normalizePoints(row[taskIndex + 1]))
      }))
      .filter(
        (participant) =>
          participant.name.length > 0 || participant.pointsByTask.some((points) => points !== null)
      );
  }

  syncFromGrid(): void {
    if (!this.hotTable || this.isSyncingGrid) {
      return;
    }

    const nextParticipants = this.readGridParticipants();

    this.wizard.updateData((current) => ({
      ...current,
      teilnehmer: {
        participants: nextParticipants.length > 0 ? nextParticipants : [this.createParticipant(0)]
      }
    }));
    this.wizard.markCurrentTouched();
  }

  addParticipant(): void {
    this.wizard.updateData((current) => ({
      ...current,
      teilnehmer: {
        participants: [
          ...current.teilnehmer.participants,
          {
            name: `Teilnehmer ${current.teilnehmer.participants.length + 1}`,
            pointsByTask: current.aufgaben.tasks.map(() => 0)
          }
        ]
      }
    }));
    this.wizard.markCurrentTouched();
  }

  removeParticipant(index: number): void {
    if (this.participants.length <= 1) {
      return;
    }

    this.wizard.updateData((current) => ({
      ...current,
      teilnehmer: {
        participants: current.teilnehmer.participants.filter((_, participantIndex) => participantIndex !== index)
      }
    }));
    this.wizard.markCurrentTouched();
  }

  updateParticipantName(index: number, name: string): void {
    this.wizard.updateData((current) => ({
      ...current,
      teilnehmer: {
        participants: current.teilnehmer.participants.map((participant, participantIndex) =>
          participantIndex === index
            ? {
                ...participant,
                name
              }
            : participant
        )
      }
    }));
  }

  updateParticipantPoints(participantIndex: number, taskIndex: number, points: number | null): void {
    this.wizard.updateData((current) => ({
      ...current,
      teilnehmer: {
        participants: current.teilnehmer.participants.map((participant, currentParticipantIndex) =>
          currentParticipantIndex === participantIndex
            ? {
                ...participant,
                pointsByTask: current.aufgaben.tasks.map((_, currentTaskIndex) =>
                  currentTaskIndex === taskIndex ? points : participant.pointsByTask[currentTaskIndex] ?? 0
                )
              }
            : participant
        )
      }
    }));
  }

  textValue(event: Event): string {
    return (event.currentTarget as HTMLInputElement).value;
  }

  numberValue(event: Event): number | null {
    const value = (event.currentTarget as HTMLInputElement).value;

    return value === '' ? null : Number(value);
  }

  hasCellError(row: number, column: number): boolean {
    if (!this.showErrors) {
      return false;
    }

    if (this.participants.length === 0) {
      return row === 0 && column === 0 && Boolean(this.errors['participants']?.length);
    }

    if (!this.participants[row]) {
      return false;
    }

    const field =
      column === 0 ? `participants.${row}.name` : `participants.${row}.pointsByTask.${column - 1}`;

    return Boolean(this.errors[field]?.length);
  }

  createCellSettings(row: number, column: number): Partial<CellProperties> {
    return {
      className: this.hasCellError(row, column) ? 'teilnehmer-grid-error' : ''
    };
  }

  updateGrid(): void {
    if (!this.hotTable) {
      return;
    }

    this.isSyncingGrid = true;
    this.hotTable.updateSettings({
      colHeaders: this.createColumnHeaders(),
      columns: this.createColumns(),
      cells: (row, column) => this.createCellSettings(row, column)
    });
    this.hotTable.loadData(this.createGridData());
    this.hotTable.render();
    this.isSyncingGrid = false;
  }

  formatErrorField(field: string): string {
    if (field === 'participants') {
      return 'Teilnehmer';
    }

    const nameMatch = /^participants\.(\d+)\.name$/.exec(field);

    if (nameMatch) {
      return `Zeile ${Number(nameMatch[1]) + 1}, Teilnehmer`;
    }

    const pointsMatch = /^participants\.(\d+)\.pointsByTask\.(\d+)$/.exec(field);

    if (pointsMatch) {
      const row = Number(pointsMatch[1]) + 1;
      const taskIndex = Number(pointsMatch[2]);
      const taskName = this.tasks[taskIndex]?.name.trim() || `Aufgabe ${taskIndex + 1}`;

      return `Zeile ${row}, ${taskName}`;
    }

    return field;
  }

  collectValidationMessages(fieldErrors: FieldErrors): string[] {
    return Object.entries(fieldErrors).flatMap(([field, messages]) =>
      messages.map((message) => `${this.formatErrorField(field)}: ${message}`)
    );
  }

  private readInputEditorMode(): InputEditorMode {
    const hasFinePointer = this.finePointerQuery?.matches ?? false;
    const hasCoarsePointer = this.coarsePointerQuery?.matches ?? false;

    return hasCoarsePointer && !hasFinePointer ? 'mobile' : 'desktop';
  }

  private addInputModeListeners(): void {
    this.finePointerQuery?.addEventListener('change', this.handleInputModeChange);
    this.coarsePointerQuery?.addEventListener('change', this.handleInputModeChange);
  }

  private removeInputModeListeners(): void {
    this.finePointerQuery?.removeEventListener('change', this.handleInputModeChange);
    this.coarsePointerQuery?.removeEventListener('change', this.handleInputModeChange);
  }
}
