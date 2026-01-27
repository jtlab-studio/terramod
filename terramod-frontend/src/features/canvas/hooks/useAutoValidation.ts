import { useEffect } from 'react';

/**
 * Auto-validation hook - DISABLED for UX development
 * 
 * This hook is currently disabled to focus on UI/UX improvements.
 * Enable it later by uncommenting the validation logic.
 */
export const useAutoValidation = () => {
  useEffect(() => {
    // Validation disabled - focusing on UX first
    console.log('⏸️ Auto-validation is disabled during UX development');
  }, []);
};