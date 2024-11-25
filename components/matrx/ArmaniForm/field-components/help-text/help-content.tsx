import React from 'react';
import {HelpConfiguration, HelpContent} from './types';

export const helpContent: Record<string, HelpContent> = {
    'modal.default': {
        title: 'Using Modals',
        summary: 'Learn how to effectively use modal dialogs',
        mainContent: (
            <div className="space-y-4">
                <section>
                    <h4 className="font-medium mb-2">Modal Basics</h4>
                    <p className="text-sm">
                        Modals provide focused content and actions in an overlay window.
                    </p>
                    <ul className="text-sm list-disc list-inside mt-2">
                        <li>Click outside to close (if enabled)</li>
                        <li>Press ESC to dismiss (if enabled)</li>
                        <li>Use the control buttons to perform actions</li>
                    </ul>
                </section>
            </div>
        ),
        sections: [
            {
                title: 'Configuration',
                content: (
                    <div>
                        Customize modal behavior through density, animation, size, and position settings.
                    </div>
                )
            },
            {
                title: 'Controls',
                content: (
                    <div>
                        Add action buttons like Save, Cancel, and Close based on your needs.
                    </div>
                )
            }
        ],
        buttonLabels: ['Config', 'Controls'],
        variant: 'default',
        position: 'inline',
        draggable: false
    },

    'modal.form': {
        title: 'Form Modal Help',
        summary: 'Guide for form-based modals',
        mainContent: (
            <div className="space-y-4">
                <section>
                    <h4 className="font-medium mb-2">Form Guidelines</h4>
                    <p className="text-sm">
                        Form modals help collect structured data from users.
                    </p>
                    <ul className="text-sm list-disc list-inside mt-2">
                        <li>Fill in required fields</li>
                        <li>Validate before submission</li>
                        <li>Save or cancel your changes</li>
                    </ul>
                </section>
            </div>
        ),
        variant: 'primary'
    },

    'modal.confirmation': {
        title: 'Confirmation Dialog',
        summary: 'Understanding confirmation modals',
        mainContent: (
            <div className="space-y-4">
                <section>
                    <h4 className="font-medium mb-2">Confirmation Actions</h4>
                    <p className="text-sm">
                        Confirmation modals help prevent accidental actions.
                    </p>
                    <ul className="text-sm list-disc list-inside mt-2">
                        <li>Review the action details</li>
                        <li>Confirm or cancel the operation</li>
                        <li>Some actions cannot be undone</li>
                    </ul>
                </section>
            </div>
        ),
        variant: 'warning'
    }
};




// Define help content for the save changes modal
helpContent['modal.save-changes'] = {
    title: 'Saving Changes',
    summary: 'Learn about saving your changes',
    mainContent: (
        <div className="space-y-4">
            <section>
                <h4 className="font-medium mb-2">Save Options</h4>
                <p className="text-sm">
                    Review your changes before saving:
                </p>
                <ul className="text-sm list-disc list-inside mt-2">
                    <li>All fields are validated automatically</li>
                    <li>Required fields must be filled</li>
                    <li>Changes can't be undone after saving</li>
                </ul>
            </section>
        </div>
    ),
    variant: 'primary',
    position: 'fixed',
    draggable: true
};

// You can also organize help content by features/sections
helpContent['form.user-profile'] = {
    title: 'User Profile Help',
    summary: 'Guide to updating your profile',
    mainContent: (
        <div className="space-y-4">
            <section>
                <h4 className="font-medium mb-2">Profile Information</h4>
                <p className="text-sm">
                    Keep your profile information up to date.
                </p>
            </section>
        </div>
    ),
    sections: [
        {
            title: 'Privacy',
            content: (
                <div>Information about privacy settings and visibility options.</div>
            )
        },
        {
            title: 'Notifications',
            content: (
                <div>Configure how and when you receive notifications.</div>
            )
        }
    ],
    buttonLabels: ['Privacy', 'Notifications'],
    variant: 'default'
};
