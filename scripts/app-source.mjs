import fs from 'node:fs';

export const APP_JS_FILES = [
  'js/core.js',
  'js/library.js',
  'js/features.js',
  'js/insights.js',
  'js/stats.js',
  'js/settings.js',
  'js/bootstrap.js'
];

export function readAppSource(){
  return APP_JS_FILES.map((f)=>fs.readFileSync(f,'utf8')).join('\n');
}

export function readCss(){
  return fs.readFileSync('styles.css','utf8');
}
