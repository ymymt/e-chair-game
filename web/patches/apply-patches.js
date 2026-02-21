/**
 * Post-install patches for React 0.14 compatibility with Next.js 3.
 *
 * React 0.14's react-dom has a flat structure (no lib/ subdirectory),
 * so Next.js 3's CommonsChunkPlugin check for react-dom fails because
 * it looks for '/react-dom/' (with trailing separator) in module.context,
 * but React 0.14's context ends with '/react-dom' (no trailing separator).
 */
var fs = require('fs');
var path = require('path');

var webpackPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'next',
  'dist',
  'server',
  'build',
  'webpack.js'
);

var original = "if (module.context && module.context.indexOf(_path.sep + 'react-dom' + _path.sep) >= 0) {";
var patched = "var _reactDomDir = _path.sep + 'react-dom';\n                if (module.context && (_reactDomDir + _path.sep) >= 0 || module.context.slice(-_reactDomDir.length) === _reactDomDir)) {";

// Use a more reliable approach: read, check, replace
var content = fs.readFileSync(webpackPath, 'utf8');

if (content.indexOf("var _reactDomDir = _path.sep + 'react-dom'") >= 0) {
  console.log('[patches] Next.js webpack.js already patched, skipping.');
  process.exit(0);
}

if (content.indexOf(original) < 0) {
  console.error('[patches] Could not find expected string in webpack.js. Patch may need updating.');
  process.exit(1);
}

var newContent = content.replace(
  original,
  "var _reactDomDir = _path.sep + 'react-dom';\n                if (module.context && (module.context.indexOf(_reactDomDir + _path.sep) >= 0 || module.context.slice(-_reactDomDir.length) === _reactDomDir)) {"
);

fs.writeFileSync(webpackPath, newContent, 'utf8');
console.log('[patches] Patched Next.js webpack.js for React 0.14 react-dom detection.');
