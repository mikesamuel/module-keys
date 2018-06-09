import { makeModuleKeys as __moduleKeysMaker } from '../../../../index.mjs';

const moduleKeys = __moduleKeysMaker('test/data/babel/masked-module-keys/code.js'),
      {
  publicKey: __moduleKeysPublicKey
} = moduleKeys;

export { __moduleKeysPublicKey as publicKey };
let b = function f(moduleKeys) {
  return typeof moduleKeys == 'object';
}(moduleKeys);

export { b };
