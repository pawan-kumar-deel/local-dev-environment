import {useState} from 'react';
import type {Pod} from '../types';
import type {EnvVar} from './useEnvironmentVariables';

interface UsePrintEnvResult {
  printEnvAnchorEl: HTMLElement | null;
  currentPod: Pod | null;
  printEnvOutput: EnvVar[];
  searchTerm: string;
  handlePrintEnvClick: (event: React.MouseEvent<HTMLButtonElement>, pod: Pod) => void;
  handlePrintEnvClose: () => void;
  handleSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Custom hook for managing printenv command output display
 * @returns PrintEnv state and handlers
 */
export const usePrintEnv = (): UsePrintEnvResult => {
  const [printEnvAnchorEl, setPrintEnvAnchorEl] = useState<HTMLElement | null>(null);
  const [currentPod, setCurrentPod] = useState<Pod | null>(null);
  const [printEnvOutput, setPrintEnvOutput] = useState<EnvVar[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [allEnvVars, setAllEnvVars] = useState<EnvVar[]>([]);

  const handlePrintEnvClick = (event: React.MouseEvent<HTMLButtonElement>, pod: Pod) => {
    setPrintEnvAnchorEl(event.currentTarget);
    setCurrentPod(pod);
    setSearchTerm('');

    // Simulate executing printenv command
    const envVars: EnvVar[] = [];
    pod.spec.containers.forEach(container => {
      // Add simulated environment variables from printenv command
      envVars.push({
        name: 'PATH',
        value: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
        container: container.name
      });
      envVars.push({
        name: 'HOSTNAME',
        value: pod.metadata.name,
        container: container.name
      });
      envVars.push({
        name: 'KUBERNETES_PORT',
        value: 'tcp://10.96.0.1:443',
        container: container.name
      });

      // Add actual environment variables from pod spec
      if (container.env) {
        container.env.forEach(env => {
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
    setPrintEnvOutput(envVars);
  };

  const handlePrintEnvClose = () => {
    setPrintEnvAnchorEl(null);
    setCurrentPod(null);
    setPrintEnvOutput([]);
    setSearchTerm('');
    setAllEnvVars([]);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);

    if (!term.trim()) {
      setPrintEnvOutput(allEnvVars);
      return;
    }

    // Filter printenv output based on search term
    const filtered = allEnvVars.filter(env => 
      env.name.toLowerCase().includes(term) || 
      env.value.toLowerCase().includes(term)
    );

    setPrintEnvOutput(filtered);
  };

  return {
    printEnvAnchorEl,
    currentPod,
    printEnvOutput,
    searchTerm,
    handlePrintEnvClick,
    handlePrintEnvClose,
    handleSearchChange
  };
};