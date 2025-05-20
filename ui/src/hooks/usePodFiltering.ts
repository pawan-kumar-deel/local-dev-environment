import { useState, useEffect } from 'react';
import type { Pod, AppSettings } from '../types';

interface UsePodFilteringResult {
  filteredPods: Pod[];
  filterPreference: AppSettings['filterPreference'];
  setFilterPreference: (preference: AppSettings['filterPreference']) => void;
}

/**
 * Custom hook for filtering pods based on filter preference
 * @param pods The list of pods to filter
 * @param initialFilterPreference The initial filter preference
 * @returns The filtered pods and filter preference state
 */
export const usePodFiltering = (
  pods: Pod[] | undefined,
  initialFilterPreference: AppSettings['filterPreference'] = 'Services with listeners'
): UsePodFilteringResult => {
  const [filteredPods, setFilteredPods] = useState<Pod[]>([]);
  const [filterPreference, setFilterPreference] = useState<AppSettings['filterPreference']>(initialFilterPreference);

  // Helper function to get exposed ports from a pod
  const getExposedPorts = (pod: Pod): number[] => {
    const ports: number[] = [];
    pod.spec.containers.forEach(container => {
      if (container.ports) {
        container.ports.forEach(port => {
          ports.push(port.containerPort);
        });
      }
    });
    return ports;
  };

  // Apply filter when pods or filter preference changes
  useEffect(() => {
    if (!pods) {
      setFilteredPods([]);
      return;
    }

    if (filterPreference === 'All services') {
      setFilteredPods(pods);
    } else {
      // Filter pods with listeners
      const podsWithExposedPorts = pods.filter(pod => {
        const ports = getExposedPorts(pod);
        return ports.length > 0;
      });
      setFilteredPods(podsWithExposedPorts);
    }
  }, [pods, filterPreference]);

  return { filteredPods, filterPreference, setFilterPreference };
};