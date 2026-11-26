import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve('_site'), errors=[];
async function exists(file){try{return (await stat(file)).size>0;}catch{return false;}}
const files=await readdir(root), pages=files.filter(x=>x.endsWith('.html'));
for(const page of pages){const html=await readFile(path.join(root,page),'utf8');
 if(!html.includes('Content-Security-Policy'))errors.push(page+': missing CSP');
 if(!html.includes('favicon.svg'))errors.push(page+': missing favicon');
 if(/<script\s*>|\son(?:click|submit|change|input)=/i.test(html))errors.push(page+': inline executable code');
 for(const [,ref] of html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)){
  if(/^(?:[a-z]+:|#|\/\/)/i.test(ref))continue;
  const target=path.resolve(root,ref.split(/[?#]/)[0]);if(!target.startsWith(root+path.sep)||!await exists(target))errors.push(page+': missing '+ref);
 }
}
for(const name of await readdir(path.join(root,'js')))if(name.endsWith('.js')){try{new vm.Script(await readFile(path.join(root,'js',name),'utf8'),{filename:name});}catch(e){errors.push(e.message);}}
for(const name of ['vendor/ffmpeg/api/ffmpeg.js','vendor/ffmpeg/core/ffmpeg-core.js','vendor/ffmpeg/core/ffmpeg-core.wasm','vendor/qrcode/qrcode.js','vendor/jszip/jszip.min.js','vendor/fontawesome/css/all.min.css','favicon.ico','favicon.svg','favicon-16x16.png','favicon-32x32.png','apple-touch-icon.png','android-chrome-192x192.png','android-chrome-512x512.png','site.webmanifest'])if(!await exists(path.join(root,name)))errors.push('Missing '+name);
const workerFiles=await readdir(path.join(root,'vendor/ffmpeg/api'));if(!workerFiles.some(x=>x.endsWith('.js')&&x!=='ffmpeg.js'))errors.push('Missing FFmpeg worker');
const shell=await readFile(path.join(root,'js/gds-shell.js'),'utf8');for(const [,href] of shell.matchAll(/href: '([^']+)'/g))if(!href.startsWith('http')&&!await exists(path.join(root,href)))errors.push('Navigation missing '+href);
if(errors.length){console.error(errors.join('\n'));process.exit(1);}console.log('Validated '+pages.length+' pages, local assets, navigation and JavaScript syntax.');
