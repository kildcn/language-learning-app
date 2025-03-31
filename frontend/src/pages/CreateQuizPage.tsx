// src/pages/CreateQuizPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import {
  Box, Typography, Paper, Button, TextField, MenuItem,
  Checkbox, FormControlLabel, FormGroup, FormHelperText,
  CircularProgress, Alert, Grid, Card, CardContent, CardHeader,
  List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Divider, Chip, RadioGroup, Radio, Tooltip
} from '@mui/material';
import {
  HelpOutlineRounded as HelpIcon,
  TranslateOutlined as TranslateIcon
} from '@mui/icons-material';
import { savedWordService, quizService } from '../services/api';

const CreateQuizSchema = Yup.object().shape({
  title: Yup.string().required('Required'),
  type: Yup.string().required('Required'),
  word_ids: Yup.array().min(1, 'Select at least one word').required('Required'),
});

const CreateQuizPage: React.FC = () => {
  const navigate = useNavigate();
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wordCategories, setWordCategories] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetchWords();
  }, []);

  const fetchWords = async () => {
    setLoading(true);
    try {
      const response = await savedWordService.getAll();
      const fetchedWords = response.data.data || [];
      setWords(fetchedWords);

      // Group words by categories for easier selection
      const categories: Record<string, string[]> = {};
      fetchedWords.forEach((word: any) => {
        // Extract category from definition (simplified version)
        let category = 'Other';
        const definition = word.definition?.toLowerCase() || '';

        if (definition.includes('noun') || definition.includes('der ') || definition.includes('die ') || definition.includes('das ')) {
          category = 'Nouns';
        } else if (definition.includes('verb')) {
          category = 'Verbs';
        } else if (definition.includes('adjective')) {
          category = 'Adjectives';
        } else if (definition.includes('adverb')) {
          category = 'Adverbs';
        }

        if (!categories[category]) {
          categories[category] = [];
        }
        categories[category].push(word.id.toString());
      });

      setWordCategories(categories);
    } catch (error) {
      console.error('Error fetching saved words:', error);
      setError('Failed to load your saved German words');
    } finally {
      setLoading(false);
    }
  };

  const quizTypeDescriptions = {
    'multiple_choice': 'You will be presented with a German word and four possible English translations. Choose the correct one.',
    'fill_blank': 'Complete German sentences by filling in the correct word from your vocabulary list.',
    'matching': 'Match German words with their English translations.'
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (words.length === 0) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Create German Vocabulary Quiz
        </Typography>
        <Alert severity="info">
          You need to save some German words first before you can create a quiz.
          Go to the German texts section and start saving words to your vocabulary.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Create German Vocabulary Quiz
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Formik
          initialValues={{
            title: '',
            type: 'multiple_choice',
            word_ids: [],
          }}
          validationSchema={CreateQuizSchema}
          onSubmit={async (values, { setSubmitting, setStatus }) => {
            setError(null);
            try {
              const response = await quizService.create(values);
              navigate(`/quizzes/${response.data.quiz.id}`);
            } catch (error: any) {
              console.error('Error creating quiz:', error);
              setStatus({ error: error.response?.data?.message || 'Failed to create quiz' });
              setSubmitting(false);
            }
          }}
        >
          {({ values, setFieldValue, isSubmitting, errors, touched, status }) => (
            <Form>
              {status && status.error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {status.error}
                </Alert>
              )}

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Field
                    as={TextField}
                    fullWidth
                    name="title"
                    label="Quiz Title"
                    placeholder="e.g., Common German Verbs"
                    error={touched.title && Boolean(errors.title)}
                    helperText={touched.title && errors.title}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Field
                    as={TextField}
                    fullWidth
                    select
                    name="type"
                    label="Quiz Type"
                    error={touched.type && Boolean(errors.type)}
                    helperText={touched.type && errors.type}
                  >
                    <MenuItem value="multiple_choice">Multiple Choice</MenuItem>
                    <MenuItem value="fill_blank">Fill in the Blank</MenuItem>
                    <MenuItem value="matching">Matching</MenuItem>
                  </Field>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                    <HelpIcon fontSize="small" sx={{ mr: 0.5 }} />
                    {quizTypeDescriptions[values.type as keyof typeof quizTypeDescriptions]}
                  </Typography>
                </Grid>
              </Grid>

              <Box mt={4}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <TranslateIcon sx={{ mr: 1 }} />
                  Select German Words for the Quiz
                </Typography>

                {touched.word_ids && errors.word_ids && (
                  <FormHelperText error>
                    {errors.word_ids as string}
                  </FormHelperText>
                )}

                <Grid container spacing={2} mt={1}>
                  {/* Word selection section */}
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                      <CardHeader title="Word Categories" />
                      <Divider />
                      <CardContent sx={{ p: 0 }}>
                        <List dense>
                          <ListItem>
                            <ListItemButton
                              onClick={() => {
                                // Select all words
                                setFieldValue('word_ids', words.map(w => w.id));
                              }}
                            >
                              <ListItemText primary="Select All Words" />
                              <Chip
                                label={words.length}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </ListItemButton>
                          </ListItem>
                          <Divider />
                          {Object.entries(wordCategories).map(([category, wordIds]) => (
                            <ListItem key={category}>
                              <ListItemButton
                                onClick={() => {
                                  // Select or deselect all words in this category
                                  const allSelected = wordIds.every(id =>
                                    values.word_ids.includes(parseInt(id))
                                  );

                                  if (allSelected) {
                                    // Remove all category words
                                    setFieldValue(
                                      'word_ids',
                                      values.word_ids.filter(id => !wordIds.includes(id.toString()))
                                    );
                                  } else {
                                    // Add all category words
                                    const newIds = [...values.word_ids];
                                    wordIds.forEach(id => {
                                      if (!newIds.includes(parseInt(id))) {
                                        newIds.push(parseInt(id));
                                      }
                                    });
                                    setFieldValue('word_ids', newIds);
                                  }
                                }}
                              >
                                <ListItemText primary={category} />
                                <Chip
                                  label={wordIds.length}
                                  size="small"
                                  color="primary"
                                  variant={
                                    wordIds.every(id => values.word_ids.includes(parseInt(id)))
                                      ? "filled"
                                      : "outlined"
                                  }
                                />
                              </ListItemButton>
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Word list section */}
                  <Grid item xs={12} md={8}>
                    <Card variant="outlined">
                      <CardHeader
                        title="Available Words"
                        subheader={`${values.word_ids.length} of ${words.length} words selected`}
                      />
                      <Divider />
                      <Box maxHeight={400} overflow="auto">
                        <List dense>
                          {words.map((word) => (
                            <React.Fragment key={word.id}>
                              <ListItemButton
                                onClick={() => {
                                  const currentIds = [...values.word_ids];
                                  if (currentIds.includes(word.id)) {
                                    setFieldValue(
                                      'word_ids',
                                      currentIds.filter(id => id !== word.id)
                                    );
                                  } else {
                                    setFieldValue('word_ids', [...currentIds, word.id]);
                                  }
                                }}
                                dense
                              >
                                <ListItemIcon>
                                  <Checkbox
                                    edge="start"
                                    checked={values.word_ids.includes(word.id)}
                                    disableRipple
                                  />
                                </ListItemIcon>
                                <ListItemText
                                  primary={word.word}
                                  secondary={word.definition ?
                                    word.definition.substring(0, 60) + (word.definition.length > 60 ? '...' : '') :
                                    'No definition'}
                                />
                              </ListItemButton>
                              <Divider />
                            </React.Fragment>
                          ))}
                        </List>
                      </Box>
                    </Card>
                  </Grid>
                </Grid>
              </Box>

              <Box display="flex" justifyContent="flex-end" mt={3}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={isSubmitting}
                  startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
                >
                  {isSubmitting ? 'Creating...' : 'Create German Quiz'}
                </Button>
              </Box>
            </Form>
          )}
        </Formik>
      </Paper>
    </Box>
  );
};

export default CreateQuizPage;
