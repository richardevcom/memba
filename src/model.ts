import {
  VertexAI,
  HarmBlockThreshold,
  HarmCategory,
} from '@google-cloud/vertexai';
import env from './env';
import { z } from 'zod';

const MAX_MESSAGE_RESOLVE_TRIES = 3;
const SYSTEM_PROMPT = `Functionality:Parse reminder text into JSON format.Input:The text of the reminder and/or date, time.Output:JSON string in the format: {'reminder_text': "<text>", 'reminder_datetime': "<ISO 8601 extended format>", 'reminder_recipient': '<recipient_telephone_number>'}. Don't include any introduction text like "Hello...", "Remind me to...", "Please..." in reminder_text.Error handling:If the reminder text doesn't follow the expected format (e.g., missing date/time), return an empty JSON string {}.If the date/time is not set or can't be parsed, return an empty JSON string {}. If reminder_text is empty or not set, return an empty JSON string {}. If date is set, but time is not set, use current time. If time is set, but date is not set, use current date. Don't return the JSON string as markdown. Do not delimit the output JSON with anything. If reminder text contains abstract date, time meanings like "tomorrow", "next week", "next month", etc. then convert them to date, time as ISO8601 extended format - for example, "tomorrow" becomes <current_date> + 1 day or "next week" becomes <current_date> + 7 days, etc. New Rules: 1. Timezone Adjustment: * Parse the reminder_recipient number code (e.g., +371 for Latvia). * Based on the code, determine the corresponding GMT offset (e.g., +371 translates to GMT+2). * When converting the parsed date/time to ISO 8601 format, adjust it to the recipient's timezone using the calculated offset. 2. Time Format Handling: * Identify if the reminder text includes AM or PM indicators. * If AM/PM is present, use a 12-hour time format for parsing. * If AM/PM is absent, use a 24-hour time format for parsing. 3. Year Handling: * If year is not specified in the reminder text, set the year to the current year.`;

// gemini response
const convertedMessageSchema = z.object({
  reminder_text: z.string().min(1),
  reminder_datetime: z.string().min(1),
});
type ConvertedMessage = z.infer<typeof convertedMessageSchema>;

// initialize gemini
const vertexAi = new VertexAI({
  project: env.GCP_PROJECT_ID,
  location: env.GCP_REGION,
});
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
    parts: [{ text: SYSTEM_PROMPT }],
  },
});

/**
 * Get the response from the generative model
 * @param userMessage - The message from the user
 * @returns The converted message or null if no valid response
 */
export async function getGeminiResponse(
  userMessage: string,
): Promise<ConvertedMessage | null> {
  let unparsedJson = null;

  // request gemini
  gemini: for (let i = 0; i < MAX_MESSAGE_RESOLVE_TRIES; ++i) {
    const geminiResult = (
      await generativeModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      })
    )?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log(`[rembo] gemini result ${i}: ${geminiResult}`);
    if (geminiResult) {
      unparsedJson = geminiResult;
      break gemini;
    }
  }

  // parse response if available
  if (unparsedJson) {
    const parsedMessage = convertedMessageSchema.safeParse(
      JSON.parse(unparsedJson),
    );
    if (parsedMessage.success) {
      return parsedMessage.data;
    }
  }

  // return null if no valid response
  return null;
}
