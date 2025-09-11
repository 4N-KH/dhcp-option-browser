import { AuthMode } from "../enum/auth-mode.enum";
import { Region } from "../enum/region.enum";

// Represents login request payload
export interface AuthCredentialDto {
  mode: AuthMode;
  username?: string;
  password?: string;
  apiKey?: string;
  region?: Region;
  remember: boolean;
}
