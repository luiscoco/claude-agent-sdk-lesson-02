import type { CourseLesson } from '../shared/lesson.js';
export const LESSONS: readonly CourseLesson[] = [
  {
    id: 1,
    title: 'Introduction and Package Map',
    summary: 'Explain the host, agent loop, streamed messages, and the package entry points.',
    practice: 'Observe a query stream and identify its final result.',
  },
  {
    id: 2,
    title: 'Core Exports and Main APIs',
    summary:
      'Group the exports by running, preparation, extension, and configuration. Define a clear custom tool contract.',
    practice: 'Define one read-only tool with a description, schema, and execute handler.',
  },
  {
    id: 3,
    title: 'Query Handles and Runtime Methods',
    summary: 'Observe, inspect, and control a running query through its handle.',
    practice: 'Sketch a query lifecycle with streaming and cleanup.',
  },
  {
    id: 4,
    title: 'Options and Session Configuration',
    summary: 'Choose task context, capabilities, limits, and session settings deliberately.',
    practice: 'Explain each option in a small query configuration.',
  },
  {
    id: 5,
    title: 'Tools and Permissions',
    summary: 'Connect capabilities with an explicit host approval strategy.',
    practice: 'Design a read-only repository assistant and explain its permission choices.',
  },
  {
    id: 6,
    title: 'MCP, Subagents, and Sessions',
    summary: 'Connect integrations, delegate focused work, and organize saved context.',
    practice: 'Map a tool server to a session and a history workflow.',
  },
  {
    id: 7,
    title: 'Messages and Hooks',
    summary: 'Distinguish conversation, progress, outcomes, and lifecycle events.',
    practice: 'Choose a lifecycle hook for a focused logging task.',
  },
  {
    id: 8,
    title: 'Browser SDK and Observability',
    summary: 'Explore browser interactions, stream control, usage, context, and tracing.',
    practice: 'Explain the difference between pausing event delivery and stopping work.',
  },
  {
    id: 9,
    title: 'API Status and Migration',
    summary: 'Read stable, alpha, and historical APIs in their version context.',
    practice: 'Plan a small migration and describe how you would verify it.',
  },
];
