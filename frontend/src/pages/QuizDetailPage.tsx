// src/pages/QuizDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, CircularProgress, Alert,
  RadioGroup, Radio, FormControlLabel, FormControl, FormLabel,
  Stepper, Step, StepLabel, TextField, Card, CardContent,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  List, ListItem, ListItemText, Divider, Grid
} from '@mui/material';
import { quizService } from '../services/api';

const QuizDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [showAttempts, setShowAttempts] = useState(false);

  useEffect(() => {
    if (id) {
      fetchQuiz();
    }
  }, [id]);

  const fetchQuiz = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const response = await quizService.getById(parseInt(id));
      setQuiz(response.data);

      // Fetch previous attempts
      try {
        const attemptsRes = await quizService.getAttempts(parseInt(id));
        setAttempts(attemptsRes.data || []);
      } catch (err) {
        console.error('Error fetching attempts:', err);
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
      setError('Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = () => {
    setQuizStarted(true);
    setCurrentQuestion(0);
    setAnswers({});
    setQuizCompleted(false);
    setResult(null);
  };

  const handleAnswerChange = (value: any) => {
    setAnswers({
      ...answers,
      [currentQuestion]: value
    });
  };

  const goToNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      submitQuiz();
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const submitQuiz = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const response = await quizService.submitAttempt(parseInt(id), {
        answers: Object.values(answers)
      });

      setResult(response.data);
      setQuizCompleted(true);

      // Refresh attempts
      try {
        const attemptsRes = await quizService.getAttempts(parseInt(id));
        setAttempts(attemptsRes.data || []);
      } catch (err) {
        console.error('Error fetching attempts after submission:', err);
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      setError('Failed to submit quiz');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !quiz) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (!quiz) {
    return (
      <Alert severity="error">Quiz not found</Alert>
    );
  }

  // Format questions based on quiz type
  const questions = Array.isArray(quiz.questions) ?
    quiz.questions :
    (quiz.questions ? Object.values(quiz.questions) : []);

  const renderQuestion = () => {
    if (!questions[currentQuestion]) return null;

    const question = questions[currentQuestion];

    switch (quiz.type) {
      case 'multiple_choice':
        return (
          <FormControl component="fieldset">
            <FormLabel component="legend">{question.question}</FormLabel>
            <RadioGroup
              value={answers[currentQuestion] || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
            >
              {question.options && Object.entries(question.options).map(([key, value]) => (
                <FormControlLabel
                  key={key}
                  value={key}
                  control={<Radio />}
                  label={value as string}
                />
              ))}
            </RadioGroup>
          </FormControl>
        );

      case 'fill_blank':
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              {question.sentence.replace('_____', '________')}
            </Typography>
            <TextField
              fullWidth
              label="Your answer"
              value={answers[currentQuestion] || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
              margin="normal"
            />
          </Box>
        );

      case 'matching':
        // Simplified matching UI - in a real app, you'd want drag-and-drop
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Match the word with its definition:
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Word: {question.word}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Select definition"
                  value={answers[currentQuestion] || ''}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                >
                  {question.options.map((option: string, index: number) => (
                    <MenuItem key={index} value={index}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return <Typography>Question format not supported</Typography>;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {quiz.title}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!quizStarted && !quizCompleted ? (
        <Paper sx={{ p: 3 }}>
          <Box textAlign="center">
            <Typography variant="h5" gutterBottom>
              Quiz Overview
            </Typography>
            <Typography variant="body1" paragraph>
              Type: {quiz.type === 'multiple_choice' ? 'Multiple Choice' :
                    quiz.type === 'fill_blank' ? 'Fill in the Blank' :
                    quiz.type === 'matching' ? 'Matching' : quiz.type}
            </Typography>
            <Typography variant="body1" paragraph>
              Number of questions: {questions.length}
            </Typography>

            <Box mt={4} display="flex" justifyContent="center" flexWrap="wrap" gap={2}>
              <Button
                variant="contained"
                color="primary"
                onClick={startQuiz}
                size="large"
              >
                Start Quiz
              </Button>

              {attempts.length > 0 && (
                <Button
                  variant="outlined"
                  onClick={() => setShowAttempts(true)}
                  size="large"
                >
                  View Previous Attempts
                </Button>
              )}
            </Box>
          </Box>
        </Paper>
      ) : quizCompleted ? (
        <Paper sx={{ p: 3 }}>
          <Box textAlign="center">
            <Typography variant="h5" gutterBottom>
              Quiz Results
            </Typography>

            {result && (
              <Box>
                <Typography variant="h6" color="primary" gutterBottom>
                  Score: {result.score} / {result.totalQuestions}
                </Typography>
                <Typography variant="body1" paragraph>
                  {result.score === result.totalQuestions ?
                    'Perfect! You got all the answers correct.' :
                    result.score > result.totalQuestions / 2 ?
                    'Good job! You passed the quiz.' :
                    'Keep practicing. You can try again.'}
                </Typography>

                <Box display="flex" justifyContent="center" mt={3} gap={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={startQuiz}
                  >
                    Take Again
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/quizzes')}
                  >
                    Back to Quizzes
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </Paper>
      ) : (
        <Paper sx={{ p: 3 }}>
          <Stepper activeStep={currentQuestion} alternativeLabel sx={{ mb: 4 }}>
            {questions.map((_, index) => (
              <Step key={index}>
                <StepLabel>Q{index + 1}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Question {currentQuestion + 1} of {questions.length}
            </Typography>
            {renderQuestion()}
          </Box>

          <Box display="flex" justifyContent="space-between">
            <Button
              onClick={goToPreviousQuestion}
              disabled={currentQuestion === 0}
              variant="outlined"
            >
              Previous
            </Button>
            <Button
              onClick={goToNextQuestion}
              variant="contained"
              color="primary"
              disabled={answers[currentQuestion] === undefined}
            >
              {currentQuestion < questions.length - 1 ? 'Next' : 'Submit Quiz'}
            </Button>
          </Box>
        </Paper>
      )}

      {/* Previous Attempts Dialog */}
      <Dialog
        open={showAttempts}
        onClose={() => setShowAttempts(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Previous Quiz Attempts</DialogTitle>
        <DialogContent dividers>
          {attempts.length > 0 ? (
            <List>
              {attempts.map((attempt, index) => (
                <React.Fragment key={attempt.id}>
                  <ListItem>
                    <ListItemText
                      primary={`Attempt #${index + 1} - ${new Date(attempt.created_at).toLocaleString()}`}
                      secondary={`Score: ${attempt.score}/${questions.length} (${Math.round(attempt.score / questions.length * 100)}%)`}
                    />
                  </ListItem>
                  {index < attempts.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography>No previous attempts found.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAttempts(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuizDetailPage;
