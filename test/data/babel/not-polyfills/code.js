'use strict';

;

// None of these are polyfills
Require('module-keys/cjs').polyfill(module, require);
require('module-keys/cjs').polyfool(module, require);
require.polyfill(module, require);
require('module-keys/cjs').polyfill(module, module.id);
require('module-keys/cjs').polyfill(require, module);
require('module-keys/cjs').polyfill(mule, require);
require('module-keys/cjs').polyfill(require, module, module.id);
require('module-keys/cjs').polyfill(module, require, module.id, 'Why am I here?');
// End of bad polyfills
