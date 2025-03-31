// src/pages/DashboardPage.tsx
import React, { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Grid, Paper, Typography, Button, Divider,
  List, ListItem, ListItemText, CircularProgress
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { paragraphService, savedWordService, quizService } from '../services/api';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    paragraphs: 0,
    savedWords: 0,
    quizzes: 0,
  });
  const [recentParagraphs, setRecentParagraphs] = useState<any[]>([]);
  const [recentWords, setRecentWords] = useState<any[]>([]);

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

        // Fetch stats
        setStats({
          paragraphs: paragraphsRes.data.total || 0,
          savedWords: wordsRes.data.total || 0,
          quizzes: 0, // We'll update this with the real count
        });

        // Fetch quiz count
        const quizzesRes = await quizService.getAll();
        setStats(prev => ({
          ...prev,
          quizzes: quizzesRes.data.total || 0
        }));
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
        Welcome, {user?.name}!
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
            }}
          >
            <Typography component="h2" variant="h6" color="primary" gutterBottom>
              Paragraphs
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
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
            }}
          >
            <Typography component="h2" variant="h6" color="primary" gutterBottom>
              Saved Words
            </Typography>
            <Typography component="p" variant="h4">
              {stats.savedWords}
            </Typography>
            <Box sx={{ mt: 'auto' }}>
              <Button
                component={RouterLink}
                to="/saved-words"
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
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
            }}
          >
            <Typography component="h2" variant="h6" color="primary" gutterBottom>
              Quizzes
            </Typography>
            <Typography component="p" variant="h4">
              {stats.quizzes}
            </Typography>
            <Box sx={{ mt: 'auto' }}>
              <Button
                component={RouterLink}
                to="/quizzes"
                color="primary"
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
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Recent Paragraphs</Typography>
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
                      primary={paragraph.title || `Paragraph #${paragraph.id}`}
                      secondary={`Level: ${paragraph.level} | Created: ${new Date(paragraph.created_at).toLocaleDateString()}`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box p={2} textAlign="center">
                <Typography color="textSecondary">
                  No paragraphs yet. Create your first one!
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Recent Saved Words</Typography>
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
                  <ListItem key={word.id}>
                    <ListItemText
                      primary={word.word}
                      secondary={word.definition?.substring(0, 60) + '...' || 'No definition'}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box p={2} textAlign="center">
                <Typography color="textSecondary">
                  No saved words yet. Start reading paragraphs to save words!
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
