// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Box, Button, CircularProgress, Fab, Paper, SvgIcon, TextField, Tooltip, Typography } from '@mui/material';
import { ReactElement, useState } from 'react';
import { useBot } from './context/Bot';

function BotIcon(): ReactElement {
  return (
    <SvgIcon viewBox="0 0 24 24">
      <path d="M9 11a1 1 0 1 0 0 2a1 1 0 0 0 0-2zm6 0a1 1 0 1 0 0 2a1 1 0 0 0 0-2z" />
      <path d="M11 2h2v2h-2zM7 6h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-1v2h-2v-2h-4v2H8v-2H7a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3zm0 2a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H7z" />
    </SvgIcon>
  );
}

function getMessageColor(role: 'user' | 'assistant' | 'error'): 'error.main' | 'text.black' | 'text.secondary' {
  if (role === 'error') {
    return 'error.main';
  }
  if (role === 'assistant') {
    return 'text.black';
  }
  return 'text.secondary';
}

export default function Bot(): ReactElement {
  const { isOpen, toggleBot, closeBot, sendQuestionToBot, isSending, messages, error } = useBot();
  const [question, setQuestion] = useState<string>('');

  const submitQuestion = async (): Promise<void> => {
    if (!question.trim()) {
      return;
    }
    await sendQuestionToBot(question.trim());
    setQuestion('');
  };

  return (
    <>
      {isOpen && (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            right: 24,
            bottom: 92,
            width: { xs: 'calc(100vw - 32px)', sm: 620 },
            maxWidth: { xs: 'calc(100vw - 32px)', sm: 620 },
            p: 2,
            zIndex: (theme) => theme.zIndex.snackbar + 1,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1">Assistant</Typography>
            <Button size="small" onClick={closeBot}>
              Close
            </Button>
          </Box>

          <Box
            sx={{
              minHeight: 220,
              maxHeight: 560,
              overflowY: 'auto',
              border: (theme) => `1px solid ${theme.palette.divider}`,
              borderRadius: 1,
              p: 1,
              mb: 1.5,
            }}
          >
            {messages.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Welcome to the Perses GenAI Bot!
              </Typography>
            )}

            {messages.map((message) => (
              <Typography
                key={message.id}
                variant="body2"
                sx={{
                  mb: 0.75,
                  color: getMessageColor(message.role),
                }}
              >
                <strong>{message.role === 'user' ? 'You' : 'Bot'}:</strong> {message.content}
              </Typography>
            ))}
          </Box>

          {error && (
            <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
              {error}
            </Typography>
          )}

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Ask a question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void submitQuestion();
                }
              }}
            />
            <Button
              variant="contained"
              onClick={() => void submitQuestion()}
              disabled={isSending || question.trim().length === 0}
            >
              Send
            </Button>
            {isSending && <CircularProgress size={18} />}
          </Box>
        </Paper>
      )}

      <Tooltip title={isOpen ? 'Hide assistant' : 'Open assistant'} placement="left">
        <Fab
          aria-label={isOpen ? 'Hide assistant' : 'Open assistant'}
          color="primary"
          size="large"
          onClick={toggleBot}
          sx={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            zIndex: (theme) => theme.zIndex.snackbar + 1,
          }}
        >
          <BotIcon />
        </Fab>
      </Tooltip>
    </>
  );
}
