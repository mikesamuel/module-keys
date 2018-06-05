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
const { Box, makeModuleKeys, isPublicKey } = require('../index.js');

describe('boxing', () => {
  const alice = makeModuleKeys('alice');
  const bob = makeModuleKeys('bob');
  const carol = makeModuleKeys('carol');
  function isKey({ publicKey }) {
    return (key) => key === publicKey && isPublicKey(key) && key();
  }

  it('permissive', () => {
    const box = alice.box('foo', () => true);
    expect(alice.unbox(box, () => true, 'bar')).to.equal('foo');
    expect(bob.unbox(box, () => true, 'bar')).to.equal('foo');
    expect(carol.unbox(box, () => true, 'bar')).to.equal('foo');
  });
  it('mayOpen', () => {
    const box = alice.box('foo', isKey(bob));
    expect(alice.unbox(box, () => true, 'bar')).to.equal('bar');
    expect(bob.unbox(box, () => true, 'bar')).to.equal('foo');
    expect(carol.unbox(box, () => true, 'bar')).to.equal('bar');
  });
  it('ifFrom', () => {
    const abox = alice.box('foo', isPublicKey);
    const bbox = bob.box('foo', isPublicKey);
    const cbox = carol.box('foo', isPublicKey);
    const fromAlice = isKey(alice);
    expect(bob.unbox(abox, fromAlice, 'bar'), 'a').to.equal('foo');
    expect(bob.unbox(bbox, fromAlice, 'bar'), 'b').to.equal('bar');
    expect(bob.unbox(cbox, fromAlice, 'bar'), 'c').to.equal('bar');
  });
  it('this is null', () => {
    let onlyNullThis = true;
    let nCalls = 0;
    function requireNullThis() {
      // eslint-disable-next-line no-invalid-this
      if (this !== null && this !== void 0) {
        onlyNullThis = false;
      }
      ++nCalls;
      return true;
    }

    const box = alice.box('foo', requireNullThis);
    bob.unbox(box, requireNullThis, 'bar');

    expect(onlyNullThis).to.equal(true);
    expect(nCalls).to.equal(2);
  });
  it('mutual', () => {
    const yall = [ alice, bob, carol ];
    const box = alice.box(true, isKey(bob));
    const results = [];
    for (const opener of yall) {
      for (const ifFrom of yall) {
        results.push(opener.unbox(box, isKey(ifFrom), false));
      }
    }
    expect(results).to.deep.equal(
      [ false, false, false, true, false, false, false, false, false ]);
  });
  it('fallback', () => {
    const box = alice.box(new Date(), isKey(bob));
    expect(carol.unbox(box, () => true, 1)).to.equal(1);
    expect(carol.unbox(box, () => true, null)).to.equal(null);
    const obj = {};
    expect(carol.unbox(box, () => true, obj)).to.equal(obj);
    expect(carol.unbox(box, () => true, obj)).to.not.equal({});
    const dot = /./;
    expect(bob.unbox(box, isKey(carol), dot)).to.equal(dot);
    expect(bob.unbox(null, isKey(carol), dot)).to.equal(dot);
    expect(bob.unbox('[Box]', isKey(carol), dot)).to.equal(dot);
  });
  it('unboxStrict', () => {
    const date = new Date();
    const box = alice.box(date, isKey(bob));
    expect(() => carol.unboxStrict(box, () => true)).to.throw();
    expect(() => bob.unboxStrict(box, isKey(carol))).to.throw();
    expect(bob.unboxStrict(box, isKey(alice))).to.equal(date);
  });
  it('missingMayOpen', () => {
    expect(() => alice.box('foo')).to.throw();
  });
  function justThrow() {
    throw new Error();
  }
  it('missingIfFrom', () => {
    const box = alice.box('foo', justThrow);
    expect(() => bob.unbox(box)).to.throw();
  });
  it('throwingMayOpen', () => {
    const box = alice.box('foo', justThrow);
    expect(() => bob.unbox(box, () => true)).to.throw();
  });
  it('throwingIfFrom', () => {
    const box = alice.box('foo', justThrow);
    expect(() => bob.unbox(box, () => true)).to.throw();
  });
});

describe('Box', () => {
  const alice = makeModuleKeys('alice');
  const box = alice.box('foo', () => true);
  it('toString', () => {
    expect(box.toString()).to.equal('[Box]');
  });
  it('instanceof', () => {
    expect(box instanceof Box).to.equal(true);
  });
});
