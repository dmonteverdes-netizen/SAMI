import { RucBusinessDetails } from '../../../services/pseService';

export interface RucLookupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBusiness?: (business: RucBusinessDetails) => void;
}

export interface PresetRuc {
  ruc: string;
  name: string;
  regime?: string;
  condition?: string;
  activity?: string;
}

export interface TaxRiskEvaluation {
  positives: string[];
  warnings: string[];
}

export type ThemePaletteName = 'slate-dark' | 'slate-light' | 'high-contrast' | 'emerald' | 'warm';
