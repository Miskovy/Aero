import { Injectable } from '@nestjs/common';
import Docker, {
  ContainerInfo,
  ContainerStats,
  ImageBuildOptions,
} from 'dockerode';

@Injectable()
export class DockerService {
  private docker: Docker;

  constructor() {
    this.docker = new Docker(
      process.env.DOCKER_SOCKET
        ? { socketPath: process.env.DOCKER_SOCKET }
        : undefined,
    );
  }

  // Connection and Status
  async ping(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch (error) {
      console.error('Docker ping failed:', error);
      return false;
    }
  }

  async getInfo(): Promise<any> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const info = await this.docker.info();
      return info;
    } catch (error) {
      console.error('Failed to get Docker info:', error);
      throw error;
    }
  }

  async getVersion(): Promise<any> {
    try {
      const version = await this.docker.version();
      return version;
    } catch (error) {
      console.error('Failed to get Docker version:', error);
      throw error;
    }
  }

  // Container Management

  // Reading
  async listContainers(
    filters?: Docker.ContainerListOptions,
  ): Promise<ContainerInfo[]> {
    try {
      const containers = await this.docker.listContainers(filters);
      return containers;
    } catch (error) {
      console.error('Failed to list containers:', error);
      throw error;
    }
  }

  getContainer(containerId: string): Docker.Container {
    try {
      return this.docker.getContainer(containerId);
    } catch (error: unknown) {
      console.error('Failed to get container reference:', error);
      throw error;
    }
  }

  async getContainerStats(containerId: string): Promise<ContainerStats> {
    try {
      const container = this.docker.getContainer(containerId);
      const stats = await container.stats();
      return stats;
    } catch (error) {
      console.error('Failed to get container stats:', error);
      throw error;
    }
  }

  async getContainerLogs(
    containerId: string,
    options?: Docker.ContainerLogsOptions,
  ): Promise<string | NodeJS.ReadableStream> {
    try {
      const container = this.docker.getContainer(containerId);
      // By casting, we tell TypeScript to use the Promise overload
      const logs = await container.logs(
        options as Docker.ContainerLogsOptions & { follow: false },
      );
      return logs.toString('utf-8');
    } catch (error) {
      console.error('Failed to get container logs:', error);
      throw error;
    }
  }

  // Writing
  async createContainer(
    config: Docker.ContainerCreateOptions,
  ): Promise<Docker.Container> {
    try {
      const container = await this.docker.createContainer(config);
      return container;
    } catch (error) {
      console.error('Failed to create container:', error);
      throw error;
    }
  }

  async inspectContainer(containerId: string): Promise<Docker.ContainerInspectInfo> {
    try {
      const container = this.docker.getContainer(containerId);
      return await container.inspect();
    } catch (error: unknown) {
      console.error('Failed to inspect container:', error);
      throw error;
    }
  }

  async startContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.start();
    } catch (error) {
      console.error('Failed to start container:', error);
      throw error;
    }
  }

  async stopContainer(containerId: string, timeout?: number): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.stop({ t: timeout });
    } catch (error) {
      console.error('Failed to stop container:', error);
      throw error;
    }
  }

  async restartContainer(containerId: string, timeout?: number): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.restart({ t: timeout });
    } catch (error) {
      console.error('Failed to restart container:', error);
      throw error;
    }
  }

  async removeContainer(
    containerId: string,
    options?: Docker.ContainerRemoveOptions,
  ): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.remove(options);
    } catch (error) {
      console.error('Failed to remove container:', error);
      throw error;
    }
  }

  // only allows you to update CPU, Memory, and Restart Policies
  async editContainer(
    containerId: string,
    config: Partial<Docker.ContainerCreateOptions>,
  ): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.update(config);
    } catch (error) {
      console.error('Failed to edit container:', error);
      throw error;
    }
  }

  // Images Management

  // Reading
  async listImages(): Promise<Docker.ImageInfo[]> {
    try {
      const images = await this.docker.listImages();
      return images;
    } catch (error) {
      console.error('Failed to list images:', error);
      throw error;
    }
  }

  getImage(id: string): Docker.Image {
    try {
      const image = this.docker.getImage(id);
      return image;
    } catch (error) {
      console.error('Failed to get image:', error);
      throw error;
    }
  }

  // Writing
  async buildImage(
    context: string,
    options: ImageBuildOptions,
  ): Promise<NodeJS.ReadableStream> {
    try {
      const stream = await this.docker.buildImage(context, options);
      return stream;
    } catch (error) {
      console.error('Failed to build image:', error);
      throw error;
    }
  }

  async pullImage(image: string, tag: string = 'latest'): Promise<void> {
    return new Promise((resolve, reject) => {
      const fullImageName = `${image}:${tag}`;
      this.docker.pull(fullImageName, (err: Error, stream: NodeJS.ReadableStream) => {
        if (err) return reject(err);

        // docker.modem.followProgress waits for the download stream to completely finish
        this.docker.modem.followProgress(stream, onFinished, onProgress);

        function onFinished(err: Error | null, output: any[]) {
          if (err) return reject(err);
          resolve();
        }

        function onProgress(event: any) {
          // Optional: You could log download progress here if you wanted to
        }
      });
    });
  }

  async removeImage(imageId: string): Promise<void> {
    try {
      const image = this.docker.getImage(imageId);
      await image.remove();
    } catch (error) {
      console.error('Failed to remove image:', error);
      throw error;
    }
  }

  // Networks Management

  // Reading
  async listNetworks(): Promise<Docker.NetworkInspectInfo[]> {
    try {
      const networks = await this.docker.listNetworks();
      return networks;
    } catch (error) {
      console.error('Failed to list networks:', error);
      throw error;
    }
  }

  // Writing
  async createNetwork(
    name: string,
    options?: Docker.NetworkCreateOptions,
  ): Promise<Docker.Network> {
    try {
      const network = await this.docker.createNetwork({
        Name: name,
        ...options,
      });
      return network;
    } catch (error) {
      console.error('Failed to create network:', error);
      throw error;
    }
  }

  async removeNetwork(networkId: string): Promise<void> {
    try {
      const network = this.docker.getNetwork(networkId);
      await network.remove();
    } catch (error) {
      console.error('Failed to remove network:', error);
      throw error;
    }
  }

  async connectContainerToNetwork(
    containerId: string,
    networkId: string,
  ): Promise<void> {
    try {
      const network = this.docker.getNetwork(networkId);
      await network.connect({ Container: containerId });
    } catch (error) {
      console.error('Failed to connect container to network:', error);
      throw error;
    }
  }

  async disconnectContainerFromNetwork(
    containerId: string,
    networkId: string,
  ): Promise<void> {
    try {
      const network = this.docker.getNetwork(networkId);
      await network.disconnect({ Container: containerId });
    } catch (error) {
      console.error('Failed to disconnect container from network:', error);
      throw error;
    }
  }

  // Volumes Management

  // Reading
  async listVolumes(): Promise<Docker.VolumeInspectInfo[]> {
    try {
      const volumes = await this.docker.listVolumes();
      return volumes.Volumes || [];
    } catch (error) {
      console.error('Failed to list volumes:', error);
      throw error;
    }
  }

  getVolume(name: string): Docker.Volume {
    try {
      const volume = this.docker.getVolume(name);
      return volume;
    } catch (error) {
      console.error('Failed to get volume:', error);
      throw error;
    }
  }

  // Writing
  async createVolume(
    name: string,
    options?: Docker.VolumeCreateOptions[],
  ): Promise<Docker.VolumeCreateResponse> {
    try {
      const volume = await this.docker.createVolume({ Name: name, ...options });
      return volume;
    } catch (error) {
      console.error('Failed to create volume:', error);
      throw error;
    }
  }

  async removeVolume(name: string): Promise<void> {
    try {
      const volume = this.docker.getVolume(name);
      await volume.remove();
    } catch (error) {
      console.error('Failed to remove volume:', error);
      throw error;
    }
  }
}
