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

const { makeModuleKeys } = require('../index.js');

/**
 * @fileoverview
 * Support for the CommonJS module keys polyfill.
 */

function polyfill(module, require) {
  const keysObj = makeModuleKeys(module.filename);
  require.moduleKeys = keysObj;
  const { publicKey } = keysObj;
  // Export the public key.
  module.exports.publicKey = publicKey;
  // If the module body overrides exports, try to
  // sneak it in there too.
  let { exports, loaded } = module;
  delete module.exports;
  delete module.loaded;
  Object.defineProperties(
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
               typeof newExports === 'function') &&
              !Object.hasOwnProperty.call(exports, 'publicKey')) {
            try {
              module.exports.publicKey = publicKey;
            } catch (exc) {
              // Oh well.  We tried our best.
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
