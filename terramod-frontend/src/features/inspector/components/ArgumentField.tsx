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
  onBlur?: () => void;
}

const ArgumentField: React.FC<ArgumentFieldProps> = ({
  name,
  value,
  type,
  required,
  onChange,
  onBlur
}) => {
  const formatLabel = (fieldName: string): string => {
    return fieldName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderField = () => {
    switch (type) {
      case 'string':
        return (
          <Input
            label={formatLabel(name)}
            value={value || ''}
            onChange={onChange}
            onBlur={onBlur}
            required={required}
            placeholder={`Enter ${formatLabel(name).toLowerCase()}`}
          />
        );
      
      case 'number':
        return (
          <Input
            label={formatLabel(name)}
            type="number"
            value={value || ''}
            onChange={(val) => onChange(val ? Number(val) : '')}
            onBlur={onBlur}
            required={required}
            placeholder="0"
          />
        );
      
      case 'boolean':
        return (
          <div onBlur={onBlur}>
            <Checkbox
              label={formatLabel(name)}
              checked={value || false}
              onChange={onChange}
            />
          </div>
        );
      
      case 'array':
        return (
          <div>
            <label className="block text-sm font-medium mb-1">
              {formatLabel(name)}
              {required && <span className="text-red-600 ml-1">*</span>}
            </label>
            <textarea
              value={Array.isArray(value) ? JSON.stringify(value, null, 2) : '[]'}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  onChange(parsed);
                } catch {
                  onChange(e.target.value);
                }
              }}
              onBlur={onBlur}
              rows={4}
              className="w-full px-3 py-2 border rounded font-mono text-sm"
              placeholder="[]"
            />
          </div>
        );
      
      case 'object':
        return (
          <div>
            <label className="block text-sm font-medium mb-1">
              {formatLabel(name)}
              {required && <span className="text-red-600 ml-1">*</span>}
            </label>
            <textarea
              value={typeof value === 'object' ? JSON.stringify(value, null, 2) : '{}'}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  onChange(parsed);
                } catch {
                  onChange(e.target.value);
                }
              }}
              onBlur={onBlur}
              rows={6}
              className="w-full px-3 py-2 border rounded font-mono text-sm"
              placeholder="{}"
            />
          </div>
        );
      
      default:
        return (
          <Input
            label={formatLabel(name)}
            value={String(value || '')}
            onChange={onChange}
            onBlur={onBlur}
            required={required}
          />
        );
    }
  };

  return <div>{renderField()}</div>;
};

export default ArgumentField;
