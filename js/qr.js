(function () {
  function boot() {
    const $ = id => document.getElementById(id), form = $('qrText')?.closest('form'); if (!form) return;
    const text = $('qrText'), img = $('qrImage'), placeholder = $('qrPlaceholder'), button = $('downloadBtn'), status = $('qrStatus');
    let blob = null, url = null, generation = 0;
    function clear() { generation++; blob = null; if (url) URL.revokeObjectURL(url); url = null; img.removeAttribute('src'); img.style.display = 'none'; placeholder.style.display = 'block'; button.disabled = true; status.textContent = ''; }
    function error(message) { $('qrError').textContent = message; text.classList.toggle('error-input',!!message); text.setAttribute('aria-invalid',String(!!message)); }
    text.addEventListener('input', () => {clear(); error('');});
    form.addEventListener('submit', async e => {
      e.preventDefault(); clear(); error(''); const token = generation, value = text.value.trim();
      if (!value) {error('Enter some text or a URL.'); return;}
      if (new TextEncoder().encode(value).length > 2300) {error('This text is too long for a reliable QR code. Use a shorter link or text.'); return;}
      try {
        if (typeof qrcode !== 'function') throw new Error('QR library unavailable. Refresh the page.');
        qrcode.stringToBytes = s => Array.from(new TextEncoder().encode(s));
        const qr = qrcode(0,'M'); qr.addData(value,'Byte'); qr.make();
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
        const ctx = canvas.getContext('2d'), n = qr.getModuleCount(), scale = Math.floor(512/(n+8)), offset = Math.floor((512-n*scale)/2);
        ctx.fillStyle = '#fff'; ctx.fillRect(0,0,512,512); ctx.fillStyle = '#000';
        for (let r=0;r<n;r++) for(let c=0;c<n;c++) if(qr.isDark(r,c)) ctx.fillRect(offset+c*scale,offset+r*scale,scale,scale);
        const generated = await Toolkit.canvasBlob(canvas); if (token !== generation) return;
        blob = generated; url = URL.createObjectURL(blob); img.src = url; img.style.display = 'block'; placeholder.style.display = 'none'; button.disabled = false; status.textContent = 'QR code generated locally. You can scan or download it.';
      } catch (e) { if (token === generation) error(e.message || 'Could not generate this QR code.'); }
    });
    button.addEventListener('click', () => {if (blob) Toolkit.downloadBlob(blob,Toolkit.safeName($('qrName').value,'qr-code')+'-qr-code.png');});
  }
  document.addEventListener('app-shell-ready',boot);
})();
