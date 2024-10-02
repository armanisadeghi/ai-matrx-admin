
const toTitleCase = (str: string) => {
    return str
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
};

export { toTitleCase };
