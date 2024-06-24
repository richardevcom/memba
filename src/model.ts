import {
  VertexAI,
  HarmBlockThreshold,
  HarmCategory,
} from '@google-cloud/vertexai';
import env from './env';
import { z } from 'zod';

const MAX_MESSAGE_RESOLVE_TRIES = 3;
const SYSTEM_PROMPT = `
### Current Date (UTC)
${new Date().toUTCString()}
### Input
<phone_number_string>: <reminder_string>
### Output
Unformatted JSON string (no delimiters) in the format: {"reminder_text": "<text>", "reminder_datetime": "<Unix timestamp ISO format>"}.
  - <text>: Extracted reminder text (without "Remind me to..." or phone number).
  - <Unix timestamp ISO format>: Parsed reminder date and time as Unix timestamp with timezone information (e.g., "2024-06-25T00:00:00+03:00").
### Processing
1. Extract reminder text:
  - Remove any introduction ("Remind me to...", "Please...") and phone number from the reminder string.
2. Parse reminder date and time:
  - If no date is provided, set it to today's date from the above current date.
  - If no year is provided, set it to the current year from the above current date.
  - If no time is provided, set it to one minute from the above current date.
  - If the reminder string includes abstract time definitions like "tomorrow" or "next week,"
    adjust the date accordingly (e.g., "tomorrow" adds one day, "next week" adds seven days).
3. Handle phone number (optional):
  - If a phone number is present, extract its country code and use the corresponding time zone for date/time parsing.
4. Convert reminder date and time to Unix timestamp with timezone information in ISO format from the above current date.
<reminder_date> should always be in future from the above current date.
5. Error handling:
  - If no reminder text or date/time information can be extracted, return an empty JSON string {}.
  - If any errors occur during processing, return an empty JSON string {}.
6. Make sure the JSON is parseable, contains the required fields and use double quotes for string keys and string values.
### Example
1. The input message format is "<phone Number>: <reminder string>" and the output is JSON adjusted for US Eastern Time (GMT-4)
  since the phone number is from the US.
  - Input: "+1464738291: Call Mom tomorrow at 9:00 AM"
  - Output: {"reminder_text": "Call Mom", "reminder_datetime": "2024-06-25T09:00:00-04:00"}
`;

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

/**
 * Get the response from the generative model
 * @param userMessage - The message from the user
 * @returns The converted message or null if no valid response
 */
export async function getGeminiResponse(
  userMessage: string,
  userPhone: string,
): Promise<ConvertedMessage | null> {
  let unparsedJson = null;
  const message = `${userPhone}: ${userMessage}`;
  console.log(`[rembo] sending gemini message: ${message}`);

  // get generative model
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

  // request gemini
  gemini: for (let i = 0; i < MAX_MESSAGE_RESOLVE_TRIES; ++i) {
    const geminiResult = (
      await generativeModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: message }] }],
      })
    )?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log(`[rembo] recieved gemini result ${i}: ${geminiResult}`);
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
