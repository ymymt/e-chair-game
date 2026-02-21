const path = require('path');
const webpack = require('webpack');
require('dotenv').config({ path: '.env.local' });

// Expose NEXT_PUBLIC_* env vars to the client bundle via DefinePlugin
const envKeys = Object.keys(process.env)
  .filter(function(key) { return key.startsWith('NEXT_PUBLIC_'); })
  .reduce(function(acc, key) {
    acc['process.env.' + key] = JSON.stringify(process.env[key]);
    return acc;
  }, {});

module.exports = {
  webpack: (config) => {
    config.plugins.push(new webpack.DefinePlugin(envKeys));
    if (!config.resolve) {
      config.resolve = {};
    }
    if (!config.resolve.alias) {
      config.resolve.alias = {};
    }
    config.resolve.alias['@'] = path.resolve(__dirname);

    // React 0.14: internal modules are in react/lib/ instead of react-dom/lib/
    config.resolve.alias['react-dom/lib/ReactReconciler'] = 'react/lib/ReactReconciler';

    // Prefer browser builds to avoid Node.js-only modules (gRPC, tls, net, http2)
    config.resolve.mainFields = ['browser', 'module', 'main'];

    // Allow webpack to resolve .cjs files
    if (!config.resolve.extensions) {
      config.resolve.extensions = ['.js', '.json'];
    }
    if (config.resolve.extensions.indexOf('.cjs') === -1) {
      config.resolve.extensions.push('.cjs');
    }

    // Transpile Firebase and idb packages that use modern JS syntax (ES2017+)
    // webpack 2 in Next.js 3 cannot parse spread operators, optional chaining, etc.
    config.module.rules.push({
      test: /\.(js|cjs|mjs)$/,
      include: [
        /node_modules\/firebase/,
        /node_modules\/@firebase/,
        /node_modules\/idb/,
        /node_modules\/undici/,
        /node_modules\/nanoid/,
      ],
      use: {
        loader: 'babel-loader',
        options: {
          presets: [
            ['env', {
              targets: { browsers: ['> 1%', 'last 2 versions'] },
              modules: false,
            }],
          ],
          plugins: [
            'transform-object-rest-spread',
            'transform-class-properties',
          ],
        },
      },
    });

    // Mock Node.js modules that aren't available in browser
    if (!config.node) {
      config.node = {};
    }
    config.node.tls = 'empty';
    config.node.net = 'empty';
    config.node.dns = 'empty';
    config.node.child_process = 'empty';

    return config;
  },
};
