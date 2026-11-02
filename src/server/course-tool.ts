import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { LESSONS } from './catalog.js';
import { TOOL_NAME, TOOL_DESCRIPTION } from '../shared/lesson.js';

export function createCourseServer(onExecute: () => void = () => {}) {
  // SDK 0.3.310 uses positional arguments, not tool({ name, execute, ... }).
  const lookupLesson = tool(
    TOOL_NAME,
    TOOL_DESCRIPTION,
    { lessonId: z.number().int().min(1).max(9), includePractice: z.boolean().default(false) },
    async ({ lessonId, includePractice }) => {
      onExecute();
      const lesson = LESSONS.find((item) => item.id === lessonId);
      if (!lesson) return { content: [{ type: 'text', text: 'Lesson not found.' }], isError: true };
      const data = {
        id: lesson.id,
        title: lesson.title,
        summary: lesson.summary,
        ...(includePractice ? { practice: lesson.practice } : {}),
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        structuredContent: data,
        isError: false,
      };
    },
    { annotations: { readOnlyHint: true, openWorldHint: false } },
  );
  return createSdkMcpServer({ name: 'course-catalog', version: '1.0.0', tools: [lookupLesson] });
}
