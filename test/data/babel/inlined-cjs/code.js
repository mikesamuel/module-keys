// It looks like this module inlines another module which should not prevent
// polyfilling the outer module.

exports.x = (function (require, module) {
  require("module-keys/cjs").polyfill(module, require, module.id);
  return module.exports;
}(require, { id: 'inner', exports: {} }));
