(function () {
  const sizes = [ ['email_cover','Email Cover (800px x 400px)',800,400], ['email_220','Email 220 (220px x 165px)',220,165], ['email_240','Email 240 (240px x 180px)',240,180], ['email_330','Email 330 (330px x 248px)',330,248], ['website','Website News (800px x 600px)',800,600], ['website_contact_profile','Website Contact Profile (300px x 265px)',300,265], ['website_case_study','Website Case Study (512px x 512px)',512,512], ['press','Press (Max 4000px wide)',4000,null] ];
  document.addEventListener('app-shell-ready', () => {
    const $ = id => document.getElementById(id), form = $('uploadForm'); if (!form) return;
    const file = $('imageInput'), name = $('fileName'), tbody = $('resultsTbody'), zipButton = $('zipButton'), submit = form.querySelector('[type=submit]'), status = $('resizeStatus');
    let outputs = [], urls = [], busy = false, base = '';
    function clear() { urls.forEach(URL.revokeObjectURL); urls=[]; outputs=[]; tbody.replaceChildren(); zipButton.disabled=true; }
    function setBusy(value) {busy=value; file.disabled=value; name.disabled=value; submit.disabled=value; zipButton.disabled=value||!outputs.length;}
    function append(row, text, label) {const td=document.createElement('td');td.dataset.label=label; if (typeof text==='string') td.textContent=text;else td.append(text);row.append(td);}
    form.addEventListener('submit',async e=> {
      e.preventDefault(); if(busy) return; clear();
      if(!file.files[0]||!name.value.trim()){status.textContent='Choose an image and enter a filename.';return;}
      setBusy(true); base=Toolkit.safeName(name.value,'image'); status.textContent='Reading image…'; let failed=0;
      try {
        const img=await Toolkit.loadImage(file.files[0]);
        for(const [suffix,description,w,h] of sizes){
          try {
            const canvas=document.createElement('canvas'); const iw=img.naturalWidth,ih=img.naturalHeight;
            canvas.width=h?w:Math.min(w,iw); canvas.height=h||Math.max(1,Math.round(ih*canvas.width/iw));
            const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
            const scale=Math.max(canvas.width/iw,canvas.height/ih);ctx.drawImage(img,(canvas.width-iw*scale)/2,(canvas.height-ih*scale)/2,iw*scale,ih*scale);
            const blob=await Toolkit.canvasBlob(canvas,'image/jpeg',.9), filename=base+'_'+suffix+'.jpg',url=URL.createObjectURL(blob); urls.push(url); outputs.push({blob,filename});
            const tr=document.createElement('tr'), preview=new Image(), link=document.createElement('a');preview.src=url;preview.alt='Preview of '+description;preview.className='results-image-preview';link.href=url;link.download=filename;link.className='downloadLink';link.textContent='Download';
            append(tr,preview,'Image');append(tr,description,'Description');append(tr,filename,'File name');append(tr,(blob.size/1024).toFixed(2)+' KB','File size');append(tr,link,'Download');tbody.append(tr);
          } catch(e){failed++;console.error('Could not resize '+suffix,e);}
        }
        status.textContent=outputs.length+' of '+sizes.length+' images generated.'+(failed?' Some sizes failed; try a smaller source image.':'');
      } catch(e){status.textContent=e.message||'Image processing failed.';} finally {setBusy(false);}
    });
    zipButton.addEventListener('click',async()=>{if(busy||!outputs.length)return;setBusy(true);try{if(typeof JSZip!=='function')throw new Error('ZIP library did not load.');const zip=new JSZip();for(const item of outputs)zip.file(item.filename,item.blob);Toolkit.downloadBlob(await zip.generateAsync({type:'blob'}),base+'_resized_images.zip');status.textContent='ZIP download started.';}catch(e){status.textContent=e.message;}finally{setBusy(false);}});
    [name,file].forEach(field=>field.addEventListener('input',()=>{if(!busy){clear();status.textContent='Generate images using the updated details.';}}));
    clear();
  });
})();
