import { AuthCredentialDto } from '../dto/auth-credential.dto';

export interface AuthProvider {
  login(
    dto: AuthCredentialDto,
  ): Promise<{ success: boolean; message?: string }>;
}
