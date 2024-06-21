import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const environmentSchema = z.object({
  PORT: z.string().default('3000'),
  HOST: z.string().default('localhost'),
  TWILIO_AUTH_TOKEN: z.string(),
  TWILIO_ACCOUNT_SID: z.string(),
  TWILIO_PHONE_NUMBER: z.string(),
  DATABASE_URL: z.string(),
  GCP_PROJECT_ID: z.string(),
  GCP_REGION: z.string(),
  VERTEX_MODEL: z.string().default('gemini-1.5-flash-001'),
  NODE_ENV: z.string().default('production'),
});

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof environmentSchema> {}
  }
}

const parsedEnvironemnt = environmentSchema.safeParse(process.env);
if (!parsedEnvironemnt.success) {
  throw new Error(
    `The environment variables is not correctly configured. ${reduceZodError(parsedEnvironemnt.error)}`,
  );
}

function reduceZodError(error: z.ZodError): string {
  return error.errors.map((e) => e.message).join(' ');
}

export default parsedEnvironemnt.data;
