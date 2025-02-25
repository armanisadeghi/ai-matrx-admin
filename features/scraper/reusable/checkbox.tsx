
export const Checkbox = ({ checked, onChange, label, ...props }) => {
    return (
      <label className="flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="mr-2 accent-current text-blue-500 dark:bg-white dark:border-gray-600"
          {...props}
        />
        {label && <span className="text-gray-800 dark:text-gray-200">{label}</span>}
      </label>
    );
  };
  
  