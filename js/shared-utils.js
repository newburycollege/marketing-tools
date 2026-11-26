(function () {
  'use strict';
  function safeName(value, fallback = 'download') {
    const name = String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^[-_]+|[-_]+$/g, '').slice(0, 100);
    return !name || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(name) ? fallback : name;
  }
  async function copyText(text, field) {
    if (!text) return false;
    try { await navigator.clipboard.writeText(text); return true; } catch (_) {
      const target = field || document.createElement('textarea');
      if (!field) { target.value = text; target.style.position = 'fixed'; target.style.opacity = '0'; document.body.append(target); }
      try { target.focus(); target.select(); return document.execCommand('copy') === true; }
      catch (_) { return false; } finally { if (!field) target.remove(); }
    }
  }
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('Choose an image.'));
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); if (!img.naturalWidth || !img.naturalHeight) reject(new Error('Invalid image dimensions.')); else resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This image could not be opened. Choose a supported image.')); };
      img.src = url;
    });
  }
  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  function canvasBlob(canvas, type = 'image/png', quality) {
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not create the image.')), type, quality));
  }
  function cropPlacement(img, size, zoom, x, y) {
    const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight) * Math.max(1, Number(zoom));
    const width = img.naturalWidth * scale, height = img.naturalHeight * scale;
    const clamp = v => Math.max(-1, Math.min(1, Number(v) / 100));
    return { width, height, x: (size - width) / 2 + clamp(x) * (width - size) / 2, y: (size - height) / 2 + clamp(y) * (height - size) / 2 };
  }
  window.Toolkit = Object.freeze({safeName, copyText, loadImage, downloadBlob, canvasBlob, cropPlacement});
})();
