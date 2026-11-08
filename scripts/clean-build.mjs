import { rm } from 'node:fs/promises';
// Finder/indexing can race directory removal on macOS (ENOTEMPTY).
// Only the reproducible build output is removed; retry before Vite copies tiles.
await rm(new URL('../dist/',import.meta.url),{recursive:true,force:true,maxRetries:5,retryDelay:120});
