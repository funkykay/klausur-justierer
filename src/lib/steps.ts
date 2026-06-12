import type { WizardStep } from './types';
import { validateAbschluss, validateBasis, validateJustierung, validateNotenschema } from './validation';
import BasisStep from './steps/BasisStep.svelte';
import NotenschemaStep from './steps/NotenschemaStep.svelte';
import JustierungStep from './steps/JustierungStep.svelte';
import AbschlussStep from './steps/AbschlussStep.svelte';

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
      id: 'notenschema',
      title: 'Notenschema',
      view: NotenschemaStep,
      validate: validateNotenschema,
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
    },
    {
      id: 'abschluss',
      title: 'Abschluss',
      view: AbschlussStep,
      validate: validateAbschluss,
      touched: false,
      validation: emptyValidation
    }
  ];
}