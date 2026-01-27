export type DomainType = 
  | 'networking'
  | 'compute'
  | 'serverless'
  | 'data'
  | 'storage'
  | 'messaging'
  | 'identity'
  | 'observability'
  | 'edge';

export interface Position {
  x: number;
  y: number;
}

export interface DomainInput {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface DomainOutput {
  name: string;
  type: string;
  description?: string;
}

export interface Domain {
  id: string;
  name: string;
  type: DomainType;
  resourceIds: string[];
  inputs: DomainInput[];
  outputs: DomainOutput[];
  position: Position;
  width: number;
  height: number;
}
