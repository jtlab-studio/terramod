import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { Domain } from '../../types/domain';
import { useUIStore } from '../../store/uiStore';
import { useInfraStore } from '../../store/infraStore';
import ResourceCard from './ResourceCard';
import ConnectionPort from './ConnectionPort';

interface DomainBoundaryProps {
  domain: Domain;
}

const DomainBoundary: React.FC<DomainBoundaryProps> = ({ domain }) => {
  const selectedId = useUIStore((state) => state.selectedId);
  const setSelectedId = useUIStore((state) => state.setSelectedId);
  const resources = useInfraStore((state) => 
    domain.resourceIds.map(id => state.resources.get(id)).filter(Boolean)
  );

  const isSelected = selectedId === domain.id;

  const handleClick = () => {
    setSelectedId(domain.id);
  };

  return (
    <Group x={domain.position.x} y={domain.position.y}>
      <Rect
        width={domain.width}
        height={domain.height}
        stroke={isSelected ? '#3B82F6' : '#6B7280'}
        strokeWidth={isSelected ? 3 : 1}
        fill="#F9FAFB"
        onClick={handleClick}
      />
      <Text
        text={domain.name}
        fontSize={16}
        fontStyle="bold"
        x={10}
        y={10}
      />
      {resources.map((resource) => (
        resource && <ResourceCard key={resource.id} resource={resource} />
      ))}
      {domain.inputs.map((input, idx) => (
        <ConnectionPort
          key={`input-${idx}`}
          domainId={domain.id}
          portType="input"
          portName={input.name}
        />
      ))}
      {domain.outputs.map((output, idx) => (
        <ConnectionPort
          key={`output-${idx}`}
          domainId={domain.id}
          portType="output"
          portName={output.name}
        />
      ))}
    </Group>
  );
};

export default DomainBoundary;
