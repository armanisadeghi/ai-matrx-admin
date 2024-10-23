interface FormCache {
    values: Record<string, any>;
    timestamp: number;
    formId: string;
}

class FormStateManager {
    private static readonly STORAGE_KEY = 'form_state_cache';
    private static readonly TTL = 1000 * 60 * 30; // 30 minutes

    static saveFormState(formId: string, values: Record<string, any>) {
        const cache: FormCache = {
            values,
            timestamp: Date.now(),
            formId
        };

        localStorage.setItem(
            `${this.STORAGE_KEY}_${formId}`,
            JSON.stringify(cache)
        );
    }

    static getFormState(formId: string) {
        const cached = localStorage.getItem(`${this.STORAGE_KEY}_${formId}`);
        if (!cached) return null;

        const cache: FormCache = JSON.parse(cached);
        if (Date.now() - cache.timestamp > this.TTL) {
            localStorage.removeItem(`${this.STORAGE_KEY}_${formId}`);
            return null;
        }

        return cache.values;
    }

    static clearFormState(formId: string) {
        localStorage.removeItem(`${this.STORAGE_KEY}_${formId}`);
    }
}
