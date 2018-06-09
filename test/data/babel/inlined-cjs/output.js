require('module-keys/cjs').polyfill(module, require, 'test/data/babel/inlined-cjs/code.js');

// It looks like this module inlines another module which should not prevent
// polyfilling the outer module.

exports.x = function (require, module) {
  require("module-keys/cjs").polyfill(module, require, '/a');
  return module.exports;
}(require, { id: 'inner', exports: {} });
