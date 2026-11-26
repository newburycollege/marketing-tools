/* Lossless container/tag editing. Never decode or recompress image/audio payloads. */
(function(root){
  'use strict';
  const ascii=(b,p,n)=>String.fromCharCode(...b.subarray(p,p+n));
  const fail=m=>{throw new Error(m);};
  const view=b=>new DataView(b.buffer,b.byteOffset,b.byteLength);
  const join=parts=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let off=0;for(const p of parts){out.set(p,off);off+=p.length;}return out;};
  const same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
  // Keep only the orientation tag in a fresh minimal TIFF directory, not the original EXIF block.
  function orientation(t){
    if(t.length<8)fail('Invalid EXIF header; cannot safely preserve orientation.');
    const endian=ascii(t,0,2), le=endian==='II'; if(!le&&endian!=='MM')fail('Invalid EXIF byte order.');
    const v=view(t);if(v.getUint16(2,le)!==42)fail('Unsupported EXIF structure.');
    const p=v.getUint32(4,le);if(p>t.length-2)fail('Invalid EXIF directory.');
    const n=v.getUint16(p,le);if(p+2+n*12+4>t.length)fail('Truncated EXIF directory.');
    for(let i=0;i<n;i++){const o=p+2+i*12;if(v.getUint16(o,le)===274){if(v.getUint16(o+2,le)!==3||v.getUint32(o+4,le)!==1)fail('Invalid EXIF orientation.');const x=v.getUint16(o+8,le);if(x<1||x>8)fail('Invalid EXIF orientation.');return x;}}
    return 1;
  }
  function minimalExif(o){return Uint8Array.of(73,73,42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,o,0,0,0,0,0,0,0);}
  function jpeg(b){
    if(b[0]!==255||b[1]!==216)fail('Not a JPEG image.');
    const parts=[b.subarray(0,2)], removed=new Set(), retained=new Set();let p=2, scan=false, seenScan=false, done=false;
    while(p<b.length){
      if(scan){const start=p;while(p<b.length){if(b[p++]!==255)continue;const markerStart=p-1;while(b[p]===255)p++;const m=b[p];if(m===0||(m>=208&&m<=215)){p++;continue;}p=markerStart;break;}parts.push(b.subarray(start,p));scan=false;if(p>=b.length)break;}
      const start=p;if(b[p++]!==255)fail('Invalid JPEG marker.');while(b[p]===255)p++;const m=b[p++];if(m===217){parts.push(b.subarray(start,p));done=true;break;}
      if(m===0||m===216||m===undefined||(m>=208&&m<=215))fail('Unexpected JPEG marker.');
      if(m===1){parts.push(b.subarray(start,p));continue;}
      if(p+2>b.length)fail('Truncated JPEG segment.');const len=view(b).getUint16(p);if(len<2||p+len>b.length)fail('Invalid JPEG segment length.');const end=p+len, data=b.subarray(p+2,end), tag=ascii(data,0,Math.min(32,data.length));
      if(m===225&&tag.startsWith('Exif\0\0')){const o=orientation(data.subarray(6));removed.add('EXIF (including GPS when present)');if(o!==1){const payload=join([Uint8Array.of(69,120,105,102,0,0),minimalExif(o)]), n=payload.length+2;parts.push(join([Uint8Array.of(255,225,n>>8,n&255),payload]));retained.add('EXIF orientation');}}
      else if(m===226&&tag.startsWith('MPF\0'))fail('Multi-picture JPEG/MPO is not supported; stripping could invalidate embedded images.');
      else if(m===224&&tag.startsWith('JFIF\0')){if(data.length<14)fail('Invalid JFIF header.');const payload=data.slice(0,14);if(data[12]||data[13]||data.length>14){payload[12]=payload[13]=0;removed.add('JFIF thumbnail');}parts.push(join([Uint8Array.of(255,224,0,16),payload]));retained.add('JFIF display information');}
      else if(m===226&&tag.startsWith('ICC_PROFILE\0')){parts.push(b.subarray(start,end));retained.add('ICC colour profile');}
      else if(m===238&&tag.startsWith('Adobe')){parts.push(b.subarray(start,end));retained.add('Adobe colour transform');}
      else if(m===254)removed.add('JPEG comments');
      else if(m>=224&&m<=239){if(m===225)removed.add(tag.startsWith('http://ns.adobe.com/')?'XMP':'APP1 metadata');else if(m===237)removed.add('Photoshop/IPTC metadata');else if(m===235)removed.add('APP11/JUMBF segment (not provenance verification)');else removed.add('APP'+(m-224)+' ancillary segment');}
      else {parts.push(b.subarray(start,end));if(m===218){scan=true;seenScan=true;}}
      p=end;
    }
    if(!done||!seenScan)fail('Incomplete JPEG image.');if(p!==b.length)fail('JPEG has trailing or embedded data; refusing to risk changing a multi-image file.');
    return {bytes:join(parts),removed:[...removed],retained:[...retained]};
  }
  const crcTable=Uint32Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
  function crc(b){let c=0xffffffff;for(const x of b)c=crcTable[(c^x)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
  function chunk(type,data){const out=new Uint8Array(data.length+12),v=view(out);v.setUint32(0,data.length);out.set([...type].map(c=>c.charCodeAt(0)),4);out.set(data,8);v.setUint32(out.length-4,crc(out.subarray(4,-4)));return out;}
  function png(b){
    const sig=Uint8Array.of(137,80,78,71,13,10,26,10);if(!same(b.subarray(0,8),sig))fail('Not a PNG image.');
    const parts=[b.subarray(0,8)],removed=new Set(),retained=new Set();let p=8,done=false,seenData=false,first=true;
    const visual=new Set(['IHDR','PLTE','IDAT','IEND','tRNS','gAMA','cHRM','sRGB','iCCP','sBIT','bKGD','pHYs','hIST','sPLT','cICP','mDCV','cLLI','acTL','fcTL','fdAT','sTER']);
    while(p+12<=b.length){const len=view(b).getUint32(p),end=p+12+len;if(len>0x7fffffff||end>b.length)fail('Truncated PNG chunk.');const type=ascii(b,p+4,4), data=b.subarray(p+8,end-4);if(!/^[A-Za-z]{4}$/.test(type)|| (first&&(type!=='IHDR'||len!==13)))fail('Invalid PNG structure.');first=false;
      if(crc(b.subarray(p+4,end-4))!==view(b).getUint32(end-4))fail('PNG checksum failed for '+type+'.');
      if(type==='eXIf'){const o=orientation(data);removed.add('EXIF (including GPS when present)');if(o!==1){parts.push(chunk('eXIf',minimalExif(o)));retained.add('EXIF orientation');}}
      else if(visual.has(type)){parts.push(b.subarray(p,end));if(!['IHDR','PLTE','IDAT','IEND'].includes(type))retained.add(type+' (rendering/animation information)');}
      else if(type[0]===type[0].toUpperCase())fail('Unknown critical PNG chunk: '+type+'.');
      else if(['tEXt','zTXt','iTXt','tIME','caBX'].includes(type)){removed.add(type==='caBX'?'caBX/JUMBF chunk (not provenance verification)':type+' metadata');}
      else { // Unknown ancillary chunks may affect appearance; preserve them rather than claim a full scrub.
        parts.push(b.subarray(p,end));retained.add(type+' (unrecognised ancillary chunk)');
      }
      p=end;if(type==='IDAT')seenData=true;if(type==='IEND'){if(len!==0)fail('Invalid IEND chunk.');done=true;break;}
    }
    if(!done||!seenData||p!==b.length)fail('Incomplete PNG or unexpected trailing data.');return {bytes:join(parts),removed:[...removed],retained:[...retained]};
  }
  function mp3(b){
    let start=0,end=b.length;const removed=new Set();
    while(ascii(b,start,3)==='ID3'){
      if(start+10>end)fail('Truncated ID3 tag.');const major=b[start+3],flags=b[start+5],s=b.subarray(start+6,start+10);if(![2,3,4].includes(major)||s.some(x=>x>127))fail('Unsupported ID3 header.');
      const size=s.reduce((n,x)=>n*128+x,0),footer=major===4&&(flags&16)?10:0;const next=start+10+size+footer;if(next>end)fail('Truncated ID3 metadata.');if(footer&&ascii(b,next-10,3)!=='3DI')fail('Invalid ID3 footer.');start=next;removed.add('ID3v2.'+major+' tag (including embedded artwork)');
    }
    let again=true;while(again){again=false;if(end-start>=128&&ascii(b,end-128,3)==='TAG'){end-=128;removed.add('ID3v1 tag');again=true;}
      if(end-start>=227&&ascii(b,end-227,4)==='TAG+'){end-=227;removed.add('Enhanced ID3v1 tag');again=true;}
      if(end-start>=32&&ascii(b,end-32,8)==='APETAGEX'){const v=view(b),size=v.getUint32(end-20,true),flags=v.getUint32(end-12,true);if(size<32||size>end-start)fail('Invalid APE tag size.');let pos=end-size;if(flags&0x80000000){if(pos-32<start||ascii(b,pos-32,8)!=='APETAGEX')fail('Invalid APE tag header.');pos-=32;}end=pos;removed.add('APEv2 tag');again=true;}
      if(end-start>=15&&ascii(b,end-9,9)==='LYRICS200'){const digits=ascii(b,end-15,6);if(!/^\d{6}$/.test(digits))fail('Invalid Lyrics3 tag.');const pos=end-15-Number(digits);if(pos<start||ascii(b,pos,11)!=='LYRICSBEGIN')fail('Invalid Lyrics3 header.');end=pos;removed.add('Lyrics3v2 tag');again=true;}
    }
    // Validate frame boundaries, allowing variable bitrate. Do not remove Xing/LAME headers: they can carry gapless-playback data.
    const br1=[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320],br2=[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160];let p=start,frames=0;
    while(p<end){if(p+4>end||b[p]!==255||(b[p+1]&224)!==224)fail('Unrecognised MP3 data or trailing tag. Only complete MPEG Layer III frames are supported.');const version=(b[p+1]>>3)&3,layer=(b[p+1]>>1)&3,bi=b[p+2]>>4,si=(b[p+2]>>2)&3;if(version===1||layer!==1||bi===0||bi===15||si===3)fail('Unsupported MPEG audio frame (free-format MP3 is not supported).');const rate=[44100,48000,32000][si]/(version===3?1:version===2?2:4);const len=Math.floor((version===3?144000:72000)*(version===3?br1:br2)[bi]/rate)+((b[p+2]>>1)&1);if(len<4||p+len>end)fail('Truncated MP3 audio frame.');p+=len;frames++;}
    if(!frames)fail('No MP3 audio frames found.');return {bytes:b.subarray(start,end),removed:[...removed],retained:['MPEG audio frames and playback headers']};
  }
  const api=Object.freeze({jpeg,png,mp3,chunk});if(typeof module==='object'&&module.exports)module.exports=api;else root.MediaMetadata=api;
})(typeof globalThis!=='undefined'?globalThis:this);
