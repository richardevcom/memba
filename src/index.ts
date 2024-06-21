import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import MessagingResponse from 'twilio/lib/twiml/MessagingResponse';
import generativeModel from './vertex';
import morgan from 'morgan';
import twilio from 'twilio';
import { z } from 'zod';
import env from './env';
import { format } from 'date-fns';

const MAX_MESSAGE_RESOLVE_TRIES = 5;
const messageSchema = z.object({
  reminder_text: z.string().min(1),
  reminder_datetime: z.string().min(1),
});

const app = express();

app.use(helmet()); // Security and parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms'),
);
app.disable('x-powered-by'); // Disable header, logging

// Health check
app.get('/', (_: Request, res: Response) => res.send('Ok'));

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

    let didParse = false;
    parseloop: for (let i = 0; i < MAX_MESSAGE_RESOLVE_TRIES; ++i) {
      const geminiResult = (
        await generativeModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: req.body.Body }] }],
        })
      )?.response?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (geminiResult) {
        const parsedMessage = messageSchema.safeParse(JSON.parse(geminiResult));
        if (parsedMessage.success) {
          didParse = true;
          const date = new Date(parsedMessage.data.reminder_datetime);
          const response = new MessagingResponse();
          response.message(
            `A reminder for "${parsedMessage.data.reminder_text}" has been set for ${format(date, 'PPPPpppp')}`,
          );
          res.type('text/xml').send(response.toString());
          break parseloop;
        }
      }
    }
    if (!didParse) {
      const response = new MessagingResponse();
      response.message('Sorry, I could not understand your message.');
      res.type('text/xml').send(response.toString());
    }
  },
);

app.listen(env.PORT, () => {
  console.log(`[rembo] server running on port ${env.HOST}:${env.PORT}`);
});
