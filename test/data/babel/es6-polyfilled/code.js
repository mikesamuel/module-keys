import { makeModuleKeys as __moduleKeysMaker } from "./path/to/module-keys";
const moduleKeys = __moduleKeysMaker('code.js');
const { publicKey: __moduleKeysPublicKey } = moduleKeys;
export { __moduleKeysPublicKey as publicKey };

export default function dropBox(x) {
  return moduleKeys.box(x, (k) => k === moduleKeys.publicKey && k());
};
