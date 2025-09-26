import { AuthMode } from "../enum/auth-mode.enum";

// Represents login request payload
export interface AuthCredentialDto {
  mode: AuthMode;
  username?: string;
  password?: string;
  apiKey?: string;
  remember: boolean;
}
