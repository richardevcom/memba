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

const instructions = `Functionality:Parse reminder text into JSON format.Input:The text of the reminder and/or date, time.Output:JSON string in the format: {'reminder_text': "<text>", 'reminder_datetime': "<ISO 8601 extended format>"}. Don't include any introduction text likt "Hello...", "Remind me to...", "Please..." in reminder_text.Error handling:If the reminder text doesn't follow the expected format (e.g., missing date/time), return an empty JSON string {}.If the date/time is not set or can't be parsed, return an empty JSON string {}. If reminder_text is empty or not set, return an empty JSON string {}. If date is set, but time is not set, use current time. If time is set, but date is not set, use current date. Don't return the JSON string as markdown. Do not delimit the output JSON with anything. Translate the reminder_text to latvian. If reminder text contains abstract date, time meanings like "tomorrow", "next week", "next month", etc. then convert them to date, time as ISO8601 extended format - for example, "tomorrow" becomes <current_date> + 1 day or "next week" becomes <current_date> + 7 days, etc.`;

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
