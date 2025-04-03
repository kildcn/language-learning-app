// src/components/dashboard/UserProgressComponent.tsx
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, LinearProgress,
  Grid, Card, CardContent, Tooltip,
  Chip, Divider, CircularProgress
} from '@mui/material';
import {
  School as SchoolIcon,
  EmojiEvents as EmojiEventsIcon,
  TrendingUp as TrendingUpIcon,
  Info as InfoIcon,
  Translate as TranslateIcon,
  MenuBook as BookIcon,
  Quiz as QuizIcon
} from '@mui/icons-material';
import { api } from '../../contexts/AuthContext';

interface ProgressData {
  level: number;
  cefr_equivalent: string;
  points: number;
  next_level: number;
  percentage_to_next_level: number;
  stats: {
    words_learned: number;
    quiz_score_avg: number;
    quiz_attempts: number;
    paragraphs_read: number;
  }
}

const UserProgressComponent: React.FC = () => {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserProgress();
  }, []);

  const fetchUserProgress = async () => {
    setLoading(true);
    try {
      const response = await api.get('/user/progress');
      setProgress(response.data);
    } catch (err) {
      console.error('Error fetching user progress:', err);
      setError('Failed to load your progress data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get color based on level
  const getLevelColor = (level: number): string => {
    if (level < 100) return '#4caf50'; // Green for A1
    if (level < 250) return '#8bc34a'; // Light Green for A2
    if (level < 500) return '#03a9f4'; // Blue for B1
    if (level < 750) return '#3f51b5'; // Indigo for B2
    if (level < 950) return '#9c27b0'; // Purple for C1
    return '#f44336'; // Red for C2
  };

  // Helper function to get level name
  const getLevelName = (level: number, cefrEquivalent: string): string => {
    return `Level ${level} (${cefrEquivalent})`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={2} bgcolor="#ffecef" borderRadius={1}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!progress) {
    return (
      <Box p={2}>
        <Typography>No progress data available.</Typography>
      </Box>
    );
  }

  return (
    <Card elevation={2} sx={{ mb: 4 }}>
      <CardContent>
        {/* User Level Information */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center">
            <SchoolIcon
              color="primary"
              sx={{
                fontSize: 40,
                mr: 2,
                color: getLevelColor(progress.level)
              }}
            />
            <Box>
              <Typography variant="h5" gutterBottom fontWeight="medium">
                {getLevelName(progress.level, progress.cefr_equivalent)}
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip
                  label={`${progress.points} Points`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Tooltip title="Next level">
                  <Typography variant="body2" color="textSecondary">
                    Next: Level {progress.next_level}
                  </Typography>
                </Tooltip>
              </Box>
            </Box>
          </Box>
          <Box textAlign="right">
            <Typography variant="body2" color="textSecondary">
              Progress to Next Level
            </Typography>
            <Typography variant="h4" sx={{ color: getLevelColor(progress.level) }}>
              {progress.percentage_to_next_level}%
            </Typography>
          </Box>
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 4 }}>
          <LinearProgress
            variant="determinate"
            value={progress.percentage_to_next_level}
            sx={{
              height: 12,
              borderRadius: 6,
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 6,
                backgroundColor: getLevelColor(progress.level),
              }
            }}
          />
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Stats Grid */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Box display="flex" alignItems="center">
              <TranslateIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="body1" fontWeight="medium">
                {progress.stats.words_learned} Words Learned
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box display="flex" alignItems="center">
              <QuizIcon sx={{ mr: 1, color: 'secondary.main' }} />
              <Typography variant="body1" fontWeight="medium">
                {progress.stats.quiz_score_avg}% Quiz Average
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box display="flex" alignItems="center">
              <BookIcon sx={{ mr: 1, color: 'success.main' }} />
              <Typography variant="body1" fontWeight="medium">
                {progress.stats.paragraphs_read} Texts Read
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Level Explanation */}
        <Box bgcolor="#f8f9fa" p={2} borderRadius={1}>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
            <InfoIcon fontSize="small" sx={{ mr: 1, color: 'info.main' }} />
            Our level system ranges from 1-999, with CEFR equivalents (A1-C2). Continue learning to increase your level!
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default UserProgressComponent;
