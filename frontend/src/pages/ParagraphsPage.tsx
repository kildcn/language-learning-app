// src/pages/ParagraphsPage.tsx
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
