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
 *   <li>makes the module keys available via {@code require.moduleKeys}</li>
 *   <li>hooks into the module so that common patterns of replacing
 *      {@code module.exports} will still export {@code publicKey}.</li>
 * </ol>
 */

const { defineProperties, hasOwnProperty } = Object;
const { replace } = String.prototype;
const { apply } = Reflect;
const { sep } = require('path');
const { makeModuleKeys, publicKeySymbol } = require('../index.js');

const sepGlobalPattern = sep === '\\' ? /\\/g : new RegExp(`[${ sep }]`, 'g');
sepGlobalPattern.exec = sepGlobalPattern.exec;

/**
 * Makes module keys available to module code as {@code require.moduleKeys}
 * and makes a best effort to export the modules public key via
 * an exported property named "publicKey" and via the public key symbol.
 *
 * @param {!Module} module the CommonJS module to polyfill.
 * @param {!function(string):*} require module's require function.
 */
function polyfill(module, require) {
  if (apply(hasOwnProperty, require, [ 'moduleKeys' ])) {
    return;
  }
  let moduleIdentifier = `${ module.filename }`;
  if (sep !== '/') {
    moduleIdentifier = apply(replace, moduleIdentifier, [ sepGlobalPattern, '/' ]);
    if (moduleIdentifier[0] !== '/') {
      moduleIdentifier = `/${ moduleIdentifier }`;
    }
  }

  const keysObj = makeModuleKeys(moduleIdentifier);
  require.moduleKeys = keysObj;

  const { publicKey } = keysObj;
  // Export the public key.
  module.exports.publicKey = publicKey;
  module.exports[publicKeySymbol] = publicKey;
  // If the module body overrides exports, try to
  // sneak it in there too.
  let { exports, loaded } = module;
  delete module.exports;
  const properties = {
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
  };
  try {
    delete module.loaded;

    properties.loaded = {
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
    };
  } catch (exc) {
    // Webpack locks this down.  Good job, webpack!
  }
  defineProperties(module, properties);
}

module.exports.polyfill = polyfill;
