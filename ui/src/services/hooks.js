import useSWR from 'swr';
import { applyTemplate, checkPortAvailability, deleteTemplate, execCommand, getAppSettings, getConfigurations, getPodDetails, getPods, getProfiles, getTemplates, saveTemplate, startPortForwarding, stopPortForwarding, updateAppSettings } from './api';
// Fetcher function that wraps the API calls
const fetcher = async (url) => {
    if (url === 'pods') {
        throw new Error('Namespace is required for fetching pods');
    }
    if (url.startsWith('pods/')) {
        const [_, namespace] = url.split('/');
        return getPods(namespace);
    }
    if (url.startsWith('pod/')) {
        const [_, namespace, podName] = url.split('/');
        return getPodDetails(namespace, podName);
    }
    if (url === 'configurations') {
        return getConfigurations();
    }
    if (url === 'settings') {
        return getAppSettings();
    }
    if (url === 'templates') {
        return getTemplates();
    }
    throw new Error(`Unknown API endpoint: ${url}`);
};
// Hook for fetching pods in a namespace
export function usePods(namespace) {
    const { data, error, isLoading, mutate } = useSWR(namespace ? `pods/${namespace}` : null, fetcher);
    return {
        pods: data,
        isLoading,
        isError: error,
        mutate
    };
}
// Hook for fetching a specific pod's details
export function usePodDetails(namespace, podName) {
    const { data, error, isLoading } = useSWR(namespace && podName ? `pod/${namespace}/${podName}` : null, fetcher);
    return {
        pod: data,
        isLoading,
        isError: error
    };
}
// Hook for fetching port forwarding configurations
export function useConfigurations() {
    const { data, error, isLoading, mutate } = useSWR('configurations', fetcher);
    return {
        configurations: data,
        isLoading,
        isError: error,
        mutate
    };
}
// Hook for fetching application settings
export function useAppSettings() {
    const { data, error, isLoading, mutate } = useSWR('settings', fetcher);
    return {
        settings: data,
        isLoading,
        isError: error,
        mutate
    };
}
// Function to check port availability (not a hook, but a utility function)
export async function checkPortAvailabilityWithMutate(localPort) {
    return await checkPortAvailability(localPort);
}
// Function to start port forwarding (not a hook, but a mutation function)
export async function startPortForwardingWithMutate(namespace, podName, podPort, localPort, mutateConfigurations, force = false) {
    const result = await startPortForwarding(namespace, podName, podPort, localPort, force);
    if (result.success) {
        // Revalidate configurations after successful port forwarding
        await mutateConfigurations();
    }
    return result;
}
// Function to stop port forwarding (not a hook, but a mutation function)
export async function stopPortForwardingWithMutate(localPort, mutateConfigurations) {
    const result = await stopPortForwarding(localPort);
    if (result) {
        // Revalidate configurations after stopping port forwarding
        await mutateConfigurations();
    }
    return result;
}
// Function to update application settings (not a hook, but a mutation function)
export async function updateAppSettingsWithMutate(settings, mutateSettings) {
    const result = await updateAppSettings(settings);
    // Revalidate settings after update
    await mutateSettings();
    return result;
}
// Function to execute a command in a pod (not a hook, but a mutation function)
export async function execCommandWithMutate(namespace, podName, command, containerName) {
    return await execCommand(namespace, podName, command, containerName);
}
// Hook for fetching templates
export function useTemplates() {
    const { data, error, isLoading, mutate } = useSWR('templates', fetcher);
    return {
        templates: data,
        isLoading,
        isError: error,
        mutate
    };
}
// Function to save a template (not a hook, but a mutation function)
export async function saveTemplateWithMutate(name, mutateTemplates, body) {
    const result = await saveTemplate(name, body);
    if (result.success) {
        // Revalidate templates after successful save
        await mutateTemplates();
    }
    return result;
}
// Function to apply a template (not a hook, but a mutation function)
export async function applyTemplateWithMutate(name, mutateTemplates, mutateConfigurations) {
    const result = await applyTemplate(name);
    if (result.success) {
        // Revalidate templates and configurations after successful apply
        await mutateTemplates();
        await mutateConfigurations();
    }
    return result;
}
// Function to delete a template (not a hook, but a mutation function)
export async function deleteTemplateWithMutate(name, mutateTemplates) {
    const result = await deleteTemplate(name);
    if (result) {
        // Revalidate templates after successful delete
        await mutateTemplates();
    }
    return result;
}
export async function getProfilesWithMutate() {
    try {
        return await getProfiles();
    }
    catch (error) {
        console.error('Error fetching profiles:', error);
        return [];
    }
}
export function useProfiles() {
    const { data, error, isLoading, mutate } = useSWR('profiles', getProfilesWithMutate);
    return {
        profiles: data,
        isLoading,
        isError: error,
        mutate
    };
}
