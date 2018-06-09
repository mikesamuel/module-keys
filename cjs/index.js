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
 * Support for the CommonJS module keys polyfill.
 * <ol>
 *   <li>allocates a module keys instance for the module</li>
 *   <li>attaches the public key to {@code module.exports}</li>
 *   <li>makes the module keys available via {@code require.keys}</li>
 *   <li>hooks into the module so that common patterns of replacing
 *      {@code module.exports} will still export {@code publicKey}.</li>
 * </ol>
 */

const { makeModuleKeys, publicKeySymbol } = require('../index.js');
const { apply } = Reflect;
const { defineProperties, hasOwnProperty } = Object;
const { indexOf, substring } = String.prototype;
const { replace } = RegExp.prototype;
const { sep } = require('path');
const { dirname, relpath } = require('../lib/relpath.js');

const allSeps = new RegExp(`\\${ sep }`, 'g');

// Compute a root so the module identifier strings are not
// sensitive to ancestors of the local client.
const root = (() => {
  const nodeModulesPathElement = `${ sep }node_modules${ sep }`;
  // Use the first node_modules since nested node_modules are
  // subdirectories of installed packages that pack overly eagerly.
  const nodeModulesIndex = apply(
    indexOf, __dirname, [ nodeModulesPathElement ]);
  if (nodeModulesIndex >= 0) {
    return apply(substring, __dirname, [ 0, nodeModulesIndex ]);
  }
  return dirname(dirname(__dirname));
})();

/**
 * Makes module keys available to module code as {@code require.keys}
 * and makes a best effort to export the modules public key via
 * an exported property named "publicKey" and via the public key symbol.
 *
 * @param {!Module} module the CommonJS module to polyfill.
 * @param {!function(string):*} require module's require function.
 */
function polyfill(module, require) {
  const { filename } = module;
  let canonIdentifier = relpath(root, filename);
  if (sep !== '/') {
    // Make the identifier look more like a relative URL.
    // TODO: Can Windows paths like `C:\foo/../bar spoof?
    // I don't think we care since bad identifiers should only
    // deny service locally.
    canonIdentifier = apply(replace, allSeps, [ '/' ]);
  }

  const keysObj = makeModuleKeys(canonIdentifier);
  require.keys = keysObj;
  const { publicKey } = keysObj;
  // Export the public key.
  module.exports.publicKey = publicKey;
  module.exports[publicKeySymbol] = publicKey;
  // If the module body overrides exports, try to
  // sneak it in there too.
  let { exports, loaded } = module;
  delete module.exports;
  delete module.loaded;
  defineProperties(
    module, {
      exports: {
        enumerable: true,
        configurable: true,
        get() {
          return exports;
        },
        set(newExports) {
          exports = newExports;
          if (newExports &&
              (typeof newExports === 'object' ||
               typeof newExports === 'function')) {
            if (!apply(hasOwnProperty, exports, [ 'publicKey' ])) {
              try {
                module.exports.publicKey = publicKey;
              } catch (exc) {
                // Oh well.  We tried our best.
              }
            }
            if (!apply(hasOwnProperty, exports, [ publicKeySymbol ])) {
              try {
                module.exports[publicKeySymbol] = publicKey;
              } catch (exc) {
                // Oh well.  We tried our best.
              }
            }
          }
        },
      },
      loaded: {
        enumerable: true,
        configurable: true,
        get() {
          return loaded;
        },
        set(newLoaded) {
          loaded = newLoaded;
          if (loaded === true) {
            // Stop virtualizing
            try {
              delete module.exports;
              module.exports = exports;
            } catch (exc) {
              // Best effort.
            }
            try {
              delete module.loaded;
              module.loaded = loaded;
            } catch (exc) {
              // Best effort.
            }
          }
        },
      },
    });
}

module.exports.polyfill = polyfill;
