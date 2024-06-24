import {
  VertexAI,
  HarmBlockThreshold,
  HarmCategory,
} from '@google-cloud/vertexai';
import env from './env';
import { z } from 'zod';

const MAX_MESSAGE_RESOLVE_TRIES = 3;
const SYSTEM_PROMPT = `
### Current Date (ISO)
${new Date().toISOString()}
### Input
<reminder_string>
### Output
Unformatted JSON string (no delimiters) in the format: {"reminder_text": "<text>", "reminder_datetime": "<ISO_format>"}.
  - <text>: Extracted reminder text (eg. "make coffee" etc.).
  - <ISO_format>: Parsed reminder date and time to ISO format (eg., "2024-06-25T00:00:00Z" etc.).
### Processing
1. Parse <reminder_text>:
  - Remove any introduction ("Remind me to...", "Please...") and phone number from the reminder string.
2. Parse <reminder_datetime>:
  - If no date is provided, set it to today's date from the above current date.
  - If no year is provided, set it to the current year from the above current date.
  - If no time is provided, set it to one minute from the above current date.
  - If the reminder string includes abstract time definitions like "tomorrow" or "next week,"
    adjust the date accordingly (e.g., "tomorrow" adds one day, "next week" adds seven days).
  - The date and time you parse should always be in future relative to the above current date.
  - The timezone will always be +0:00 in the ISO format.
3. Error handling:
  - If no reminder text or date/time information can be extracted, return an empty JSON string {}.
  - If any errors occur during processing, return an empty JSON string {}.
4. Make sure the JSON is parseable, contains the required fields and use double quotes for string keys and string values.
### Example
1. The input message format is "<reminder_string>" and the output is parseable JSON.
  - Current Date (ISO): "2024-06-24T16:33:08.888Z"
  - Input: "Call Mom tomorrow at 9:00 AM"
  - Output: {"reminder_text": "Call Mom", "reminder_datetime": "2024-06-25T09:00:00.000Z"}
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
  const now = new Date();

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
  for (let i = 0; i < MAX_MESSAGE_RESOLVE_TRIES; ++i) {
    console.log(`[rembo] sending gemini message attempt ${i}: ${userMessage}`);
    const geminiResult = (
      await generativeModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      })
    )?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log(`[rembo] recieved gemini result attempt ${i}: ${geminiResult}`);
    if (geminiResult) {
      const parsedMessage = convertedMessageSchema.safeParse(
        JSON.parse(geminiResult),
      );
      if (parsedMessage.success) {
        const reminderDate = new Date(parsedMessage.data.reminder_datetime);
        if (reminderDate < now) {
          continue;
        } else {
          return parsedMessage.data;
        }
      }
    }
  }

  // return null if no valid response
  return null;
}
