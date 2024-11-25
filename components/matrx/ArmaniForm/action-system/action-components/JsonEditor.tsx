import React from "react";

export const JsonEditor = ({value, onChange}) => {
    const [error, setError] = React.useState(null);

    const handleChange = (e) => {
        try {
            const parsed = JSON.parse(e.target.value);
            setError(null);
            onChange({target: {value: parsed}});
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="space-y-2">
      <textarea
          value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
          onChange={handleChange}
          className="w-full min-h-[200px] p-3 font-mono bg-input border border-border rounded-md"
      />
            {error && (
                <p className="text-sm text-destructive">{error}</p>
            )}
        </div>
    );
};

