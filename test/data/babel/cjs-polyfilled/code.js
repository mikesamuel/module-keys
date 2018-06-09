'use strict';

// Look ma, I polyfilled myself!
require('module-keys/cjs').polyfill(module, require, 'test/data/babel/cjs-polyfilled/code.js');

module.exports = function f() {};
