// src/components/vocabulary/CategoryWordGenerator.tsx
import React, { useState, useEffect } from 'react';
import {
  Box, Button, Card, CardContent, Typography, Grid,
  Chip, IconButton, CircularProgress, Dialog,
  DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem,
  SelectChangeEvent,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  Divider
} from '@mui/material';
import {
  Translate as TranslateIcon,
  Add as AddIcon,
  VolumeUp as VolumeUpIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { api } from '../../contexts/AuthContext';

interface VocabularyWord {
  word: string;
  definition: string;
}

interface Category {
  [key: string]: string;
}

const CategoryWordGenerator: React.FC = () => {
  const [categories, setCategories] = useState<Category>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [generatedWords, setGeneratedWords] = useState<VocabularyWord[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [savingWords, setSavingWords] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/vocabulary/categories');
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Failed to load vocabulary categories');
    }
  };

  const handleCategoryChange = (event: SelectChangeEvent) => {
    setSelectedCategory(event.target.value);
  };

  const handleOpenDialog = async () => {
    if (!selectedCategory) {
      setError('Please select a category first');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const response = await api.get('/vocabulary/generate', {
        params: { category: selectedCategory, count: 15 }
      });
      setGeneratedWords(response.data.words);
      setSelectedWords(response.data.words.map((word: VocabularyWord) => word.word));
      setDialogOpen(true);
    } catch (error) {
      console.error('Error generating words:', error);
      setError('Failed to generate vocabulary words');
    } finally {
      setLoading(false);
    }
  };

  // Function to speak German text
  const speakGerman = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleToggleWord = (word: string) => {
    setSelectedWords(prev => {
      if (prev.includes(word)) {
        return prev.filter(w => w !== word);
      } else {
        return [...prev, word];
      }
    });
  };

  const handleSaveSelectedWords = async () => {
    if (selectedWords.length === 0) {
      setError('Please select at least one word to save');
      return;
    }

    setError(null);
    setSavingWords(true);
    try {
      // Create an array of word objects to save
      const wordsToSave = generatedWords
        .filter(wordObj => selectedWords.includes(wordObj.word))
        .map(wordObj => ({
          word: wordObj.word,
          definition: wordObj.definition
        }));

      const response = await api.post('/vocabulary/bulk-save', {
        words: wordsToSave,
        category: selectedCategory
      });

      setSuccess(`${response.data.savedWords.length} words saved to your vocabulary`);
      setDialogOpen(false);

      // Clear success message after a delay
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error) {
      console.error('Error saving words:', error);
      setError('Failed to save words to your vocabulary');
    } finally {
      setSavingWords(false);
    }
  };

  return (
    <Card elevation={2} sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <CategoryIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">Generate Vocabulary by Category</Typography>
        </Box>

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {success && (
          <Typography color="success.main" sx={{ mb: 2 }}>
            {success}
          </Typography>
        )}

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel id="category-select-label">Vocabulary Category</InputLabel>
              <Select
                labelId="category-select-label"
                value={selectedCategory}
                label="Vocabulary Category"
                onChange={handleCategoryChange}
              >
                {Object.entries(categories).map(([key, value]) => (
                  <MenuItem key={key} value={key}>{value}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleOpenDialog}
              disabled={loading || !selectedCategory}
              startIcon={loading ? <CircularProgress size={24} /> : <TranslateIcon />}
            >
              {loading ? 'Generating...' : 'Generate Words'}
            </Button>
          </Grid>
        </Grid>
      </CardContent>

      {/* Word Selection Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <TranslateIcon sx={{ mr: 1 }} />
            Select Words to Add ({selectedCategory})
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="textSecondary" paragraph>
            Select the words you want to add to your vocabulary. You can deselect any words you don't want to save.
          </Typography>

          <List sx={{ width: '100%' }}>
            {generatedWords.map((wordObj, index) => (
              <React.Fragment key={wordObj.word}>
                <ListItem>
                  <Checkbox
                    edge="start"
                    checked={selectedWords.includes(wordObj.word)}
                    onChange={() => handleToggleWord(wordObj.word)}
                  />
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center">
                        <Typography variant="subtitle1">{wordObj.word}</Typography>
                        <IconButton
                          size="small"
                          onClick={() => speakGerman(wordObj.word.replace(/der |die |das /, ''))}
                          sx={{ ml: 1 }}
                        >
                          <VolumeUpIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    }
                    secondary={wordObj.definition}
                  />
                </ListItem>
                {index < generatedWords.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveSelectedWords}
            disabled={savingWords || selectedWords.length === 0}
            startIcon={savingWords ? <CircularProgress size={20} /> : <AddIcon />}
          >
            {savingWords ? 'Saving...' : `Add ${selectedWords.length} Words`}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default CategoryWordGenerator;
