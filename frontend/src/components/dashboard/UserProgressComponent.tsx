// src/components/dashboard/UserProgressComponent.tsx
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper,
  Grid, Card, CardContent, Tooltip,
  Chip, Divider, CircularProgress,
  LinearProgress, useTheme
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
  points: number;
  next_level: number;
  next_level_points: number;
  current_level_points: number;
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
  const theme = useTheme();

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
    if (level < 500) return theme.palette.mode === 'dark' ? '#64dd17' : '#4caf50'; // Green for beginner
    if (level < 2500) return theme.palette.mode === 'dark' ? '#00e5ff' : '#03a9f4'; // Blue for intermediate
    if (level < 5000) return theme.palette.mode === 'dark' ? '#651fff' : '#3f51b5'; // Indigo for advanced
    return theme.palette.mode === 'dark' ? '#ff6d00' : '#f44336'; // Red/orange for master
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
      <Box p={2} bgcolor={theme.palette.mode === 'dark' ? '#3a0000' : '#ffecef'} borderRadius={1}>
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

  // Calculate the actual points needed for next level and current progress
  const totalPointsNeeded = progress.next_level_points - progress.current_level_points;
  const currentProgress = progress.points - progress.current_level_points;
  const formattedPercentage = `${progress.percentage_to_next_level}%`;

  return (
    <Card elevation={3} sx={{
      mb: 4,
      borderRadius: 2,
      overflow: 'hidden',
      position: 'relative'
    }}>
      <Box
        sx={{
          height: '6px',
          width: '100%',
          background: `linear-gradient(to right,
            ${getLevelColor(progress.level)} ${formattedPercentage},
            ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'} ${formattedPercentage}
          )`,
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 5
        }}
      />

      <CardContent sx={{ pt: 4 }}>
        {/* User Level Information */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center">
            <SchoolIcon
              color="primary"
              sx={{
                fontSize: 46,
                mr: 2,
                color: getLevelColor(progress.level),
                filter: 'drop-shadow(0px 2px 3px rgba(0,0,0,0.2))'
              }}
            />
            <Box>
              <Typography variant="h5" fontWeight="500" gutterBottom>
                Level {progress.level}
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip
                  label={`${progress.points} Points`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 'medium' }}
                />

                <Tooltip title={`${currentProgress} of ${totalPointsNeeded} points to next level`}>
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
            <Typography variant="h4" sx={{
              color: getLevelColor(progress.level),
              fontWeight: 'bold',
              textShadow: theme.palette.mode === 'dark' ? '0px 0px 10px rgba(255,255,255,0.2)' : 'none'
            }}>
              {progress.percentage_to_next_level}%
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Stats Grid */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Box display="flex" alignItems="center">
              <TranslateIcon sx={{ mr: 1, color: 'primary.main', fontSize: 28 }} />
              <Typography variant="body1" fontWeight="medium">
                {progress.stats.words_learned} Words Learned
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box display="flex" alignItems="center">
              <QuizIcon sx={{ mr: 1, color: 'secondary.main', fontSize: 28 }} />
              <Typography variant="body1" fontWeight="medium">
                {progress.stats.quiz_score_avg}% Quiz Average
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box display="flex" alignItems="center">
              <BookIcon sx={{ mr: 1, color: 'success.main', fontSize: 28 }} />
              <Typography variant="body1" fontWeight="medium">
                {progress.stats.paragraphs_read} Texts Read
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Level Explanation */}
        <Box bgcolor={theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8f9fa'} p={2} borderRadius={1}>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
            <InfoIcon fontSize="small" sx={{ mr: 1, color: 'info.main' }} />
            Points system rewards active learning. Earn more points by saving words, completing quizzes, and reading German texts to advance to higher levels.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default UserProgressComponent;
