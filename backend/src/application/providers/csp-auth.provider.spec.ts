import { Test, TestingModule } from '@nestjs/testing';
import { CspAuthProvider } from './csp-auth.provider';
import {
  CspClient,
  CspAuthTestResult,
} from '../../infrastructure/api-clients/csp.client';
import { AuthCredentialDto } from '../../domain/dto/auth-credential.dto';
import { AuthMode } from '../../domain/enums/auth-mode.enum';
import { Region } from '../../domain/enums/region.enum';

// Unit tests for CspAuthProvider
describe('CspAuthProvider', () => {
  let provider: CspAuthProvider;
  let cspClient: {
    testLogin: jest.MockedFunction<(key: string) => Promise<CspAuthTestResult>>;
  };

  // Set up test module
  beforeEach(async () => {
    const mockCspClient = {
      testLogin: jest.fn<Promise<CspAuthTestResult>, [string]>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CspAuthProvider,
        {
          provide: CspClient,
          useValue: mockCspClient,
        },
      ],
    }).compile();

    provider = module.get<CspAuthProvider>(CspAuthProvider);
    cspClient = module.get(CspClient);
  });

  // Valid test DTO
  const validDto: AuthCredentialDto = {
    mode: AuthMode.CSP,
    username: undefined,
    password: undefined,
    apiKey: 'FAKE_API_KEY',
    region: Region.EU,
    remember: false,
  };

  // Success case
  it('should return success=true when CspClient returns ok=true', async () => {
    cspClient.testLogin.mockResolvedValue({ ok: true });

    const result = await provider.login(validDto);

    expect(result.success).toBe(true);
    expect(result.message).toBeUndefined();
    expect(cspClient.testLogin).toHaveBeenCalledWith(validDto.apiKey);
  });

  // Failure case: CspClient returns ok=false
  it('should return success=false when CspClient returns ok=false', async () => {
    cspClient.testLogin.mockResolvedValue({
      ok: false,
      status: 401,
      message: 'Unauthorized',
    });

    const result = await provider.login(validDto);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Unauthorized');
  });

  // Failure case: missing API key
  it('should return success=false if apiKey is missing', async () => {
    const dtoWithoutApiKey: AuthCredentialDto = {
      ...validDto,
      apiKey: undefined,
    };

    const result = await provider.login(dtoWithoutApiKey);

    expect(result.success).toBe(false);
    expect(result.message).toBe('API Key is required for CSP login');
    expect(cspClient.testLogin).not.toHaveBeenCalled();
  });
});
