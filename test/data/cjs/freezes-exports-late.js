'use strict';

require('../../../cjs').polyfill(module, require);
module.exports = {
  exp: 42,
};
Object.freeze(module.exports);
