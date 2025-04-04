import React from 'react';
import { Button, Tooltip } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

interface SearchDictionaryButtonProps {
  word: string;
  size?: "small" | "medium" | "large";
}

const SearchDictionaryButton: React.FC<SearchDictionaryButtonProps> = ({
  word,
  size = "small"
}) => {
  // List of good German-English dictionaries
  const dictionaries = [
    { name: "PONS", url: "https://en.pons.com/translate/german-english/" },
    { name: "dict.cc", url: "https://www.dict.cc/?s=" },
    { name: "Linguee", url: "https://www.linguee.com/german-english/search?source=german&query=" },
    { name: "Leo", url: "https://dict.leo.org/german-english/" },
    { name: "Reverso", url: "https://context.reverso.net/translation/german-english/" }
  ];

  // Default to PONS dictionary (reliable German-English dictionary)
  const defaultDictionary = dictionaries[0];

  const handleSearch = () => {
    // Open the dictionary in a new tab with the word pre-filled
    window.open(defaultDictionary.url + encodeURIComponent(word), '_blank');
  };

  return (
    <Tooltip title={`Search "${word}" in ${defaultDictionary.name} dictionary`}>
      <Button
        startIcon={<SearchIcon />}
        onClick={handleSearch}
        size={size}
        variant="outlined"
        color="primary"
      >
        Search Online
      </Button>
    </Tooltip>
  );
};

export default SearchDictionaryButton;
