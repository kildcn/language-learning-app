// src/pages/CreateParagraphPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import {
  Box, Button, Typography, TextField, MenuItem,
  Paper, CircularProgress, Alert, Chip
} from '@mui/material';
import { paragraphService } from '../services/api';

const CreateParagraphSchema = Yup.object().shape({
  level: Yup.string().required('Required'),
  topic: Yup.string().max(100, 'Topic must be at most 100 characters'),
});

// German topics
const suggestedTopics = [
  'Alltag', 'Familie', 'Reisen', 'Essen und Trinken',
  'Freizeit', 'Hobbys', 'Kultur', 'Arbeit', 'Schule',
  'Umwelt', 'Gesundheit', 'Sport', 'Traditionen',
  'Deutsche Städte', 'Deutsche Geschichte'
];

const CreateParagraphPage: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Generate New German Text
      </Typography>

      <Paper sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Formik
          initialValues={{ level: 'B1', topic: '' }}
          validationSchema={CreateParagraphSchema}
          onSubmit={async (values, { setSubmitting }) => {
            setError(null);
            try {
              const response = await paragraphService.create(values);
              navigate(`/paragraphs/${response.data.paragraph.id}`);
            } catch (error: any) {
              console.error('Error creating paragraph:', error);
              setError(error.response?.data?.message || 'Failed to generate German text. Please try again.');
              setSubmitting(false);
            }
          }}
        >
          {({ isSubmitting, errors, touched, setFieldValue }) => (
            <Form>
              <Box mb={3}>
                <Field
                  as={TextField}
                  fullWidth
                  select
                  name="level"
                  label="German Proficiency Level"
                  helperText="Select your German language proficiency level"
                  error={touched.level && Boolean(errors.level)}
                >
                  <MenuItem value="A2">A2 - Elementary (Grundstufe)</MenuItem>
                  <MenuItem value="B1">B1 - Intermediate (Mittelstufe)</MenuItem>
                  <MenuItem value="B2">B2 - Upper Intermediate (Fortgeschrittene)</MenuItem>
                  <MenuItem value="C1">C1 - Advanced (Fortgeschrittene Plus)</MenuItem>
                </Field>
              </Box>

              <Box mb={3}>
                <Field
                  as={TextField}
                  fullWidth
                  name="topic"
                  label="Topic (Optional)"
                  placeholder="Enter a topic for the German text"
                  helperText="Leave blank for a random topic, or select from suggested topics below"
                  error={touched.topic && Boolean(errors.topic)}
                />
                <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {suggestedTopics.map(topic => (
                    <Chip
                      key={topic}
                      label={topic}
                      onClick={() => setFieldValue('topic', topic)}
                      color="primary"
                      variant="outlined"
                      clickable
                    />
                  ))}
                </Box>
              </Box>

              <Box display="flex" justifyContent="flex-end">
                <Button
                  variant="contained"
                  color="primary"
                  type="submit"
                  disabled={isSubmitting}
                  startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
                >
                  {isSubmitting ? 'Generating...' : 'Generate German Text'}
                </Button>
              </Box>
            </Form>
          )}
        </Formik>
      </Paper>
    </Box>
  );
};

export default CreateParagraphPage;
