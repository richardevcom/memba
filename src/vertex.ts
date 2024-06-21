import {
  VertexAI,
  HarmBlockThreshold,
  HarmCategory,
} from '@google-cloud/vertexai';
import env from './env';

const vertexAi = new VertexAI({
  project: env.GCP_PROJECT_ID,
  location: env.GCP_REGION,
});

const instructions = `
  Parse reminder text into JSON. Expected format: {'reminder_text': <text>, 'reminder_datetime': '<ISO 8601 extended format>'}.
  1. Extract date and time from reminder text.
  2. Parse the date and time together using a natural language format specifier (e.g., '%dth %B %Y %H:%M').
  3. Convert the parsed datetime object to ISO 8601 extended format (e.g., 'YYYY-MM-DDTHH:mm:ss.sssZ'). Strip reminder intro text (e.g. 'Remind me to'). Return only JSON.
  4. Do not delimit the output JSON with anything.
  5. Do not output anything else other than JSON.
`;

const generativeModel = vertexAi.preview.getGenerativeModel({
  model: env.VERTEX_MODEL,
  generationConfig: {
    maxOutputTokens: 1000, // Optional, can be passed in options
    temperature: 1, // Optional, can be passed in options
    topP: 0.95, // Optional, can be passed in options
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
    parts: [{ text: instructions }],
  },
});

export default generativeModel;
