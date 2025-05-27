export interface Pod {
  metadata: {
    name: string;
    namespace: string;
    uid: string;
    creationTimestamp: string;
    labels?: {
      [key: string]: string;
    };
  };
  spec: {
    containers: {
      name: string;
      image: string;
      ports?: {
        containerPort: number;
        protocol: string;
      }[];
      env?: {
        name: string;
        value?: string;
        valueFrom?: {
          fieldRef?: {
            fieldPath: string;
          };
          secretKeyRef?: {
            name: string;
            key: string;
          };
          configMapKeyRef?: {
            name: string;
            key: string;
          };
        };
      }[];
    }[];
  };
  status: {
    phase: string;
    conditions: {
      type: string;
      status: string;
    }[];
    containerStatuses?: {
      name: string;
      ready: boolean;
      restartCount: number;
      state: {
        running?: {
          startedAt: string;
        };
        waiting?: {
          reason: string;
          message: string;
        };
        terminated?: {
          exitCode: number;
          reason: string;
          message: string;
        };
      };
    }[];
  };
}

export interface PodList {
  items: Pod[];
}

export interface PortForwardConfig {
  namespace: string;
  podName: string;
  podPort: number;
  localPort: number;
  createdAt: string;
}

export interface AppSettings {
  filterPreference: "Services with listeners" | "All services";
  namespace: string;
  refreshInterval?: "5s" | "10s" | "15s" | "30s" | "1m";
}

export interface Template {
  name: string;
  createdAt: string;
  configurations: PortForwardConfig[];
}
