var path = require('path');
var webpack = require('webpack');
require('dotenv').config({ path: '.env.local' });

// Expose NEXT_PUBLIC_* env vars to the client bundle via DefinePlugin
var envKeys = Object.keys(process.env)
  .filter(function(key) { return key.startsWith('NEXT_PUBLIC_'); })
  .reduce(function(acc, key) {
    acc['process.env.' + key] = JSON.stringify(process.env[key]);
    return acc;
  }, {});

module.exports = {
  entry: ['babel-polyfill', './client.js'],
  output: {
    path: path.resolve(__dirname, 'static'),
    filename: 'bundle.js',
  },
  resolve: {
    alias: {
      '@': __dirname,
    },
    mainFields: ['browser', 'module', 'main'],
    extensions: ['.js', '.json', '.cjs'],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
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
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin(envKeys),
  ],
  node: {
    tls: 'empty',
    net: 'empty',
    dns: 'empty',
    child_process: 'empty',
  },
};
