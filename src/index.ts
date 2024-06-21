import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import MessagingResponse from 'twilio/lib/twiml/MessagingResponse';
import generativeModel from './vertex';
import config from './config'; // Assuming config is simple JSON
import morgan from 'morgan';
import type { TwilioMessage } from './types';
import twilioMiddleware from './twilio';
import { z } from 'zod';

const MAX_MESSAGE_RESOLVE_TRIES = 5;
const messageSchema = z.object({
  reminder_text: z.string().min(1),
  reminder_datetime: z.string().min(1),
});

const app = express();

app.use(helmet()); // Security and parsing
app.use(express.json());
app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms :body'),
);
app.disable('x-powered-by'); // Disable header, logging

// Health check
app.get('/', (_: Request, res: Response) => res.send('Ok'));

app.post(
  '/message',
  twilioMiddleware,
  async (req: Request<TwilioMessage>, res: Response) => {
    const { Body } = req.body;

    console.log(`[rembo] received sms message: ${JSON.stringify(req.body)}`);

    const response = new MessagingResponse();
    let didParse = false;
    parseloop: for (let i = 0; i < MAX_MESSAGE_RESOLVE_TRIES; ++i) {
      const geminiResult = (
        await generativeModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: Body }] }],
        })
      )?.response?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (geminiResult) {
        const parsedMessage = messageSchema.safeParse(JSON.parse(geminiResult));
        if (parsedMessage.success) {
          didParse = true;
          const date = new Date(parsedMessage.data.reminder_datetime);
          response.message(
            `A reminder for "${parsedMessage.data.reminder_text}" has been set for ${date.toLocaleString()}`,
          );
          break parseloop;
        }
      }
    }
    if (!didParse) {
      response.message('Sorry, I could not understand your message.');
    }
    console.log(`[rembo] sending sms response: ${response.toString()} `);
    res.type('text/xml').send(response.toString());
  },
);

app.listen(config.server.port, () => {
  console.log(`[rembo] server running on port ${config.server.port} `);
});
