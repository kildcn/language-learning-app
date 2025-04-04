import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Divider,
  Typography,
  Box
} from '@mui/material';
import {
  Search as SearchIcon,
  ArrowDropDown as ArrowDropDownIcon,
  Language as LanguageIcon,
  OpenInNew as OpenInNewIcon,
  School as SchoolIcon,
  Translate as TranslateIcon
} from '@mui/icons-material';

interface DictionarySearchMenuProps {
  word: string;
  size?: "small" | "medium" | "large";
  variant?: "text" | "outlined" | "contained";
}

// Dictionary information with improved descriptions
const dictionaries = [
  {
    id: 'pons',
    name: 'PONS',
    url: 'https://en.pons.com/translate/german-english/',
    description: 'Professional dictionary with examples, grammar info, and multiple translations',
    highlight: true
  },
  {
    id: 'dict-cc',
    name: 'dict.cc',
    url: 'https://www.dict.cc/?s=',
    description: 'Comprehensive user-contributed dictionary with many example phrases',
    highlight: true
  },
  {
    id: 'linguee',
    name: 'Linguee',
    url: 'https://www.linguee.com/german-english/search?source=german&query=',
    description: 'Dictionary with real context examples from websites and documents',
    highlight: false
  },
  {
    id: 'leo',
    name: 'Leo',
    url: 'https://dict.leo.org/german-english/',
    description: 'German dictionary with forums and discussion for nuanced meanings',
    highlight: false
  },
  {
    id: 'dwds',
    name: 'DWDS',
    url: 'https://www.dwds.de/wb/',
    description: 'German-only dictionary with detailed explanations for advanced learners',
    highlight: false
  },
  {
    id: 'collins',
    name: 'Collins',
    url: 'https://www.collinsdictionary.com/dictionary/german-english/',
    description: 'Clear definitions with usage examples and audio pronunciation',
    highlight: false
  },
  {
    id: 'reverso',
    name: 'Reverso Context',
    url: 'https://context.reverso.net/translation/german-english/',
    description: 'Shows how words are used in different contexts with examples',
    highlight: true
  }
];

const DictionarySearchMenu: React.FC<DictionarySearchMenuProps> = ({
  word,
  size = "small",
  variant = "outlined"
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleDictionarySelect = (dictionary: typeof dictionaries[0]) => {
    window.open(dictionary.url + encodeURIComponent(word), '_blank');
    handleClose();
  };

  const handleDefaultSearch = () => {
    // Use the first dictionary as default
    const defaultDictionary = dictionaries[0];
    window.open(defaultDictionary.url + encodeURIComponent(word), '_blank');
  };

  return (
    <>
      <Button
        variant={variant}
        color="primary"
        size={size}
        onClick={handleDefaultSearch}
        endIcon={
          <Tooltip title="More dictionaries">
            <ArrowDropDownIcon
              onClick={(e) => {
                e.stopPropagation();
                handleClick(e as unknown as React.MouseEvent<HTMLElement>);
              }}
            />
          </Tooltip>
        }
        startIcon={<SearchIcon />}
        sx={{ fontWeight: 'medium' }}
      >
        Search Dictionary
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            maxWidth: 380,
            width: '100%',
            mt: 1
          }
        }}
      >
        <Box sx={{ p: 1.5, pb: 0 }}>
          <Typography variant="subtitle2" color="primary" sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <TranslateIcon fontSize="small" sx={{ mr: 0.5 }} />
            Choose a dictionary to look up:
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontStyle: 'italic' }}>
            "{word}"
          </Typography>
        </Box>
        <Divider />

        {/* Recommended dictionaries first */}
        <Box sx={{ p: 1 }}>
          <Typography variant="caption" color="text.secondary" fontWeight="medium">
            RECOMMENDED
          </Typography>
        </Box>
        {dictionaries.filter(d => d.highlight).map((dictionary) => (
          <MenuItem
            key={dictionary.id}
            onClick={() => handleDictionarySelect(dictionary)}
            sx={{
              py: 1,
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.08)'
              }
            }}
          >
            <ListItemIcon>
              <LanguageIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={dictionary.name}
              secondary={dictionary.description}
              primaryTypographyProps={{
                fontWeight: 'medium'
              }}
            />
            <OpenInNewIcon fontSize="small" sx={{ ml: 1, color: 'text.secondary', opacity: 0.7 }} />
          </MenuItem>
        ))}

        <Divider sx={{ my: 1 }} />

        {/* Other dictionaries */}
        <Box sx={{ p: 1 }}>
          <Typography variant="caption" color="text.secondary" fontWeight="medium">
            OTHER OPTIONS
          </Typography>
        </Box>
        {dictionaries.filter(d => !d.highlight).map((dictionary) => (
          <MenuItem
            key={dictionary.id}
            onClick={() => handleDictionarySelect(dictionary)}
            dense
          >
            <ListItemIcon>
              <LanguageIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={dictionary.name}
              secondary={dictionary.description}
            />
          </MenuItem>
        ))}

        <Divider sx={{ mt: 1 }} />
        <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center' }}>
          <SchoolIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary">
            Tip: Use dictionaries to find accurate translations and add them to your vocabulary
          </Typography>
        </Box>
      </Menu>
    </>
  );
};

export default DictionarySearchMenu;
