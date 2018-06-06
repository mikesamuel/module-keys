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

/**
 * @fileoverview
 * A babel plugin that adds the module keys pollyfill.
 */

'use strict';

module.exports = function moduleKeysBabelPlugin({ types: t }) {
  return {
    name: 'module-keys/babel plugin',
    visitor: {
      Program(path) {
        // require('module-keys/cjs').polyfill(module, require);
        const polyfill = t.expressionStatement(
          t.callExpression(
            t.memberExpression(
              t.callExpression(
                t.identifier('require'),
                [ t.stringLiteral('module-keys/cjs') ]),
              t.identifier('polyfill')),
            [ t.identifier('module'), t.identifier('require') ]));
        path.unshiftContainer('body', polyfill);
      },
    },
  };
};
