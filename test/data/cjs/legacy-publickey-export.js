'use strict';

require('../../../cjs').polyfill(module, require);
module.exports.publicKey = 'foo';
module.exports[Symbol.for('publicKey')] = 'foo';
module.exports[Symbol('publicKey')] = 'foo';
module.exports.exp = 42;
