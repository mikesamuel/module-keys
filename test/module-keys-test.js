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

/* eslint "no-sync": off, "no-console": off */

'use strict';

const { expect } = require('chai');
const { describe, it } = require('mocha');
const index = require('../index.js');
const { makeModuleKeys, isPublicKey } = index;

describe('trusted path', () => {
  const id = require.resolve('../index.js');
  const imposter = {
    id,
    exports: {
      makeModuleKeys() {
        throw new Error('muhahaha');
      },
    },
  };
  it('require cache replacement', () => {
    expect(require.cache[id].exports).to.equal(index);
    expect(() => (require.cache[id] = imposter)).to.throw();
    expect(() => (require.cache[id].exports = imposter.exports)).to.throw();
    expect(require.cache[id].exports).to.equal(index);
  });
  it('maker replacement', () => {
    expect(() => (index.makeModuleKeys = imposter.exports.makeModuleKeys)).to.throw();
    expect(require.cache[id].exports.makeModuleKeys).to.equal(makeModuleKeys);
    expect(index.makeModuleKeys).to.equal(makeModuleKeys);
  });
  it('isPublicKey replacement', () => {
    expect(() => (index.isPublicKey = () => true)).to.throw();
    expect(require.cache[id].exports.isPublicKey).to.equal(isPublicKey);
    expect(index.isPublicKey).to.equal(isPublicKey);
  });
});

describe('privacy', () => {
  const alice = index.makeModuleKeys('alice');
  const box = alice.box('foo', () => true);
  it('private key leak', () => {
    // Walk all object reachable from public key and a box to make sure private key not among them.
    const seen = new Set();
    function walk(obj) {
      if (!(obj instanceof Object) || seen.has(obj)) {
        return;
      }
      seen.add(obj);
      for (const keys of [ Object.getOwnPropertySymbols(obj), Object.getOwnPropertyNames(obj) ]) {
        for (const key of keys) {
          let value = null;
          try {
            value = obj[key];
          } catch (exc) {
            // Unreachable if cannot be read.
          }
          walk(value);
        }
      }
      walk(Object.getPrototypeOf(obj));
    }
    for (const root of [ alice, box ]) {
      walk(root);
    }

    expect(seen.has(alice.privateKey)).to.equal(false);
  });
});

describe('mitm', () => {
  function create2AndShare() {
    const alice = makeModuleKeys('alice');
    const bob = makeModuleKeys('bob');
    const box = alice.box(
      {}, (key) => key === bob.publicKey && isPublicKey(key) && key());
    bob.unbox(
      box, (key) => key === alice.publicKey && isPublicKey(key) && key());
  }

  const targets = [
    [ Object, 'create' ],
    [ Object, 'assign' ],
    [ Object, 'defineProperty' ],
    [ Object, 'defineProperties' ],
    [ Object, 'freeze' ],
    [ Object, 'getOwnPropertyDescriptors' ],
    [ Object.prototype, 'hasOwnProperty' ],
    [ Object.prototype, 'toString' ],
    [ Object.prototype, 'valueOf' ],
    [ Function, 'apply' ],
    [ Function, 'bind' ],
    [ Function, 'call' ],
    [ WeakMap, 'has' ],
    [ WeakMap, 'get' ],
    [ WeakMap, 'set' ],
    [ WeakSet, 'add' ],
    [ WeakSet, 'has' ],
    [ global, 'Boolean' ],
    [ global, 'Number' ],
    [ global, 'Object' ],
    [ global, 'String' ],
  ];
  for (const [ obj, name ] of targets) {
    it(`${obj.name || '?'}.${name}`, () => {
      let successful = false;
      const original = obj[name];
      obj[name] = (...args) => {
        successful = true;
        return original(...args);
      };
      try {
        create2AndShare();
      } finally {
        obj[name] = original;
      }
      expect(successful).to.equal(false);
    });
  }
});