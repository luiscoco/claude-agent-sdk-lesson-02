import { inspectSettings } from '../server/settings.js';
console.log('Actual alpha configuration helpers; selected teaching fields only.');
console.log(JSON.stringify(await inspectSettings(), null, 2));
