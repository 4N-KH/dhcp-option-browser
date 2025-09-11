import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { AuthCredentialDto } from '../../domain/dto/auth-credential.dto';

@Injectable()
export class NiosClient {
  async testLogin(
    dto: AuthCredentialDto,
  ): Promise<{ ok: boolean; status?: number; message?: string }> {
    const { username, password } = dto;

    if (!username || !password) {
      return {
        ok: false,
        message: 'Missing credentials',
      };
    }

    try {
      const response = await axios.get('https://<your-host>/wapi/v2.10/grid', {
        auth: {
          username,
          password,
        },
        timeout: 5000,
        validateStatus: () => true,
      });

      if (response.status === 200) {
        return { ok: true };
      } else if (response.status === 401) {
        return {
          ok: false,
          status: 401,
          message: 'Unauthorized',
        };
      } else {
        return {
          ok: false,
          status: response.status,
          message: 'Unexpected response from server',
        };
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        return {
          ok: false,
          message: err.message,
        };
      }

      return {
        ok: false,
        message: 'Unknown error occurred',
      };
    }
  }
}
