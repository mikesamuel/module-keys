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

const fs = require('fs'); // eslint-disable-line id-length
const path = require('path');
const { expect } = require('chai');
const { describe, it } = require('mocha');

describe('module-code', () => {
  it('in-sync', () => {
    let jsData = fs.readFileSync( // eslint-disable-line no-sync
      path.join(__dirname, '..', 'index.js'), { encoding: 'UTF-8' });
    let mjsData = fs.readFileSync( // eslint-disable-line no-sync
      path.join(__dirname, '..', 'index.mjs'), { encoding: 'UTF-8' });

    jsData = jsData.substring(0, jsData.indexOf('\n// CommonJS specific\n'));
    mjsData = mjsData.substring(0, mjsData.indexOf('\n// EcmaScript modules specific\n'));

    expect(jsData).to.equal(mjsData);
  });
});
