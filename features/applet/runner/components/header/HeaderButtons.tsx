

export interface ButtonConfig {
    label: string;
    onClick: () => void;
  }
  
  
  
  export const HeaderButtonGroup = ({ buttons }: { buttons: ButtonConfig[] }) => {
      return (
          <div className="flex items-center gap-2">
              {buttons.map((button) => (
                  <button key={button.label} className="text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full px-2 py-2 text-gray-800 dark:text-gray-200">
                      {button.label}
                  </button>
              ))}
          </div>
      );
  };
  