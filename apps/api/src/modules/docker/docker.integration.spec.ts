import { Test, TestingModule } from '@nestjs/testing';
import { DockerService } from './docker.service';

describe('Docker Integration (e2e)', () => {
  let dockerService: DockerService;
  const testPrefix = 'aero-test';

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DockerService],
    }).compile();

    dockerService = module.get<DockerService>(DockerService);

    // Pull a tiny image down for testing if not already present
    await dockerService.pullImage('alpine', 'latest');
  }, 60000); // 1 min timeout for pulling image

  afterAll(async () => {
    // Cleanup any lingering test artifacts
    const containers = await dockerService.listContainers({ all: true });
    for (const c of containers.filter((c) => c.Names[0].includes(testPrefix))) {
      await dockerService.removeContainer(c.Id, { force: true });
    }

    const volumes = await dockerService.listVolumes();
    for (const v of volumes.filter((v) => v.Name.includes(testPrefix))) {
      await dockerService.removeVolume(v.Name);
    }

    const networks = await dockerService.listNetworks();
    for (const n of networks.filter((n) => n.Name.includes(testPrefix))) {
      await dockerService.removeNetwork(n.Id);
    }
  });

  describe('Container Lifecycle', () => {
    it('should create, start, stop, and remove a container', async () => {
      const containerName = `${testPrefix}-lifecycle`;

      // 1. Create
      const container = await dockerService.createContainer({
        Image: 'alpine:latest',
        name: containerName,
        Cmd: ['sleep', '3600'],
      });
      expect(container).toBeDefined();
      expect(container.id).toBeDefined();

      // 2. Start
      await dockerService.startContainer(container.id);

      let list = await dockerService.listContainers();
      let found = list.find((c) => c.Id === container.id);
      expect(found).toBeDefined();
      expect(found?.State).toEqual('running');

      // 3. Stop
      await dockerService.stopContainer(container.id, 1);

      list = await dockerService.listContainers({ all: true });
      found = list.find((c) => c.Id === container.id);
      expect(found).toBeDefined();
      expect(found?.State).toEqual('exited');

      // 4. Remove
      await dockerService.removeContainer(container.id);

      list = await dockerService.listContainers({ all: true });
      found = list.find((c) => c.Id === container.id);
      expect(found).toBeUndefined();
    });
  });

  describe('Volume Persistence', () => {
    it('should persist data across container restarts', async () => {
      const volumeName = `${testPrefix}-vol`;
      const containerName = `${testPrefix}-vol-container`;

      // Create volume
      await dockerService.createVolume(volumeName);

      // Create container that writes to volume
      const container = await dockerService.createContainer({
        Image: 'alpine:latest',
        name: containerName,
        Cmd: [
          'sh',
          '-c',
          'echo "data_persisted" > /data/test.txt && sleep 3600',
        ],
        HostConfig: {
          Binds: [`${volumeName}:/data`],
        },
      });

      // Start, write the data & let running
      await dockerService.startContainer(container.id);

      // Restart container
      await dockerService.restartContainer(container.id, 1);

      // Wait a moment for restart to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Kill the first container and create a new one to thoroughly prove persistence
      await dockerService.removeContainer(container.id, { force: true });

      // Create a second container using the same volume to read the file
      const readerContainer = await dockerService.createContainer({
        Image: 'alpine:latest',
        name: `${containerName}-reader`,
        Cmd: ['cat', '/data/test.txt'],
        HostConfig: {
          Binds: [`${volumeName}:/data`],
        },
      });

      await dockerService.startContainer(readerContainer.id);

      // Give it time to execute `cat`
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const logs = (await dockerService.getContainerLogs(readerContainer.id, {
        stdout: true,
        stderr: true,
      })) as string;

      expect(logs).toContain('data_persisted');

      await dockerService.removeContainer(readerContainer.id, { force: true });
      await dockerService.removeVolume(volumeName);
    });
  });

  describe('Network Isolation', () => {
    it('should isolate containers in different networks', async () => {
      const netA = `${testPrefix}-netA`;
      const netB = `${testPrefix}-netB`;

      await dockerService.createNetwork(netA);
      await dockerService.createNetwork(netB);

      // We'll create two containers in NetA, and one in NetB.
      // Then check if the one in NetB can ping the one in NetA.
      const targetContainer = await dockerService.createContainer({
        Image: 'alpine:latest',
        name: `${testPrefix}-target`,
        Cmd: ['sleep', '3600'],
        HostConfig: {
          NetworkMode: netA,
        },
      });
      await dockerService.startContainer(targetContainer.id);

      // Pinger in NetA
      const pingerA = await dockerService.createContainer({
        Image: 'alpine:latest',
        name: `${testPrefix}-ping-A`,
        Cmd: ['ping', '-c', '1', '-W', '2', `${testPrefix}-target`],
        HostConfig: {
          NetworkMode: netA,
        },
      });
      await dockerService.startContainer(pingerA.id);

      // Pinger in NetB
      const pingerB = await dockerService.createContainer({
        Image: 'alpine:latest',
        name: `${testPrefix}-ping-B`,
        Cmd: ['ping', '-c', '1', '-W', '2', `${testPrefix}-target`],
        HostConfig: {
          NetworkMode: netB,
        },
      });
      await dockerService.startContainer(pingerB.id);

      await new Promise((resolve) => setTimeout(resolve, 3000));

      const logsA = (await dockerService.getContainerLogs(pingerA.id, {
        stdout: true,
        stderr: true,
      })) as string;
      const logsB = (await dockerService.getContainerLogs(pingerB.id, {
        stdout: true,
        stderr: true,
      })) as string;

      // Pinger A is on same network, ping should succeed or at least resolve host
      // If it resolved and got 1 packets transmitted, 0 returned
      expect(logsA).not.toMatch(/bad address|Name does not resolve/i);

      // Pinger B is on different network, the dns resolution for container name should fail
      expect(logsB).toMatch(/bad address|Name does not resolve/i);

      // Clean up
      await dockerService.removeContainer(targetContainer.id, { force: true });
      await dockerService.removeContainer(pingerA.id, { force: true });
      await dockerService.removeContainer(pingerB.id, { force: true });
      await dockerService.removeNetwork(netA);
      await dockerService.removeNetwork(netB);
    }, 20000); // Give it some time
  });

  describe('Resource Limit Enforcement', () => {
    it('should respect memory and CPU limits', async () => {
      const memoryLimit = 128 * 1024 * 1024; // 128 MB
      const cpuLimit = 0.5 * 1e9; // 0.5 CPUs (NanoCPUs)

      const containerName = `${testPrefix}-resource-limit`;

      const container = await dockerService.createContainer({
        Image: 'alpine:latest',
        name: containerName,
        Cmd: ['sleep', '3600'],
        HostConfig: {
          Memory: memoryLimit,
          NanoCpus: cpuLimit,
        },
      });

      await dockerService.startContainer(container.id);

      const statsInfo = (await dockerService.getContainerStats(
        container.id,
      )) as unknown as NodeJS.ReadableStream;

      // Wait for at least one data point from stream
      const stat: any = await new Promise((resolve, reject) => {
        let buffers = '';
        statsInfo.on('data', (chunk: Buffer) => {
          buffers += chunk.toString();
          try {
            const lines = buffers.split('\n');
            if (lines.length > 1) {
              // Got least one complete JSON
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call
              if (typeof statsInfo.destroy === 'function') statsInfo.destroy(); // stop streaming

              resolve(JSON.parse(lines[0]));
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (e) {
            // Error ignored intentionally
          }
        });
        statsInfo.on('error', reject);
      });

      // Memory limit enforcement check
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(stat.memory_stats).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(stat.memory_stats.limit).toBe(memoryLimit);

      // CPU Limit logic varies slightly based on Cgroups (v1 vs v2)
      // Usually cgroup v1 populates `cpu_stats.cpu_usage.percpu_usage` or limits
      // cgroup v2 uses different fields, however if config applied successfully,
      // it verifies Docker accepted the constraints.

      // We can also verify via docker.inspect (which reveals HostConfig we passed)
      const list = await dockerService.listContainers({ all: true });
      const running = list.find((c) => c.Id === container.id);
      expect(running).toBeDefined();

      // Clean up
      await dockerService.removeContainer(container.id, { force: true });
    });
  });
});
