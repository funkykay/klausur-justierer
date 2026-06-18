import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RevoGrid, type ColumnRegular } from '@revolist/angular-datagrid';
import { ThemeService } from '../../../../core/theme.service';
import { collectWizardValidationMessages } from '../../../../core/wizard-error-labels';
import type { ExamParticipant } from '../../../../core/wizard.models';
import { WizardService } from '../../../../core/wizard.service';
import { FieldErrorComponent } from '../../../../shared/field-error/field-error.component';

type InputEditorMode = 'mobile' | 'desktop';
type GridTheme = 'material' | 'darkMaterial';
type TeilnehmerGridValue = string | number | null;
type TeilnehmerGridRow = {
  name: string;
  actions: string;
  [key: string]: TeilnehmerGridValue;
};
type GridRangeData = Record<string, Record<string, unknown>>;
type GridEditDetail = {
  prop?: string | number;
  rowIndex?: number;
  val?: unknown;
  data?: unknown;
};
type GridEditEvent = CustomEvent<GridEditDetail>;

const ACTIONS_COLUMN_PROP = 'actions';
const TASK_PROP_PREFIX = 'task_';

function createTaskProp(index: number): string {
  return `${TASK_PROP_PREFIX}${index}`;
}

function readTaskIndexFromProp(prop: string | number): number | null {
  if (typeof prop !== 'string' || !prop.startsWith(TASK_PROP_PREFIX)) {
    return null;
  }

  const index = Number(prop.slice(TASK_PROP_PREFIX.length));

  return Number.isInteger(index) && index >= 0 ? index : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isGridRangeData(value: unknown): value is GridRangeData {
  return isRecord(value) && Object.values(value).every(isRecord);
}

@Component({
  selector: 'app-teilnehmer-step',
  standalone: true,
  imports: [FieldErrorComponent, RevoGrid],
  templateUrl: './teilnehmer-step.component.html',
  styleUrl: './teilnehmer-step.component.css'
})
export class TeilnehmerStepComponent implements OnInit, OnDestroy {
  protected readonly wizard = inject(WizardService);
  private readonly theme = inject(ThemeService);
  private readonly finePointerQuery = typeof window !== 'undefined' ? window.matchMedia('(any-pointer: fine)') : null;
  private readonly coarsePointerQuery = typeof window !== 'undefined' ? window.matchMedia('(any-pointer: coarse)') : null;
  protected readonly inputEditorMode = signal<InputEditorMode>(this.readInputEditorMode());

  private readonly handleInputModeChange = (): void => {
    this.inputEditorMode.set(this.readInputEditorMode());
  };

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
    return collectWizardValidationMessages('teilnehmer', this.errors, this.wizard.state().data);
  }

  protected get gridTheme(): GridTheme {
    return this.theme.isDark() ? 'darkMaterial' : 'material';
  }

  protected get gridSource(): TeilnehmerGridRow[] {
    return this.participants.map((participant) => {
      const row: TeilnehmerGridRow = {
        name: participant.name,
        actions: ''
      };

      this.tasks.forEach((_, taskIndex) => {
        row[createTaskProp(taskIndex)] = participant.pointsByTask[taskIndex] ?? null;
      });

      return row;
    });
  }

  protected get gridColumns(): ColumnRegular[] {
    const columns: ColumnRegular[] = [
      {
        prop: 'name',
        name: 'Teilnehmer',
        size: 220,
        autoSize: true,
        cellProperties: (props) => this.createCellProperties(props.rowIndex, 0)
      },
      ...this.tasks.map((task, taskIndex): ColumnRegular => {
        const name = task.name.trim() || `Aufgabe ${taskIndex + 1}`;
        const maxPoints = task.maxPoints ?? 0;

        return {
          prop: createTaskProp(taskIndex),
          name: `${name} (${maxPoints} P.)`,
          size: 140,
          autoSize: true,
          cellProperties: (props) => this.createCellProperties(props.rowIndex, taskIndex + 1)
        };
      }),
      {
        prop: ACTIONS_COLUMN_PROP,
        name: 'Aktion',
        size: 112,
        readonly: true,
        pin: 'colPinEnd',
        cellTemplate: (createElement, props) =>
          createElement(
            'button',
            {
              class: 'teilnehmer-grid-remove-button',
              disabled: this.participants.length === 1,
              type: 'button',
              onClick: (event: MouseEvent) => {
                event.preventDefault();
                event.stopPropagation();
                this.removeParticipant(props.rowIndex);
              }
            },
            'Entfernen'
          )
      }
    ];

    return columns;
  }

  ngOnInit(): void {
    this.addInputModeListeners();
  }

  ngOnDestroy(): void {
    this.removeInputModeListeners();
  }

  createParticipant(index = this.participants.length): ExamParticipant {
    return {
      name: `Teilnehmer ${index + 1}`,
      pointsByTask: this.tasks.map(() => 0)
    };
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

  normalizeGridEdit(event: Event): void {
    const detail = (event as GridEditEvent).detail;

    if (!detail || detail.prop === undefined) {
      return;
    }

    const normalized = this.normalizeGridValue(detail.prop, detail.val);

    if (normalized !== undefined) {
      detail.val = normalized;
    }
  }

  normalizeGridRangeEdit(event: Event): void {
    const detail = (event as GridEditEvent).detail;

    if (!detail || !isGridRangeData(detail.data)) {
      return;
    }

    Object.values(detail.data).forEach((row) => {
      Object.entries(row).forEach(([prop, value]) => {
        const normalized = this.normalizeGridValue(prop, value);

        if (normalized !== undefined) {
          row[prop] = normalized;
        }
      });
    });
  }

  handleGridEdit(event: Event): void {
    const detail = (event as GridEditEvent).detail;

    if (!detail) {
      return;
    }

    if (isGridRangeData(detail.data)) {
      this.updateParticipantsFromGridRows(detail.data);
      return;
    }

    if (detail.prop === undefined || typeof detail.rowIndex !== 'number') {
      return;
    }

    const normalized = this.normalizeGridValue(detail.prop, detail.val);

    if (normalized === undefined) {
      return;
    }

    this.updateParticipantFromGridCell(detail.rowIndex, detail.prop, normalized);
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

  createCellProperties(row: number, column: number): { class: string } | undefined {
    return this.hasCellError(row, column) ? { class: 'teilnehmer-grid-error' } : undefined;
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

  private updateParticipantFromGridCell(
    rowIndex: number,
    prop: string | number,
    value: TeilnehmerGridValue
  ): void {
    const taskIndex = readTaskIndexFromProp(prop);

    if (prop !== 'name' && taskIndex === null) {
      return;
    }

    this.wizard.updateData((current) => {
      if (!current.teilnehmer.participants[rowIndex]) {
        return current;
      }

      return {
        ...current,
        teilnehmer: {
          participants: current.teilnehmer.participants.map((participant, participantIndex) => {
            if (participantIndex !== rowIndex) {
              return participant;
            }

            if (prop === 'name') {
              return {
                ...participant,
                name: this.normalizeText(value).trim()
              };
            }

            return {
              ...participant,
              pointsByTask: current.aufgaben.tasks.map((_, currentTaskIndex) =>
                currentTaskIndex === taskIndex ? this.normalizePoints(value) : participant.pointsByTask[currentTaskIndex] ?? 0
              )
            };
          })
        }
      };
    });
    this.wizard.markCurrentTouched();
  }

  private updateParticipantsFromGridRows(rowsByIndex: GridRangeData): void {
    this.wizard.updateData((current) => ({
      ...current,
      teilnehmer: {
        participants: current.teilnehmer.participants.map((participant, participantIndex) => {
          const row = rowsByIndex[participantIndex];

          return row ? this.applyGridRowToParticipant(participant, row, current.aufgaben.tasks.length) : participant;
        })
      }
    }));
    this.wizard.markCurrentTouched();
  }

  private applyGridRowToParticipant(
    participant: ExamParticipant,
    row: Record<string, unknown>,
    taskCount: number
  ): ExamParticipant {
    return {
      name: row.name === undefined ? participant.name : this.normalizeText(row.name).trim(),
      pointsByTask: Array.from({ length: taskCount }, (_, taskIndex) => {
        const prop = createTaskProp(taskIndex);

        return row[prop] === undefined ? participant.pointsByTask[taskIndex] ?? 0 : this.normalizePoints(row[prop]);
      })
    };
  }

  private normalizeGridValue(prop: string | number, value: unknown): TeilnehmerGridValue | undefined {
    if (prop === 'name') {
      return this.normalizeText(value);
    }

    if (readTaskIndexFromProp(prop) !== null) {
      return this.normalizePoints(value);
    }

    return undefined;
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
