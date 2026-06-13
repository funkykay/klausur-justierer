<script lang="ts">
  import Handsontable from 'handsontable/base';
  import { registerAllModules } from 'handsontable/registry';
  import { onMount } from 'svelte';
  import { wizard } from '../store/wizardStore';
  import type { ExamParticipant, FieldErrors } from '../types';

  registerAllModules();

  let gridElement: HTMLDivElement | null = null;
  let hotTable: Handsontable | null = null;
  let isSyncingGrid = false;

  $: tasks = $wizard.data.aufgaben.tasks;
  $: participants = $wizard.data.teilnehmer.participants;
  $: step = $wizard.steps.find((item) => item.id === 'teilnehmer');
  $: errors = $wizard.validation.errorsByStep.teilnehmer;
  $: showErrors = Boolean(step?.touched);
  $: validationMessages = collectValidationMessages(errors);
  $: gridRevision = JSON.stringify({
    tasks,
    participants,
    errors,
    showErrors
  });

  $: if (hotTable && gridRevision) {
    updateGrid();
  }

  function createParticipant(index = participants.length): ExamParticipant {
    return {
      name: `Teilnehmer ${index + 1}`,
      pointsByTask: tasks.map(() => 0)
    };
  }

  function createGridData(): (string | number | null)[][] {
    const rows = participants.map((participant) => [
      participant.name,
      ...tasks.map((_, taskIndex) => participant.pointsByTask[taskIndex] ?? 0)
    ]);

    if (rows.length === 0) {
      const participant = createParticipant(0);

      return [[participant.name, ...participant.pointsByTask]];
    }

    return rows;
  }

  function createColumnHeaders(): string[] {
    return [
      'Teilnehmer',
      ...tasks.map((task, index) => {
        const name = task.name.trim() || `Aufgabe ${index + 1}`;
        const maxPoints = task.maxPoints ?? 0;

        return `${name} (${maxPoints} P.)`;
      })
    ];
  }

  function createColumns() {
    return [
      {
        type: 'text'
      },
      ...tasks.map(() => ({
        type: 'numeric',
        allowInvalid: true
      }))
    ];
  }

  function normalizeText(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    if (value === null || value === undefined) {
      return '';
    }

    return String(value);
  }

  function normalizePoints(value: unknown): number | null {
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

  function readGridParticipants(): ExamParticipant[] {
    if (!hotTable) {
      return [];
    }

    return hotTable
      .getData()
      .map((row) => ({
        name: normalizeText(row[0]).trim(),
        pointsByTask: tasks.map((_, taskIndex) => normalizePoints(row[taskIndex + 1]))
      }))
      .filter(
        (participant) =>
          participant.name.length > 0 || participant.pointsByTask.some((points) => points !== null)
      );
  }

  function syncFromGrid(): void {
    if (!hotTable || isSyncingGrid) {
      return;
    }

    const nextParticipants = readGridParticipants();

    wizard.updateData((current) => ({
      ...current,
      teilnehmer: {
        participants: nextParticipants.length > 0 ? nextParticipants : [createParticipant(0)]
      }
    }));
    wizard.markCurrentTouched();
  }

  function addParticipant(): void {
    wizard.updateData((current) => ({
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
    wizard.markCurrentTouched();
  }

  function hasCellError(row: number, column: number): boolean {
    if (!showErrors) {
      return false;
    }

    if (participants.length === 0) {
      return row === 0 && column === 0 && Boolean(errors.participants?.length);
    }

    if (!participants[row]) {
      return false;
    }

    const field =
      column === 0 ? `participants.${row}.name` : `participants.${row}.pointsByTask.${column - 1}`;

    return Boolean(errors[field]?.length);
  }

  function createCellSettings(row: number, column: number) {
    return {
      className: hasCellError(row, column) ? 'teilnehmer-grid-error' : ''
    };
  }

  function updateGrid(): void {
    if (!hotTable) {
      return;
    }

    isSyncingGrid = true;
    hotTable.updateSettings({
      colHeaders: createColumnHeaders(),
      columns: createColumns(),
      cells: createCellSettings
    });
    hotTable.loadData(createGridData());
    hotTable.render();
    isSyncingGrid = false;
  }

  function formatErrorField(field: string): string {
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
      const taskName = tasks[taskIndex]?.name.trim() || `Aufgabe ${taskIndex + 1}`;

      return `Zeile ${row}, ${taskName}`;
    }

    return field;
  }

  function collectValidationMessages(fieldErrors: FieldErrors): string[] {
    return Object.entries(fieldErrors).flatMap(([field, messages]) =>
      messages.map((message) => `${formatErrorField(field)}: ${message}`)
    );
  }

  onMount(() => {
    if (!gridElement) {
      return;
    }

    hotTable = new Handsontable(gridElement, {
      data: createGridData(),
      colHeaders: createColumnHeaders(),
      columns: createColumns(),
      rowHeaders: true,
      height: 'auto',
      stretchH: 'all',
      autoWrapRow: true,
      autoWrapCol: true,
      contextMenu: ['remove_row', 'undo', 'redo'],
      manualColumnResize: true,
      manualRowResize: true,
      themeName: 'ht-theme-main',
      licenseKey: 'non-commercial-and-evaluation',
      cells: createCellSettings,
      afterChange(changes, source) {
        if (!changes || source === 'loadData') {
          return;
        }

        syncFromGrid();
      },
      afterRemoveRow() {
        syncFromGrid();
      }
    });

    return () => {
      hotTable?.destroy();
      hotTable = null;
    };
  });
</script>

<div class="space-y-6">
  <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
    <div>
      <h3 class="text-sm font-semibold text-slate-900">Teilnehmer und Punkte</h3>
      <p class="mt-1 text-sm text-slate-600">
        Erfasse pro Zeile eine Person und die erreichten Punkte je Aufgabe.
      </p>
    </div>

    <button class="button-secondary" type="button" onclick={addParticipant}>Teilnehmer hinzufügen</button>
  </div>

  <div class="teilnehmer-hot overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
    <div bind:this={gridElement}></div>
  </div>

  {#if showErrors && validationMessages.length}
    <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
      <h3 class="text-sm font-semibold text-red-800">Validierungsfehler</h3>
      <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
        {#each validationMessages as message}
          <li>{message}</li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .teilnehmer-hot :global(.handsontable td.teilnehmer-grid-error) {
    background-color: #fef2f2 !important;
    color: #991b1b;
  }

  .teilnehmer-hot :global(.handsontable td.teilnehmer-grid-error.current),
  .teilnehmer-hot :global(.handsontable td.teilnehmer-grid-error.area),
  .teilnehmer-hot :global(.handsontable td.teilnehmer-grid-error.highlight) {
    background-color: #fee2e2 !important;
  }
</style>