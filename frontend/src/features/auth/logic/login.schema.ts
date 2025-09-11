import { z } from "zod";
import { AuthMode } from "@/types/enum/auth-mode.enum";
// import { Region } from "@/types/enum/region.enum";

// Defines login form schema with conditional validation
export const loginSchema = z
  .object({
    mode: z.nativeEnum(AuthMode),
    username: z.string().trim().optional(),
    password: z.string().trim().optional(),
    apiKey: z.string().trim().optional(),
    // region: z.nativeEnum(Region).optional(),
    remember: z.boolean(),
  })
  .superRefine((data, ctx) => {
    // Grid mode requires username and password
    if (data.mode === AuthMode.GRID) {
      if (!data.username) {
        ctx.addIssue({
          path: ["username"],
          code: z.ZodIssueCode.custom,
          message: "Username is required",
        });
      }
      if (!data.password) {
        ctx.addIssue({
          path: ["password"],
          code: z.ZodIssueCode.custom,
          message: "Password is required",
        });
      }
    }

    // CSP mode requires API key
    if (data.mode === AuthMode.CSP) {
      if (!data.apiKey) {
        ctx.addIssue({
          path: ["apiKey"],
          code: z.ZodIssueCode.custom,
          message: "API Key is required",
        });
      }
    }
  });

// Infers schema type for type safety
export type LoginSchemaData = z.infer<typeof loginSchema>;
