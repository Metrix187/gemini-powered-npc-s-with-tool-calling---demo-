import type { Chat } from "@google/genai";

export interface NPC {
  id: number;
  x: number;
  y: number;
  name: string;
  sprite: string;
  systemPrompt: string;
}

export interface PlayerPosition {
  x: number;
  y: number;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface ExecutedToolCall {
  name: string;
  result: any;
}

export interface ConversationMessage {
  role: 'user' | 'model';
  content: string;
  toolCalls?: ExecutedToolCall[];
}

export type ChatSessions = Map<number, Chat>;

export type Weather = 'sunny' | 'rainy' | 'snowy';
export type TimeOfDay = 'day' | 'night';

export interface GeminiResponse {
  text: string;
  toolCalls: ExecutedToolCall[];
}
