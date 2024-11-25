// config/modal-configs.ts
import { helpContent } from './help-content';

export const modalConfigs = {
    // Form modal configuration
    form: {
        defaultConfig: {
            density: 'comfortable',
            animationPreset: 'smooth',
            size: 'default',
            position: 'center',
            closeOnOutsideClick: true,
            closeOnEscape: true,
            allowBackgroundInteraction: false
        },
        defaultControls: {
            showSave: true,
            showCancel: true,
            showClose: false
        },
        helpSource: 'modal.form'
    },

    // Confirmation modal configuration
    confirmation: {
        defaultConfig: {
            density: 'compact',
            animationPreset: 'quick',
            size: 'sm',
            position: 'center',
            closeOnOutsideClick: false,
            closeOnEscape: true,
            allowBackgroundInteraction: false
        },
        defaultControls: {
            showConfirm: true,
            showCancel: true,
            showClose: false
        },
        helpSource: 'modal.confirmation'
    },

    // Viewer modal configuration
    viewer: {
        defaultConfig: {
            density: 'spacious',
            animationPreset: 'smooth',
            size: 'lg',
            position: 'center',
            closeOnOutsideClick: true,
            closeOnEscape: true,
            allowBackgroundInteraction: true
        },
        defaultControls: {
            showClose: true
        },
        helpSource: 'modal.default'
    }
};

