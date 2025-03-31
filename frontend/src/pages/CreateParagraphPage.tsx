import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, TextField, CircularProgress,
  Chip, Alert, Divider, Dialog, Backdrop
} from '@mui/material';
import { paragraphService, savedWordService } from '../services/api';

const ParagraphDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditMode = searchParams.get('edit') === 'true';

  const [paragraph, setParagraph] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedContext, setSelectedContext] = useState<string | null>(null);
  const [wordDialogOpen, setWordDialogOpen] = useState(false);
  const [savingWord, setSavingWord] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchParagraph = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const response = await paragraphService.getById(parseInt(id));
      setParagraph(response.data);
      setEditTitle(response.data.title || '');
      setEditContent(response.data.content);
    } catch (error) {
      console.error('Error fetching paragraph:', error);
      setError('Failed to load paragraph');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchParagraph();
  }, [fetchParagraph]);

  const handleSaveEdit = async () => {
    if (!id) return;

    setLoading(true);
    try {
      await paragraphService.update(parseInt(id), {
        title: editTitle,
        content: editContent
      });

      setSuccess('Paragraph updated successfully');
      setTimeout(() => {
        navigate(`/paragraphs/${id}`);
      }, 1500);
    } catch (error) {
      console.error('Error updating paragraph:', error);
      setError('Failed to update paragraph');
    } finally {
      setLoading(false);
    }
  };

  const handleWordSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim() !== '') {
      const selectedText = selection.toString().trim();

      // Get a bit of context around the selected word
      const node = selection.anchorNode;
      if (node && node.textContent) {
        const text = node.textContent;
        // Get a reasonable amount of context around the word
        const start = Math.max(0, text.indexOf(selectedText) - 30);
        const end = Math.min(text.length, text.indexOf(selectedText) + selectedText.length + 30);
        const context = text.substring(start, end).trim();

        setSelectedWord(selectedText);
        setSelectedContext(context);
        setWordDialogOpen(true);
      }
    }
  };

  const handleSaveWord = async () => {
    if (!selectedWord) return;

    setSavingWord(true);
    try {
      await savedWordService.create({
        word: selectedWord,
        context: selectedContext,
        paragraph_id: id
      });

      setSuccess(`Word "${selectedWord}" saved successfully`);
      setWordDialogOpen(false);
    } catch (error) {
      console.error('Error saving word:', error);
      setError('Failed to save word');
    } finally {
      setSavingWord(false);
    }
  };

  if (loading && !paragraph) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  if (!paragraph) {
    return (
      <Alert severity="error">Paragraph not found</Alert>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">
          {isEditMode ? 'Edit Paragraph' : 'Paragraph Details'}
        </Typography>
        <Chip
          label={paragraph.level}
          color="primary"
        />
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        {isEditMode ? (
          <Box>
            <TextField
              fullWidth
              label="Title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Content"
              multiline
              rows={8}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              margin="normal"
            />
            <Box display="flex" justifyContent="flex-end" mt={2}>
              <Button
                variant="outlined"
                onClick={() => navigate(`/paragraphs/${id}`)}
                sx={{ mr: 1 }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSaveEdit}
                disabled={loading}
              >
                Save Changes
              </Button>
            </Box>
          </Box>
        ) : (
          <Box>
            <Typography variant="h5" gutterBottom>
              {paragraph.title || `Paragraph #${paragraph.id}`}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Created: {new Date(paragraph.created_at).toLocaleDateString()}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Box
              sx={{
                p: 2,
                backgroundColor: 'rgba(0, 0, 0, 0.02)',
                borderRadius: 1,
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                },
              }}
              onClick={handleWordSelection}
            >
              <Typography variant="body1" component="div" sx={{ lineHeight: 1.8 }}>
                {paragraph.content}
              </Typography>
            </Box>
            <Typography variant="caption" color="textSecondary" sx={{ mt: 2, display: 'block' }}>
              Click on any word to save it to your vocabulary list
            </Typography>

            <Box display="flex" justifyContent="flex-end" mt={3}>
              <Button
                variant="outlined"
                onClick={() => navigate('/paragraphs')}
                sx={{ mr: 1 }}
              >
                Back to List
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => navigate(`/paragraphs/${id}?edit=true`)}
              >
                Edit
              </Button>
            </Box>
          </Box>
        )}
      </Paper>

      <Dialog
        open={wordDialogOpen}
        onClose={() => setWordDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <Box p={3}>
          <Typography variant="h6" gutterBottom>
            Save Word to Vocabulary
          </Typography>
          <Typography variant="body1" gutterBottom>
            <strong>Word:</strong> {selectedWord}
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            <strong>Context:</strong> "{selectedContext}"
          </Typography>
          <Box display="flex" justifyContent="flex-end" mt={2}>
            <Button
              onClick={() => setWordDialogOpen(false)}
              sx={{ mr: 1 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveWord}
              disabled={savingWord}
            >
              {savingWord ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Saving...
                </>
              ) : 'Save Word'}
            </Button>
          </Box>
        </Box>
