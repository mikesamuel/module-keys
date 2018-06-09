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
const relpath = require('../lib/relpath.js');
const { sep } = require('path');

/** UNIX paths -> local system paths */
function local(str) {
  return str.replace(/[/]/g, sep);
}

describe('dedot', () => {
  [
    /* eslint-disable array-element-newline */
    [ '', '' ],
    [ '.', '' ],
    [ '..', '' ],
    [ './..', '' ],
    [ '../.', '' ],
    [ './.././../../.', '' ],
    [ '/', '/' ],
    [ '/.', '/' ],
    [ '/./', '/' ],
    [ '/..', '/' ],
    [ '/../', '/' ],
    [ '/foo', '/foo' ],
    [ 'foo', 'foo' ],
    [ 'foo/', 'foo' ],
    [ 'foo/bar', 'foo/bar' ],
    [ 'foo/bar/../baz', 'foo/baz' ],
    [ 'foo/bar/./../baz', 'foo/baz' ],
    [ 'foo/bar/././../baz', 'foo/baz' ],
    [ 'foo/bar/../../baz', 'baz' ],
    [ 'foo/bar/../baz/../', 'foo' ],
    [ '/foo/bar/../baz/../', '/foo' ],
    [ '/foo/bar/../../baz/../', '/' ],
    [ '/foo/bar/../../../baz/../', '/' ],
    [ '/foo/bar/../../../baz/../..', '/' ],
    [ '/foo/bar/../../../baz/../../', '/' ],
    [ 'a/.../b', 'a/.../b' ],
    [ 'a//b', 'a/b' ],
    [ 'a/b//../c', 'a/c' ],
    [ 'a//', 'a' ],
    [ '///a', '/a' ],
    /* eslint-enable array-element-newline */
  ].forEach(([ inp, want ]) => {
    it(`dedot(${ JSON.stringify(inp) })`, () => {
      const localInp = local(inp);
      const localWant = local(want);
      expect(relpath.dedot(localInp)).to.equal(localWant);
    });
  });
});

describe('relpath', () => {
  [
    /* eslint-disable array-element-newline */
    [ '/', '/', '.' ],
    [ '/foo/bar', '/foo/bar/baz', './baz' ],
    [ '/foo/bar', '/foo/bar/baz/..', '.' ],
    [ '/a/b', '/a/c/d/e/f', '../c/d/e/f' ],
    /* eslint-enable array-element-newline */
  ].forEach(([ base, abs, want ]) => {
    it(`relpath(${ JSON.stringify(base) }, ${ JSON.stringify(abs) })`, () => {
      const localBase = local(base);
      const localAbs = local(abs);
      const localWant = local(want);
      const got = relpath.relpath(localBase, localAbs);
      expect(got).to.equal(localWant);
    });
  });
});
