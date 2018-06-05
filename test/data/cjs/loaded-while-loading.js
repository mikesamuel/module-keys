'use strict';

require('../../../cjs').polyfill(module, require);
module.exports = {
  loadedWhileLoading: module.loaded
};
module.loaded = module.loaded;
