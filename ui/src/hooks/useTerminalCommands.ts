import { useState } from 'react';
import type { Pod } from '../types';
import { execCommandWithMutate } from '../services/hooks';

interface CommandHistoryItem {
  command: string;
  output: string;
}

interface UseTerminalCommandsResult {
  terminalDialogOpen: boolean;
  currentPod: Pod | null;
  selectedPodName: string;
  availablePods: Pod[];
  isExecuting: boolean;
  terminalCommand: string;
  terminalHistory: CommandHistoryItem[];
  openTerminal: (pod: Pod, allPodsInService: Pod[]) => void;
  closeTerminal: () => void;
  setTerminalCommand: (command: string) => void;
  executeCommand: (command: string) => Promise<void>;
  changePod: (podName: string) => void;
}

/**
 * Custom hook for managing terminal commands
 * @returns Terminal command state and handlers
 */
export const useTerminalCommands = (): UseTerminalCommandsResult => {
  const [terminalDialogOpen, setTerminalDialogOpen] = useState<boolean>(false);
  const [currentPod, setCurrentPod] = useState<Pod | null>(null);
  const [availablePods, setAvailablePods] = useState<Pod[]>([]);
  const [selectedPodName, setSelectedPodName] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [terminalCommand, setTerminalCommand] = useState<string>('');
  const [terminalHistory, setTerminalHistory] = useState<CommandHistoryItem[]>([]);

  // Helper function to find a pod by name
  const findPodByName = (podName: string): Pod | undefined => {
    return availablePods.find(pod => pod.metadata.name === podName);
  };

  const openTerminal = (pod: Pod, allPodsInService: Pod[]) => {
    setTerminalDialogOpen(true);
    setCurrentPod(pod);
    setAvailablePods(allPodsInService);
    setSelectedPodName(pod.metadata.name);
    setTerminalCommand('');
    setTerminalHistory([]);
    setIsExecuting(false);
  };

  const closeTerminal = () => {
    setTerminalDialogOpen(false);
    setCurrentPod(null);
    setAvailablePods([]);
    setSelectedPodName('');
    setTerminalCommand('');
    setIsExecuting(false);
  };

  const changePod = (podName: string) => {
    const newPod = findPodByName(podName);
    if (newPod) {
      setCurrentPod(newPod);
      setSelectedPodName(podName);
      setTerminalHistory([]); // Clear history when pod changes
    }
  };

  const executeCommand = async (command: string) => {
    if (!currentPod || !command.trim() || isExecuting) return;

    const trimmedCommand = command.trim();
    setIsExecuting(true);

    // Add the command to history with a "pending" output
    setTerminalHistory(prev => [
      ...prev,
      { command: trimmedCommand, output: `Executing command: ${trimmedCommand}...` }
    ]);

    try {
      // Get the first container name from the pod
      const containerName = currentPod.spec.containers.length > 0 
        ? currentPod.spec.containers[0].name 
        : undefined;

      // Execute the command using the API
      const result = await execCommandWithMutate(
        currentPod.metadata.namespace,
        currentPod.metadata.name,
        trimmedCommand,
        containerName
      );

      // Update the command output in history
      setTerminalHistory(prev => {
        const newHistory = [...prev];
        const lastIndex = newHistory.length - 1;

        if (lastIndex >= 0) {
          newHistory[lastIndex] = {
            command: trimmedCommand,
            output: result.success 
              ? result.output || 'Command executed successfully (no output)' 
              : `Error: ${result.error || 'Unknown error'}`
          };
        }

        return newHistory;
      });
    } catch (error) {
      console.error('Error executing terminal command:', error);

      // Update the command output in history with the error
      setTerminalHistory(prev => {
        const newHistory = [...prev];
        const lastIndex = newHistory.length - 1;

        if (lastIndex >= 0) {
          newHistory[lastIndex] = {
            command: trimmedCommand,
            output: `Error executing command: ${error instanceof Error ? error.message : String(error)}`
          };
        }

        return newHistory;
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return {
    terminalDialogOpen,
    currentPod,
    selectedPodName,
    availablePods,
    isExecuting,
    terminalCommand,
    terminalHistory,
    openTerminal,
    closeTerminal,
    setTerminalCommand,
    executeCommand,
    changePod
  };
};
