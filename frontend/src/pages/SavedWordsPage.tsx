import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Typography, Paper, List, ListItem, ListItemText,
  IconButton, Divider, CircularProgress, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Grid, Card, CardContent, CardActions, Chip, Tooltip, InputAdornment
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  QuizOutlined as QuizIcon,
  Search as SearchIcon,
  VolumeUp as VolumeUpIcon,
  FilterAlt as FilterIcon
} from '@mui/icons-material';
import { savedWordService } from '../services/api';

// Define word difficulty levels by letter counts
const getWordDifficulty = (word: string): 'easy' | 'medium' | 'hard' => {
  const length = word.length;
  if (length <= 5) return 'easy';
  if (length <= 10) return 'medium';
  return 'hard';
};

// Color mapping for difficulty
const difficultyColors = {
  easy: 'success',
  medium: 'warning',
  hard: 'error'
};

// Word categories for German
const germanCategories = [
  'Noun', 'Verb', 'Adjective', 'Adverb', 'Preposition',
  'Conjunction', 'Article', 'Pronoun'
];

const SavedWordsPage: React.FC = () => {
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWord, setSelectedWord] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

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

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(selectedCategory === category ? '' : category);
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

  // Function to speak the German word
  const speakGerman = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Extract category from definition (crude implementation - would need improvement)
  const extractCategory = (definition: string): string => {
    const lowerDef = definition?.toLowerCase() || '';
    if (!lowerDef) return '';

    if (lowerDef.includes('noun') || lowerDef.includes('der ') || lowerDef.includes('die ') || lowerDef.includes('das '))
      return 'Noun';
    if (lowerDef.includes('verb') || lowerDef.match(/to \w+/))
      return 'Verb';
    if (lowerDef.includes('adjective'))
      return 'Adjective';
    if (lowerDef.includes('adverb'))
      return 'Adverb';
    if (lowerDef.includes('preposition'))
      return 'Preposition';
    if (lowerDef.includes('conjunction'))
      return 'Conjunction';
    if (lowerDef.includes('article'))
      return 'Article';
    if (lowerDef.includes('pronoun'))
      return 'Pronoun';

    return '';
  };

  const filteredWords = words.filter(word => {
    // Search term filter
    const matchesSearch = word.word.toLowerCase().includes(searchTerm);

    // Category filter
    const category = extractCategory(word.definition);
    const matchesCategory = !selectedCategory || category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        My German Vocabulary
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" flexWrap="wrap">
          <TextField
            placeholder="Search German words..."
            value={searchTerm}
            onChange={handleSearch}
            sx={{ flexGrow: 1, mr: 2, mb: { xs: 2, md: 0 } }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>,
            }}
          />
          <Button
            component={RouterLink}
            to="/quizzes/create"
            variant="contained"
            startIcon={<QuizIcon />}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Create Quiz
          </Button>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom display="flex" alignItems="center">
            <FilterIcon fontSize="small" sx={{ mr: 1 }} /> Filter by Word Type:
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {germanCategories.map(category => (
              <Chip
                key={category}
                label={category}
                onClick={() => handleCategoryChange(category)}
                color={selectedCategory === category ? "primary" : "default"}
                variant={selectedCategory === category ? "filled" : "outlined"}
                clickable
              />
            ))}
          </Box>
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
              {filteredWords.map((word) => {
                const difficulty = getWordDifficulty(word.word);
                const category = extractCategory(word.definition);

                return (
                <Grid item xs={12} sm={6} md={4} key={word.id}>
                  <Card>
                    <CardContent sx={{ pb: 1 }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                        <Typography variant="h6">
                          {word.word}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            speakGerman(word.word);
                          }}
                          color="primary"
                        >
                          <VolumeUpIcon />
                        </IconButton>
                      </Box>

                      <Box display="flex" flexWrap="wrap" gap={0.5} mb={1}>
                        <Chip
                          label={difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                          color={difficultyColors[difficulty] as any}
                          size="small"
                        />
                        {category && (
                          <Chip
                            label={category}
                            variant="outlined"
                            size="small"
                          />
                        )}
                      </Box>

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
                        <Tooltip title="Source German text">
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
              )})}
            </Grid>
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="textSecondary">
                {searchTerm || selectedCategory ?
                  'No words match your search or filter criteria.' :
                  'No saved words yet. Start reading German texts to save words!'}
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
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="h6">{selectedWord.word}</Typography>
              <IconButton
                onClick={() => speakGerman(selectedWord.word)}
                color="primary"
              >
                <VolumeUpIcon />
              </IconButton>
            </Box>
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
                    View German Text
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
