import { GoogleGenAI, Chat, FunctionDeclaration, Type, GenerateContentResponse } from "@google/genai";
import { Weather, TimeOfDay, GeminiResponse, ExecutedToolCall } from '../types';

const apiKey = process.env.API_KEY;

if (!apiKey) {
  console.error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

const functionDeclarations: FunctionDeclaration[] = [
    {
      name: 'getWeather',
      description: 'Get the current weather.',
      parameters: { type: Type.OBJECT, properties: {} }
    },
    {
      name: 'getTimeOfDay',
      description: 'Get the current time of day (day or night).',
      parameters: { type: Type.OBJECT, properties: {} }
    }
  ];

/**
 * Creates a new chat session with a specific system prompt.
 * @param {string} systemPrompt - The system instruction for the AI model.
 * @returns {Chat} - A Chat instance.
 */
export function createChatSession(systemPrompt: string): Chat {
  const model = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: systemPrompt,
      tools: [{ functionDeclarations }],
    },
  });
  return model;
}

/**
 * Sends a message to an existing chat session and gets the response, handling tool calls.
 * @param {Chat} chat - The Chat instance to use.
 * @param {string} message - The user's message.
 * @param {Weather} weather - The current game weather.
 * @param {TimeOfDay} timeOfDay - The current game time of day.
 * @returns {Promise<GeminiResponse>} - An object containing the AI's text response and any tool calls it made.
 */
export async function sendMessage(
    chat: Chat, 
    message: string,
    weather: Weather,
    timeOfDay: TimeOfDay
): Promise<GeminiResponse> {
  const executedToolCalls: ExecutedToolCall[] = [];

  try {
    let response = await chat.sendMessage({ message });

    while (response.functionCalls && response.functionCalls.length > 0) {
      const functionCalls = response.functionCalls;
      
      const functionResponseParts = functionCalls.map(fc => {
        let result: string;
        if (fc.name === 'getWeather') {
          result = weather;
        } else if (fc.name === 'getTimeOfDay') {
          result = timeOfDay;
        } else {
          result = `Unknown function: ${fc.name}`;
        }
        
        executedToolCalls.push({ name: fc.name, result });

        return {
          functionResponse: {
            name: fc.name,
            response: { result },
          },
        };
      });

      response = await chat.sendMessage({ message: functionResponseParts });
    }

    return { text: response.text, toolCalls: executedToolCalls };
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    let errorMessage = "An unknown error occurred while contacting the AI.";
    if (error instanceof Error) {
        errorMessage = `An error occurred: ${error.message}. Please check your API key and network connection.`;
    }
    return { text: errorMessage, toolCalls: executedToolCalls };
  }
}
