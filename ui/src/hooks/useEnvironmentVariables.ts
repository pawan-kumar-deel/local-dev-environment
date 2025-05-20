import { useState, useEffect } from 'react';
import type { Pod } from '../types';

export interface EnvVar {
  name: string;
  value: string;
  container: string;
}

interface UseEnvironmentVariablesResult {
  envVarsAnchorEl: HTMLElement | null;
  currentPod: Pod | null;
  filteredEnvVars: EnvVar[];
  searchTerm: string;
  handleEnvVarsClick: (event: React.MouseEvent<HTMLButtonElement>, pod: Pod) => void;
  handleEnvVarsClose: () => void;
  handleSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Custom hook for managing environment variables display
 * @returns Environment variables state and handlers
 */
export const useEnvironmentVariables = (): UseEnvironmentVariablesResult => {
  const [envVarsAnchorEl, setEnvVarsAnchorEl] = useState<HTMLElement | null>(null);
  const [currentPod, setCurrentPod] = useState<Pod | null>(null);
  const [filteredEnvVars, setFilteredEnvVars] = useState<EnvVar[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [allEnvVars, setAllEnvVars] = useState<EnvVar[]>([]);

  // Extract and format environment variables when pod changes
  useEffect(() => {
    if (!currentPod) {
      setAllEnvVars([]);
      setFilteredEnvVars([]);
      return;
    }

    const envVars: EnvVar[] = [];
    currentPod.spec.containers.forEach(container => {
      if (container.env) {
        container.env.forEach(env => {
          // Handle different types of env vars
          let value = env.value || '';
          if (env.valueFrom) {
            if (env.valueFrom.fieldRef) {
              value = `[Field Ref: ${env.valueFrom.fieldRef.fieldPath}]`;
            } else if (env.valueFrom.secretKeyRef) {
              value = `[Secret: ${env.valueFrom.secretKeyRef.name}.${env.valueFrom.secretKeyRef.key}]`;
            } else if (env.valueFrom.configMapKeyRef) {
              value = `[ConfigMap: ${env.valueFrom.configMapKeyRef.name}.${env.valueFrom.configMapKeyRef.key}]`;
            }
          }
          envVars.push({
            name: env.name,
            value,
            container: container.name
          });
        });
      }
    });

    setAllEnvVars(envVars);
    setFilteredEnvVars(envVars);
  }, [currentPod]);

  // Filter environment variables when search term changes
  useEffect(() => {
    if (!searchTerm.trim() || !allEnvVars.length) {
      setFilteredEnvVars(allEnvVars);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = allEnvVars.filter(
      env => env.name.toLowerCase().includes(term) || env.value.toLowerCase().includes(term)
    );
    setFilteredEnvVars(filtered);
  }, [searchTerm, allEnvVars]);

  const handleEnvVarsClick = (event: React.MouseEvent<HTMLButtonElement>, pod: Pod) => {
    setEnvVarsAnchorEl(event.currentTarget);
    setCurrentPod(pod);
    setSearchTerm('');
  };

  const handleEnvVarsClose = () => {
    setEnvVarsAnchorEl(null);
    setCurrentPod(null);
    setFilteredEnvVars([]);
    setSearchTerm('');
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  return {
    envVarsAnchorEl,
    currentPod,
    filteredEnvVars,
    searchTerm,
    handleEnvVarsClick,
    handleEnvVarsClose,
    handleSearchChange
  };
};