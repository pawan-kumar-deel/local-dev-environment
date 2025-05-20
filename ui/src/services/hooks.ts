import useSWR from 'swr';
import type { Pod, PortForwardConfig, AppSettings } from '../types';
import {
  getPods,
  getPodDetails,
  getConfigurations,
  getAppSettings,
  startPortForwarding,
  stopPortForwarding,
  updateAppSettings
} from './api';

// Fetcher function that wraps the API calls
const fetcher = async (url: string) => {
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

  throw new Error(`Unknown API endpoint: ${url}`);
};

// Hook for fetching pods in a namespace
export function usePods(namespace: string) {
  const { data, error, isLoading, mutate } = useSWR(
    namespace ? `pods/${namespace}` : null,
    fetcher
  );

  return {
    pods: data as Pod[] | undefined,
    isLoading,
    isError: error,
    mutate
  };
}

// Hook for fetching a specific pod's details
export function usePodDetails(namespace: string, podName: string) {
  const { data, error, isLoading } = useSWR(
    namespace && podName ? `pod/${namespace}/${podName}` : null,
    fetcher
  );

  return {
    pod: data as Pod | null | undefined,
    isLoading,
    isError: error
  };
}

// Hook for fetching port forwarding configurations
export function useConfigurations() {
  const { data, error, isLoading, mutate } = useSWR('configurations', fetcher);

  return {
    configurations: data as PortForwardConfig[] | undefined,
    isLoading,
    isError: error,
    mutate
  };
}

// Hook for fetching application settings
export function useAppSettings() {
  const { data, error, isLoading, mutate } = useSWR('settings', fetcher);

  return {
    settings: data as AppSettings | undefined,
    isLoading,
    isError: error,
    mutate
  };
}

// Function to start port forwarding (not a hook, but a mutation function)
export async function startPortForwardingWithMutate(
  namespace: string,
  podName: string,
  podPort: number,
  localPort: number,
  mutateConfigurations: () => Promise<any>
) {
  const result = await startPortForwarding(namespace, podName, podPort, localPort);
  if (result) {
    // Revalidate configurations after successful port forwarding
    await mutateConfigurations();
  }
  return result;
}

// Function to stop port forwarding (not a hook, but a mutation function)
export async function stopPortForwardingWithMutate(
  localPort: number,
  mutateConfigurations: () => Promise<any>
) {
  const result = await stopPortForwarding(localPort);
  if (result) {
    // Revalidate configurations after stopping port forwarding
    await mutateConfigurations();
  }
  return result;
}

// Function to update application settings (not a hook, but a mutation function)
export async function updateAppSettingsWithMutate(
  settings: Partial<AppSettings>,
  mutateSettings: () => Promise<any>
) {
  const result = await updateAppSettings(settings);
  // Revalidate settings after update
  await mutateSettings();
  return result;
}
