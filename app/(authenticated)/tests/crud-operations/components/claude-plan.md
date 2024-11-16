lib/redux/form/
├── hooks/
│   ├── useEntityValidation.ts      # Validation logic and state
│   └── useEntityForm.ts            # Main form logic hook
├── types/
│   ├── validation.types.ts         # Validation related types
│   └── form.types.ts              # Form related types
└── components/
├── EntityFormGroup/
│   ├── index.ts
│   ├── EntityFormGroup.tsx     # Main form component
│   ├── FormHeader.tsx          # Title and action buttons
│   ├── FormContent.tsx         # Fields container
│   └── FormActions.tsx         # Save/Cancel buttons
└── common/
├── DeleteRecordAction.tsx  # Reusable delete action
└── SimpleFormField.tsx     # Base form field component
