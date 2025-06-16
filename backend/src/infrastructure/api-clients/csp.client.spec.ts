// Tests for CspClient
import { Test, TestingModule } from '@nestjs/testing';
import { CspClient } from './csp.client';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';

// Local AxiosResponse type to avoid TS errors
interface AxiosResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: any;
}

describe('CspClient', () => {
  let service: CspClient;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CspClient,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CspClient>(CspClient);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should return ok=true on 200 response', async () => {
    const mockResponse: AxiosResponse = {
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    };

    jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

    const result = await service.testLogin('FAKE_API_KEY');
    expect(result.ok).toBe(true);
    expect(result.message).toBeUndefined();
  });

  it('should return ok=false on 401 response', async () => {
    const mockResponse: AxiosResponse = {
      data: {},
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: {},
    };

    jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

    const result = await service.testLogin('FAKE_API_KEY');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
    expect(result.message).toBe('Unauthorized');
  });
});
