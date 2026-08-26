const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '../client/src/index.css');
let css = fs.readFileSync(cssPath, 'utf8');

// Replace borders
css = css.replace(/border-left:/g, 'border-inline-end:');
css = css.replace(/border-right:/g, 'border-inline-start:');

// Replace margins
css = css.replace(/margin-left:/g, 'margin-inline-end:');
css = css.replace(/margin-right:/g, 'margin-inline-start:');

// Replace paddings
css = css.replace(/padding-left:/g, 'padding-inline-end:');
css = css.replace(/padding-right:/g, 'padding-inline-start:');

// Replace text-align
css = css.replace(/text-align:\s*right/g, 'text-align: start');
css = css.replace(/text-align:\s*left/g, 'text-align: end');

// Replace positioning
css = css.replace(/([;{\s])left:\s*([^;}]+)/g, '$1inset-inline-end: $2');
css = css.replace(/([;{\s])right:\s*([^;}]+)/g, '$1inset-inline-start: $2');

fs.writeFileSync(cssPath, css);
console.log('RTL logical properties applied (RTL-first mapping).');
