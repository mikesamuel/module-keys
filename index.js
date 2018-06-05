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

/**
 * @fileoverview
 * Allow modules to establish secure channels to other modules.
 * This is a general purpose building block that aims to enable:
 * - product teams to grant more privilege to dependencies they
 *   know are compatible with their security needs than to the
 *   bulk of dependencies.
 * - allow conveying sensitive data (secrets, passwords, PII) from
 *   one part of a system to another that are opaque to cross-cutting
 *   concerns like logging.
 * - allow modules that provide APIs that are unsafe when not used
 *   very carefully to interact closely with carefully vetted modules
 *   but failsafe when used by general purpose code.
 */

// Capture some globals so we can rely on them later
const {
  create, defineProperties, defineProperty, freeze, getOwnPropertyNames, getPrototypeOf,
  prototype: ObjectPrototype,
} = Object;
const { apply: fApply, call: fCall } = Function.prototype;

/**
 * @typedef {!function(!PublicKey):boolean}
 */
let KeyPredicate; // eslint-disable-line no-unused-vars, init-declarations

/**
 * A public key analogue is a function that returns true when called in the
 * context of its corresponding private key.
 * @typedef {!function():boolean}
 */
let PublicKey; // eslint-disable-line no-unused-vars, init-declarations

/**
 * A private key analogue is a function that takes a zero argument function,
 * {@code f}, and calls it.  During the call to {@code f}, any calls to the
 * corresponding public key will return true.
 * @template T
 * @typedef {!function(function():T):T}
 */
let PrivateKey; // eslint-disable-line no-unused-vars, init-declarations

/**
 * @typedef {{
 *   boxerPriv: !PrivateKey,
 *   boxerPub: !PublicKey,
 *   value: *,
 *   mayOpen: !KeyPredicate
 * }}
 */
let BoxPrivates; // eslint-disable-line no-unused-vars, init-declarations

/**
 * Called before attacker-controlled code on an internal collections,
 * copies prototype members onto the instance directly, so that later
 * changes to prototypes cannot expose collection internals.
 * @param {!T} collection
 * @return {!T} collection
 * @template T
 */
function selfContained(collection) {
  const proto = getPrototypeOf(collection);
  if (!proto || getPrototypeOf(proto) !== ObjectPrototype) {
    // The loop below is insufficient.
    throw new Error();
  }
  for (const key of getOwnPropertyNames(proto)) {
    defineProperty(collection, key, { value: collection[key] });
  }
  return collection;
}

/**
 * Maps opaque boxes to box data records.
 *
 * @type {!WeakMap<!Box,BoxPrivates>}
 */
const boxes = selfContained(new WeakMap());

/**
 * A set of all public keys.
 * @type {!WeakSet<!PublicKey>}
 */
const publicKeys = selfContained(new WeakSet());

/**
 * True iff the given function is in fact a public key.
 *
 * Public keys are represented as functions that return true
 * iff called during the execution of their matching private key.
 * @type {!function(*):boolean}
 */
const isPublicKey = publicKeys.has.bind(publicKeys);

/** An opaque token used to represent a boxed value in transit. */
class Box {
  toString() { // eslint-disable-line class-methods-use-this
    return '[Box]';
  }
}

/**
 * Space for collaboration between the private and public
 * halves of a public/private key pair.
 */
let hidden = void 0;

/**
 * Creates a bundle that should be available as a local variable to module code.
 */
