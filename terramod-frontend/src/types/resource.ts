import { Position } from './domain';
import { ResourceDeployment } from './deployment';

export type ArgumentType = 'string' | 'number' | 'boolean' | 'array' | 'object';

export interface ValidationState {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ResourceArgument {
  name: string;
  value: any;
  type: ArgumentType;
  required: boolean;
}

export interface Resource {
  id: string;
  type: string;
  domainId: string;  // Still use domain for module grouping
  name: string;
  arguments: Record<string, any>;

  // NEW: Deployment configuration
  deployment: ResourceDeployment;

  // Position no longer used in module view (kept for compatibility)
  position?: Position;

  validationState: ValidationState;
}