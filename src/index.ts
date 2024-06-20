import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import twilio from 'twilio';
import MessagingResponse from 'twilio/lib/twiml/MessagingResponse';
import morgan from 'morgan';
import {
  HarmBlockThreshold,
  HarmCategory,
  VertexAI,
} from '@google-cloud/vertexai';

dotenv.config();
const SYSTEM_PROMPT =
  process.env.PROMPT ||
  "Parse reminder text into JSON. Expected format: {'reminder_text': <text>, 'reminder_datetime': '<ISO 8601 extended format>'}.  1. Extract date and time from reminder text.  2. Parse the date and time together using a natural language format specifier (e.g., '%dth %B %Y %H:%M').  3. Convert the parsed datetime object to ISO 8601 extended format (e.g., 'YYYY-MM-DDTHH:mm:ss.sssZ'). Strip reminder intro text (e.g. 'Remind me to'). Return only JSON.";
const AI_MODEL = process.env.MODEL || 'gemini-1.5-flash-001';
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || 'localhost';
if (!process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_ACCOUNT_SID) {
  throw new Error('TWILIO_AUTH_TOKEN or TWILIO_ACCOUNT_SID are missing.');
}

// gemini initialization
const vertex_ai = new VertexAI({
  project: 'charged-mind-426813-t5',
  location: 'europe-west1',
});
const generativeModel = vertex_ai.preview.getGenerativeModel({
  model: AI_MODEL,
  generationConfig: {
    maxOutputTokens: 1000,
    temperature: 1,
    topP: 0.95,
  },
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
  ],
  systemInstruction: {
    role: 'system',
    parts: [
      {
        text: SYSTEM_PROMPT,
      },
    ],
  },
});

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

app.listen(PORT, HOST, () => {
  console.log(
    `[rembo] server running on port ${process.env.HOST}:${process.env.PORT}`,
  );
});
