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

const ID_POLYFILL = 'polyfill';
const ID_MODULE = 'module';
const ID_REQUIRE = 'require';
const STR_MODULE_KEYS_CJS = 'module-keys/cjs';

function isIdentifierNamed(node, name) {
  return node.type === 'Identifier' && node.name === name;
}

function isString(node, value) {
  return node.type === 'StringLiteral' && node.value === value;
}

function isCall(node, fnPredicate, ...argPredicates) {
  if (node.type !== 'CallExpression') {
    return false;
  }
  const { callee, 'arguments': args } = node;
  const nArgs = args.length;
  if (nArgs === argPredicates.length &&
      fnPredicate(callee)) {
    for (let i = 0; i < nArgs; ++i) {
      if (!argPredicates[i](args[i])) {
        return false;
      }
    }
    return true;
  }
  return false;
}

module.exports = function moduleKeysBabelPlugin({ types: t }) {
  let isCommonJsModule = true;
  let sawCjsPolyfill = false;
  let sawEsPolyfill = false;
  return {
    name: 'module-keys/babel plugin',
    visitor: {
      CallExpression(nodePath) {
        // If there's already a CJS polyfill, remember so we
        // don't add a redundant polyfill.
        // This helps us bootstrap the index file with a public key.
        const { callee } = nodePath.node;
        if (callee.type === 'MemberExpression' &&
            isIdentifierNamed(callee.property, ID_POLYFILL) &&
            // Expect top level.
            nodePath.parentPath.node.type === 'ExpressionStatement' &&
            nodePath.parentPath.parentPath.node.type === 'Program' &&
            isCall(
              nodePath.node,
              ({ object }) => isCall( // eslint-disable-line id-blacklist
                object, // eslint-disable-line id-blacklist
                (fun) => isIdentifierNamed(fun, ID_REQUIRE),
                (arg) => isString(arg, STR_MODULE_KEYS_CJS)),
              (arg) => isIdentifierNamed(arg, ID_MODULE),
              (arg) => isIdentifierNamed(arg, ID_REQUIRE))) {
          sawCjsPolyfill = true;
        }
      },
      VariableDeclarator(nodePath) {
        // If there's already a top level moduleKeys variable, don't insert the
        // ES6 polyfill.
        if (isIdentifierNamed(nodePath.node.id, 'moduleKeys') &&
            nodePath.parentPath.node.type === 'VariableDeclaration' &&
            nodePath.parentPath.parentPath.node.type === 'Program') {
          sawEsPolyfill = true;
        }
      },
      ModuleDeclaration() {
        isCommonJsModule = false;
      },
      Program: {
        enter() {
          // until proven otherwise
          isCommonJsModule = true;
          sawCjsPolyfill = false;
          sawEsPolyfill = false;
        },
        exit(nodePath, state) {
          if (isCommonJsModule ? sawCjsPolyfill : sawEsPolyfill) {
            return;
          }
          const polyfills = [];
          if (isCommonJsModule) {
            // require('module-keys/cjs').polyfill(module, require);
            polyfills.push(
              t.expressionStatement(
                t.callExpression(
                  t.memberExpression(
                    t.callExpression(
                      t.identifier(ID_REQUIRE),
                      [ t.stringLiteral(STR_MODULE_KEYS_CJS) ]),
                    t.identifier(ID_POLYFILL)),
                  [ t.identifier(ID_MODULE), t.identifier(ID_REQUIRE) ])));
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
