(() => {
  'use strict';

  const MAX_RECOMMENDED_BYTES = 900 * 1024 * 1024;
  const ALLOWED_EXTENSIONS = ['mp4', 'mov', 'm4v'];

  const fileInput = document.getElementById('vs-file-input');
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

  let selectedFile = null;
  let ffmpeg = null;
  let outputBlob = null;
  let outputName = '';
  let cancelled = false;

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return 'Unknown size';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    return `${value.toFixed(unit > 1 ? 1 : 0)} ${units[unit]}`;
  }

  function extensionOf(name) {
    const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1] : '';
  }

  function baseNameOf(name) {
    return name.replace(/\.[^.]+$/, '');
  }

  function setStatus(message, type = 'info') {
    status.textContent = message;
    status.className = `vs-status vs-status--${type}`;
  }

  function setProgress(value, message) {
    const safeValue = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    progressBar.style.width = `${safeValue}%`;
    progressTrack.setAttribute('aria-valuenow', String(safeValue));
    progressLabel.textContent = message || `${safeValue}%`;
  }

  function revokeOutput() {
    outputBlob = null;
    outputName = '';
  }

  function resetResult() {
    revokeOutput();
    result.hidden = true;
    progressWrap.hidden = true;
    setProgress(0, 'Preparing…');
  }

  function chooseFile(file) {
    resetResult();

    if (!file) return;
    const ext = extensionOf(file.name);
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      selectedFile = null;
      fileInput.value = '';
      fileCard.hidden = true;
      cleanButton.disabled = true;
      setStatus('Choose an MP4, MOV or M4V file.', 'error');
      return;
    }

    selectedFile = file;
    fileName.textContent = file.name;
    fileDetails.textContent = `${formatBytes(file.size)} · ${file.type || 'video file'}`;
    fileCard.hidden = false;
    cleanButton.disabled = false;

    if (file.size > MAX_RECOMMENDED_BYTES) {
      setStatus('This file is larger than 900 MB. Browser processing may run out of memory. Close other tabs before continuing, or use the PowerShell/FFmpeg method for the most reliable result.', 'working');
    } else {
      setStatus('Ready. The original file will not be changed.', 'info');
    }
  }

  async function loadFFmpeg() {
    if (ffmpeg) return ffmpeg;

    if (!window.FFmpegWASM || !window.FFmpegUtil) {
      throw new Error('The FFmpeg browser library could not be loaded. Check the internet connection or ask the site administrator to host the FFmpeg files locally.');
    }

    const { FFmpeg } = window.FFmpegWASM;
    const { toBlobURL } = window.FFmpegUtil;
    const instance = new FFmpeg();
    const coreBase = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';

    instance.on('progress', ({ progress }) => {
      if (Number.isFinite(progress)) {
        setProgress(progress * 100, `Processing… ${Math.round(progress * 100)}%`);
      }
    });

    setStatus('Loading the local video-processing engine (about 31 MB on first use)…', 'working');
    setProgress(2, 'Loading processing engine…');

    await instance.load({
      coreURL: await toBlobURL(`${coreBase}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${coreBase}/ffmpeg-core.wasm`, 'application/wasm')
    });

    ffmpeg = instance;
    return ffmpeg;
  }

  async function cleanVideo() {
    if (!selectedFile) return;

    cancelled = false;
    cleanButton.disabled = true;
    changeFile.disabled = true;
    cancelButton.hidden = false;
    result.hidden = true;
    progressWrap.hidden = false;
    setProgress(0, 'Preparing…');

    const inputExt = extensionOf(selectedFile.name);
    const inputVirtualName = `input.${inputExt}`;
    const outputExt = inputExt === 'mov' ? 'mov' : 'mp4';
    const outputVirtualName = `output.${outputExt}`;
    outputName = `${baseNameOf(selectedFile.name)}-CLEAN.${outputExt}`;

    try {
      const processor = await loadFFmpeg();
      if (cancelled) throw new Error('Processing cancelled.');

      setStatus('Reading the selected video into the browser…', 'working');
      setProgress(5, 'Reading source video…');
      const inputBytes = new Uint8Array(await selectedFile.arrayBuffer());
      if (cancelled) throw new Error('Processing cancelled.');

      await processor.writeFile(inputVirtualName, inputBytes);
      setStatus('Rebuilding the video container without inherited metadata. Video and audio are not being re-encoded.', 'working');
      setProgress(10, 'Remuxing video…');

      const exitCode = await processor.exec([
        '-i', inputVirtualName,
        '-map', '0:v?',
        '-map', '0:a?',
        '-map', '0:s?',
        '-map_metadata', '-1',
        '-map_chapters', '-1',
        '-c', 'copy',
        '-movflags', '+faststart',
        outputVirtualName
      ]);

      if (cancelled) throw new Error('Processing cancelled.');
      if (exitCode !== 0) throw new Error(`FFmpeg finished with error code ${exitCode}.`);

      setProgress(95, 'Preparing download…');
      const outputData = await processor.readFile(outputVirtualName);
      outputBlob = new Blob([outputData.buffer], {
        type: outputExt === 'mov' ? 'video/quicktime' : 'video/mp4'
      });

      await processor.deleteFile(inputVirtualName).catch(() => {});
      await processor.deleteFile(outputVirtualName).catch(() => {});

      setProgress(100, 'Complete');
      setStatus(`Clean copy created: ${outputName}\nDownload it before leaving this page.`, 'success');
      result.hidden = false;
    } catch (error) {
      if (String(error && error.message).includes('cancelled')) {
        setStatus('Processing cancelled. The original video was not changed.', 'info');
      } else {
        console.error(error);
        setStatus(`Video Stripper could not process this file. ${error && error.message ? error.message : 'The browser may have run out of memory.'}\n\nFor a large 4K file, use the PowerShell/FFmpeg method instead.`, 'error');
      }
    } finally {
      cleanButton.disabled = !selectedFile;
      changeFile.disabled = false;
      cancelButton.hidden = true;
    }
  }

  function cancelProcessing() {
    cancelled = true;
    if (ffmpeg) {
      try { ffmpeg.terminate(); } catch (_) {}
      ffmpeg = null;
    }
    setStatus('Cancelling…', 'working');
  }

  function downloadOutput() {
    if (!outputBlob || !outputName) return;
    const url = URL.createObjectURL(outputBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = outputName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  function resetAll() {
    selectedFile = null;
    fileInput.value = '';
    fileCard.hidden = true;
    cleanButton.disabled = true;
    resetResult();
    setStatus('Select one video to begin.', 'info');
  }

  fileInput.addEventListener('change', () => chooseFile(fileInput.files[0]));
  changeFile.addEventListener('click', () => fileInput.click());
  cleanButton.addEventListener('click', cleanVideo);
  cancelButton.addEventListener('click', cancelProcessing);
  downloadButton.addEventListener('click', downloadOutput);
  resetButton.addEventListener('click', resetAll);

  dropZone.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fileInput.click();
    }
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, event => {
      event.preventDefault();
      dropZone.classList.add('is-dragging');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, event => {
      event.preventDefault();
      dropZone.classList.remove('is-dragging');
    });
  });

  dropZone.addEventListener('drop', event => {
    const file = event.dataTransfer && event.dataTransfer.files
      ? event.dataTransfer.files[0]
      : null;
    chooseFile(file);
  });
})();
