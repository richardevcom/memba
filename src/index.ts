import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import MessagingResponse from 'twilio/lib/twiml/MessagingResponse';
import morgan from 'morgan';
import twilio from 'twilio';
import env from './env';
import { formatDistanceToNow } from 'date-fns';
import { getGeminiResponse } from './model';
import { db } from './db';
import { startScheduler } from './scheduler';

const UNAVAILABLE_COUNTRIES: Map<string, string> = new Map([
  ['RU', 'Russia'],
  ['IL', 'Israel'],
  ['PS', 'Palestine'],
  ['BY', 'Belarus'],
  ['AZ', 'Azerbaijan'],
  ['BD', 'Bangladesh'],
  ['CN', 'China'],
]);
const app = express();
startScheduler();

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
      url: env.API_ENDPOINT,
      authToken: env.TWILIO_AUTH_TOKEN,
    },
    env.TWILIO_AUTH_TOKEN,
  ),
  async (req: Request, res: Response) => {
    console.log(`[rembo] received sms message: ${JSON.stringify(req.body)}`);

    // multi tz countries are not supported
    if (
      req.body.FromCountry &&
      UNAVAILABLE_COUNTRIES.has(req.body.FromCountry)
    ) {
      const twiml = new MessagingResponse();
      twiml.message(
        `Sorry, I am unable to process requests from ${UNAVAILABLE_COUNTRIES.get(
          req.body.FromCountry,
        )}.`,
      );
      console.log(`[rembo] sending sms message: ${twiml.toString()}`);
      return res.type('text/xml').send(twiml.toString());
    }

    // process message
    const twiml = new MessagingResponse();
    try {
      const geminiResponse = await getGeminiResponse(
        req.body.Body,
        req.body.From,
      );
      if (geminiResponse) {
        const userPhone = req.body.From;
        const reminderDate = new Date(geminiResponse.reminder_datetime);
        const reminderText = geminiResponse.reminder_text;
        const formattedDate = formatDistanceToNow(reminderDate, {
          addSuffix: true,
        });
        const user = await db.user.findUnique({
          where: {
            phone: userPhone,
          },
          select: {
            id: true,
            phone: true,
            reminders: true,
          },
        });
        if (user) {
          const reminderAlreadyExists = user.reminders.find(
            (reminder) =>
              reminder.time === reminderDate && reminder.text === reminderText,
          );

          if (reminderAlreadyExists) {
            twiml.message(
              `A reminder for "${reminderText}" already exists with that date and message.`,
            );
          } else {
            await db.user.update({
              where: {
                id: user.id,
              },
              data: {
                reminders: {
                  create: {
                    time: reminderDate,
                    text: reminderText,
                    sent: false,
                  },
                },
              },
            });
            twiml.message(
              `A reminder for "${reminderText}" has been created. It'll occur ${formattedDate}.`,
            );
          }
        } else {
          await db.user.create({
            data: {
              phone: userPhone,
              reminders: {
                create: {
                  time: reminderDate,
                  text: reminderText,
                  sent: false,
                },
              },
            },
          });
          twiml.message(
            `A reminder for "${reminderText}" has been created for ${formattedDate}`,
          );
        }
      } else {
        throw new Error('Gemini response is null or undefined.');
      }
    } catch (e) {
      console.log(
        `[rembo] error processing message: ${JSON.stringify(e, null, 2)}`,
      );
      twiml.message(
        'Sorry, I am having trouble processing your reminder. Please try again.',
      );
    }
    console.log(`[rembo] sending sms message: ${twiml.toString()}`);
    res.type('text/xml').send(twiml.toString());
  },
);

app.listen(env.PORT, () => {
  console.log(`[rembo] server running on port ${env.HOST}:${env.PORT}`);
});
