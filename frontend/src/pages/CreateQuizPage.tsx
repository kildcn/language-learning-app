// src/pages/CreateQuizPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import {
  Box, Typography, Paper, Button, TextField, CircularProgress,
  RadioGroup, Radio, FormControlLabel, FormControl, FormLabel,
  Card, CardContent, CardHeader, Divider, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, Chip, Grid,
  Checkbox, FormHelperText, Tab, Tabs, Tooltip, Switch,
  Alert
} from '@mui/material';
import {
  HelpOutlineRounded as HelpIcon,
  TranslateOutlined as TranslateIcon,
  PermIdentity as UserIcon,
  AccessTime as TimeIcon,
  Shuffle as ShuffleIcon
} from '@mui/icons-material';
import { savedWordService, quizService } from '../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`quiz-tabpanel-${index}`}
      aria-labelledby={`quiz-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const CreateQuizSchema = Yup.object().shape({
  title: Yup.string().required('Required'),
  type: Yup.string().oneOf(['multiple_choice', 'matching'], 'Invalid quiz type').required('Required'),
  source: Yup.string().oneOf(['selection', 'recent', 'random'], 'Invalid source').required('Required'),
  word_ids: Yup.array().when('source', {
    is: 'selection',
    then: (schema) => schema.min(1, 'Select at least one word').required('Required'),
    otherwise: (schema) => schema
  }),
  wordCount: Yup.number().when('source', {
    is: (value: string) => value === 'recent' || value === 'random',
    then: (schema) => schema.min(5, 'Minimum 5 words').max(20, 'Maximum 20 words').required('Required number of words'),
    otherwise: (schema) => schema
  }),
  level: Yup.string().oneOf(['all', 'beginner', 'intermediate', 'advanced']).required('Required'),
});

const CreateQuizPage: React.FC = () => {
  const navigate = useNavigate();
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
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
      const categories: Record<string, string[]> = {
        'All Words': [],
        'Nouns': [],
        'Verbs': [],
        'Adjectives': [],
        'Other': []
      };

      fetchedWords.forEach((word: any) => {
        categories['All Words'].push(word.id.toString());

        // Extract category from definition
        let category = 'Other';
        const definition = word.definition?.toLowerCase() || '';

        if (definition.includes('noun') ||
            definition.includes('der ') ||
            definition.includes('die ') ||
            definition.includes('das ')) {
          category = 'Nouns';
        } else if (definition.includes('verb') ||
                  definition.includes('to ') === 0) {
          category = 'Verbs';
        } else if (definition.includes('adjective')) {
          category = 'Adjectives';
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const quizTypeDescriptions: Record<string, string> = {
    'multiple_choice': 'You will be presented with a German word and four possible English translations. Choose the correct one.',
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
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="quiz creation options"
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
        >
          <Tab
            icon={<UserIcon />}
            label="Selection"
            id="quiz-tab-0"
            aria-controls="quiz-tabpanel-0"
          />
          <Tab
            icon={<TimeIcon />}
            label="Recent Words"
            id="quiz-tab-1"
            aria-controls="quiz-tabpanel-1"
          />
          <Tab
            icon={<ShuffleIcon />}
            label="Random Words"
            id="quiz-tab-2"
            aria-controls="quiz-tabpanel-2"
          />
        </Tabs>

        <Formik
          initialValues={{
            title: '',
            type: 'multiple_choice' as 'multiple_choice' | 'matching',
            source: (tabValue === 0 ? 'selection' : tabValue === 1 ? 'recent' : 'random') as 'selection' | 'recent' | 'random',
            word_ids: [] as number[],
            wordCount: 10,
            level: 'all' as 'all' | 'beginner' | 'intermediate' | 'advanced',
          }}
          enableReinitialize
          validationSchema={CreateQuizSchema}
          onSubmit={async (values, { setSubmitting, setStatus }) => {
            setError(null);
            try {
              // Update source based on current tab
              const updatedValues = {
                ...values,
                source: (tabValue === 0 ? 'selection' : tabValue === 1 ? 'recent' : 'random') as 'selection' | 'recent' | 'random',
                type: values.type as 'multiple_choice' | 'matching'
              };

              const response = await quizService.create(updatedValues);
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

              <Grid container spacing={3} mb={4}>
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
                  <FormControl component="fieldset">
                    <FormLabel id="quiz-type-label">Quiz Type</FormLabel>
                    <RadioGroup
                      row
                      aria-labelledby="quiz-type-label"
                      name="type"
                      value={values.type}
                      onChange={(e) => setFieldValue('type', e.target.value)}
                    >
                      <FormControlLabel
                        value="multiple_choice"
                        control={<Radio />}
                        label="Multiple Choice"
                      />
                      <FormControlLabel
                        value="matching"
                        control={<Radio />}
                        label="Matching"
                      />
                    </RadioGroup>
                  </FormControl>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                    <HelpIcon fontSize="small" sx={{ mr: 0.5 }} />
                    {quizTypeDescriptions[values.type]}
                  </Typography>
                </Grid>
              </Grid>

              <TabPanel value={tabValue} index={0}>
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <TranslateIcon sx={{ mr: 1 }} />
                    Select German Words for the Quiz
                  </Typography>

                  {touched.word_ids && typeof errors.word_ids === 'string' && (
                    <FormHelperText error>
                      {errors.word_ids}
                    </FormHelperText>
                  )}

                  <Grid container spacing={2} mt={1}>
                    {/* Word category selection section */}
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined">
                        <CardHeader title="Word Categories" />
                        <Divider />
                        <CardContent sx={{ p: 0 }}>
                          <List dense>
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
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Generate Quiz with Recent Words
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Field
                        as={TextField}
                        fullWidth
                        type="number"
                        name="wordCount"
                        label="Number of words"
                        InputProps={{
                          inputProps: { min: 5, max: 20 }
                        }}
                        error={touched.wordCount && Boolean(errors.wordCount)}
                        helperText={touched.wordCount && errors.wordCount}
                      />
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                        Select between 5-20 of your most recently saved words
                      </Typography>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <FormControl component="fieldset">
                        <FormLabel id="word-level-label">Word Difficulty Level</FormLabel>
                        <RadioGroup
                          row
                          aria-labelledby="word-level-label"
                          name="level"
                          value={values.level}
                          onChange={(e) => setFieldValue('level', e.target.value)}
                        >
                          <FormControlLabel
                            value="all"
                            control={<Radio />}
                            label="All Levels"
                          />
                          <FormControlLabel
                            value="beginner"
                            control={<Radio />}
                            label="Beginner"
                          />
                          <FormControlLabel
                            value="intermediate"
                            control={<Radio />}
                            label="Intermediate"
                          />
                          <FormControlLabel
                            value="advanced"
                            control={<Radio />}
                            label="Advanced"
                          />
                        </RadioGroup>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Box>
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Generate Quiz with Random Words
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Field
                        as={TextField}
                        fullWidth
                        type="number"
                        name="wordCount"
                        label="Number of words"
                        InputProps={{
                          inputProps: { min: 5, max: 20 }
                        }}
                        error={touched.wordCount && Boolean(errors.wordCount)}
                        helperText={touched.wordCount && errors.wordCount}
                      />
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                        Select between 5-20 random words from your vocabulary
                      </Typography>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <FormControl component="fieldset">
                        <FormLabel id="word-level-label-random">Word Difficulty Level</FormLabel>
                        <RadioGroup
                          row
                          aria-labelledby="word-level-label-random"
                          name="level"
                          value={values.level}
                          onChange={(e) => setFieldValue('level', e.target.value)}
                        >
                          <FormControlLabel
                            value="all"
                            control={<Radio />}
                            label="All Levels"
                          />
                          <FormControlLabel
                            value="beginner"
                            control={<Radio />}
                            label="Beginner"
                          />
                          <FormControlLabel
                            value="intermediate"
                            control={<Radio />}
                            label="Intermediate"
                          />
                          <FormControlLabel
                            value="advanced"
                            control={<Radio />}
                            label="Advanced"
                          />
                        </RadioGroup>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Box>
              </TabPanel>

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
