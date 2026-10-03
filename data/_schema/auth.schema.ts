import { z } from "zod";
import { baseRecordSchema } from "./base.schema";

export const userRecordSchema = baseRecordSchema.extend({
  email: z.string().email().max(254),
  passwordHash: z.string().regex(/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/),
  name: z.string().min(1).max(120),
  active: z.boolean(),
});

export const authSessionRecordSchema = baseRecordSchema.extend({
  userId: z.string().min(1),
  tokenHash: z.string().regex(/^[a-f0-9]{64}$/),
  expiresAt: z.string().datetime(),
});

export type UserRecord = z.infer<typeof userRecordSchema>;
export type AuthSessionRecord = z.infer<typeof authSessionRecordSchema>;