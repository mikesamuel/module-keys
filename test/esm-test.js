/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const childProcess = require('child_process');
const path = require('path');
const { describe, it } = require('mocha');

describe('index.mjs', () => {
  const test = it('loads', (done) => {
    const proc = childProcess.spawn(
      process.execPath, [ '--experimental-modules' ],
      { stdio: 'ignore' });
    proc.on('exit', (code, signal) => {
      if (code) {
        // node --experimental-modules not supported until node@8
        // eslint-disable-next-line no-console
        console.log('Skipping --experimental-modules support tests');
        done();
        return;
      }
      if (signal) {
        done(new Error(
          `${ process.execPath } terminated with signal ${ signal }`));
        return;
      }
      childProcess.execFile(
        process.execPath,
        [ '--experimental-modules', path.join(__dirname, '..', 'index.mjs') ],
        done);
    });
  });
  test.slow(300); // eslint-disable-line no-magic-numbers
  test.timeout(1000); // eslint-disable-line no-magic-numbers
});
