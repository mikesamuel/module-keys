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

const path = require('path');

module.exports = function moduleKeysBabelPlugin({ types: t }) {
  let isCommonJsModule = true;
  // let sawPolyfill = false; // TODO: don't polyfill if already present
  return {
    name: 'module-keys/babel plugin',
    visitor: {
      ModuleDeclaration() {
        isCommonJsModule = false;
      },
      Program: {
        enter() {
          // until proven otherwise
          isCommonJsModule = true;
        },
        exit(nodePath, state) {
          const polyfills = [];
          if (isCommonJsModule) {
            // require('module-keys/cjs').polyfill(module, require);
            polyfills.push(
              t.expressionStatement(
                t.callExpression(
                  t.memberExpression(
                    t.callExpression(
                      t.identifier('require'),
                      [ t.stringLiteral('module-keys/cjs') ]),
                    t.identifier('polyfill')),
                  [ t.identifier('module'), t.identifier('require') ])));
          } else {
            const { filename } = state.file.opts;
            // Compute the absolute path to the ESM index file.
            const moduleKeysPath = path.join(__dirname, '..', 'index.mjs');
            const moduleKeysImportSpec = path.relative(path.dirname(filename), moduleKeysPath);

            // import { makeModuleKeys as __moduleKeysMaker } from "./path/to/module-keys";
            // const moduleKeys = __moduleKeysMaker(import.meta.url);
            // const { publicKey: __moduleKeysPublicKey } = moduleKeys;
            // export { __moduleKeysPublicKey as publicKey };
            polyfills.push(
              t.importDeclaration(
                [
                  t.importSpecifier(
                    t.identifier('__moduleKeysMaker'),
                    t.identifier('makeModuleKeys')),
                ],
                t.stringLiteral(moduleKeysImportSpec)),
              t.variableDeclaration(
                'const',
                [
                  t.variableDeclarator(
                    t.identifier('moduleKeys'),
                    t.callExpression(
                      t.identifier('__moduleKeysMaker'),
                      [
                        t.memberExpression(
                          // TODO: should this use t.metaProperty?
                          t.memberExpression(t.identifier('import'), t.identifier('meta')),
                          t.identifier('url')),
                      ])),
                  t.variableDeclarator(
                    t.objectPattern(
                      [
                        t.objectProperty(
                          t.identifier('publicKey'),
                          t.identifier('__moduleKeysPublicKey')),
                      ]),
                    t.identifier('moduleKeys')),
                ]),
              t.exportNamedDeclaration(
                null,
                [
                  t.exportSpecifier(
                    t.identifier('__moduleKeysPublicKey'),
                    t.identifier('publicKey')),
                ]));
          }
          for (const polyfill of polyfills.slice().reverse()) {
            nodePath.unshiftContainer('body', polyfill);
          }
        },
      },
    },
  };
};
