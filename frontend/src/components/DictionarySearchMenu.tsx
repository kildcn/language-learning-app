import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  ArrowDropDown as ArrowDropDownIcon,
  Language as LanguageIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';

interface DictionarySearchMenuProps {
  word: string;
  size?: "small" | "medium" | "large";
  variant?: "text" | "outlined" | "contained";
}

// Dictionary information
const dictionaries = [
  {
    id: 'pons',
    name: 'PONS',
    url: 'https://en.pons.com/translate/german-english/',
    description: 'Professional dictionary with examples and grammar info'
  },
  {
    id: 'dict-cc',
    name: 'dict.cc',
    url: 'https://www.dict.cc/?s=',
    description: 'Comprehensive user-contributed dictionary'
  },
  {
    id: 'linguee',
    name: 'Linguee',
    url: 'https://www.linguee.com/german-english/search?source=german&query=',
    description: 'Dictionary with real context examples from websites'
  },
  {
    id: 'leo',
    name: 'Leo',
    url: 'https://dict.leo.org/german-english/',
    description: 'German dictionary with forums and discussion'
  },
  {
    id: 'dwds',
    name: 'DWDS',
    url: 'https://www.dwds.de/wb/',
    description: 'German-only dictionary with detailed explanations'
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
      >
        Search Dictionary
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        {dictionaries.map((dictionary) => (
          <MenuItem
            key={dictionary.id}
            onClick={() => handleDictionarySelect(dictionary)}
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
      </Menu>
    </>
  );
};

export default DictionarySearchMenu;
