'use strict';

// Look ma, I polyfilled myself!
require('module-keys/cjs').polyfill(module, require, module.id);

module.exports = function f() {};
