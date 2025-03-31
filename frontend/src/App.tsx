// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import { AuthProvider, useAuth } from './contexts/AuthContext';

// Layout
import Layout from './components/Layout';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ParagraphsPage from './pages/ParagraphsPage';
import ParagraphDetailPage from './pages/ParagraphDetailPage';
import CreateParagraphPage from './pages/CreateParagraphPage';
import SavedWordsPage from './pages/SavedWordsPage';
import QuizzesPage from './pages/QuizzesPage';
import QuizDetailPage from './pages/QuizDetailPage';
import CreateQuizPage from './pages/CreateQuizPage';
import NotFoundPage from './pages/NotFoundPage';

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

// Create a theme with German colors
const theme = createTheme({
  palette: {
    primary: {
      main: '#202d5a', // Dark blue from German flag
      light: '#4e5986',
      dark: '#000032',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#dd0000', // Red from German flag
      light: '#ff4d30',
      dark: '#a30000',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8f9fa',
    },
  },
  typography: {
    fontFamily: "'Roboto', 'Arial', sans-serif",
    h1: {
      fontWeight: 500,
    },
    h2: {
      fontWeight: 500,
    },
    h3: {
      fontWeight: 500,
    },
  },
});

const AppContent: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<DashboardPage />} />
          <Route path="paragraphs" element={<ParagraphsPage />} />
          <Route path="paragraphs/create" element={<CreateParagraphPage />} />
          <Route path="paragraphs/:id" element={<ParagraphDetailPage />} />
          <Route path="saved-words" element={<SavedWordsPage />} />
          <Route path="quizzes" element={<QuizzesPage />} />
          <Route path="quizzes/create" element={<CreateQuizPage />} />
          <Route path="quizzes/:id" element={<QuizDetailPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
