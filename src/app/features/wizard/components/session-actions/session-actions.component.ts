import { Component, ElementRef, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { appSettings } from '../../../../core/app-settings';
import { ThemeService } from '../../../../core/theme.service';
import { ViewWidthService } from '../../../../core/view-width.service';
import {
  createWizardSessionExport,
  createWizardSessionFilename,
  listWizardSessions,
  loadWizardSession,
  parseWizardSessionJson,
  saveWizardSession,
  type StoredWizardSession
} from '../../../../core/wizard-session-storage';
import { WizardService } from '../../../../core/wizard.service';

type ModalType = 'welcome' | 'save' | 'load' | 'impressum' | 'datenschutz' | null;

const WELCOME_DIALOG_STORAGE_KEY = 'klasur-justierer:welcome-dialog-on-visit';

function readWelcomeDialogOnVisit(): boolean {
  if (typeof localStorage === 'undefined') {
    return false;
  }

  try {
    const value = localStorage.getItem(WELCOME_DIALOG_STORAGE_KEY);

    return value === null ? true : value === 'true';
  } catch {
    return true;
  }
}

function writeWelcomeDialogOnVisit(openOnVisit: boolean): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(WELCOME_DIALOG_STORAGE_KEY, String(openOnVisit));
  } catch {
    return;
  }
}

@Component({
  selector: 'app-session-actions',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './session-actions.component.html'
})
export class SessionActionsComponent implements OnInit {
  private readonly wizardService = inject(WizardService);

  @ViewChild('fileInput') private fileInput: ElementRef<HTMLInputElement> | undefined;
  @ViewChild('sessionNameInput') private sessionNameInput: ElementRef<HTMLInputElement> | undefined;
  @ViewChild('selectedSessionSelect') private selectedSessionSelect: ElementRef<HTMLSelectElement> | undefined;
  @ViewChild('menuElement') private menuElement: ElementRef<HTMLDivElement> | undefined;

  protected readonly settings = appSettings;
  protected readonly theme = inject(ThemeService);
  protected readonly viewWidth = inject(ViewWidthService);
  protected readonly wizard = this.wizardService.state;
  protected menuOpen = false;
  protected activeModal: ModalType = null;
  protected sessionName = '';
  protected selectedSessionName = '';
  protected sessions: StoredWizardSession[] = [];
  protected fileError = '';
  protected welcomeDialogOnVisit = readWelcomeDialogOnVisit();

  protected get canSave(): boolean {
    return this.sessionName.trim().length > 0;
  }

  protected get canLoad(): boolean {
    return this.selectedSessionName.trim().length > 0;
  }

  ngOnInit(): void {
    if (this.welcomeDialogOnVisit) {
      this.activeModal = 'welcome';
    }
  }

  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent): void {
    const target = event.target;

    if (!(target instanceof Node)) {
      return;
    }

    if (!this.menuElement?.nativeElement.contains(target)) {
      this.closeMenus();
    }
  }

  @HostListener('document:keydown.escape')
  handleDocumentEscape(): void {
    if (this.activeModal) {
      this.closeModal();
      return;
    }

    if (this.fileError) {
      this.closeFileError();
      return;
    }

    this.closeMenus();
  }

  refreshSessions(): void {
    this.sessions = listWizardSessions();
  }

  closeMenus(): void {
    this.menuOpen = false;
  }

  closeModal(): void {
    this.activeModal = null;
  }

  closeFileError(): void {
    this.fileError = '';
  }

  createDefaultSessionName(): string {
    return [this.wizard().data.basis.course.trim(), this.wizard().data.basis.topic.trim()]
      .filter((value) => value.length > 0)
      .join(' ');
  }

  checkboxValue(event: Event): boolean {
    return (event.currentTarget as HTMLInputElement).checked;
  }

  setWelcomeDialogOnVisit(openOnVisit: boolean): void {
    this.welcomeDialogOnVisit = openOnVisit;
    writeWelcomeDialogOnVisit(openOnVisit);
  }

  openWelcomeModal(): void {
    this.closeMenus();
    this.activeModal = 'welcome';
  }

  openSaveModal(): void {
    this.closeMenus();
    this.refreshSessions();
    this.sessionName = this.createDefaultSessionName();
    this.activeModal = 'save';
    window.setTimeout(() => this.sessionNameInput?.nativeElement.focus());
  }

  openLoadModal(): void {
    this.closeMenus();
    this.refreshSessions();
    this.selectedSessionName = this.sessions[0]?.name ?? '';
    this.activeModal = 'load';
    window.setTimeout(() => this.selectedSessionSelect?.nativeElement.focus());
  }

  openImpressumModal(): void {
    this.closeMenus();
    this.activeModal = 'impressum';
  }

  openDatenschutzModal(): void {
    this.closeMenus();
    this.activeModal = 'datenschutz';
  }

  saveSession(): void {
    if (!this.canSave) {
      return;
    }

    saveWizardSession(this.sessionName, this.wizard());
    this.refreshSessions();
    this.closeModal();
  }

  loadSession(): void {
    if (!this.canLoad) {
      return;
    }

    const snapshot = loadWizardSession(this.selectedSessionName);

    if (!snapshot) {
      this.refreshSessions();
      this.selectedSessionName = this.sessions[0]?.name ?? '';
      return;
    }

    this.wizardService.replaceSession(snapshot);
    this.closeModal();
  }

  openFileImport(): void {
    this.closeMenus();
    this.fileInput?.nativeElement.click();
  }

  async importFile(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    try {
      const content = await file.text();
      const snapshot = parseWizardSessionJson(content);

      this.wizardService.replaceSession(snapshot);
    } catch (error) {
      this.fileError = error instanceof Error ? error.message : 'Die Datei konnte nicht importiert werden.';
    } finally {
      input.value = '';
    }
  }

  exportFile(): void {
    this.closeMenus();

    const payload = createWizardSessionExport(this.wizard());
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');

    downloadLink.href = url;
    downloadLink.download = createWizardSessionFilename(this.wizard().data.basis.course, this.wizard().data.basis.topic);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
  }

  formatSavedAt(value: string): string {
    return new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  }

  closeModalOnBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  closeFileErrorOnBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeFileError();
    }
  }
}
