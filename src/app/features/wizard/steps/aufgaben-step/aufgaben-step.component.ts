import { Component, inject } from '@angular/core';
import type { ExamTask, WizardData } from '../../../../core/wizard.models';
import { WizardService } from '../../../../core/wizard.service';
import { FieldErrorComponent } from '../../../../shared/field-error/field-error.component';

@Component({
  selector: 'app-aufgaben-step',
  standalone: true,
  imports: [FieldErrorComponent],
  templateUrl: './aufgaben-step.component.html'
})
export class AufgabenStepComponent {
  protected readonly wizard = inject(WizardService);
  protected readonly state = this.wizard.state;

  protected get data(): WizardData['aufgaben'] {
    return this.state().data.aufgaben;
  }

  protected get errors() {
    return this.state().validation.errorsByStep.aufgaben;
  }

  protected get showErrors(): boolean {
    return Boolean(this.state().steps.find((item) => item.id === 'aufgaben')?.touched);
  }

  protected get totalPoints(): number {
    return this.data.tasks.reduce((sum, task) => sum + (task.maxPoints ?? 0), 0);
  }

  textValue(event: Event): string {
    return (event.currentTarget as HTMLInputElement).value;
  }

  numberValue(event: Event): number | null {
    const value = (event.currentTarget as HTMLInputElement).value;

    return value === '' ? null : Number(value);
  }

  updateTask<K extends keyof ExamTask>(index: number, key: K, value: ExamTask[K]): void {
    this.wizard.updateData((current) => ({
      ...current,
      aufgaben: {
        tasks: current.aufgaben.tasks.map((task, taskIndex) =>
          taskIndex === index
            ? {
                ...task,
                [key]: value
              }
            : task
        )
      },
      justierung: {
        ...current.justierung,
        adjustedMaxPointsByTask:
          key === 'maxPoints'
            ? current.justierung.adjustedMaxPointsByTask.map((maxPoints, taskIndex) =>
                taskIndex === index && maxPoints === current.aufgaben.tasks[index]?.maxPoints ? (value as number | null) : maxPoints
              )
            : current.justierung.adjustedMaxPointsByTask
      }
    }));
  }

  addTask(): void {
    this.wizard.updateData((current) => ({
      ...current,
      aufgaben: {
        tasks: [
          ...current.aufgaben.tasks,
          {
            name: `Aufgabe ${current.aufgaben.tasks.length + 1}`,
            maxPoints: 0
          }
        ]
      }
    }));
  }

  removeTask(index: number): void {
    this.wizard.updateData((current) => ({
      ...current,
      aufgaben: {
        tasks: current.aufgaben.tasks.filter((_, taskIndex) => taskIndex !== index)
      },
      teilnehmer: {
        participants: current.teilnehmer.participants.map((participant) => ({
          ...participant,
          pointsByTask: participant.pointsByTask.filter((_, taskIndex) => taskIndex !== index)
        }))
      },
      justierung: {
        ...current.justierung,
        droppedTaskIndexes: current.justierung.droppedTaskIndexes
          .filter((taskIndex) => taskIndex !== index)
          .map((taskIndex) => (taskIndex > index ? taskIndex - 1 : taskIndex)),
        adjustedMaxPointsByTask: current.justierung.adjustedMaxPointsByTask.filter((_, taskIndex) => taskIndex !== index)
      }
    }));
  }
}
