import {
  VertexAI,
  HarmBlockThreshold,
  HarmCategory,
} from '@google-cloud/vertexai';
import config from './config'; // Import the configuration

const vertexAi = new VertexAI({
  project: config.vertex.project,
  location: config.vertex.location,
});

const instructions =
  "Parse reminder text into JSON. Expected format: {'reminder_text': <text>, 'reminder_datetime': '<ISO 8601 extended format>'}.  1. Extract date and time from reminder text.  2. Parse the date and time together using a natural language format specifier (e.g., '%dth %B %Y %H:%M').  3. Convert the parsed datetime object to ISO 8601 extended format (e.g., 'YYYY-MM-DDTHH:mm:ss.sssZ'). Strip reminder intro text (e.g. 'Remind me to'). Return only JSON.";

const generativeModel = vertexAi.preview.getGenerativeModel({
  model: config.vertex.model,
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
    parts: [{ text: instructions }],
  },
});

export default generativeModel;
