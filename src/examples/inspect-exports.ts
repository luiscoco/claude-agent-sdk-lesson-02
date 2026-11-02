import { inspectExports } from '../server/exports.js';
const metadata = await inspectExports();
console.log(`Claude Agent SDK ${metadata.version}`);
console.table(
  metadata.exports.map(({ name, kind, group, status, runtimeType }) => ({
    name,
    kind,
    group,
    status,
    runtimeType,
  })),
);
console.log('Read is in the built-in name table:', metadata.builtinNames.includes('Read'));
console.log('Task compatibility alias:', metadata.aliases.Task);
