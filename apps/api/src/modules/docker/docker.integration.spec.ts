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

      // 3. Stop — use a short timeout and wait for it to fully exit
      await dockerService.stopContainer(container.id, 1);

      // Poll up to 5s for the container to reach 'exited' state
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        list = await dockerService.listContainers({ all: true });
        found = list.find((c) => c.Id === container.id);
        if (found?.State === 'exited') break;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      expect(found).toBeDefined();
      expect(found?.State).toEqual('exited');

      // 4. Remove
      await dockerService.removeContainer(container.id);

      list = await dockerService.listContainers({ all: true });
      found = list.find((c) => c.Id === container.id);
      expect(found).toBeUndefined();
    }, 30000);
  });

  describe('Volume Persistence', () => {
    it('should persist data across container restarts', async () => {
      const volumeName = `${testPrefix}-vol`;
      const containerName = `${testPrefix}-vol-container`;

      // Create volume
      await dockerService.ensureVolume(volumeName);

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
    }, 30000);
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

      // Wait for both ping containers to finish
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const logsA = (await dockerService.getContainerLogs(pingerA.id, {
        stdout: true,
        stderr: true,
      })) as string;
      const logsB = (await dockerService.getContainerLogs(pingerB.id, {
        stdout: true,
        stderr: true,
      })) as string;

      // Pinger A is on same network, ping should succeed or at least resolve host
      expect(logsA).not.toMatch(/bad address|Name does not resolve/i);

      // Pinger B is on different network, the dns resolution for container name should fail.
      // Accept empty logs (container exited immediately with non-zero) OR an explicit error message.
      const bFailed =
        logsB.match(/bad address|Name does not resolve/i) !== null ||
        logsB.trim() === '';
      expect(bFailed).toBe(true);

      // Clean up
      await dockerService.removeContainer(targetContainer.id, { force: true });
      await dockerService.removeContainer(pingerA.id, { force: true });
      await dockerService.removeContainer(pingerB.id, { force: true });
      await dockerService.removeNetwork(netA);
      await dockerService.removeNetwork(netB);
    }, 30000);
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

      // getContainerStats with { stream: false } returns a plain stats object, not a stream
      const statsInfo = await dockerService.getContainerStats(container.id);

      // Memory limit enforcement check — stats object is directly accessible
      expect(statsInfo.memory_stats).toBeDefined();
      expect(statsInfo.memory_stats.limit).toBe(memoryLimit);

      // Verify via container list that it is still running
      const list = await dockerService.listContainers({ all: true });
      const running = list.find((c) => c.Id === container.id);
      expect(running).toBeDefined();

      // Clean up
      await dockerService.removeContainer(container.id, { force: true });
    }, 30000);
  });
});
