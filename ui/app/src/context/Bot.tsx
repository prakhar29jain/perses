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

import React, { createContext, ReactElement, useCallback, useContext, useMemo, useState } from 'react';
import {
  BotResolvedEndpoints,
  buildBotClientConfig,
  extractBotResponseContent,
  resolveBotEndpoints,
  useAskBotMutation,
} from '../model/bot-client';
import { useConfigContext } from './Config';

export interface BotMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
}

interface BotContextType {
  isOpen: boolean;
  endpoints: BotResolvedEndpoints;
  messages: BotMessage[];
  isSending: boolean;
  error?: string;
  openBot: () => void;
  closeBot: () => void;
  toggleBot: () => void;
  sendQuestionToBot: (question: string) => Promise<void>;
}

const BotContext = createContext<BotContextType | undefined>(undefined);

export function BotProvider(props: { children: React.ReactNode }): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const { config } = useConfigContext();
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string>();

  const endpoints = useMemo(() => resolveBotEndpoints(config.frontend.bot), [config.frontend.bot]);
  const askMutation = useAskBotMutation(buildBotClientConfig(config.frontend.bot));

  const openBot = useCallback(() => setIsOpen(true), []);
  const closeBot = useCallback(() => setIsOpen(false), []);
  const toggleBot = useCallback(() => setIsOpen((prev) => !prev), []);

  const sendQuestionToBot = useCallback(
    async (question: string): Promise<void> => {
      const trimmedQuestion = question.trim();
      if (trimmedQuestion.length === 0) {
        return;
      }

      setError(undefined);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'user',
          content: trimmedQuestion,
        },
      ]);

      setIsSending(true);
      try {
        const response = await askMutation.mutateAsync({ question: trimmedQuestion });
        const responseContent = extractBotResponseContent(response);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: responseContent ?? 'No response content.',
          },
        ]);
      } catch {
        const errorMessage = 'Failed to contact bot endpoint.';
        setError(errorMessage);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'error',
            content: errorMessage,
          },
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [askMutation]
  );

  const value = useMemo(
    () => ({
      isOpen,
      endpoints,
      messages,
      isSending,
      error,
      openBot,
      closeBot,
      toggleBot,
      sendQuestionToBot,
    }),
    [closeBot, endpoints, error, isOpen, isSending, messages, openBot, sendQuestionToBot, toggleBot]
  );

  return <BotContext.Provider value={value}>{props.children}</BotContext.Provider>;
}

export function useBot(): BotContextType {
  const ctx = useContext(BotContext);
  if (ctx === undefined) {
    throw new Error('No BotContext found. Did you forget a Provider?');
  }
  return ctx;
}
