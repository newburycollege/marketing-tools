(function () {
  function boot() {
    const fileInput = document.getElementById('vs-file-input');
    if (!fileInput || fileInput.dataset.initialised === 'true') return;
    fileInput.dataset.initialised = 'true';

    const dropZone = document.getElementById('vs-drop-zone');
    const fileCard = document.getElementById('vs-file-card');
    const fileName = document.getElementById('vs-file-name');
    const fileDetails = document.getElementById('vs-file-details');
    const changeFile = document.getElementById('vs-change-file');
    const cleanButton = document.getElementById('vs-clean-button');
    const cancelButton = document.getElementById('vs-cancel-button');
    const status = document.getElementById('vs-status');
    const progressWrap = document.getElementById('vs-progress-wrap');
    const progressTrack = progressWrap.querySelector('[role="progressbar"]');
    const progressBar = document.getElementById('vs-progress-bar');
    const progressLabel = document.getElementById('vs-progress-label');
    const result = document.getElementById('vs-result');
    const downloadButton = document.getElementById('vs-download-button');
    const resetButton = document.getElementById('vs-reset-button');

    let selectedFile = null, ffmpeg = null, outputBlob = null, outputName = '', cancelled = false;
    const allowed = ['mp4','mov','m4v'];

    const ext = n => ((n.toLowerCase().match(/\.([a-z0-9]+)$/) || [,''])[1]);
    const base = n => n.replace(/\.[^.]+$/, '');
    function size(n){const u=['B','KB','MB','GB'];let i=0;while(n>=1024&&i<u.length-1){n/=1024;i++}return n.toFixed(i>1?1:0)+' '+u[i]}
    function stat(t,k='info'){status.textContent=t;status.className='vs-status vs-status--'+k}
    function prog(n,t){n=Math.max(0,Math.min(100,Math.round(n||0)));progressBar.style.width=n+'%';progressTrack.setAttribute('aria-valuenow',n);progressLabel.textContent=t||n+'%'}

    function choose(f){
      result.hidden=true; outputBlob=null; outputName='';
      if(!f) return;
      if(!allowed.includes(ext(f.name))){stat('Choose an MP4, MOV or M4V file.','error');return}
      selectedFile=f; fileName.textContent=f.name; fileDetails.textContent=size(f.size)+' · '+(f.type||'video file');
      fileCard.hidden=false; cleanButton.disabled=false;
      stat(f.size>900*1024*1024?'This file is over 900 MB. Browser memory may be insufficient; the PowerShell/FFmpeg method is safer.':'Ready. The original file will not be changed.', f.size>900*1024*1024?'working':'info');
    }

    async function engine(){
      if(ffmpeg) return ffmpeg;
      if(!window.FFmpegWASM||!window.FFmpegUtil) throw new Error('FFmpeg browser libraries did not load.');
      const f=new window.FFmpegWASM.FFmpeg();
      const toBlobURL=window.FFmpegUtil.toBlobURL;
      const core='https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';
      f.on('progress',e=>{if(Number.isFinite(e.progress))prog(e.progress*100,'Processing… '+Math.round(e.progress*100)+'%')});
      stat('Loading the video-processing engine (about 31 MB on first use)…','working');
      progressWrap.hidden=false; prog(2,'Loading processing engine…');
      await f.load({coreURL:await toBlobURL(core+'/ffmpeg-core.js','text/javascript'),wasmURL:await toBlobURL(core+'/ffmpeg-core.wasm','application/wasm')});
      ffmpeg=f; return f;
    }

    async function clean(){
      if(!selectedFile)return; cancelled=false; cleanButton.disabled=true; changeFile.disabled=true; cancelButton.hidden=false; result.hidden=true; progressWrap.hidden=false; prog(0,'Preparing…');
      const ie=ext(selectedFile.name), oe=ie==='mov'?'mov':'mp4', input='input.'+ie, output='output.'+oe; outputName=base(selectedFile.name)+'-CLEAN.'+oe;
      try{
        const f=await engine(); if(cancelled)throw new Error('cancelled'); stat('Reading the selected video into the browser…','working');
        await f.writeFile(input,new Uint8Array(await selectedFile.arrayBuffer())); if(cancelled)throw new Error('cancelled');
        stat('Rebuilding the container without inherited metadata. Video and audio are not being re-encoded.','working');
        const code=await f.exec(['-i',input,'-map','0:v?','-map','0:a?','-map','0:s?','-map_metadata','-1','-map_chapters','-1','-c','copy','-movflags','+faststart',output]);
        if(code!==0)throw new Error('FFmpeg exited with code '+code);
        const data=await f.readFile(output); outputBlob=new Blob([data.buffer],{type:oe==='mov'?'video/quicktime':'video/mp4'});
        await f.deleteFile(input).catch(()=>{}); await f.deleteFile(output).catch(()=>{}); prog(100,'Complete'); stat('Clean copy created: '+outputName,'success'); result.hidden=false;
      }catch(e){stat(cancelled?'Processing cancelled. The original was not changed.':'Could not process this file: '+(e.message||e),'error')}
      finally{cleanButton.disabled=!selectedFile;changeFile.disabled=false;cancelButton.hidden=true}
    }

    fileInput.addEventListener('change',()=>choose(fileInput.files[0]));
    changeFile.addEventListener('click',()=>fileInput.click()); cleanButton.addEventListener('click',clean);
    cancelButton.addEventListener('click',()=>{cancelled=true;if(ffmpeg){try{ffmpeg.terminate()}catch(e){}ffmpeg=null}stat('Cancelling…','working')});
    downloadButton.addEventListener('click',()=>{if(!outputBlob)return;const u=URL.createObjectURL(outputBlob),a=document.createElement('a');a.href=u;a.download=outputName;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000)});
    resetButton.addEventListener('click',()=>{selectedFile=null;fileInput.value='';fileCard.hidden=true;cleanButton.disabled=true;result.hidden=true;progressWrap.hidden=true;stat('Select one video to begin.')});

    const stop=e=>{e.preventDefault();e.stopPropagation()};
    ['dragenter','dragover'].forEach(n=>dropZone.addEventListener(n,e=>{stop(e);dropZone.classList.add('is-dragging')}));
    ['dragleave','drop'].forEach(n=>dropZone.addEventListener(n,e=>{stop(e);dropZone.classList.remove('is-dragging')}));
    dropZone.addEventListener('drop',e=>choose(e.dataTransfer&&e.dataTransfer.files?e.dataTransfer.files[0]:null));
    dropZone.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fileInput.click()}});
  }

  document.addEventListener('app-shell-ready', boot);
  document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 0));
  setTimeout(boot, 250);
})();
