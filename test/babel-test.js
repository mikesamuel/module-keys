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

const { expect } = require('chai');
const { describe, it } = require('mocha');
const babel = require('babel-core');
const path = require('path');
const pluginTester = require('babel-plugin-tester');
const plugin = require('../babel');

// https://github.com/babel-utils/babel-plugin-tester
pluginTester({
  plugin,
  fixtures: path.join(__dirname, 'data', 'babel'),
});


describe('polyfilling v bootstrap', () => {
  // Test that the polyfill does not prevent the main library files
  // from bootstrapping themselves.
  // We might get bad interactions if the polyfill introduces a module
  // dependency cycle or if it depends on exports that have yet to be computed.

  function expectPluginNoop(srcFile) {
    // eslint-disable-next-line no-sync
    const { code: withPlugin } = babel.transformFileSync(
      srcFile, { plugins: './babel' });
    // eslint-disable-next-line no-sync
    const { code: withoutPlugin } = babel.transformFileSync(srcFile);
    expect(withPlugin).to.equal(withoutPlugin);
  }

  it('cjs', () => {
    expectPluginNoop(path.join(__dirname, '../index.js'));
  });
  it('es6', () => {
    expectPluginNoop(path.join(__dirname, '../index.mjs'));
  });
});

describe('babel plugin options', () => {
  it('cjs explicit root', () => {
    const { code } = babel.transform(
      'function f() {}',
      {
        filename: '/foo/bar/baz.js',
        plugins: [
          [
            path.join(__dirname, '../babel/index.js'),
            {
              'rootDir': '/foo/boo',
            },
          ],
        ],
      });
    expect(code).to.equal(
      'require("module-keys/cjs").polyfill(module, require);\n\n' +
      'function f() {}');
  });
  it('es6 explicit root', () => {
    const { code } = babel.transform(
      'export function f() {}',
      {
        filename: '/foo/bar/baz.js',
        plugins: [
          [
            path.join(__dirname, '../babel/index.js'),
            {
              'rootDir': '/foo/boo',
            },
          ],
        ],
      });
    expect(code).to.equal([
      /* eslint-disable array-element-newline */
      `import { makeModuleKeys as __moduleKeysMaker } from "../..${ path.join(__dirname, '..') }/index.mjs";`,
      '',
      'const moduleKeys = __moduleKeysMaker("../bar/baz.js"),',
      '      {',
      '  publicKey: __moduleKeysPublicKey',
      '} = moduleKeys;',
      '',
      'export { __moduleKeysPublicKey as publicKey };',
      'export function f() {}',
      /* eslint-enable array-element-newline */
    ].join('\n'));
  });
});
