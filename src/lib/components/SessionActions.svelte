<script lang="ts">
  import {
    createWizardSessionExport,
    createWizardSessionFilename,
    listWizardSessions,
    loadWizardSession,
    parseWizardSessionJson,
    saveWizardSession
  } from '../sessionStorage';
  import type { StoredWizardSession } from '../sessionStorage';
  import { wizard } from '../store/wizardStore';

  type ModalType = 'save' | 'load' | null;

  let importMenuOpen = false;
  let exportMenuOpen = false;
  let activeModal: ModalType = null;
  let sessionName = '';
  let selectedSessionName = '';
  let sessions: StoredWizardSession[] = [];
  let fileError = '';
  let fileInput: HTMLInputElement | null = null;
  let importMenuElement: HTMLDivElement | null = null;
  let exportMenuElement: HTMLDivElement | null = null;

  $: canSave = sessionName.trim().length > 0;
  $: canLoad = selectedSessionName.trim().length > 0;

  function refreshSessions(): void {
    sessions = listWizardSessions();
  }

  function closeMenus(): void {
    importMenuOpen = false;
    exportMenuOpen = false;
  }

  function closeModal(): void {
    activeModal = null;
  }

  function closeFileError(): void {
    fileError = '';
  }

  function handleWindowClick(event: MouseEvent): void {
    const target = event.target;

    if (!(target instanceof Node)) {
      return;
    }

    if (!importMenuElement?.contains(target) && !exportMenuElement?.contains(target)) {
      closeMenus();
    }
  }

  function handleWindowKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') {
      return;
    }

    if (activeModal) {
      closeModal();
      return;
    }

    if (fileError) {
      closeFileError();
      return;
    }

    closeMenus();
  }

  function openSaveModal(): void {
    closeMenus();
    refreshSessions();
    sessionName = $wizard.data.basis.title.trim();
    activeModal = 'save';
  }

  function openLoadModal(): void {
    closeMenus();
    refreshSessions();
    selectedSessionName = sessions[0]?.name ?? '';
    activeModal = 'load';
  }

  function saveSession(): void {
    if (!canSave) {
      return;
    }

    saveWizardSession(sessionName, $wizard);
    refreshSessions();
    closeModal();
  }

  function loadSession(): void {
    if (!canLoad) {
      return;
    }

    const snapshot = loadWizardSession(selectedSessionName);

    if (!snapshot) {
      refreshSessions();
      selectedSessionName = sessions[0]?.name ?? '';
      return;
    }

    wizard.replaceSession(snapshot);
    closeModal();
  }

  function openFileImport(): void {
    closeMenus();
    fileInput?.click();
  }

  async function importFile(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    try {
      const content = await file.text();
      const snapshot = parseWizardSessionJson(content);

      wizard.replaceSession(snapshot);
    } catch (error) {
      fileError = error instanceof Error ? error.message : 'Die Datei konnte nicht importiert werden.';
    } finally {
      input.value = '';
    }
  }

  function exportFile(): void {
    closeMenus();

    const payload = createWizardSessionExport($wizard);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');

    downloadLink.href = url;
    downloadLink.download = createWizardSessionFilename($wizard.data.basis.title);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
  }

  function formatSavedAt(value: string): string {
    return new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  }

  function closeModalOnBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }

  function closeFileErrorOnBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      closeFileError();
    }
  }
</script>

<svelte:window onclick={handleWindowClick} onkeydown={handleWindowKeydown} />

