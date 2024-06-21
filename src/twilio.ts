import twilio from 'twilio';
import config from './config'; // Import the configuration

const twilioMiddleware = twilio.webhook(
  {
    url: `https://rembo-4lewwrw27q-ew.a.run.app/message`,
  },
  config.twilio.authToken,
);

export default twilioMiddleware;
