export type NodeType = 'resource' | 'domain';

export type ConnectionType = 'data' | 'dependency' | 'implicit';

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  sourceType: NodeType;
  targetType: NodeType;
  connectionType: ConnectionType;
  outputName?: string;
  inputName?: string;
}
