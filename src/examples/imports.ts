import { query, tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { query as coreQuery } from '@anthropic-ai/claude-agent-sdk/core';
import type { FileReadInput } from '@anthropic-ai/claude-agent-sdk/sdk-tools';
export const imports = { query, tool, createSdkMcpServer, coreQuery };
export const sampleInput: FileReadInput = { file_path: '/example/README.md' };
