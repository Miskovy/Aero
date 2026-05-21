import { Test, TestingModule } from '@nestjs/testing';
import { CloudflareService } from './cloudflare.service';
import { DockerService } from '../docker/docker.service';

describe('CloudflareService', () => {
  let service: CloudflareService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudflareService,
        {
          provide: DockerService,
          useValue: {
            inspectContainer: jest.fn(),
            getContainer: jest.fn(),
            listContainers: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CloudflareService>(CloudflareService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
