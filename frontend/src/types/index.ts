// src/types/index.ts - Update this file with improved Quiz types
export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Paragraph {
  id: number;
  content: string;
  level: 'A2' | 'B1' | 'B2' | 'C1';
  title?: string;
  topic?: string;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface SavedWord {
  id: number;
  word: string;
  context?: string;
  definition?: string;
  user_id: number;
  paragraph_id?: number;
  paragraph?: Paragraph;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestion {
  question?: string;
  sentence?: string;
  options?: Record<string, string> | string[];
  word?: string;
  correctAnswer: string | number;
}

export interface MatchingQuizData {
  words: string[];
  definitions: string[];
  matches: {
    word: string;
    definition: string;
    word_id: number;
  }[];
}

export interface QuizQuestions {
  questions?: QuizQuestion[];
  words?: string[];
  definitions?: string[];
  matches?: {
    word: string;
    definition: string;
    word_id: number;
  }[];
}

export interface Quiz {
  id: number;
  title: string;
  type: 'multiple_choice' | 'matching';
  user_id: number;
  questions: QuizQuestions;
  created_at: string;
  updated_at: string;
  attempts?: QuizAttempt[];
}

export interface QuizAttempt {
  id: number;
  user_id: number;
  quiz_id: number;
  answers: any[];
  score: number;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  links: { url: string | null; label: string; active: boolean }[];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}
