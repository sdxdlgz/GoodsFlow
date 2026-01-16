import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const binExt = process.platform === 'win32' ? '.cmd' : '';

const prismaBin = resolve(rootDir, 'node_modules', '.bin', `prisma${binExt}`);
const nextBin = resolve(rootDir, 'node_modules', '.bin', `next${binExt}`);

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(prismaBin, ['generate']);
run(nextBin, ['build']);
