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

    const extension = name => ((name.toLowerCase().match(/\.([a-z0-9]+)$/) || [, ''])[1]);
    const baseName = name => name.replace(/\.[^.]+$/, '');
    function formatBytes(bytes) { const units = ['B','KB','MB','GB']; let i=0; while(bytes>=1024&&i<3){bytes/=1024;i++;} return bytes.toFixed(i>1?1:0)+' '+units[i]; }
    function setStatus(text, type='info'){ status.textContent=text; status.className='vs-status vs-status--'+type; }
    function setProgress(value,text){ const n=Math.max(0,Math.min(100,Math.round(value||0))); progressBar.style.width=n+'%'; progressTrack.setAttribute('aria-valuenow',String(n)); progressLabel.textContent=text||n+'%'; }

    function selectFile(file){
      result.hidden=true; outputBlob=null; outputName='';
      if(!file) return;
      if(!['mp4','mov','m4v'].includes(extension(file.name))){ setStatus('Choose an MP4, MOV or M4V file.','error'); return; }
      selectedFile=file; fileName.textContent=file.name; fileDetails.textContent=formatBytes(file.size)+' · '+(file.type||'video file');
      fileCard.hidden=false; cleanButton.disabled=false;
      setStatus(file.size>900*1024*1024?'This file is over 900 MB. Browser memory may be insufficient; the PowerShell/FFmpeg method is safer.':'Ready. The original file will not be changed.',file.size>900*1024*1024?'working':'info');
    }

    async function getEngine(){
      if(ffmpeg) return ffmpeg;
      if(!window.FFmpegWASM) throw new Error('Local FFmpeg API did not load.');
      const processor = new window.FFmpegWASM.FFmpeg();
      const coreBase = new URL('vendor/ffmpeg/core/', document.baseURI).href;
      processor.on('progress', event => { if(Number.isFinite(event.progress)) setProgress(event.progress*100,'Processing… '+Math.round(event.progress*100)+'%'); });
      setStatus('Loading the local video-processing engine (about 31 MB on first use)…','working');
      progressWrap.hidden=false; setProgress(2,'Loading processing engine…');
      await processor.load({
      coreURL: coreBase + 'ffmpeg-core.js',
      wasmURL: coreBase + 'ffmpeg-core.wasm'
      });
      ffmpeg=processor; return processor;
    }

    async function clean(){
      if(!selectedFile) return;
      cancelled=false; cleanButton.disabled=true; changeFile.disabled=true; cancelButton.hidden=false; result.hidden=true; progressWrap.hidden=false; setProgress(0,'Preparing…');
      const inputExt=extension(selectedFile.name), outputExt=inputExt==='mov'?'mov':'mp4';
      const input='input.'+inputExt, output='output.'+outputExt; outputName=baseName(selectedFile.name)+'-CLEAN.'+outputExt;
      try{
        const processor=await getEngine(); if(cancelled) throw new Error('cancelled');
        setStatus('Reading the selected video into the browser…','working');
        await processor.writeFile(input,new Uint8Array(await selectedFile.arrayBuffer())); if(cancelled) throw new Error('cancelled');
        setStatus('Rebuilding the container without inherited metadata. Video and audio are not being re-encoded.','working');
        const code=await processor.exec(['-i',input,'-map','0:v?','-map','0:a?','-map','0:s?','-map_metadata','-1','-map_chapters','-1','-c','copy','-movflags','+faststart',output]);
        if(code!==0) throw new Error('FFmpeg exited with code '+code);
        const data=await processor.readFile(output); outputBlob=new Blob([data.buffer],{type:outputExt==='mov'?'video/quicktime':'video/mp4'});
        await processor.deleteFile(input).catch(()=>{}); await processor.deleteFile(output).catch(()=>{});
        setProgress(100,'Complete'); setStatus('Clean copy created: '+outputName+'\nDownload it before leaving this page.','success'); result.hidden=false;
      }catch(error){
        setStatus(cancelled?'Processing cancelled. The original was not changed.':'Could not process this file: '+(error.message||error),'error');
      }finally{ cleanButton.disabled=!selectedFile; changeFile.disabled=false; cancelButton.hidden=true; }
    }

    fileInput.addEventListener('change',()=>selectFile(fileInput.files[0]));
    changeFile.addEventListener('click',()=>fileInput.click()); cleanButton.addEventListener('click',clean);
    cancelButton.addEventListener('click',()=>{cancelled=true;if(ffmpeg){try{ffmpeg.terminate();}catch(e){}ffmpeg=null;}setStatus('Cancelling…','working');});
    downloadButton.addEventListener('click',()=>{if(!outputBlob)return;const url=URL.createObjectURL(outputBlob),a=document.createElement('a');a.href=url;a.download=outputName;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);});
    resetButton.addEventListener('click',()=>{selectedFile=null;fileInput.value='';fileCard.hidden=true;cleanButton.disabled=true;result.hidden=true;progressWrap.hidden=true;setStatus('Select one video to begin.');});
    const stop=event=>{event.preventDefault();event.stopPropagation();};
    ['dragenter','dragover'].forEach(name=>dropZone.addEventListener(name,event=>{stop(event);dropZone.classList.add('is-dragging');}));
    ['dragleave','drop'].forEach(name=>dropZone.addEventListener(name,event=>{stop(event);dropZone.classList.remove('is-dragging');}));
    dropZone.addEventListener('drop',event=>selectFile(event.dataTransfer&&event.dataTransfer.files?event.dataTransfer.files[0]:null));
    dropZone.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();fileInput.click();}});
  }
  document.addEventListener('app-shell-ready',boot);
  document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0));
  setTimeout(boot,250);
})();
