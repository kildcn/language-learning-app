/ src/pages/ParagraphsPage.tsx
import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Button, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  CircularProgress, TextField, MenuItem, Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { paragraphService } from '../services/api';

const levelColors: Record<string, string> = {
  A2: 'success',
  B1: 'info',
  B2: 'warning',
  C1: 'error',
};

const ParagraphsPage: React.FC = () => {
  const [paragraphs, setParagraphs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paragraphToDelete, setParagraphToDelete] = useState<number | null>(null);
  const [filters, setFilters] = useState({
    level: '',
    topic: '',
  });

  useEffect(() => {
    fetchParagraphs();
  }, [filters]);

  const fetchParagraphs = async () => {
    setLoading(true);
    try {
      const response = await paragraphService.getAll({
        level: filters.level || undefined,
        topic: filters.topic || undefined,
      });
      setParagraphs(response.data.data || []);
    } catch (error) {
      console.error('Error fetching paragraphs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: number) => {
    setParagraphToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (paragraphToDelete) {
      try {
        await paragraphService.delete(paragraphToDelete);
        setParagraphs(paragraphs.filter(p => p.id !== paragraphToDelete));
      } catch (error) {
        console.error('Error deleting paragraph:', error);
      }
    }
    setDeleteDialogOpen(false);
    setParagraphToDelete(null);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Paragraphs</Typography>
        <Button
          component={RouterLink}
          to="/paragraphs/create"
          variant="contained"
          startIcon={<AddIcon />}
        >
          Generate New
        </Button>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              fullWidth
              name="level"
              label="Filter by Level"
              value={filters.level}
              onChange={handleFilterChange}
            >
              <MenuItem value="">All Levels</MenuItem>
              <MenuItem value="A2">A2 - Elementary</MenuItem>
              <MenuItem value="B1">B1 - Intermediate</MenuItem>
              <MenuItem value="B2">B2 - Upper Intermediate</MenuItem>
              <MenuItem value="C1">C1 - Advanced</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              name="topic"
              label="Search by Topic"
              value={filters.topic}
              onChange={handleFilterChange}
            />
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Level</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paragraphs.length > 0 ? (
                paragraphs.map((paragraph) => (
                  <TableRow key={paragraph.id}>
                    <TableCell>{paragraph.id}</TableCell>
                    <TableCell>{paragraph.title || `Paragraph #${paragraph.id}`}</TableCell>
                    <TableCell>
                      <Chip
                        label={paragraph.level}
                        color={levelColors[paragraph.level] as any || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(paragraph.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        component={RouterLink}
                        to={`/paragraphs/${paragraph.id}`}
                        size="small"
                        color="primary"
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        component={RouterLink}
                        to={`/paragraphs/${paragraph.id}?edit=true`}
                        size="small"
                        color="secondary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeleteClick(paragraph.id)}
                        size="small"
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No paragraphs found. Create your first one!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this paragraph? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ParagraphsPage;

// src/pages/CreateParagraphPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import {
  Box, Button, Typography, TextField, MenuItem,
  Paper, CircularProgress, Alert
} from '@mui/material';
import { paragraphService } from '../services/api';

const CreateParagraphSchema = Yup.object().shape({
  level: Yup.string().required('Required'),
  topic: Yup.string().max(100, 'Topic must be at most 100 characters'),
});

const CreateParagraphPage: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Generate New Paragraph
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
              setError(error.response?.data?.message || 'Failed to generate paragraph. Please try again.');
              setSubmitting(false);
            }
          }}
        >
          {({ isSubmitting, errors, touched }) => (
            <Form>
              <Box mb={3}>
                <Field
                  as={TextField}
                  fullWidth
                  select
                  name="level"
                  label="Language Level"
                  helperText="Select the language proficiency level"
                  error={touched.level && Boolean(errors.level)}
                >
                  <MenuItem value="A2">A2 - Elementary</MenuItem>
                  <MenuItem value="B1">B1 - Intermediate</MenuItem>
                  <MenuItem value="B2">B2 - Upper Intermediate</MenuItem>
                  <MenuItem value="C1">C1 - Advanced</MenuItem>
                </Field>
              </Box>

              <Box mb={3}>
                <Field
                  as={TextField}
                  fullWidth
                  name="topic"
                  label="Topic (Optional)"
                  placeholder="Enter a topic for the paragraph"
                  helperText="Leave blank for a random topic"
                  error={touched.topic && Boolean(errors.topic)}
                />
              </Box>

              <Box display="flex" justifyContent="flex-end">
                <Button
                  variant="contained"
                  color="primary"
                  type="submit"
                  disabled={isSubmitting}
                  startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
                >
                  {isSubmitting ? 'Generating...' : 'Generate Paragraph'}
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
