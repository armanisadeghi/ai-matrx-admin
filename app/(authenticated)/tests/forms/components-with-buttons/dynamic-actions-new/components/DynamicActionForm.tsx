import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import FieldAction from "./FieldAction";

const DynamicField = ({ field, value, onChange, onActionComplete, isNested = false }) => {

  const renderFieldByType = () => {
    // First check defaultComponent if it exists
    switch (field.defaultComponent?.toLowerCase()) {
      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={onChange}
            className="w-full min-h-[100px] bg-input/50 border border-border rounded-md text-foreground"
          />
        );
      case 'select':
        return (
          <Select value={value || ''} onValueChange={(val) => onChange({ target: { value: val }})}>
            <SelectTrigger className="w-full bg-input/50">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {(field.enumValues || []).map((option) => (
                <SelectItem key={option.value || option} value={option.value || option}>
                  {option.label || option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'input':
        return (
          <div className="relative w-full">
            <Input
              type="text"
              value={value || ''}
              onChange={onChange}
              className="w-full h-10 px-3 bg-input/50 border border-border rounded-md text-foreground"
            />
            {field.actions?.length > 0 && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                {field.actions.map((action, index) => (
                  <FieldAction
                    key={index}
                    action={action}
                    field={field}
                    value={value}
                    onChange={onChange}
                    fieldComponentProps={field.componentProps}
                    onActionComplete={onActionComplete}
                  />
                ))}
              </div>
            )}
          </div>
        );
    }

    // Then check type if no defaultComponent or for special handling
    switch (field.type) {
      case 'json':
        return (
          <div className="relative w-full">
            <Textarea
              value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value || ''}
              onChange={onChange}
              className="w-full min-h-[100px] font-mono text-sm bg-input/50 border border-border rounded-md text-foreground pr-12"
            />
            {field.actions?.length > 0 && (
              <div className="absolute right-2 top-2 flex gap-1">
                {field.actions.map((action, index) => (
                  <FieldAction
                    key={index}
                    action={action}
                    field={field}
                    value={value}
                    onChange={onChange}
                    fieldComponentProps={field.componentProps}
                    onActionComplete={onActionComplete}
                  />
                ))}
              </div>
            )}
          </div>
        );

      case 'relation':
      case 'custom':
        return (
          <div className="relative w-full">
            {field.component ? (
              <field.component
                {...field.componentProps}
                value={value}
                onChange={onChange}
                onActionComplete={onActionComplete}
              />
            ) : (
              <Input
                type="text"
                value={value || ''}
                onChange={onChange}
                className="w-full h-10 px-3 bg-input/50 border border-border rounded-md text-foreground"
              />
            )}
            {field.actions?.length > 0 && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                {field.actions.map((action, index) => (
                  <FieldAction
                    key={index}
                    action={action}
                    field={field}
                    value={value}
                    onChange={onChange}
                    fieldComponentProps={field.componentProps}
                    onActionComplete={onActionComplete}
                  />
                ))}
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="relative w-full">
            <Input
              type="text"
              value={value || ''}
              onChange={onChange}
              className="w-full h-10 px-3 bg-input/50 border border-border rounded-md text-foreground"
            />
            {field.actions?.length > 0 && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                {field.actions.map((action, index) => (
                  <FieldAction
                    key={index}
                    action={action}
                    field={field}
                    value={value}
                    onChange={onChange}
                    fieldComponentProps={field.componentProps}
                    onActionComplete={onActionComplete}
                  />
                ))}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="relative">
      <Label>{field.label}</Label>
      {renderFieldByType()}
    </div>
  );
};

const InlineFormCard = ({ parentField, initialValues = {}, onActionComplete }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [values, setValues] = useState(initialValues);
  const [activeInlineForms, setActiveInlineForms] = useState(new Set());

  const handleChange = (fieldId, e) => {
    setValues(prev => ({
      ...prev,
      [fieldId]: e.target.value
    }));
  };

  const handleNestedActionComplete = (fieldId) => {
    setActiveInlineForms(prev => {
      const next = new Set(prev);
      next.add(fieldId);
      return next;
    });
  };

  if (!isVisible) return null;

  return (
    <Card className="mt-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">
          {parentField.label} Details
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {parentField.inlineFields?.map((field) => (
            <React.Fragment key={field.id}>
              <DynamicField
                field={field}
                value={values[field.id]}
                onChange={(e) => handleChange(field.id, e)}
                onActionComplete={() => handleNestedActionComplete(field.id)}
                isNested={true}
              />
              {activeInlineForms.has(field.id) && field.inlineFields && (
                <div className="col-span-full">
                  <InlineFormCard
                    parentField={field}
                    initialValues={values[`${field.id}_inlineValues`]}
                    onActionComplete={handleNestedActionComplete}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="absolute right-2 top-2 p-1 hover:bg-gray-100 rounded-full"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </CardContent>
    </Card>
  );
};

const ActionForm = ({ fields }) => {
  const [values, setValues] = useState({});
  const [activeInlineForms, setActiveInlineForms] = useState(new Set());

  const handleChange = (fieldId, e) => {
    setValues(prev => ({
      ...prev,
      [fieldId]: e.target.value
    }));
  };

  const handleActionComplete = (fieldId, isOpen) => {
    if (!isOpen) {  // Only show inline form when action is completed
      setActiveInlineForms(prev => {
        const next = new Set(prev);
        next.add(fieldId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6 p-4">
      {fields.map((field) => (
        <React.Fragment key={field.id}>
          <DynamicField
            field={field}
            value={values[field.id]}
            onChange={(e) => handleChange(field.id, e)}
            onActionComplete={(isOpen) => handleActionComplete(field.id, isOpen)}
          />
          {activeInlineForms.has(field.id) && field.inlineFields && (
            <InlineFormCard
              parentField={field}
              initialValues={values[`${field.id}_inlineValues`]}
              onActionComplete={handleActionComplete}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default ActionForm;
