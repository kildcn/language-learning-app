import React, { useState } from 'react';
import {
  Alert,
  AlertTitle,
  IconButton,
  Collapse,
  Box,
  Link
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const TranslationServiceNotice: React.FC = () => {
  const [open, setOpen] = useState(true);

  return (
    <Collapse in={open}>
      <Alert
        severity="info"
        action={
          <IconButton
            aria-label="close"
            color="inherit"
            size="small"
            onClick={() => setOpen(false)}
          >
            <CloseIcon fontSize="inherit" />
          </IconButton>
        }
        sx={{ mb: 3 }}
      >
        <AlertTitle>Automatic Translation Temporarily Limited</AlertTitle>
        <Box>
          <p>
            Our automatic translation service is currently experiencing limited availability.
            You can still look up any word by using the "Search Dictionary" button that appears
            next to words with translation issues.
          </p>
          <p>
            We recommend using{' '}
            <Link href="https://en.pons.com/translate/german-english/" target="_blank" rel="noopener">
              PONS Dictionary
            </Link>{' '}
            or{' '}
            <Link href="https://www.dict.cc/" target="_blank" rel="noopener">
              dict.cc
            </Link>{' '}
            for accurate German-English translations.
          </p>
        </Box>
      </Alert>
    </Collapse>
  );
};

export default TranslationServiceNotice;
