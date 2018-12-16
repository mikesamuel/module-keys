# Module Keys

Communications channels between modules that allow granting
different privileges to some modules than others.

[![Build Status](https://travis-ci.org/mikesamuel/module-keys.svg?branch=master)](https://travis-ci.org/mikesamuel/module-keys)
[![Dependencies Status](https://david-dm.org/mikesamuel/module-keys/status.svg)](https://david-dm.org/mikesamuel/module-keys)
[![npm](https://img.shields.io/npm/v/module-keys.svg)](https://www.npmjs.com/package/module-keys)
[![Coverage Status](https://coveralls.io/repos/github/mikesamuel/module-keys/badge.svg?branch=master)](https://coveralls.io/github/mikesamuel/module-keys?branch=master)
[![Known Vulnerabilities](https://snyk.io/test/github/mikesamuel/module-keys/badge.svg?targetFile=package.json)](https://snyk.io/test/github/mikesamuel/module-keys?targetFile=package.json)

*  [Why Module Keys?](#why-module-keys)
*  [Installing](#installing)
*  [Babel Plugin](#babel-plugin)
   *  [CommonJS Modules](#commonjs-modules)
   *  [ES6 Modules](#es6-modules)
*  [API](#api)
   * [`class Box`](#class-box)
   * [`.box(value, mayOpen)`](#box)
   * [`.unbox(box, ifFrom, fallback)`](#unbox)
   * [`.unboxStrict(box, ifFrom)`](#unboxstrict)
   * [`.isPublicKey(x)`](#ispublickey)
   * [`.privateKey`](#privatekey)
   * [`.publicKey`](#publickey)
   * [`makeModuleKeys`](#makemodulekeys)
   * [`publicKeySymbol`](#publickeysymbol)

## Why Module Keys?
Module Keys provide a way for one module to grant privileges to another
module without granting that privilege to every module.

A development team might `npm install example-package` and trust it to
work as advertised, but not trust all of its dependencies or its
dependencies' dependencies with unmitigated access to powerful APIs
like `child_process` since subtle bugs can have disastrous consequences
when exposed to attacker-controlled inputs.

Module keys enable secure code patterns like those in the examples
below.  They can combine with module loader hooks and other mechanisms
to bound the security consequences of common bugs and the amount of
code that might be involved in certain kinds of security failures
helping security reviewers to focus their attention.

See also [*node-sec-patterns*](https://www.npmjs.com/package/node-sec-patterns)
which makes these patterns easy to express.

Module keys allow code written in good faith to cooperate while
avoiding lowest-common-denominator security problems.  It does not
allow safely running malicious code within the same process.
Potentially malicious code should be sandboxed if it needs to run at
all.


## Installing

```sh
$ npm install --save module-keys
```

## Babel Plugin
The babel plugin will add keys to your modules.

### Via .babelrc (Recommended)
Add the following line to your `.babelrc` file:

```json
{
  "plugins": [
    [ "module-keys/babel", { "rootDir": "/path/to/module/root" } ]
  ]
}
```

The optional `"rootDir"` option lets you specify the base URL
used to compute relative module identifiers.

### Via CLI
```sh
babel --plugins module-keys/babel script.js
```

### Via Node API
```js
require("@babel/core").transform("code", {
  plugins: [
    [ "module-keys/babel", { "rootDir": "/path/to/module/root" } ]
  ]
});
```


### CommonJS Modules
Once you've run the Babel plugin over your modules, each module will have
its own keys available via `require.moduleKeys`, and will export its `publicKey`
if doing so would not conflict with an explicit export.

```js
require.moduleKeys.box(...);  // boxes a value.  See API below
```

### ES6 Modules
The Babel plugin will treat any source file with an `export` declaration
as an ES6 module, and instead define a local `moduleKeys` which has the API
below.

```js
moduleKeys.box(...);  // See API below
```

## API

### `class Box`
A box is a container for a value that may only be opened by an authorized opener.

Boxes are opaque values, and the only way to access the contained value is to use
an `.unbox` method as described below.

```js
const { Box } = require('module-keys');       // CommonJS
import { Box } from './path/to/module-keys';  // ES6
```

### `box`
`.box(value, mayOpen)` creates a `Box` that may only be opened by an `.unbox` method.

*value* - returned when the returned `Box` is unboxed.

*mayOpen* - a function that takes a public key.  It should return true if the
public key identifies an `unbox` method that should be allowed access to *value*.

Returns an instance of `class Box`.

```js
// CommonJS
const { publicKey: fooKey } = require('./foo');
const box = require.moduleKeys.box(value, (k) => k === fooKey && k());
// box may only be opened via ./foo's unboxer.
```

```js
// ES6
import { publicKey as fooKey } from './foo';
export const box = moduleKeys.box(value, (k) => k === fooKey && k());
```

### `unbox`
`.unbox(box, ifFrom, fallback)` opens a `Box` while optionally checking its
source.

*box* - A `Box`

*ifFrom* - A function that takes a public key.  It should return true if
the caller wishes to receive values boxed by the `.box` method associated
with the key.

*fallback* - A value to return if unboxing fails.  Defaults to `undefined`.

Returns the boxed value if `mayOpen(publicKey)` is true and `ifFrom` returns
true when passed the boxer's public key.  Otherwise returns *fallback*.

```js
// CommonJS
const { publicKey: barKey } = require('./bar');
function f(box) {
  console.log(`I got ${ require.moduleKeys.unbox(box, () => true, 'a box I cannot open') }`)
}
```

```js
// ES6
import { publicKey as barKey } from './bar';
function f(box) {
  console.log(`I got ${ moduleKeys.unbox(box, () => true, 'a box I cannot open') }`)
}
```

### `unboxStrict`
`.unboxStrict(box, ifFrom)` is the same as `.unbox(box, ifFrom)` but raises
an `Error` if unboxing fails.

### `isPublicKey`
`isPublicKey(x)` is true if `x` is a public key.

This may be called in key predicates to ensure that keys will not themselves
perform an operation that enters a private key context.

```js
const { isPublicKey } = require('module-keys');  // CommonJS
import { isPublicKey } from 'module-keys';  // ES6 modules
```

### `privateKey`
`.privateKey(f)` is a function that calls `f()` and returns its results.
Any calls to `.publicKey()` during the call to `f()` will return true.

*f* - a zero argument function

Returns - the result of calling `f()`.

Each private key refers to its corresponding public key via its
`publicKey` property, so to pass a key pair, it is sufficient to pass
the private key.  Public keys do not refer to private keys.

**Warning**: Do not export your private keys as that may allow other
code to impersonate you.  If you need to provide your private key to a
module you trust, put it in a box that is only openable by that
module.

### `publicKey`
`.publicKey()` returns true if called in the context of its
corresponding [private key](#privatekey) or false otherwise.

The Babel plugin auto-exports public keys for all processed modules.

```js
// Getting a public key.
// CommonJS.
const { publicKey: fooPublicKey } = require('./foo');
```

```js
// Getting a public key.
// ES6 modules
import { publicKey as fooPublicKey } from './foo';
```

Each `publicKey` also has a `moduleIdentifier` property which
specifies the location of the module relative to the module root.

### `makeModuleKeys`
`makeModuleKeys()` returns a new module keys bundle with its own
`.box`, `.unbox`, `.unboxStrict`, `.publicKey`, and `.privateKey`
properties.

```js
const { makeModuleKeys } = require('module-keys');  // CommonJS
import { makeModuleKeys } from 'module-keys';       // ES6 modules
```

### `publicKeySymbol`
`publicKeySymbol` is a [*Symbol*](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol)
that may be used to unambiguously attach a public key to a JavaScript object.

CommonJS export bundles have a symbol property that refers to the public key in addition
to any `"publicKey"` property.

```js
const { publicKeySymbol } = require('module-keys');  // CommonJS
import { publicKeySymbol } from 'module-keys';       // ES6 modules
```

---

This is not an official Google product.
