import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const binExt = process.platform === 'win32' ? '.cmd' : '';

dotenv.config({ path: resolve(rootDir, '.env.test') });
dotenv.config({ path: resolve(rootDir, '.env') });

const vitestBin = resolve(rootDir, 'node_modules', '.bin', `vitest${binExt}`);

const result = spawnSync(vitestBin, ['run', '--coverage'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'test' },
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
