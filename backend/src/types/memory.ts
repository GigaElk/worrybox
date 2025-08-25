// Memory management and monitoring types

export interface MemoryConfig {
  warningThreshold: number; // percentage (default: 80%)
  criticalThreshold: number; // percentage (default: 90%)
  emergencyThreshold: number; // percentage (default: 95%)
  gcTriggerThreshold: number; // percentage (default: 85%)
  monitoringInterval: number; // milliseconds (default: 30000)
  leakDetectionEnabled: boolean;
  leakDetectionSamples: number; // number of samples for trend analysis
  heapDumpEnabled: boolean;
  heapDumpPath: string;
  maxHeapDumps: number;
  cleanupStrategies: CleanupStrategy[];
}

export interface MemoryUsage {
  rss: number; // Resident Set Size (MB)
  heapTotal: number; // Total heap size (MB)
  heapUsed: number; // Used heap size (MB)
  external: number; // External memory (MB)
  arrayBuffers: number; // Array buffers (MB)
  usagePercentage: number; // Heap usage percentage
  timestamp: string;
}

export interface MemoryTrend {
  samples: MemoryUsage[];
  trend: 'increasing' | 'decreasing' | 'stable';
  growthRate: number; // MB per minute
  projectedExhaustion?: string; // ISO timestamp when memory might be exhausted
  leakSuspected: boolean;
  recommendations: string[];
}

export interface GarbageCollectionStats {
  totalCollections: number;
  totalDuration: number; // milliseconds
  averageDuration: number; // milliseconds
  lastCollection: string; // ISO timestamp
  collections: GCEvent[];
  efficiency: number; // percentage of memory freed
}

export interface GCEvent {
  timestamp: string;
  duration: number; // milliseconds
  memoryBefore: number; // MB
  memoryAfter: number; // MB
  memoryFreed: number; // MB
  type: 'manual' | 'automatic' | 'emergency';
  trigger: string;
}

export interface MemoryLeak {
  detected: boolean;
  confidence: number; // 0-100%
  growthRate: number; // MB per minute
  detectionTime: string;
  suspectedCause?: string;
  stackTrace?: string;
  recommendations: string[];
}

export interface CleanupStrategy {
  name: string;
  priority: number; // 1-10, higher is more important
  threshold: number; // memory percentage to trigger
  action: () => Promise<number>; // returns MB freed
  description: string;
  enabled: boolean;
}

export interface MemoryAlert {
  level: 'warning' | 'critical' | 'emergency';
  message: string;
  timestamp: string;
  memoryUsage: MemoryUsage;
  actionTaken?: string;
  correlationId?: string;
}

export interface MemoryPressureEvent {
  timestamp: string;
  level: 'low' | 'moderate' | 'high' | 'critical';
  memoryUsage: MemoryUsage;
  trigger: string;
  actionsPerformed: string[];
  memoryFreed: number; // MB
  duration: number; // milliseconds
  success: boolean;
}

export interface HeapSnapshot {
  timestamp: string;
  filename: string;
  size: number; // bytes
  memoryUsage: MemoryUsage;
  trigger: string;
  correlationId?: string;
}

export interface MemoryHealthReport {
  status: 'healthy' | 'warning' | 'critical' | 'emergency';
  currentUsage: MemoryUsage;
  trend: MemoryTrend;
  gcStats: GarbageCollectionStats;
  leakDetection: MemoryLeak;
  recentAlerts: MemoryAlert[];
  recentPressureEvents: MemoryPressureEvent[];
  recommendations: string[];
  nextCleanupIn?: number; // milliseconds
}