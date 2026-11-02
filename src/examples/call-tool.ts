import { invokeTool } from '../server/invoke.js';
const id = process.argv[2] === undefined ? 2 : Number(process.argv[2]);
const result = await invokeTool({ lessonId: id, includePractice: true });
console.log('REAL SDK TOOL + IN-MEMORY MCP — no model query\n');
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
