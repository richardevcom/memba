import dotenv from 'dotenv';
import type { Config } from './types';

dotenv.config();

const config: Config = {
  server: {
    port: Number(process.env.PORT || 3000),
    host: process.env.HOST || 'localhost',
  },
  mysql: {
    host: process.env.MYSQL_HOST!, // Use non-null assertion for required fields
    db: process.env.MYSQL_DB!,
    user: process.env.MYSQL_USER!,
    pass: process.env.MYSQL_PASS!,
  },
  twilio: {
    authToken: process.env.TWILIO_AUTH_TOKEN!,
    accountSid: process.env.TWILIO_ACCOUNT_SID!,
  },
  vertex: {
    project: process.env.VERTEX_PROJECT || 'charged-mind-426813-t5',
    location: process.env.VERTEX_LOCATION || 'europe-west1',
    model: process.env.VERTEX_MODEL || 'gemini-1.5-flash-001',
  },
};

// Error handling can be done here (optional)
if (!config.twilio.authToken || !config.twilio.accountSid) {
  throw new Error('TWILIO_AUTH_TOKEN or TWILIO_ACCOUNT_SID are missing.');
}

export default config;
