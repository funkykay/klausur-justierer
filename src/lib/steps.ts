import type { WizardStep } from './types';
import {
  validateAufgaben,
  validateBasis,
  validateJustierung,
  validateNotenschema,
  validateTeilnehmer
} from './validation';
import BasisStep from './steps/BasisStep.svelte';
import AufgabenStep from './steps/AufgabenStep.svelte';
import NotenschemaStep from './steps/NotenschemaStep.svelte';
import TeilnehmerStep from './steps/TeilnehmerStep.svelte';
import JustierungStep from './steps/JustierungStep.svelte';

const emptyValidation = {
  valid: true,
  errors: {}
};

export function createSteps(): WizardStep[] {
  return [
    {
      id: 'basis',
      title: 'Basisdaten',
      view: BasisStep,
      validate: validateBasis,
      touched: false,
      validation: emptyValidation
    },
    {
      id: 'aufgaben',
      title: 'Aufgaben',
      view: AufgabenStep,
      validate: validateAufgaben,
      touched: false,
      validation: emptyValidation
    },
    {
      id: 'notenschema',
      title: 'Notenschema',
      view: NotenschemaStep,
      validate: validateNotenschema,
      touched: false,
      validation: emptyValidation
    },
    {
      id: 'teilnehmer',
      title: 'Teilnehmer',
      view: TeilnehmerStep,
      validate: validateTeilnehmer,
      touched: false,
      validation: emptyValidation
    },
    {
      id: 'justierung',
      title: 'Justierung',
      view: JustierungStep,
      validate: validateJustierung,
      touched: false,
      validation: emptyValidation
    }
  ];
}