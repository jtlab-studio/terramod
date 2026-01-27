import { create } from 'zustand';
import { ValidationState } from '../types/resource';

interface ValidationResults {
  errors: Map<string, string[]>;
  warnings: Map<string, string[]>;
}

interface ValidationStoreState {
  errors: Map<string, string[]>;
  warnings: Map<string, string[]>;
  setValidationResults: (results: ValidationResults) => void;
  clearValidation: (id?: string) => void;
  getValidationState: (id: string) => ValidationState;
}

export const useValidationStore = create<ValidationStoreState>((set, get) => ({
  errors: new Map(),
  warnings: new Map(),

  setValidationResults: (results) =>
    set({
      errors: results.errors,
      warnings: results.warnings,
    }),

  clearValidation: (id) =>
    set((state) => {
      if (id) {
        const newErrors = new Map(state.errors);
        const newWarnings = new Map(state.warnings);
        newErrors.delete(id);
        newWarnings.delete(id);
        return { errors: newErrors, warnings: newWarnings };
      }
      return { errors: new Map(), warnings: new Map() };
    }),

  getValidationState: (id) => {
    const state = get();
    return {
      isValid: !state.errors.has(id) || state.errors.get(id)!.length === 0,
      errors: state.errors.get(id) || [],
      warnings: state.warnings.get(id) || [],
    };
  },
}));
