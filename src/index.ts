import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import MessagingResponse from 'twilio/lib/twiml/MessagingResponse';
import generativeModel from './vertex';
import config from './config'; // Assuming config is simple JSON
import morgan from 'morgan';
import type { TwilioMessage } from './types';
import twilioMiddleware from './twilio';

const app = express();

// Security and parsing
app.use(helmet());
app.use(express.json());

// Disable header, logging
app.disable('x-powered-by');
app.use(morgan('combined'));

// Health check
app.get('/', (_: Request, res: Response) => res.send('Ok'));

app.post(
  '/message',
  twilioMiddleware,
  async (req: Request<TwilioMessage>, res: Response) => {
    const { Body } = req.body;

    console.log(`[rembo] received sms message: ${Body}`);

    const geminiResult = await generativeModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: Body }] }],
    });

    console.log(
      `[rembo] gemini response: ${JSON.stringify(geminiResult.response)}`,
    );

    const response = new MessagingResponse();
    response.message(`Hi! You sent a ${Body.length}-character message.`);
    res.type('text/xml').send(response.toString());
  },
);

app.listen(config.server.port, () => {
  console.log(`[rembo] server running on port ${config.server.port}`);
});