function makeModuleKeys(moduleIdentifier) {
  // Allocate a public/private key pair.
  function privateKey(fun) {
    const previous = hidden;

    hidden = privateKey;
    try {
      return fun();
    } finally {
      hidden = previous;
    }
  }
  function publicKey() {
    return hidden === privateKey;
  }
  publicKeys.add(publicKey);

  // We attach a module identifier to the public key to enable
  // whitelisting based on strings in a configuration without having
  // to load modules before storing their public key in a set.
  defineProperties(
    publicKey,
    {
      moduleIdentifier: { value: `${ moduleIdentifier }`, enumerable: true },
      call: { value: fCall, enumerable: true },
      apply: { value: fApply, enumerable: true },
    });

  /**
   * Wraps a value in a box so that only an approved
   * opener may unbox it.
   *
   * @param {*} value the value that will be given to
   *    an approved unboxer.
   * @param {function(function():boolean):boolean} mayOpen
   *    receives the public key of the opener.
   *    Should return `true` to allow.
   *    This will be called in the context of the opener's
   *    private key, so the public key should also return true
   *    called with no arguments.
   * @return {!Box} a box that is opaque to any receivers that cannot
   *    unbox it.
   */
  function box(value, mayOpen) {
    if (typeof mayOpen !== 'function') {
      throw new Error(`Expected function not ${ mayOpen }`);
    }
    // Allocate an opaque token
    const newBox = new Box();
    boxes.set(
      newBox,
      freeze({ boxerPriv: privateKey, boxerPub: publicKey, value, mayOpen }));
    return newBox;
  }

  /**
   * Tries to open a box.
   *
   * @param {*} box the box to unbox.
   * @param {function(function():boolean):boolean} ifFrom
   *    if the box may be opened by this unboxer's owner,
   *    then ifFrom receives the publicKey of the box creator.
   *    It should return true to allow unboxing to proceed.
   * @param {*} fallback a value to substitute if unboxing failed.
   *    Defaults to undefined.
   * @return {*} the value if unboxing is allowed or fallback otherwise.
   */
  function unbox(box, ifFrom, fallback) { // eslint-disable-line no-shadow
    if (typeof ifFrom !== 'function') {
      throw new Error(`Expected function not ${ ifFrom }`);
    }
    const boxData = boxes.get(box);
    if (!boxData) {
      return fallback;
    }
    const { boxerPriv, boxerPub, value, mayOpen } = boxData;
    // Require mutual consent
    // TODO: Is this the object identity equivalent of an
    // out-of-order verify/decrypt fault?
    // http://world.std.com/~dtd/sign_encrypt/sign_encrypt7.html
    return (privateKey(() => mayOpen(publicKey)) === true &&
            boxerPriv(() => ifFrom(boxerPub)) === true) ?
      value :
      fallback;
  }

  const neverBoxed = {};
  /**
   * Like unbox but raises an exception if unboxing fails.
   * @param {*} box the box to unbox.
   * @param {function(function():boolean):boolean} ifFrom
   *    if the box may be opened by this unboxer's owner,
   *    then ifFrom receives the publicKey of the box creator.
   *    It should return true to allow unboxing to proceed.
   * @return {*} the value if unboxing is allowed or fallback otherwise.
   */
  function unboxStrict(box, ifFrom) { // eslint-disable-line no-shadow
    const result = unbox(box, ifFrom, neverBoxed);
    if (result === neverBoxed) {
      throw new Error('Could not unbox');
    }
    return result;
  }

  return defineProperties(
    create(null),
    {
      // These close over private keys, so do not leak them.
      box: { value: box, enumerable: true },
      unbox: { value: unbox, enumerable: true },
      unboxStrict: { value: unboxStrict, enumerable: true },
      privateKey: { value: privateKey, enumerable: true },
      isPublicKey: { value: isPublicKey, enumerable: true },

      // Modules may allow access to this, perhaps via module object.
      publicKey: { value: publicKey, enumerable: true },
    });
}

module.exports = freeze(defineProperties(
  create(null),
  {
    Box: { value: Box, enumerable: true },
    makeModuleKeys: { value: makeModuleKeys, enumerable: true },
    isPublicKey: { value: isPublicKey, enumerable: true },
  }));

// Try to establish a trusted path.
// Pin module in module cache.
delete require.cache[module.id];
defineProperty(
  require.cache,
  module.id,
  { value: module, enumerable: true });
// Prevent private key gathering via replacement.
for (const [ propertyName, descriptor ]
  of Object.entries(Object.getOwnPropertyDescriptors(module))) {
  if (descriptor.configurable) {
    delete module[propertyName];
    descriptor.writable = propertyName === 'loaded';
    descriptor.configurable = false;
    defineProperty(module, propertyName, descriptor);
  }
}
