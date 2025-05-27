// Local storage keys
const NAMESPACE_KEY = 'k8s-dashboard-namespace';
// Get the saved namespace from local storage
export const getSavedNamespace = () => {
    return localStorage.getItem(NAMESPACE_KEY) || 'default';
};
// Save the namespace to local storage
export const saveNamespace = (namespace) => {
    localStorage.setItem(NAMESPACE_KEY, namespace);
};