<div class="flex items-center gap-2">
  <div class="relative" bind:this={importMenuElement}>
    <button
      class="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950/20"
      type="button"
      aria-label="Import"
      aria-haspopup="menu"
      aria-expanded={importMenuOpen}
      onclick={() => {
        importMenuOpen = !importMenuOpen;
        exportMenuOpen = false;
      }}
    >
      <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v10.5" />
        <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 9.75 3.75 3.75 3.75-3.75" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M4.75 14.5v4.75h14.5V14.5" />
      </svg>
    </button>

    {#if importMenuOpen}
      <div
        class="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg"
        role="menu"
      >
        <button
          class="block w-full px-4 py-2 text-left text-slate-800 transition hover:bg-slate-50"
          type="button"
          role="menuitem"
          onclick={openLoadModal}
        >
          Lade Session
        </button>

        <button
          class="block w-full px-4 py-2 text-left text-slate-800 transition hover:bg-slate-50"
          type="button"
          role="menuitem"
          onclick={openFileImport}
        >
          Importiere Datei
        </button>
      </div>
    {/if}
  </div>

  <div class="relative" bind:this={exportMenuElement}>
    <button
      class="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950/20"
      type="button"
      aria-label="Export"
      aria-haspopup="menu"
      aria-expanded={exportMenuOpen}
      onclick={() => {
        exportMenuOpen = !exportMenuOpen;
        importMenuOpen = false;
      }}
    >
      <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 14V3.5" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 7.25 12 3.5l3.75 3.75" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M4.75 14.5v4.75h14.5V14.5" />
      </svg>
    </button>

    {#if exportMenuOpen}
      <div
        class="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg"
        role="menu"
      >
        <button
          class="block w-full px-4 py-2 text-left text-slate-800 transition hover:bg-slate-50"
          type="button"
          role="menuitem"
          onclick={openSaveModal}
        >
          Speichere Session
        </button>

        <button
          class="block w-full px-4 py-2 text-left text-slate-800 transition hover:bg-slate-50"
          type="button"
          role="menuitem"
          onclick={exportFile}
        >
          Exportiere Datei
        </button>
      </div>
    {/if}
  </div>
</div>

<input class="hidden" type="file" accept="application/json,.json" bind:this={fileInput} onchange={importFile} />

{#if activeModal === 'save'}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
    role="presentation"
    onclick={closeModalOnBackdrop}
  >
    <form
      class="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-session-title"
      onsubmit={(event) => {
        event.preventDefault();
        saveSession();
      }}
    >
      <h2 id="save-session-title" class="text-lg font-semibold text-slate-950">Session speichern</h2>
      <p class="mt-2 text-sm text-slate-600">Gib einen Namen an, unter dem die aktuelle Session gespeichert wird.</p>

      <label class="mt-5 block">
        <span class="field-label">Session-Name</span>
        <input class="field-input" type="text" bind:value={sessionName} list="saved-session-names" autofocus />
      </label>

      <datalist id="saved-session-names">
        {#each sessions as session}
          <option value={session.name}>{session.name}</option>
        {/each}
      </datalist>

      <div class="mt-6 flex justify-end gap-2">
        <button class="button-secondary" type="button" onclick={closeModal}>Abbrechen</button>
        <button class="button-primary" type="submit" disabled={!canSave}>Speichern</button>
      </div>
    </form>
  </div>
{/if}

{#if activeModal === 'load'}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
    role="presentation"
    onclick={closeModalOnBackdrop}
  >
    <form
      class="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="load-session-title"
      onsubmit={(event) => {
        event.preventDefault();
        loadSession();
      }}
    >
      <h2 id="load-session-title" class="text-lg font-semibold text-slate-950">Session laden</h2>

      {#if sessions.length}
        <label class="mt-5 block">
          <span class="field-label">Gespeicherte Session</span>
          <select class="field-input" bind:value={selectedSessionName} autofocus>
            {#each sessions as session}
              <option value={session.name}>{session.name} · {formatSavedAt(session.savedAt)}</option>
            {/each}
          </select>
        </label>
      {:else}
        <p class="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Es sind noch keine Sessions gespeichert.
        </p>
      {/if}

      <div class="mt-6 flex justify-end gap-2">
        <button class="button-secondary" type="button" onclick={closeModal}>Abbrechen</button>
        <button class="button-primary" type="submit" disabled={!canLoad}>Laden</button>
      </div>
    </form>
  </div>
{/if}

{#if fileError}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
    role="presentation"
    onclick={closeFileErrorOnBackdrop}
  >
    <div
      class="w-full max-w-md rounded-lg border border-red-200 bg-white p-5 shadow-xl"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="file-error-title"
    >
      <h2 id="file-error-title" class="text-lg font-semibold text-red-800">Import nicht möglich</h2>
      <p class="mt-2 text-sm text-slate-700">{fileError}</p>

      <div class="mt-6 flex justify-end">
        <button class="button-primary" type="button" onclick={closeFileError}>Schließen</button>
      </div>
    </div>
  </div>
{/if}