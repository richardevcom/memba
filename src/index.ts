import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import twilio from 'twilio';
import MessagingResponse from 'twilio/lib/twiml/MessagingResponse';
import morgan from 'morgan';

dotenv.config();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || 'localhost';
if (!process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_ACCOUNT_SID) {
  throw new Error('TWILIO_AUTH_TOKEN or TWILIO_ACCOUNT_SID are missing.');
}

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
    process.env.TWILIO_AUTH_TOKEN,
  ),
  (req: Request, res: Response) => {
    console.log('requestdump:', {
      body: JSON.stringify(req.body, null, 2),
      headers: JSON.stringify(req.headers, null, 2),
    });
    const response = new MessagingResponse();
    response.message(
      `Hi! You just sent a message ${req.body.Body.length} characters long. This was sent from the express server.`,
    );

    res.type('text/xml').send(response.toString());
  },
);

app.listen(PORT, HOST, () => {
  console.log(
    `[rembo] server running on port ${process.env.HOST}:${process.env.PORT}`,
  );
});
