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
  terminalCommand: string;
  terminalHistory: CommandHistoryItem[];
  openTerminal: (pod: Pod) => void;
  closeTerminal: () => void;
  setTerminalCommand: (command: string) => void;
  executeCommand: (command: string) => Promise<void>;
}

/**
 * Custom hook for managing terminal commands
 * @returns Terminal command state and handlers
 */
export const useTerminalCommands = (): UseTerminalCommandsResult => {
  const [terminalDialogOpen, setTerminalDialogOpen] = useState<boolean>(false);
  const [currentPod, setCurrentPod] = useState<Pod | null>(null);
  const [terminalCommand, setTerminalCommand] = useState<string>('');
  const [terminalHistory, setTerminalHistory] = useState<CommandHistoryItem[]>([]);

  const openTerminal = (pod: Pod) => {
    setTerminalDialogOpen(true);
    setCurrentPod(pod);
    setTerminalCommand('');
    setTerminalHistory([]);
  };

  const closeTerminal = () => {
    setTerminalDialogOpen(false);
    setCurrentPod(null);
    setTerminalCommand('');
  };

  const executeCommand = async (command: string) => {
    if (!currentPod || !command.trim()) return;

    const trimmedCommand = command.trim();

    // Add the command to history with a "pending" output
    setTerminalHistory(prev => [
      ...prev,
      { command: trimmedCommand, output: `Executing command: ${trimmedCommand}...` }
    ]);

    try {
      // Execute the command using the API
      const result = await execCommandWithMutate(
        currentPod.metadata.namespace,
        currentPod.metadata.name,
        trimmedCommand
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
    }
  };

  return {
    terminalDialogOpen,
    currentPod,
    terminalCommand,
    terminalHistory,
    openTerminal,
    closeTerminal,
    setTerminalCommand,
    executeCommand
  };
};