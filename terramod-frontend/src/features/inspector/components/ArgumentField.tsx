import React from 'react';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Checkbox from '../../../components/ui/Checkbox';
import { ArgumentType } from '../../../types/resource';

interface ArgumentFieldProps {
  name: string;
  value: any;
  type: ArgumentType;
  required: boolean;
  onChange: (value: any) => void;
}

const ArgumentField: React.FC<ArgumentFieldProps> = ({
  name,
  value,
  type,
  required,
  onChange,
}) => {
  const renderField = () => {
    switch (type) {
      case 'string':
        return (
          <Input
            label={name}
            value={value || ''}
            onChange={onChange}
            required={required}
          />
        );
      case 'number':
        return (
          <Input
            label={name}
            type="number"
            value={value || ''}
            onChange={(val) => onChange(Number(val))}
            required={required}
          />
        );
      case 'boolean':
        return (
          <Checkbox
            label={name}
            checked={value || false}
            onChange={onChange}
          />
        );
      case 'array':
      case 'object':
        return (
          <Input
            label={name}
            value={JSON.stringify(value || {})}
            onChange={(val) => {
              try {
                onChange(JSON.parse(val));
              } catch {
                onChange(val);
              }
            }}
            required={required}
          />
        );
      default:
        return (
          <Input
            label={name}
            value={value || ''}
            onChange={onChange}
            required={required}
          />
        );
    }
  };

  return <div>{renderField()}</div>;
};

export default ArgumentField;
