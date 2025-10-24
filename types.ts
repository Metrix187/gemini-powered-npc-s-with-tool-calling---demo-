import type { Chat } from "@google/genai";

/**
 * Represents a non-player character (NPC) in the game.
 * @interface
 */
export interface NPC {
  id: number;
  x: number;
  y: number;
  name: string;
  sprite: string;
  systemPrompt: string;
}

/**
 * Represents the player's position on the game grid.
 * @interface
 */
export interface PlayerPosition {
  x: number;
  y: number;
}

/**
 * Represents the possible directions the player can move.
 * @type {'up' | 'down' | 'left' | 'right'}
 */
export type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * Represents the result of a tool call.
 * @interface
 */
export interface ExecutedToolCall {
  name: string;
  result: any;
}

/**
 * Represents a message in a conversation.
 * @interface
 */
export interface ConversationMessage {
  role: 'user' | 'model';
  content: string;
  toolCalls?: ExecutedToolCall[];
}

/**
 * Represents a map of chat sessions, with the NPC ID as the key.
 * @type {Map<number, Chat>}
 */
export type ChatSessions = Map<number, Chat>;

/**
 * Represents the possible weather conditions.
 * @type {'sunny' | 'rainy' | 'snowy'}
 */
export type Weather = 'sunny' | 'rainy' | 'snowy';

/**
 * Represents the possible times of day.
 * @type {'day' | 'night'}
 */
export type TimeOfDay = 'day' | 'night';

/**
 * Represents the response from the Gemini API.
 * @interface
 */
export interface GeminiResponse {
  text: string;
  toolCalls: ExecutedToolCall[];
}
