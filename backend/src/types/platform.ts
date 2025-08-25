// Platform-specific types and configurations

export type Platform = 'render' | 'local' | 'heroku' | 'vercel' | 'aws' | 'azure' | 'gcp' | 'other';

export interface PlatformConfig {
  platform: Platform;
  memoryLimit: number; // MB
  maxConnections: number;
  requestTimeout: number; // ms
  healthCheckTimeout: number; // ms
  gcThreshold: number; // memory percentage to trigger GC
  connectionPoolSize: number;
  enableOptimizations: boolean;
  coldStartOptimization: boolean;
  lazyLoading: boolean;
}

export interface ResourceLimits {
  memory: {
    total: number; // MB
    available: number; // MB
    used: number; // MB
    percentage: number;
    approaching: boolean; // within 80% of limit
    critical: boolean; // within 95% of limit
  };
  cpu: {
    cores: number;
    usage: number; // percentage
    loadAverage: number[];
  };
  disk?: {
    total: number; // MB
    available: number; // MB
    used: number; // MB
    percentage: number;
  };
  network: {
    connections: number;
    maxConnections: number;
  };
}

export interface PlatformFeatures {
  autoScaling: boolean;
  persistentStorage: boolean;
  loadBalancer: boolean;
  healthChecks: boolean;
  environmentVariables: boolean;
  customDomains: boolean;
  ssl: boolean;
  logging: boolean;
  metrics: boolean;
  alerts: boolean;
}

export interface ColdStartOptimization {
  enabled: boolean;
  preloadModules: string[];
  lazyLoadServices: string[];
  skipNonCriticalInit: boolean;
  deferredTasks: string[];
  warmupEndpoints: string[];
}

export interface RenderSpecificConfig {
  serviceId?: string;
  region?: string;
  plan?: 'free' | 'starter' | 'standard' | 'pro' | 'enterprise';
  autoDeploy: boolean;
  buildCommand?: string;
  startCommand?: string;
  healthCheckPath: string;
  memoryLimit: number; // MB - Render free tier is 512MB
  cpuLimit: number; // CPU units
  diskLimit: number; // MB
  maxRequestDuration: number; // seconds
  sleepAfterInactivity: boolean;
  sleepDelay: number; // minutes
}