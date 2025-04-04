// src/pages/SavedWordsPage.tsx - Updated with category filtering
import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Typography, Paper, List, ListItem, ListItemText,
  IconButton, Divider, CircularProgress, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Grid, Card, CardContent, CardActions, Chip, Tooltip, InputAdornment,
  Tab, Tabs, Accordion, AccordionSummary, AccordionDetails,
  Select, MenuItem, FormControl, SelectChangeEvent
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  QuizOutlined as QuizIcon,
  Search as SearchIcon,
  VolumeUp as VolumeUpIcon,
  FilterAlt as FilterIcon,
  ExpandMore as ExpandMoreIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { savedWordService } from '../services/api';
import CategoryWordGenerator from '../components/vocabulary/CategoryWordGenerator';
import SearchDictionaryButton from '../components/SearchDictionaryButton';
import DictionarySearchMenu from '../components/DictionarySearchMenu';
import TranslationServiceNotice from '../components/TranslationServiceNotice';

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
      id={`words-tabpanel-${index}`}
      aria-labelledby={`words-tab-${index}`}
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

const SavedWordsPage: React.FC = () => {
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWord, setSelectedWord] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [tabValue, setTabValue] = useState(0);
  const [categories, setCategories] = useState<{[key: string]: any[]}>({});
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const refreshWordList = async () => {
    await fetchWords();
  };

  useEffect(() => {
    fetchWords();
  }, []);

  const fetchWords = async () => {
    setLoading(true);
    try {
      let allWords: any[] = [];
      let currentPage = 1;
      let totalPages = 1;

      do {
        const response = await savedWordService.getAll({ page: currentPage });
        const { data, last_page } = response.data;

        allWords = [...allWords, ...data];
        totalPages = last_page;
        currentPage++;
      } while (currentPage <= totalPages);

      setWords(allWords);

      // Organize words by category
      const categorizedWords: { [key: string]: any[] } = {
        Uncategorized: [],
      };

      allWords.forEach((word: any) => {
        const category = word.category || "Uncategorized";
        if (!categorizedWords[category]) {
          categorizedWords[category] = [];
        }
        categorizedWords[category].push(word);
      });

      // Set initial expanded categories (open the first few)
      const initialExpanded = Object.keys(categorizedWords).slice(0, 3);
      setExpandedCategories(initialExpanded);

      setCategories(categorizedWords);
    } catch (error) {
      console.error("Error fetching saved words:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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

      // Also update the word in categories
      const updatedCategories = {...categories};
      Object.keys(updatedCategories).forEach(category => {
        updatedCategories[category] = updatedCategories[category].map(w =>
          w.id === selectedWord.id ? response.data.savedWord : w
        );
      });
      setCategories(updatedCategories);

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

      // Also remove the word from categories
      const updatedCategories = {...categories};
      Object.keys(updatedCategories).forEach(category => {
        updatedCategories[category] = updatedCategories[category].filter(w => w.id !== id);
      });
      setCategories(updatedCategories);

      handleCloseDialog();
    } catch (error) {
      console.error('Error deleting word:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateCategory = async (wordId: number, newCategory: string) => {
    try {
      await savedWordService.update(wordId, { category: newCategory });

      // Update the word in the list and categories
      const updatedWords = words.map(w => {
        if (w.id === wordId) {
          return {...w, category: newCategory};
        }
        return w;
      });
      setWords(updatedWords);

      // Move the word to the correct category
      const updatedCategories = {...categories};

      // Remove from previous categories
      Object.keys(updatedCategories).forEach(category => {
        updatedCategories[category] = updatedCategories[category].filter(w => w.id !== wordId);
      });

      // Add to new category
      const wordToMove = words.find(w => w.id === wordId);
      if (wordToMove) {
        const targetCategory = newCategory || 'Uncategorized';
        if (!updatedCategories[targetCategory]) {
          updatedCategories[targetCategory] = [];
        }
        updatedCategories[targetCategory].push({...wordToMove, category: newCategory});
      }

      setCategories(updatedCategories);

      if (selectedWord && selectedWord.id === wordId) {
        setSelectedWord({...selectedWord, category: newCategory});
      }
    } catch (error) {
      console.error('Error updating word category:', error);
    }
  };

  // Function to speak the German word
  const speakGerman = (text: string) => {
    if ('speechSynthesis' in window) {
      // Remove articles (der, die, das) if present for better pronunciation
      const wordToSpeak = text.replace(/^(der|die|das) /, '');
      const utterance = new SpeechSynthesisUtterance(wordToSpeak);
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

  const toggleCategoryExpansion = (category: string) => {
    if (expandedCategories.includes(category)) {
      setExpandedCategories(expandedCategories.filter(c => c !== category));
    } else {
      setExpandedCategories([...expandedCategories, category]);
    }
  };

  const filteredWords = words.filter(word => {
    // Search term filter
    const matchesSearch = word.word.toLowerCase().includes(searchTerm);

    // Category filter (only in All tab)
    const matchesCategory = !selectedCategory || word.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getAvailableCategories = () => {
    const allCategories = Object.keys(categories);

    // Add "Uncategorized" if it doesn't exist but there are uncategorized words
    if (!allCategories.includes('Uncategorized') &&
        words.some(word => !word.category)) {
      allCategories.push('Uncategorized');
    }

    return allCategories;
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        My German Vocabulary
      </Typography>

    <TranslationServiceNotice />

      {/* Word Generator */}
      <CategoryWordGenerator />

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

        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="vocabulary view tabs"
          sx={{ mt: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            label="All Words"
            id="words-tab-0"
            aria-controls="words-tabpanel-0"
          />
          <Tab
            label="By Category"
            id="words-tab-1"
            aria-controls="words-tabpanel-1"
            icon={<CategoryIcon />}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          <TabPanel value={tabValue} index={0}>
            {/* Filter chips for categories in All Words view */}
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom display="flex" alignItems="center">
                <FilterIcon fontSize="small" sx={{ mr: 1 }} /> Filter by Category:
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {getAvailableCategories().map(category => (
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

            {/* All Words Grid View */}
            {filteredWords.length > 0 ? (
              <Grid container spacing={2}>
                {filteredWords.map((word) => {
  const difficulty = getWordDifficulty(word.word);
  const wordCategory = word.category || 'Uncategorized';
  const wordType = extractCategory(word.definition);
  const hasFailedDefinition = word.definition?.includes("translation unavailable") ||
                             word.definition?.includes("keine Antwort");

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
          {wordType && (
            <Chip
              label={wordType}
              variant="outlined"
              size="small"
            />
          )}
          <Chip
            label={wordCategory}
            color="primary"
            variant="outlined"
            size="small"
          />
          {hasFailedDefinition && (
            <Chip
              label="Translation error"
              color="error"
              size="small"
              variant="outlined"
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

        {hasFailedDefinition && (
          <DictionarySearchMenu word={word.word} size="small" />
        )}

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
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {/* Categorized Words View */}
            {Object.keys(categories).length > 0 ? (
              <Box>
                {Object.entries(categories)
                  .sort(([catA], [catB]) => catA === 'Uncategorized' ? 1 : catB === 'Uncategorized' ? -1 : catA.localeCompare(catB))
                  .map(([category, categoryWords]) => (
                    categoryWords.length > 0 && (
                      <Accordion
                        key={category}
                        expanded={expandedCategories.includes(category)}
                        onChange={() => toggleCategoryExpansion(category)}
                        sx={{ mb: 2 }}
                      >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                            <Typography variant="h6">{category}</Typography>
                            <Chip
                              label={`${categoryWords.length} words`}
                              size="small"
                              color="primary"
                              sx={{ ml: 2 }}
                            />
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Grid container spacing={2}>
                            {categoryWords.map((word) => {
                              const difficulty = getWordDifficulty(word.word);
                              const wordType = extractCategory(word.definition);

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
                                        {wordType && (
                                          <Chip
                                            label={wordType}
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
                                    </CardActions>
                                  </Card>
                                </Grid>
                              );
                            })}
                          </Grid>
                        </AccordionDetails>
                      </Accordion>
                    )
                  ))}
              </Box>
            ) : (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body1" color="textSecondary">
                  No saved words yet. Start reading German texts to save words!
                </Typography>
              </Paper>
            )}
          </TabPanel>
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

      {/* Add the search dictionary button */}
      {(selectedWord.definition?.includes("translation unavailable") ||
        selectedWord.definition?.includes("keine Antwort")) && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="error" sx={{ mb: 1 }}>
            Automatic translation currently unavailable.
          </Typography>
          <SearchDictionaryButton word={selectedWord.word} />
        </Box>
      )}

      <Typography variant="subtitle1" gutterBottom>
        Category:
      </Typography>
      <Box sx={{ mb: 2 }}>
        <FormControl fullWidth size="small">
          <Select
            native
            value={selectedWord.category || ''}
            onChange={(e: SelectChangeEvent) => handleUpdateCategory(selectedWord.id, e.target.value)}
            fullWidth
            size="small"
          >
            <option value="">Uncategorized</option>
            {getAvailableCategories()
              .filter(cat => cat !== 'Uncategorized')
              .map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
          </Select>
        </FormControl>
      </Box>

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
      <DictionarySearchMenu word={selectedWord.word} />
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
