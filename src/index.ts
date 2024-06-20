import config from './config';
import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import twilio from 'twilio';
import MessagingResponse from 'twilio/lib/twiml/MessagingResponse';
import morgan from 'morgan';
import generativeModel from './vertex';

const app = express();
app.use(helmet()); // adds important security headers to the response
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.disable('x-powered-by'); // disable the X-Powered-By header to reduce server fingerprint
app.use(morgan('combined')); // log all requests

// health check
app.get('/', (_req: Request, res: Response) => {
  res.send('Ok');
});

// webhook trigged by twillo when a message is sent to the phone number.
app.post(
  '/message',
  twilio.webhook(
    {
      url: `https://rembo-4lewwrw27q-ew.a.run.app/message`,
    },
    config.twilio.authToken,
  ),
  async (req: Request, res: Response) => {
    // gemini parse
    console.log(`[rembo] received sms message: ${req.body.Body}`);
    const gemini_result = await generativeModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: req.body.Body }] }],
    });
    console.log(
      `[rembo] gemini response: ${JSON.stringify(gemini_result.response)}`,
    );

    const response = new MessagingResponse();
    response.message(
      `Hi! You just sent a message ${req.body.Body.length} characters long. This was sent from the express server.`,
    );
    res.type('text/xml').send(response.toString());
  },
);

app.listen(config.server.port, config.server.host, () => {
  console.log(
    `[rembo] server running on port ${config.server.host}:${config.server.port}`,
  );
});
