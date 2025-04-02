// src/services/api.ts - Add new vocabulary service methods
import { api } from '../contexts/AuthContext';
import { User, Paragraph, SavedWord, Quiz, QuizAttempt, PaginatedResponse } from '../types';

// Auth Services
interface LoginResponse {
  message: string;
  user: User;
  token: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

interface LoginData {
  email: string;
  password: string;
}

export const authService = {
  register: (data: RegisterData) =>
    api.post<LoginResponse>('/register', data),
  login: (data: LoginData) =>
    api.post<LoginResponse>('/login', data),
  logout: () =>
    api.post<{ message: string }>('/logout'),
  getUser: () =>
    api.get<User>('/user'),
};

// Paragraph Services
interface CreateParagraphData {
  level: 'A2' | 'B1' | 'B2' | 'C1';
  topic?: string;
}

interface UpdateParagraphData {
  title?: string;
  content: string;
}

export const paragraphService = {
  getAll: (params?: any) =>
    api.get<PaginatedResponse<Paragraph>>('/paragraphs', { params }),
  getById: (id: number) =>
    api.get<Paragraph>(`/paragraphs/${id}`),
  create: (data: CreateParagraphData) =>
    api.post<{ message: string; paragraph: Paragraph }>('/paragraphs', data),
  update: (id: number, data: UpdateParagraphData) =>
    api.put<{ message: string; paragraph: Paragraph }>(`/paragraphs/${id}`, data),
  delete: (id: number) =>
    api.delete<{ message: string }>(`/paragraphs/${id}`),
};

// Saved Word Services
interface CreateSavedWordData {
  word: string;
  context?: string;
  paragraph_id?: number;
  category?: string;
}

interface UpdateSavedWordData {
  context?: string;
  definition?: string;
  category?: string;
}

interface BulkSaveWordsData {
  words: Array<{
    word: string;
    definition?: string;
  }>;
  category?: string;
}

export const savedWordService = {
  getAll: (params?: any) =>
    api.get<PaginatedResponse<SavedWord>>('/saved-words', { params }),
  getById: (id: number) =>
    api.get<SavedWord>(`/saved-words/${id}`),
  create: (data: CreateSavedWordData) =>
    api.post<{ message: string; savedWord: SavedWord }>('/saved-words', data),
  update: (id: number, data: UpdateSavedWordData) =>
    api.put<{ message: string; savedWord: SavedWord }>(`/saved-words/${id}`, data),
  delete: (id: number) =>
    api.delete<{ message: string }>(`/saved-words/${id}`),
  regenerateDefinition: (id: number) =>
    api.post<{ message: string; savedWord: SavedWord }>(`/saved-words/${id}/regenerate-definition`),
  getCategories: () =>
    api.get<{ categories: Record<string, string> }>('/vocabulary/categories'),
  generateCategoryWords: (category: string, count: number = 10) =>
    api.get<{ category: string; words: Array<{ word: string; definition: string }> }>('/vocabulary/generate', {
      params: { category, count }
    }),
  bulkSave: (data: BulkSaveWordsData) =>
    api.post<{ message: string; savedWords: SavedWord[]; errors: string[] }>('/vocabulary/bulk-save', data),
};

// Quiz Services
interface CreateQuizData {
  title: string;
  type: 'multiple_choice' | 'matching';
  word_ids?: number[];
  wordCount?: number;
  level?: 'all' | 'beginner' | 'intermediate' | 'advanced';
  source: 'selection' | 'recent' | 'random';
}

interface UpdateQuizData {
  title: string;
}

interface QuizAttemptData {
  answers: any[];
}

interface QuizAttemptResponse {
  message: string;
  quizAttempt: QuizAttempt;
  score: number;
  totalQuestions: number;
}

interface QuizStatsResponse {
  totalAttempts: number;
  avgScore: number;
  totalWords: number;
  totalQuestions: number;
}

export const quizService = {
  getAll: () =>
    api.get<PaginatedResponse<Quiz>>('/quizzes'),
  getById: (id: number) =>
    api.get<Quiz>(`/quizzes/${id}`),
  create: (data: CreateQuizData) =>
    api.post<{ message: string; quiz: Quiz }>('/quizzes', data),
  update: (id: number, data: UpdateQuizData) =>
    api.put<{ message: string; quiz: Quiz }>(`/quizzes/${id}`, data),
  delete: (id: number) =>
    api.delete<{ message: string }>(`/quizzes/${id}`),
  submitAttempt: (id: number, data: QuizAttemptData) =>
    api.post<QuizAttemptResponse>(`/quizzes/${id}/attempt`, data),
  getAttempts: (id: number) =>
    api.get<QuizAttempt[]>(`/quizzes/${id}/attempts`),
  getStats: () =>
    api.get<QuizStatsResponse>('/quizzes/stats'),
};
