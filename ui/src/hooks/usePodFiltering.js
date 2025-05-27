import { useState, useEffect } from 'react';
/**
 * Custom hook for filtering pods based on filter preference
 * @param pods The list of pods to filter
 * @param initialFilterPreference The initial filter preference
 * @returns The filtered pods and filter preference state
 */
export const usePodFiltering = (pods, initialFilterPreference = 'Services with listeners') => {
    const [filteredPods, setFilteredPods] = useState([]);
    const [filterPreference, setFilterPreference] = useState(initialFilterPreference);
    // Helper function to get exposed ports from a pod
    const getExposedPorts = (pod) => {
        const ports = [];
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
        }
        else {
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
