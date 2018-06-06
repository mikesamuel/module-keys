import { makeModuleKeys as __moduleKeysMaker } from "../../../../index.mjs";

const moduleKeys = __moduleKeysMaker(import.meta.url),
      {
  publicKey: __moduleKeysPublicKey
} = moduleKeys;

export { __moduleKeysPublicKey as publicKey };
function f() {
  // ...
}

export default f;
