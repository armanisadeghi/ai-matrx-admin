import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { X } from 'lucide-react';
import ActionPresentation from "./ActionPresentation";

const InlineFormCard = ({
  parentField,
  values,
  onValuesChange,
  onClose
}) => {
  if (!parentField.inlineFields?.length) return null;

  return (
    <Card className="mt-2 p-2 relative">
      <button
        onClick={onClose}
        className="absolute right-2 top-2 p-1 hover:bg-gray-100 rounded-full"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
        {parentField.inlineFields.map((field) => (
          <div key={field.id} className="relative">
            <Label className="text-sm">{field.label}</Label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={values[field.id] || ''}
                onChange={(e) => onValuesChange(field.id, e)}
                className="w-full h-8 px-2 pr-16 bg-input/50 border border-border rounded-md text-sm text-foreground"
              />
              <div className="absolute right-1 flex gap-1 scale-90">
                {field.actions?.map((action, index) => (
                  <ActionPresentation
                    key={index}
                    action={action}
                    field={field}
                    value={values[field.id]}
                    onChange={(e) => onValuesChange(field.id, e)}
                    actionProps={field.actionProps}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

const SimpleActionForm = ({ fields }) => {
  const [values, setValues] = useState({});
  const [visibleInlineForms, setVisibleInlineForms] = useState(new Set());

  const handleChange = (fieldId, e) => {
    setValues(prev => ({
      ...prev,
      [fieldId]: e.target.value
    }));
  };

  const handleActionComplete = (fieldId, isOpen) => {
    if (!isOpen) {
      setVisibleInlineForms(prev => {
        const next = new Set(prev);
        next.add(fieldId);
        return next;
      });
    }
  };

  const handleCloseInlineForm = (fieldId) => {
    setVisibleInlineForms(prev => {
      const next = new Set(prev);
      next.delete(fieldId);
      return next;
    });
  };

  return (
    <div className="space-y-6 p-4">
      {fields.map((field) => (
        <div key={field.id} className="relative">
          <Label>{field.label}</Label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={values[field.id] || ''}
              onChange={(e) => handleChange(field.id, e)}
              className="w-full h-10 px-3 pr-20 bg-input/50 border border-border rounded-md text-foreground"
            />
            <div className="absolute right-2 flex gap-1">
              {field.actions?.map((action, index) => (
                <ActionPresentation
                  key={index}
                  action={action}
                  field={field}
                  value={values[field.id]}
                  onChange={(e) => handleChange(field.id, e)}
                  actionProps={field.actionProps}
                  onActionComplete={(isOpen) => handleActionComplete(field.id, isOpen)}
                />
              ))}
            </div>
          </div>
          {visibleInlineForms.has(field.id) && (
            <InlineFormCard
              parentField={field}
              values={values}
              onValuesChange={handleChange}
              onClose={() => handleCloseInlineForm(field.id)}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default SimpleActionForm;
