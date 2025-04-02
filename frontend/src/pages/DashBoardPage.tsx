// src/pages/DashboardPage.tsx
import React, { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Grid, Paper, Typography, Button, Divider,
  List, ListItem, ListItemText, CircularProgress,
  Card, CardContent, CardActions, CardHeader,
  LinearProgress, Tooltip, Alert
} from '@mui/material';
import {
  Add as AddIcon,
  School as SchoolIcon,
  EmojiEvents as EmojiEventsIcon,
  TrendingUp as TrendingUpIcon,
  InfoOutlined as InfoOutlinedIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { paragraphService, savedWordService, quizService } from '../services/api';
import { Quiz } from '../types';

// German level descriptions
const levelDescriptions: Record<string, string> = {
  'A2': 'Elementary (Grundstufe)',
  'B1': 'Intermediate (Mittelstufe)',
  'B2': 'Upper Intermediate (Fortgeschrittene)',
  'C1': 'Advanced (Fortgeschrittene Plus)',
};

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    paragraphs: 0,
    savedWords: 0,
    quizzes: 0,
    quizAvgScore: 0,
    currentLevel: '',
    levelProgress: 0,
  });
  const [recentParagraphs, setRecentParagraphs] = useState<any[]>([]);
  const [recentWords, setRecentWords] = useState<any[]>([]);
  const [quizStats, setQuizStats] = useState({
    totalAttempts: 0,
    avgScore: 0,
    totalWords: 0,
    totalQuestions: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch paragraphs
        const paragraphsRes = await paragraphService.getAll({ limit: 5 });
        setRecentParagraphs(paragraphsRes.data.data || []);

        // Fetch saved words
        const wordsRes = await savedWordService.getAll();
        setRecentWords((wordsRes.data.data || []).slice(0, 5));

        // Fetch quizzes for stats
        const quizzesRes = await quizService.getAll();
        const quizzes = quizzesRes.data.data || [];

        // Fetch quiz stats directly from the backend
        try {
          // Define a fallback method since the getStats endpoint might be missing
          if (typeof quizService.getStats === 'function') {
            const quizStatsRes = await quizService.getStats();
            setQuizStats(quizStatsRes.data);
          } else {
            // Fallback to calculating stats from available data
            calculateQuizStats(quizzes);
          }
        } catch (error) {
          console.error('Error fetching quiz stats:', error);
          // Fallback to calculating stats from available data if API fails
          calculateQuizStats(quizzes);
        }

        // Determine user's current German level based on activity
        let currentLevel = 'A2';
        let levelProgress = 20; // Default starting progress

        // Simple algorithm: more words saved and better quiz scores = higher level
        const wordCount = wordsRes.data.total || 0;
        const avgScore = quizStats.avgScore || 0;

        if (wordCount > 100 && avgScore > 80) {
          currentLevel = 'C1';
          levelProgress = 75;
        } else if (wordCount > 50 && avgScore > 70) {
          currentLevel = 'B2';
          levelProgress = 60;
        } else if (wordCount > 20 && avgScore > 60) {
          currentLevel = 'B1';
          levelProgress = 40;
        }

        setStats({
          paragraphs: paragraphsRes.data.total || 0,
          savedWords: wordsRes.data.total || 0,
          quizzes: quizzesRes.data.total || 0,
          quizAvgScore: avgScore,
          currentLevel,
          levelProgress,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Fallback method to calculate quiz stats if the API endpoint fails
  const calculateQuizStats = (quizzes: any[]) => {
    let totalAttempts = 0;
    let totalScore = 0;
    let totalQuestions = 0;

    // This would require backend changes to fetch all attempts in one go
    // Just calculate based on available data
    const quizzesWithAttempts = quizzes as (Quiz & { attempts?: any[] })[];
    for (const quiz of quizzesWithAttempts) {
      if (quiz.attempts && quiz.attempts.length) {
        quiz.attempts.forEach((attempt: any) => {
          totalScore += attempt.score;
          totalAttempts++;

          // Estimate number of questions (this is imperfect without backend changes)
          const questionCount = getQuestionCount(quiz);
          totalQuestions += questionCount;
        });
      }
    }

    const avgScore = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;

    setQuizStats({
      totalAttempts,
      avgScore,
      totalWords: totalScore,
      totalQuestions
    });
  };

  // Helper function to estimate question count for a quiz
  const getQuestionCount = (quiz: any): number => {
    if (!quiz.questions) return 0;

    if (quiz.type === 'multiple_choice') {
      const questions = quiz.questions.questions || [];
      return questions.length;
    } else if (quiz.type === 'matching') {
      const words = quiz.questions.words || [];
      return words.length;
    }

    return 0;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Willkommen, {user?.name}!
      </Typography>

      {/* Current Level Status */}
      <Card sx={{ mb: 4, backgroundColor: '#f5f5f5' }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center">
              <SchoolIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
              <Box>
                <Typography variant="h5" gutterBottom>
                  Your German Level: {stats.currentLevel} - {levelDescriptions[stats.currentLevel as keyof typeof levelDescriptions]}
                </Typography>
                <Box display="flex" alignItems="center" width="100%" maxWidth={600}>
                  <LinearProgress
                    variant="determinate"
                    value={stats.levelProgress}
                    sx={{ height: 10, width: '100%', borderRadius: 5 }}
                  />
                  <Tooltip title="Continue learning to advance to the next level">
                    <InfoOutlinedIcon sx={{ ml: 1, color: 'text.secondary' }} />
                  </Tooltip>
                </Box>
              </Box>
            </Box>
            <Box textAlign="right">
              <Typography variant="body2" color="textSecondary">
                Quiz Average Score
              </Typography>
              <Typography variant="h4" color={stats.quizAvgScore > 70 ? 'success.main' : 'warning.main'}>
                {stats.quizAvgScore}%
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {quizStats.totalAttempts} attempt{quizStats.totalAttempts !== 1 ? 's' : ''}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              borderLeft: '4px solid #202d5a', // Theme primary color
            }}
          >
            <Typography component="h2" variant="h6" color="primary" gutterBottom>
              German Texts
            </Typography>
            <Typography component="p" variant="h4">
              {stats.paragraphs}
            </Typography>
            <Box sx={{ mt: 'auto' }}>
              <Button
                component={RouterLink}
                to="/paragraphs"
                color="primary"
                size="small"
              >
                View all
              </Button>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              borderLeft: '4px solid #dd0000', // Theme secondary color
            }}
          >
            <Typography component="h2" variant="h6" color="secondary" gutterBottom>
              Vocabulary Words
            </Typography>
            <Typography component="p" variant="h4">
              {stats.savedWords}
            </Typography>
            <Box sx={{ mt: 'auto' }}>
              <Button
                component={RouterLink}
                to="/saved-words"
                color="secondary"
                size="small"
              >
                View all
              </Button>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              borderLeft: '4px solid #ffcc00', // Gold color for quizzes/achievement
            }}
          >
            <Typography component="h2" variant="h6" gutterBottom sx={{ color: '#b8860b' }}>
              German Quizzes
            </Typography>
            <Typography component="p" variant="h4">
              {stats.quizzes}
            </Typography>
            <Box sx={{ mt: 'auto' }}>
              <Button
                component={RouterLink}
                to="/quizzes"
                sx={{ color: '#b8860b' }}
                size="small"
              >
                View all
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }} elevation={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Recent German Texts</Typography>
              <Button
                component={RouterLink}
                to="/paragraphs/create"
                variant="contained"
                startIcon={<AddIcon />}
                size="small"
              >
                New
              </Button>
            </Box>
            <Divider />

            {recentParagraphs.length > 0 ? (
              <List>
                {recentParagraphs.map((paragraph) => (
                  <ListItem
                    key={paragraph.id}
                    button
                    component={RouterLink}
                    to={`/paragraphs/${paragraph.id}`}
                  >
                    <ListItemText
                      primary={paragraph.title || `German Text #${paragraph.id}`}
                      secondary={`Level: ${paragraph.level} | Created: ${new Date(paragraph.created_at).toLocaleDateString()}`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box p={2} textAlign="center">
                <Typography color="textSecondary">
                  No German texts yet. Create your first one!
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }} elevation={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Recently Saved German Words</Typography>
              <Button
                component={RouterLink}
                to="/quizzes/create"
                variant="contained"
                startIcon={<AddIcon />}
                size="small"
              >
                Create Quiz
              </Button>
            </Box>
            <Divider />

            {recentWords.length > 0 ? (
              <List>
                {recentWords.map((word) => (
                  <ListItem key={word.id} component={RouterLink} to="/saved-words" button>
                    <ListItemText
                      primary={word.word}
                      secondary={word.definition?.substring(0, 60) + (word.definition?.length > 60 ? '...' : '') || 'No definition'}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box p={2} textAlign="center">
                <Typography color="textSecondary">
                  No saved German words yet. Start reading texts to save words!
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Learning Tips Section */}
      <Paper sx={{ p: 3, mt: 4 }} elevation={1}>
        <Typography variant="h6" gutterBottom>
          German Learning Tips
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Box display="flex" alignItems="flex-start">
              <TrendingUpIcon color="primary" sx={{ mr: 1, mt: 0.5 }} />
              <Typography variant="body2">
                <strong>Daily Practice:</strong> Try to read at least one German text each day to build your vocabulary consistently.
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box display="flex" alignItems="flex-start">
              <SchoolIcon color="primary" sx={{ mr: 1, mt: 0.5 }} />
              <Typography variant="body2">
                <strong>Focus on Common Words:</strong> The 2000 most common German words make up about 80% of everyday speech.
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box display="flex" alignItems="flex-start">
              <EmojiEventsIcon color="primary" sx={{ mr: 1, mt: 0.5 }} />
              <Typography variant="body2">
                <strong>Test Yourself:</strong> Create quizzes regularly from your saved words to reinforce your memory.
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default DashboardPage;
