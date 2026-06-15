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

import { fetchJson, StatusError } from '@perses-dev/core';
import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { FrontendBotConfig } from './config-client';
import { HTTPHeader, HTTPMethodGET } from './http';

const defaultAskPath = '/ask';

export interface BotAskRequest {
  question: string;
  conversationId?: string;
}

export interface BotAskResponse {
  answer?: string;
  response?: string;
  message?: string;
  conversationId?: string;
  data?: unknown;
}

export interface BotClientConfig {
  askUrl?: string;
  method?: typeof HTTPMethodGET;
  headers?: Record<string, string>;
}

export interface BotResolvedEndpoints {
  ask?: string;
  stream?: string;
  reset?: string;
  health?: string;
}

function normalizePath(path?: string): string | undefined {
  if (!path) {
    return undefined;
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  if (path.startsWith('/')) {
    return path;
  }
  return `/${path}`;
}

function buildEndpointUrl(baseUrl: string | undefined, path: string | undefined): string | undefined {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath) {
    return undefined;
  }
  if (normalizedPath.startsWith('http://') || normalizedPath.startsWith('https://')) {
    return normalizedPath;
  }
  if (!baseUrl || baseUrl.length === 0) {
    return normalizedPath;
  }
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBaseUrl}${normalizedPath}`;
}

export function resolveBotEndpoints(botConfig?: FrontendBotConfig): BotResolvedEndpoints {
  const endpoints = botConfig?.endpoints ?? {};
  return {
    ask: buildEndpointUrl(botConfig?.base_url, endpoints.ask?.path ?? defaultAskPath),
    stream: buildEndpointUrl(botConfig?.base_url, endpoints.stream?.path),
    reset: buildEndpointUrl(botConfig?.base_url, endpoints.reset?.path),
    health: buildEndpointUrl(botConfig?.base_url, endpoints.health?.path),
  };
}

export function buildBotClientConfig(botConfig?: FrontendBotConfig): BotClientConfig {
  const endpoints = resolveBotEndpoints(botConfig);
  return {
    askUrl: endpoints.ask,
    method: HTTPMethodGET,
    headers: HTTPHeader,
  };
}

function resolveAskUrl(askUrl?: string): string {
  if (!askUrl || askUrl.length === 0) {
    return defaultAskPath;
  }
  return askUrl;
}

export function askBot(payload: BotAskRequest, config?: BotClientConfig): Promise<BotAskResponse> {
  const method = config?.method ?? HTTPMethodGET;
  const headers = config?.headers ?? HTTPHeader;
  const url = resolveAskUrl(config?.askUrl);
  const queryParams = new URLSearchParams();
  queryParams.set('question', payload.question);
  const query = queryParams.toString();
  const separator = url.includes('?') ? '&' : '?';
  return fetchJson<BotAskResponse>(`${url}${separator}${query}`, {
    method,
    headers,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Extracts bot text content from different response payload shapes.
 * Supports string, string[], and object fields like answer/response/message.
 */
export function extractBotResponseContent(payload: unknown): string | undefined {
  if (typeof payload === 'string') {
    return payload;
  }

  if (Array.isArray(payload)) {
    const firstText = payload.find((item) => typeof item === 'string');
    if (typeof firstText === 'string') {
      return firstText;
    }
    return undefined;
  }

  if (!isRecord(payload)) {
    return undefined;
  }

  const directFields = ['answer', 'response', 'message'];
  for (const key of directFields) {
    const value = payload[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }

  const dataField = payload.data;
  if (typeof dataField === 'string' && dataField.length > 0) {
    return dataField;
  }

  if (Array.isArray(dataField)) {
    const firstDataText = dataField.find((item) => typeof item === 'string');
    if (typeof firstDataText === 'string') {
      return firstDataText;
    }
  }

  return undefined;
}

export function useAskBotMutation(
  config?: BotClientConfig
): UseMutationResult<BotAskResponse, StatusError, BotAskRequest> {
  return useMutation({
    mutationKey: ['bot', 'ask', config?.askUrl, config?.method],
    mutationFn: (payload: BotAskRequest) => askBot(payload, config),
  });
}
