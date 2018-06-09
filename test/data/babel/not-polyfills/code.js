'use strict';

;

// None of these are polyfills
Require('module-keys/cjs').polyfill(module, require, '/a');
require('nodule-keys/cjs').polyfill(module, require, '/a');
require('module-keys/cjs').polyfool(module, require, '/a');
require.polyfill(module, require, '/a');
require('module-keys/cjs').polyfill(module, '/a');
require('module-keys/cjs').polyfill(module, require);
require('module-keys/cjs').polyfill(mule, require, '/a');
require('module-keys/cjs').polyfill(require, module, '/a');
require('module-keys/cjs').polyfill(module, require, '/a', 'Why am I here?');
// End of bad polyfills
