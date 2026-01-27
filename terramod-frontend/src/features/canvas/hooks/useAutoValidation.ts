import { useEffect, useRef } from 'react';
import { useInfraStore } from '../../../store/infraStore';
import { useValidationStore } from '../../../store/validationStore';
import { validateGraph } from '../../../api/graph';
import { VALIDATION_DEBOUNCE_MS } from '../../../config/constants';

/**
 * Auto-validation hook - runs validation automatically when graph changes
 * Debounces to avoid excessive API calls
 */
export const useAutoValidation = () => {
  const domains = useInfraStore((state) => Array.from(state.domains.values()));
  const resources = useInfraStore((state) => Array.from(state.resources.values()));
  const connections = useInfraStore((state) => Array.from(state.connections.values()));
  
  const setValidationResults = useValidationStore((state) => state.setValidationResults);
  const clearValidation = useValidationStore((state) => state.clearValidation);
  
  const isValidating = useRef(false);
  const validationTimer = useRef<number | null>(null);

  useEffect(() => {
    // Clear existing timer
    if (validationTimer.current !== null) {
      window.clearTimeout(validationTimer.current);
    }

    // If graph is empty, clear validation
    if (domains.length === 0 && resources.length === 0) {
      clearValidation();
      return;
    }

    // Debounce validation
    validationTimer.current = window.setTimeout(async () => {
      if (isValidating.current) {
        console.log('⏸️ Validation already running, skipping');
        return;
      }

      isValidating.current = true;
      console.log('🔍 Running auto-validation...');

      try {
        const graph = {
          domains,
          resources,
          connections
        };

        const result = await validateGraph(graph);

        if (result.ok) {
          // Convert API format to store format
          const errors = new Map(Object.entries(result.value.errors || {}));
          const warnings = new Map(Object.entries(result.value.warnings || {}));
          
          setValidationResults({ errors, warnings });
          
          const errorCount = Object.keys(result.value.errors || {}).length;
          const warningCount = Object.keys(result.value.warnings || {}).length;
          const blockingCount = Object.keys(result.value.blocking_errors || {}).length;
          
          console.log(`✅ Validation complete: ${errorCount} errors, ${warningCount} warnings, ${blockingCount} blocking`);
        } else {
          console.error('❌ Validation failed:', result.error);
        }
      } catch (error) {
        console.error('❌ Validation error:', error);
      } finally {
        isValidating.current = false;
      }
    }, VALIDATION_DEBOUNCE_MS);

    return () => {
      if (validationTimer.current !== null) {
        window.clearTimeout(validationTimer.current);
      }
    };
  }, [domains, resources, connections, setValidationResults, clearValidation]);
};
