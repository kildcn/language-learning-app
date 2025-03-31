// src/services/api.ts
import axios from 'axios';
import { User, Paragraph, SavedWord, Quiz, QuizAttempt, PaginatedResponse } from '../types';

const API_URL = 'http://localhost:8000/api';

// Create an axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

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
}

interface UpdateSavedWordData {
  context?: string;
  definition?: string;
}

export const savedWordService = {
  getAll: () =>
    api.get<PaginatedResponse<SavedWord>>('/saved-words'),
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
};

// Quiz Services
interface CreateQuizData {
  title: string;
  type: 'multiple_choice' | 'fill_blank' | 'matching';
  word_ids: number[];
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
};

export default api;
