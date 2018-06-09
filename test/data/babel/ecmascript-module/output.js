import { makeModuleKeys as __moduleKeysMaker } from "../../../../index.mjs";

const moduleKeys = __moduleKeysMaker("test/data/babel/ecmascript-module/code.js"),
      {
  publicKey: __moduleKeysPublicKey
} = moduleKeys;

export { __moduleKeysPublicKey as publicKey };
function f() {
  // ...
}

export default f;
