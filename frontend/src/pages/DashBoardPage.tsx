// src/pages/DashboardPage.tsx
import React, { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Grid, Paper, Typography, Button, Divider,
  List, ListItem, ListItemText, CircularProgress,
  Card, CardContent, CardActions, Alert
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
import UserProgressComponent from '../components/dashboard/UserProgressComponent';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
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

        // Fetch quiz stats directly from the backend
        try {
          const quizStatsRes = await quizService.getStats();
          setQuizStats(quizStatsRes.data);
        } catch (error) {
          console.error('Error fetching quiz stats:', error);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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

      {/* User Progress Component */}
      <UserProgressComponent />

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
              {recentParagraphs.length}
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
              {recentWords.length}
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
              {quizStats.totalAttempts}
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
