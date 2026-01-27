import { create } from 'zustand';
import { ValidationState } from '../types/resource';

interface ValidationResults {
  errors: Map<string, string[]>;
  warnings: Map<string, string[]>;
}

interface ValidationStoreState {
  errors: Map<string, string[]>;
  warnings: Map<string, string[]>;
  setValidationResults: (results: ValidationResults | any) => void;
  clearValidation: (id?: string) => void;
  getValidationState: (id: string) => ValidationState;
}

export const useValidationStore = create<ValidationStoreState>((set, get) => ({
  errors: new Map(),
  warnings: new Map(),

  setValidationResults: (results) => {
    // Handle both Map and plain object formats
    let errorsMap: Map<string, string[]>;
    let warningsMap: Map<string, string[]>;

    if (results.errors instanceof Map) {
      errorsMap = results.errors;
    } else if (results.errors && typeof results.errors === 'object') {
      errorsMap = new Map(Object.entries(results.errors));
    } else {
      errorsMap = new Map();
    }

    if (results.warnings instanceof Map) {
      warningsMap = results.warnings;
    } else if (results.warnings && typeof results.warnings === 'object') {
      warningsMap = new Map(Object.entries(results.warnings));
    } else {
      warningsMap = new Map();
    }

    set({
      errors: errorsMap,
      warnings: warningsMap,
    });
  },

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

    // Ensure errors and warnings are Maps
    const errors = state.errors instanceof Map ? state.errors : new Map();
    const warnings = state.warnings instanceof Map ? state.warnings : new Map();

    return {
      isValid: !errors.has(id) || errors.get(id)!.length === 0,
      errors: errors.get(id) || [],
      warnings: warnings.get(id) || [],
    };
  },
}));