import { cpSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const extensionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requireFromExtension = createRequire(path.join(extensionRoot, 'package.json'));
const codeGraphPackage = requireFromExtension.resolve('@colbymchenry/codegraph/package.json');
const requireFromCodeGraph = createRequire(codeGraphPackage);
const platformPackage = `@colbymchenry/codegraph-${process.platform}-${process.arch}`;
const platformRoot = path.dirname(requireFromCodeGraph.resolve(`${platformPackage}/package.json`));
const destination = path.join(extensionRoot, 'dist', 'codegraph');

rmSync(destination, { force: true, recursive: true });
cpSync(platformRoot, destination, { recursive: true });
