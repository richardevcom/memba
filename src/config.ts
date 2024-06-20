import dotenv from 'dotenv';
import type { Config } from './types';

dotenv.config();

const config: Config = {
  server: {
    port: Number(process.env.PORT || 3000),
    host: process.env.HOST || 'localhost',
  },
  dburl: process.env.DATABASE_URL!,
  twilio: {
    authToken: process.env.TWILIO_AUTH_TOKEN!,
    accountSid: process.env.TWILIO_ACCOUNT_SID!,
    endpoint: process.env.TWILIO_ENDPOINT || 'https://your-api-endpoint.com', // Replace with your API endpoint URL
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
