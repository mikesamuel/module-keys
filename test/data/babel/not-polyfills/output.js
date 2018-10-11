'use strict';

require('module-keys/cjs').polyfill(module, require, module.id);

;

// None of these are polyfills
Require('module-keys/cjs').polyfill(module, require, module.id);
require('nodule-keys/cjs').polyfill(module, require, module.id);
require('module-keys/cjs').polyfool(module, require, module.id);
require.polyfill(module, require, module.id);
require('module-keys/cjs').polyfill(module, module.id);
require('module-keys/cjs').polyfill(module, require);
require('module-keys/cjs').polyfill(mule, require, module.id);
require('module-keys/cjs').polyfill(require, module, module.id);
require('module-keys/cjs').polyfill(module, require, module.id, 'Why am I here?');
// End of bad polyfills
