import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Typography, Paper, List, ListItem, ListItemText,
  IconButton, Divider, CircularProgress, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Grid, Card, CardContent, CardActions, Chip, Tooltip
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  QuizOutlined as QuizIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { savedWordService } from '../services/api';

const SavedWordsPage: React.FC = () => {
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWord, setSelectedWord] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value.toLowerCase());
  };

  const handleWordClick = (word: any) => {
    setSelectedWord(word);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedWord(null);
  };

  const handleRegenerateDefinition = async () => {
    if (!selectedWord) return;

    setRegenerating(true);
    try {
      const response = await savedWordService.regenerateDefinition(selectedWord.id);
      // Update the word in the list
      setWords(words.map(w =>
        w.id === selectedWord.id ? response.data.savedWord : w
      ));
      setSelectedWord(response.data.savedWord);
    } catch (error) {
      console.error('Error regenerating definition:', error);
    } finally {
      setRegenerating(false);
    }
  };

  const handleDeleteWord = async (id: number) => {
    setDeleting(true);
    try {
      await savedWordService.delete(id);
      setWords(words.filter(w => w.id !== id));
      handleCloseDialog();
    } catch (error) {
      console.error('Error deleting word:', error);
    } finally {
      setDeleting(false);
    }
  };

  const filteredWords = words.filter(word =>
    word.word.toLowerCase().includes(searchTerm)
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        My Vocabulary
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" alignItems="center">
          <TextField
            fullWidth
            placeholder="Search words..."
            value={searchTerm}
            onChange={handleSearch}
            InputProps={{
              startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
            }}
          />
          <Button
            component={RouterLink}
            to="/quizzes/create"
            variant="contained"
            startIcon={<QuizIcon />}
            sx={{ ml: 2, whiteSpace: 'nowrap' }}
          >
            Create Quiz
          </Button>
        </Box>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          {filteredWords.length > 0 ? (
            <Grid container spacing={2}>
              {filteredWords.map((word) => (
                <Grid item xs={12} sm={6} md={4} key={word.id}>
                  <Card>
                    <CardContent sx={{ pb: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        {word.word}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" noWrap>
                        {word.definition || 'No definition available'}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button
                        size="small"
                        onClick={() => handleWordClick(word)}
                      >
                        View Details
                      </Button>
                      {word.paragraph && (
                        <Tooltip title="Source paragraph">
                          <Chip
                            label={`Level ${word.paragraph.level}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                            component={RouterLink}
                            to={`/paragraphs/${word.paragraph.id}`}
                            clickable
                            sx={{ ml: 'auto' }}
                          />
                        </Tooltip>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="textSecondary">
                {searchTerm ?
                  'No words match your search.' :
                  'No saved words yet. Start reading paragraphs to save words!'}
              </Typography>
            </Paper>
          )}
        </Box>
      )}

      {/* Word Detail Dialog */}
      {selectedWord && (
        <Dialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Typography variant="h6">{selectedWord.word}</Typography>
          </DialogTitle>
          <DialogContent dividers>
            <Typography variant="subtitle1" gutterBottom>
              Definition:
            </Typography>
            <Typography variant="body1" paragraph>
              {selectedWord.definition || 'No definition available'}
            </Typography>

            {selectedWord.context && (
              <>
                <Typography variant="subtitle1" gutterBottom>
                  Context:
                </Typography>
                <Typography
                  variant="body1"
                  paragraph
                  sx={{
                    backgroundColor: 'rgba(0, 0, 0, 0.05)',
                    p: 1,
                    borderRadius: 1,
                    fontStyle: 'italic'
                  }}
                >
                  "{selectedWord.context}"
                </Typography>
              </>
            )}

            {selectedWord.paragraph && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" gutterBottom>
                  Source:
                </Typography>
                <Box display="flex" alignItems="center">
                  <Chip
                    label={`Level ${selectedWord.paragraph.level}`}
                    size="small"
                    color="primary"
                    sx={{ mr: 1 }}
                  />
                  <Button
                    variant="text"
                    size="small"
                    component={RouterLink}
                    to={`/paragraphs/${selectedWord.paragraph.id}`}
                  >
                    View Paragraph
                  </Button>
                </Box>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              startIcon={<RefreshIcon />}
              onClick={handleRegenerateDefinition}
              disabled={regenerating}
            >
              {regenerating ? 'Regenerating...' : 'Regenerate Definition'}
            </Button>
            <Button
              startIcon={<DeleteIcon />}
              color="error"
              onClick={() => handleDeleteWord(selectedWord.id)}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default SavedWordsPage;
