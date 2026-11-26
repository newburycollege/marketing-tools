import {cp,mkdir,readdir,rm} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(), out=path.join(root,'_site');
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
const names=['css','js','img','favicon.ico','favicon.svg','favicon-16x16.png','favicon-32x32.png','apple-touch-icon.png','android-chrome-192x192.png','android-chrome-512x512.png','site.webmanifest'];
for(const entry of await readdir(root,{withFileTypes:true}))if(entry.isFile()&&entry.name.endsWith('.html'))names.push(entry.name);
for(const name of names)await cp(path.join(root,name),path.join(out,name),{recursive:true});
await rm(path.join(out,'js','video-stripper.js'),{force:true});
const vendor=[['@ffmpeg/ffmpeg/dist/umd','ffmpeg/api'],['@ffmpeg/core/dist/umd','ffmpeg/core'],['qrcode-generator/qrcode.js','qrcode/qrcode.js'],['jszip/dist/jszip.min.js','jszip/jszip.min.js'],['@fortawesome/fontawesome-free/css/all.min.css','fontawesome/css/all.min.css'],['@fortawesome/fontawesome-free/webfonts','fontawesome/webfonts']];
for(const [src,dest] of vendor){const target=path.join(out,'vendor',dest);await mkdir(path.dirname(target),{recursive:true});await cp(path.join(root,'node_modules',src),target,{recursive:true});}
// Keep dependency notices with the redistributed browser libraries where present.
for(const [pkg,dest] of [['@ffmpeg/ffmpeg','ffmpeg/api'],['@ffmpeg/core','ffmpeg/core'],['qrcode-generator','qrcode'],['jszip','jszip'],['@fortawesome/fontawesome-free','fontawesome']]){
 for(const entry of await readdir(path.join(root,'node_modules',pkg)))if(/^(license|licence|copying|notice)(\.|$)/i.test(entry))await cp(path.join(root,'node_modules',pkg,entry),path.join(out,'vendor',dest,entry));
}
console.log('Built _site with local browser libraries and favicon assets.');
