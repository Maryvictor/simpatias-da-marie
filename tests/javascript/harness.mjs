// Mini executor de testes: sem dependências, funciona do Node 14.17 ao 22.
import assert from 'assert';
import { readFileSync } from 'fs';

export const strict = assert.strict;
const registry = [];

export function test(name, fn) {
  registry.push({ name, fn });
}

export function data(relativePath) {
  return JSON.parse(readFileSync(new URL(`../../data/${relativePath}`, import.meta.url), 'utf-8'));
}

export async function run() {
  let failed = 0;
  for (const { name, fn } of registry) {
    try {
      await fn();
      console.log(`  ok   ${name}`);
    } catch (error) {
      failed += 1;
      console.log(`  FAIL ${name}\n       ${String(error.stack || error).split('\n').join('\n       ')}`);
    }
  }
  console.log(`\n${registry.length - failed}/${registry.length} testes passaram.`);
  process.exitCode = failed ? 1 : 0;
}
