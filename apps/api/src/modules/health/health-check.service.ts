import { Injectable, Logger } from "@nestjs/common";
import { DockerService } from "../docker/docker.service"; 

@Injectable()
export class HealthCheckService {
    private readonly logger = new Logger(HealthCheckService.name);

    constructor(private readonly dockerService: DockerService) {}

    async waitForHealthy(containerId: string, timeoutMs: number = 60000): Promise<boolean> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            try {
                const info = await this.dockerService.inspectContainer(containerId);
                const state = info.State;
                if (state.Status === 'exited' || state.Status === 'dead') {
                    return false;
                }
                if (state.Health) {
                    if (state.Health.Status === 'healthy') return true;
                    if (state.Health.Status === 'unhealthy') return false; 
                } else {
                    if (state.Status === 'running' && (Date.now() - startTime > 5000)) {
                        return true;
                    }
                }
            } catch (error) {
                this.logger.warn(`Could not inspect container ${containerId}`);
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        return false;
    }
}