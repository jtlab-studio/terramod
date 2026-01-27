import { Position } from './domain';

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
  domainId: string;
  name: string;
  arguments: Record<string, any>;
  position: Position;
  validationState: ValidationState;
}
