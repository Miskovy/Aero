export interface ContainerMetrics {
    cpuPercent: number;
    memoryUsageBytes: number;
    memoryLimitBytes: number;
    memoryPercent: number;
    networkRxBytes: number;
    networkTxBytes: number;
}