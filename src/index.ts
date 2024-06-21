import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import MessagingResponse from 'twilio/lib/twiml/MessagingResponse';
import morgan from 'morgan';
import twilio from 'twilio';
import env from './env';
import { format } from 'date-fns';
import { getGeminiResponse } from './model';

const app = express();

// middlewares
app.use(helmet()); // Security and parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms'),
);
app.disable('x-powered-by'); // Disable header, logging

// Health check
app.get('/', (_: Request, res: Response) => res.send('Ok'));

// POST /message - trigged by twilio webhook
app.post(
  '/message',
  twilio.webhook(
    {
      url: `https://rembo-4lewwrw27q-ew.a.run.app/message`,
      authToken: env.TWILIO_AUTH_TOKEN,
    },
    env.TWILIO_AUTH_TOKEN,
  ),
  async (req: Request, res: Response) => {
    console.log(`[rembo] received sms message: ${JSON.stringify(req.body)}`);
    const geminiResponse = await getGeminiResponse(req.body.Body);
    const twiml = new MessagingResponse();
    if (geminiResponse) {
      twiml.message(
        `A reminder "${geminiResponse.reminder_text}" has been set for ${format(
          new Date(geminiResponse.reminder_datetime),
          'PPPPpppp',
        )}`,
      );
    } else {
      twiml.message('Sorry, I am having trouble understanding you.');
    }
    console.log(`[rembo] sending sms message: ${twiml.toString()}`);
    res.type('text/xml').send(twiml.toString());
  },
);

app.listen(env.PORT, () => {
  console.log(`[rembo] server running on port ${env.HOST}:${env.PORT}`);
});
