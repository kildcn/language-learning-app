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
  Divider
} from '@mui/material';
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

  useEffect(() => {
    fetchWords();
  }, []);

  const fetchWords = async () => {
    setLoading(true);
    try {
      const response = await savedWordService.getAll();
      setWords(response.data.data || []);
    } catch (error) {
      console.error('Error fetching saved words:', error);
      setError('Failed to load your saved words');
    } finally {
      setLoading(false);
    }
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
          Create New Quiz
        </Typography>
        <Alert severity="info">
          You need to save some words first before you can create a quiz.
          Go to the paragraphs section and start saving words to your vocabulary.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Create New Quiz
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
                </Grid>
              </Grid>

              <Box mt={4}>
                <Typography variant="h6" gutterBottom>
                  Select Words for the Quiz
                </Typography>

                {touched.word_ids && errors.word_ids && (
                  <FormHelperText error>
                    {errors.word_ids as string}
                  </FormHelperText>
                )}

                <Box maxHeight={400} overflow="auto" border={1} borderColor="divider" borderRadius={1} mt={2}>
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
              </Box>

              <Box display="flex" justifyContent="flex-end" mt={3}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={isSubmitting}
                  startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
                >
                  {isSubmitting ? 'Creating...' : 'Create Quiz'}
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
