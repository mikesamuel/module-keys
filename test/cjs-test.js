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

/* eslint "no-sync": off, "no-console": off, "no-magic-numbers": off, "global-require": off */

'use strict';

const { expect } = require('chai');
const { describe, it } = require('mocha');
require('../cjs').polyfill(module, require);
const { isPublicKey } = require('../index.js');

describe('cjs', () => {
  describe('exports', () => {
    it('simple polyfill', () => {
      const polyfilled = require('./data/cjs/simple.js');
      expect(isPublicKey(polyfilled.publicKey)).to.equal(true);
      expect(polyfilled.exp).to.equal(42);
    });
    it('replaces exports', () => {
      const polyfilled = require('./data/cjs/replaces.js');
      expect(isPublicKey(polyfilled.publicKey)).to.equal(true);
      expect(polyfilled.exp).to.equal(42);
    });
    it('exports another module', () => {
      const polyfilled = require('./data/cjs/reexporter.js');
      expect(isPublicKey(polyfilled.publicKey)).to.equal(true);
      expect(polyfilled.publicKey).to.equal(require('./data/cjs/simple.js').publicKey);
      expect(polyfilled.exp).to.equal(42);
    });
    it('freezes exports', () => {
      // should not throw
      const polyfilled = require('./data/cjs/freezes-exports.js');
      expect(polyfilled.exp).to.equal(42);
    });
    it('freezes exports late', () => {
      // should not throw
      const polyfilled = require('./data/cjs/freezes-exports-late.js');
      expect(isPublicKey(polyfilled.publicKey)).to.equal(true);
      expect(polyfilled.exp).to.equal(42);
    });
    it('legacy publicKey export', () => {
      const polyfilled = require('./data/cjs/legacy-publickey-export.js');
      expect(polyfilled.publicKey).to.equal('foo');
      expect(isPublicKey(polyfilled.publicKey)).to.equal(false);
      expect(polyfilled.exp).to.equal(42);
    });
    it('exports primitive', () => {
      const polyfilled = require('./data/cjs/primitive-export.js');
      expect(polyfilled).to.equal(42);
    });
    it('loaded while loading', () => {
      const polyfilled = require('./data/cjs/loaded-while-loading.js');
      expect(polyfilled.loadedWhileLoading).to.equal(false);
      expect(isPublicKey(polyfilled.publicKey)).to.equal(true);
    });
  });
  describe('require.moduleKeys', () => {
    const { keys } = require;
    it('publicKey', () => {
      expect(isPublicKey(keys.publicKey)).to.equal(true);
    });
    it('keys', () => {
      expect(keys.publicKey()).to.equal(false);
      expect(keys.privateKey(() => keys.publicKey())).to.equal(true);
      expect(keys.publicKey()).to.equal(false);
    });
    it('exports', () => {
      expect(keys.publicKey).to.equal(module.exports.publicKey);
    });
    it('id', () => {
      expect(module.exports.publicKey.moduleIdentifier).to.equal(__filename);
    });
  });
});
