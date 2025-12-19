// User & Auth Types
export interface UserProfile {
  nickname: string;
  birthdate: string;
  gender: '男性' | '女性' | '其他';
  interests: string;
}

// AI Character Types
export interface CharacterAttributes {
  gender: string;
  ageRange: string;
  personality: string;
  interests: string;
  occupation: string;
  customPrompt: string;
  avatarUrl: string; // Changed from ID to URL string for real images
}

export interface Character extends CharacterAttributes {
  name: string; // Generated or set default
  systemInstruction: string;
}

// Game State Types
export enum GameStage {
  LOGIN,
  PROFILE_SETUP,
  DASHBOARD,
  CHAR_SETUP,
  GAME_LOOP,
  HISTORY_VIEW,
  GAME_OVER_WIN,
  GAME_OVER_LOSS
}

export enum EventTrigger {
  NONE,
  DATE_PLAN_35,
  OUTFIT_65,
  GIFT_99
}

export interface Message {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  timestamp: number;
  affectionChange?: number; // For history review
  reason?: string; // Reason for affection change
}

export interface GameSession {
  id: string;
  startTime: number;
  user: UserProfile;
  character: Character;
  messages: Message[];
  affection: number;
  isFinished: boolean;
  result?: 'win' | 'loss';
}

// Event Data Types
export interface DatePlanSelection {
  morning: string;
  afternoon: string;
  evening: string;
}

export interface GiftOption {
  id: string;
  name: string;
  description: string;
  isLiked: boolean; // Hidden from user
  imageUrl: string;
}