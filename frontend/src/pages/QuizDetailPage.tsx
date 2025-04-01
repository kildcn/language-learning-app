// src/pages/QuizDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, TextField, CircularProgress,
  RadioGroup, Radio, FormControlLabel, FormControl, FormLabel,
  Stepper, Step, StepLabel, Card, CardContent,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  List, ListItem, ListItemText, Divider, Grid, IconButton, Tooltip,
  MenuItem, Chip, Alert
} from '@mui/material';
import {
  VolumeUp as VolumeUpIcon,
  EmojiEvents as TrophyIcon,
  Lightbulb as TipIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { quizService } from '../services/api';

// Function to get color based on score percentage
const getScoreColor = (score: number, total: number): string => {
  const percentage = (score / total) * 100;
  if (percentage >= 80) return '#4caf50'; // Green for excellent
  if (percentage >= 60) return '#ff9800'; // Orange for good
  return '#f44336'; // Red for needs improvement
};

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
  const [showHint, setShowHint] = useState(false);

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
    setShowHint(false);
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
      setShowHint(false);
    } else {
      submitQuiz();
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setShowHint(false);
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

  // Function to speak German word using browser's speech synthesis
  const speakGerman = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE'; // Set language to German
      utterance.rate = 0.9; // Slightly slower rate for learning
      window.speechSynthesis.speak(utterance);
    } else {
      setError('Text-to-speech is not supported in your browser');
    }
  };

  // Generate a hint based on quiz type and current question
  const generateHint = (): string => {
    if (!questions || !questions[currentQuestion]) return '';

    const question = questions[currentQuestion];

    switch (quiz?.type) {
      case 'multiple_choice':
        return "Try to recall the meaning of this German word. Think about its context or any similar words you may know.";

      case 'fill_blank':
        // Look at the sentence context for fill in the blank
        return "Look carefully at the context of the sentence. The missing word should grammatically fit in the blank.";

      case 'matching':
        return "Look for clues in the definition that might connect to the German word. Consider word roots or similar words you know.";

      default:
        return "Think about the context where you've seen this word before.";
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
    if (!questions || !questions[currentQuestion]) return null;

    const question = questions[currentQuestion];

    switch (quiz.type) {
      case 'multiple_choice':
        return (
          <Box>
            <Box display="flex" alignItems="center">
              <Typography variant="h6" gutterBottom>
                {question.question || "What does this word mean?"}
              </Typography>
              {question.question && typeof question.question === 'string' && question.question.includes('mean') && (
                <Tooltip title="Listen to pronunciation">
                  <IconButton
                    onClick={() => {
                      // Extract the German word from question like "What does 'Haus' mean?"
                      const match = question.question.match(/['"]([^'"]+)['"]/);
                      if (match && match[1]) {
                        speakGerman(match[1]);
                      }
                    }}
                    size="small"
                    color="primary"
                    sx={{ ml: 1 }}
                  >
                    <VolumeUpIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
            <FormControl component="fieldset" fullWidth>
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
          </Box>
        );

      case 'fill_blank':
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Fill in the blank with the correct German word:
            </Typography>
            <Paper
              variant="outlined"
              sx={{ p: 2, mb: 2, backgroundColor: 'rgba(0, 0, 0, 0.02)' }}
            >
              <Typography variant="body1">
                {question.sentence ? question.sentence.replace('_____', '________') : "_____ (Missing sentence)"}
              </Typography>
            </Paper>
            <TextField
              fullWidth
              label="Your answer"
              value={answers[currentQuestion] || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
              margin="normal"
            />
            <Button
              size="small"
              startIcon={<VolumeUpIcon />}
              onClick={() => {
                // Speak the sentence but replace the blank with a pause
                if (question.sentence) {
                  const sentenceWithPause = question.sentence.replace('_____', '... ');
                  speakGerman(sentenceWithPause);
                }
              }}
              sx={{ mt: 1 }}
            >
              Listen to sentence
            </Button>
          </Box>
        );

      case 'matching':
        // Simplified matching UI - in a real app, you'd want drag-and-drop
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Match the German word with its English definition:
            </Typography>
            <Box display="flex" alignItems="center">
              <Typography variant="h5" sx={{ mr: 2 }}>
                {question.word || "(Missing word)"}
              </Typography>
              {question.word && (
                <IconButton
                  onClick={() => speakGerman(question.word)}
                  color="primary"
                  size="small"
                >
                  <VolumeUpIcon />
                </IconButton>
              )}
            </Box>
            <TextField
              select
              fullWidth
              label="Select the correct definition"
              value={answers[currentQuestion] || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
              margin="normal"
            >
              {question.options && Array.isArray(question.options) && question.options.map((option: string, index: number) => (
                <MenuItem key={index} value={index}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        );

      default:
        return <Typography>Question format not supported</Typography>;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {quiz.title || "Quiz"}
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
              German Vocabulary Quiz
            </Typography>
            <Box sx={{ mb: 3 }}>
              <Chip
                label={
                  quiz.type === 'multiple_choice' ? 'Multiple Choice' :
                  quiz.type === 'fill_blank' ? 'Fill in the Blank' :
                  quiz.type === 'matching' ? 'Matching' : quiz.type
                }
                color="primary"
                variant="outlined"
                sx={{ mr: 1 }}
              />
              <Chip
                label={`${questions.length} questions`}
                color="secondary"
                variant="outlined"
              />
            </Box>

            <Typography variant="body1" paragraph>
              Test your knowledge of German vocabulary with this quiz.
              {quiz.type === 'multiple_choice' && " You'll be shown German words and need to select the correct English translation."}
              {quiz.type === 'fill_blank' && " You'll need to complete German sentences by filling in the missing word."}
              {quiz.type === 'matching' && " You'll match German words with their English translations."}
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
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    mb: 3
                  }}
                >
                  <TrophyIcon
                    sx={{
                      fontSize: 60,
                      color: getScoreColor(result.score, result.totalQuestions)
                    }}
                  />
                  <Box sx={{ ml: 2, textAlign: 'left' }}>
                    <Typography variant="h4" sx={{ color: getScoreColor(result.score, result.totalQuestions) }}>
                      {result.score} / {result.totalQuestions} correct
                    </Typography>
                    <Typography variant="h6" color="textSecondary">
                      {Math.round((result.score / result.totalQuestions) * 100)}% score
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="body1" paragraph>
                  {result.score === result.totalQuestions ?
                    'Perfekt! You got all the answers correct.' :
                    result.score > result.totalQuestions / 2 ?
                    'Gut gemacht! You passed the quiz.' :
                    'Weiter üben! Keep practicing to improve your German vocabulary.'}
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
            {questions.map((_: any, index: number) => (
              <Step key={index}>
                <StepLabel>Q{index + 1}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Box sx={{ mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="body2" color="textSecondary">
                Question {currentQuestion + 1} of {questions.length}
              </Typography>
              <Button
                startIcon={<TipIcon />}
                variant="text"
                color="primary"
                size="small"
                onClick={() => setShowHint(!showHint)}
              >
                {showHint ? 'Hide Hint' : 'Show Hint'}
              </Button>
            </Box>

            {showHint && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">{generateHint()}</Typography>
              </Alert>
            )}

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
                      secondary={
                        <Typography
                          component="span"
                          sx={{
                            color: getScoreColor(attempt.score, questions.length)
                          }}
                        >
                          Score: {attempt.score}/{questions.length} ({Math.round(attempt.score / questions.length * 100)}%)
                        </Typography>
                      }
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
