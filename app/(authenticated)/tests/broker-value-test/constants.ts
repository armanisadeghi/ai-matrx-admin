import { BrokerValue, DataBroker, DataInputComponent } from './types';

// First, let's create our mock data stores:
export type MockStores = {
    brokers: Record<string, DataBroker>;
    inputComponents: Record<string, DataInputComponent>;
    brokerValues: Map<string, BrokerValue>;
};

export const mockData: MockStores = {
    brokers: {
        'theme.selection': {
            id: 'theme.selection',
            name: 'Theme Selection',
            defaultValue: 'system',
            dataType: 'str',
            inputComponent: 'theme-select',
            outputComponent: 'theme-display',
        },
        'system.volume': {
            id: 'system.volume',
            name: 'System Volume',
            defaultValue: '50',
            dataType: 'float',
            inputComponent: 'volume-slider',
            outputComponent: 'volume-display',
        },
        'notifications.enabled': {
            id: 'notifications.enabled',
            name: 'Notifications',
            defaultValue: 'false',
            dataType: 'bool',
            inputComponent: 'notif-switch',
            outputComponent: 'status-display',
        },
        'user.email': {
            id: 'user.email',
            name: 'User Email',
            defaultValue: '',
            dataType: 'str',
            inputComponent: 'email-input',
            outputComponent: 'text-display',
        },
    },

    inputComponents: {
        'theme-select': {
            id: 'theme-select',
            name: 'Theme Selector',
            description: 'Choose your preferred interface theme',
            options: [
                { label: 'Light Mode', value: 'light' },
                { label: 'Dark Mode', value: 'dark' },
                { label: 'System Default', value: 'system' },
            ],
            include_other: true,
            classes: 'max-w-xs',
            color_overrides: {
                light: '#ffffff',
                dark: '#1a1a1a',
            },
            component: 'BrokerSelect',
            min: null,
            max: null,
            step: null,
            min_rows: null,
            max_rows: null,
            acceptable_filetypes: null,
            src: null,
            additional_params: {
                placeholder: 'Select theme...',
            },
            sub_component: null,
        },

        'volume-slider': {
            id: 'volume-slider',
            name: 'Volume Control',
            description: 'Adjust the system volume level',
            min: 0,
            max: 100,
            step: 1,
            classes: 'max-w-md',
            component: 'BrokerSlider',
            options: null,
            include_other: null,
            min_rows: null,
            max_rows: null,
            acceptable_filetypes: null,
            src: null,
            color_overrides: null,
            additional_params: {
                showValue: true,
                valuePrefix: '',
                valueSuffix: '%',
            },
            sub_component: null,
        },

        'notif-switch': {
            id: 'notif-switch',
            name: 'Enable Notifications',
            description: 'Toggle system notifications on or off',
            classes: 'max-w-sm',
            component: 'BrokerSwitch',
            options: null,
            include_other: null,
            min: null,
            max: null,
            step: null,
            min_rows: null,
            max_rows: null,
            acceptable_filetypes: null,
            src: null,
            color_overrides: null,
            additional_params: {
                labelPosition: 'left',
                size: 'default',
            },
            sub_component: null,
        },

        'email-input': {
            id: 'email-input',
            name: 'Email Address',
            description: 'Enter your contact email address',
            classes: 'max-w-md',
            component: 'BrokerInput',
            options: null,
            include_other: null,
            min: null,
            max: null,
            step: null,
            min_rows: null,
            max_rows: null,
            acceptable_filetypes: null,
            src: null,
            color_overrides: null,
            additional_params: {
                type: 'email',
                placeholder: 'Enter your email...',
                validation: {
                    pattern: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$',
                    message: 'Please enter a valid email address',
                },
            },
            sub_component: null,
        },
    },

    brokerValues: new Map(),
};

const additionalMockData = {
    brokers: {
      'language.selection': {
        id: 'language.selection',
        name: 'Language Selection',
        defaultValue: 'en',
        dataType: 'str',
        inputComponent: 'lang-select',
        outputComponent: 'lang-display'
      },
      'music.volume': {
        id: 'music.volume',
        name: 'Music Volume',
        defaultValue: '70',
        dataType: 'float',
        inputComponent: 'music-slider',
        outputComponent: 'volume-display'
      },
      'dark.mode': {
        id: 'dark.mode',
        name: 'Dark Mode',
        defaultValue: 'false',
        dataType: 'bool',
        inputComponent: 'dark-switch',
        outputComponent: 'mode-display'
      },
      'user.name': {
        id: 'user.name',
        name: 'Username',
        defaultValue: '',
        dataType: 'str',
        inputComponent: 'name-input',
        outputComponent: 'text-display'
      }
    },
    
    inputComponents: {
      'lang-select': {
        id: 'lang-select',
        name: 'Interface Language',
        description: 'Select your preferred language',
        options: [
          { label: 'English', value: 'en' },
          { label: 'Spanish', value: 'es' },
          { label: 'French', value: 'fr' }
        ],
        include_other: false,
        classes: 'max-w-xs',
        component: 'BrokerSelect',
        additional_params: {
          placeholder: 'Choose language...'
        }
      },
      'music-slider': {
        id: 'music-slider',
        name: 'Music Level',
        description: 'Adjust the music volume',
        min: 0,
        max: 100,
        step: 5,
        classes: 'max-w-md',
        component: 'BrokerSlider',
        additional_params: {
          showValue: true,
          valueSuffix: '%'
        }
      },
      'dark-switch': {
        id: 'dark-switch',
        name: 'Dark Mode',
        description: 'Enable dark mode for the interface',
        classes: 'max-w-sm',
        component: 'BrokerSwitch',
        additional_params: {
          labelPosition: 'right',
          size: 'default'
        }
      },
      'name-input': {
        id: 'name-input',
        name: 'Username',
        description: 'Enter your preferred username',
        classes: 'max-w-md',
        component: 'BrokerInput',
        additional_params: {
          type: 'text',
          placeholder: 'Enter username...',
          validation: {
            pattern: '^[a-zA-Z0-9_-]{3,16}$',
            message: 'Username must be 3-16 characters and contain only letters, numbers, underscore, or hyphen'
          }
        }
      }
    }
  };
  
  // Merge the additional mock data with our existing mock data
  Object.assign(mockData.brokers, additionalMockData.brokers);
  Object.assign(mockData.inputComponents, additionalMockData.inputComponents);
  