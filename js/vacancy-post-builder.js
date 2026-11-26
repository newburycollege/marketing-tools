(function () {
      const OUTPUT_SIZE = 1080;
      const OVERLAY_PATH = 'img/apprenticeship-vacancy-overlay.png';

      function boot() {
        const canvas = document.getElementById('vacancyPreviewCanvas');
        const backgroundInput = document.getElementById('backgroundImage');
        if (!canvas || !backgroundInput) {
          console.error("Toolkit shell unavailable.");
          return;
        }

        if (canvas.dataset.initialised === 'true') {
          return;
        }
        canvas.dataset.initialised = 'true';

        const previewCtx = canvas.getContext('2d');
        const zoomRange = document.getElementById('zoomRange');
        const xRange = document.getElementById('xRange');
        const yRange = document.getElementById('yRange');
        const zoomValue = document.getElementById('zoomValue');
        const xValue = document.getElementById('xValue');
        const yValue = document.getElementById('yValue');
        const imageStatus = document.getElementById('imageStatus');
        const downloadImageButton = document.getElementById('downloadImageButton');
        const resetCropButton = document.getElementById('resetCropButton');
        const headlinePreview = document.getElementById('headlinePreview');

        let backgroundImage = null;
        let overlayImage = null;
        let overlayReady = false;

        function updateSliderLabels() {
          zoomValue.textContent = Number(zoomRange.value).toFixed(2) + '×';
          xValue.textContent = xRange.value;
          yValue.textContent = yRange.value;
        }

        function updateHeadlinePreview() {
          const value = document.getElementById('apprenticeshipName').value.trim();
          const headline = value ? value + ' Vacancy' : 'Apprenticeship Vacancy';
          headlinePreview.textContent = 'Generated headline: ' + headline;
        }

        function drawPreview() {
          previewCtx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
          previewCtx.fillStyle = '#e6e6e6';
          previewCtx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

          if (!backgroundImage) {
            downloadImageButton.disabled = true;
            imageStatus.textContent = overlayReady
              ? 'Upload a background image to begin.'
              : 'Upload a background image to begin. Overlay file not yet available.';
            return;
          }

          const {x:drawX,y:drawY,width:drawWidth,height:drawHeight}=Toolkit.cropPlacement(backgroundImage,OUTPUT_SIZE,zoomRange.value,xRange.value,yRange.value);

          previewCtx.drawImage(backgroundImage, drawX, drawY, drawWidth, drawHeight);

          if (overlayReady && overlayImage) {
            previewCtx.drawImage(overlayImage, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
            imageStatus.textContent = 'Preview updated with vacancy overlay.';
          } else {
            imageStatus.textContent = 'Preview updated, but the overlay file was not found at ' + OVERLAY_PATH + '.';
          }

          downloadImageButton.disabled = !overlayReady;
        }

        let imageRequest = 0;
        async function loadImageFromFile(file, callback) { const request=++imageRequest; if(!file)return; backgroundImage=null; drawPreview(); imageStatus.textContent='Loading image…'; try { const img=await Toolkit.loadImage(file); if(request===imageRequest)callback(img); } catch(e) { if(request===imageRequest)imageStatus.textContent=e.message; } }

        function loadOverlay() {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = function () {
            overlayImage = img;
            overlayReady = true;
            drawPreview();
          };
          img.onerror = function () {
            overlayImage = null;
            overlayReady = false;
            drawPreview();
          };
          img.src = OVERLAY_PATH + '?t=' + Date.now();
        }

        function buildExportCanvas() {
          // Draw onto a fresh offscreen canvas using only in-memory images
          // (background loaded via FileReader data URL, overlay loaded with crossOrigin)
          // This avoids canvas taint issues that would block toBlob / toDataURL.
          const offscreen = document.createElement('canvas');
          offscreen.width = OUTPUT_SIZE;
          offscreen.height = OUTPUT_SIZE;
          const ctx = offscreen.getContext('2d');

          ctx.fillStyle = '#e6e6e6';
          ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

          if (backgroundImage) {
            const {x:drawX,y:drawY,width:drawWidth,height:drawHeight}=Toolkit.cropPlacement(backgroundImage,OUTPUT_SIZE,zoomRange.value,xRange.value,yRange.value);
            ctx.drawImage(backgroundImage, drawX, drawY, drawWidth, drawHeight);
          }

          if (overlayReady && overlayImage) {
            ctx.drawImage(overlayImage, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
          }

          return offscreen;
        }

        async function downloadCanvasAsPng() {
          if (!backgroundImage || !overlayReady) {
            imageStatus.textContent = 'No image available to download.';
            return;
          }

          const titleValue = document.getElementById('apprenticeshipName').value.trim();
          const safeName = Toolkit.safeName(titleValue,'apprenticeship-vacancy').toLowerCase();
          const fileName = safeName + '-1080x1080.png';

          try {
            const exportCanvas = buildExportCanvas();

            const triggerDownload = function (url, isObjectUrl) {
              const link = document.createElement('a');
              link.href = url;
              link.download = fileName;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              if (isObjectUrl) {
                setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
              }
              imageStatus.textContent = '1080 × 1080 image download started.';
            };

            if (exportCanvas.toBlob) {
              exportCanvas.toBlob(function (blob) {
                if (!blob) {
                  imageStatus.textContent = 'Download failed. Please try again.';
                  return;
                }
                if (window.navigator.msSaveOrOpenBlob) {
                  window.navigator.msSaveOrOpenBlob(blob, fileName);
                  imageStatus.textContent = '1080 × 1080 image download started.';
                  return;
                }
                triggerDownload(URL.createObjectURL(blob), true);
              }, 'image/png');
            } else {
              triggerDownload(exportCanvas.toDataURL('image/png'), false);
            }
          } catch (error) {
            console.error(error);
            imageStatus.textContent = 'Download failed: ' + error.message;
          }
        }

        backgroundInput.addEventListener('change', function () {
          loadImageFromFile(backgroundInput.files[0], function (img) {
            backgroundImage = img;
            drawPreview();
          });
        });

        [zoomRange, xRange, yRange].forEach(function (control) {
          control.addEventListener('input', function () {
            updateSliderLabels();
            drawPreview();
          });
        });

        resetCropButton.addEventListener('click', function () {
          zoomRange.value = '1';
          xRange.value = '0';
          yRange.value = '0';
          updateSliderLabels();
          drawPreview();
        });

        downloadImageButton.addEventListener('click', downloadCanvasAsPng);

        function setError(id, message) {
          document.getElementById(id).textContent = message || '';
        }

        function validateUrl(value) {
          try {
            const url = new URL(value);
            return url.protocol === 'http:' || url.protocol === 'https:';
          } catch (error) {
            return false;
          }
        }

        function buildDetailLine(locationText, salaryText, closingDate) {
          const parts = [];
          if (locationText) parts.push('Location: ' + locationText + '.');
          if (salaryText) parts.push('Pay: ' + salaryText + '.');
          if (closingDate) parts.push('Closing date: ' + closingDate + '.');
          return parts.join(' ');
        }

        function generateHeadline(apprenticeshipName) {
          return apprenticeshipName ? apprenticeshipName + ' Vacancy' : 'Apprenticeship Vacancy';
        }

        function generateCopy() {
          const apprenticeshipName = document.getElementById('apprenticeshipName').value.trim();
          const employerName = document.getElementById('employerName').value.trim();
          const locationText = document.getElementById('locationText').value.trim();
          const closingDate = document.getElementById('closingDate').value.trim();
          const salaryText = document.getElementById('salaryText').value.trim();
          const shortBenefit = document.getElementById('shortBenefit').value.trim();
          const ctaText = document.getElementById('ctaText').value.trim() || 'Apply now';
          const applyLink = document.getElementById('applyLink').value.trim();
          const headline = generateHeadline(apprenticeshipName);
          const detailLine = buildDetailLine(locationText, salaryText, closingDate);
          const hashtags = '#NewburyCollege #CareersNotCourses #Apprenticeships';

          let valid = true;
          if (!apprenticeshipName) {
            setError('apprenticeshipNameError', 'Enter the apprenticeship title.');
            valid = false;
          } else {
            setError('apprenticeshipNameError', '');
          }
          if (!employerName) {
            setError('employerNameError', 'Enter an employer.');
            valid = false;
          } else {
            setError('employerNameError', '');
          }
          if (!shortBenefit) {
            setError('shortBenefitError', 'Enter a short selling point.');
            valid = false;
          } else {
            setError('shortBenefitError', '');
          }
          if (!applyLink) {
            setError('applyLinkError', 'Enter a link.');
            valid = false;
          } else if (!validateUrl(applyLink)) {
            setError('applyLinkError', 'Enter a valid link starting with http:// or https://');
            valid = false;
          } else {
            setError('applyLinkError', '');
          }

          if (!valid) {
            ['facebookOutput','instagramOutput','linkedinOutput'].forEach(id=>document.getElementById(id).value='');
            document.getElementById('copyStatus').textContent = 'Please complete the highlighted fields and try again.';
            return;
          }

          const facebook = [
            headline + ' with ' + employerName + '.',
            shortBenefit,
            detailLine,
            ctaText + ': ' + applyLink,
            hashtags
          ].filter(Boolean).join('\n\n');

          const instagram = [
            headline + '.',
            'Employer: ' + employerName + '.',
            shortBenefit,
            detailLine,
            ctaText + ': ' + applyLink,
            hashtags
          ].filter(Boolean).join('\n\n');

          const linkedin = [
            headline + ' with ' + employerName + '.',
            shortBenefit,
            detailLine,
            ctaText + ': ' + applyLink,
            hashtags
          ].filter(Boolean).join('\n\n');

          document.getElementById('facebookOutput').value = facebook;
          document.getElementById('instagramOutput').value = instagram;
          document.getElementById('linkedinOutput').value = linkedin;
          document.getElementById('copyStatus').textContent = 'Vacancy copy generated.';
        }

        ['apprenticeshipName','employerName','locationText','closingDate','salaryText','shortBenefit','applyLink','ctaText'].forEach(id=>document.getElementById(id).addEventListener('input',()=>{['facebookOutput','instagramOutput','linkedinOutput'].forEach(out=>document.getElementById(out).value='');document.getElementById('copyStatus').textContent='Generate copy using the updated details.';}));
        document.getElementById('generatePostsButton').addEventListener('click', generateCopy);

        document.getElementById('clearPostsButton').addEventListener('click', function () {
          ['apprenticeshipName','employerName','locationText','closingDate','salaryText','shortBenefit','applyLink'].forEach(function (id) {
            document.getElementById(id).value = '';
          });
          document.getElementById('ctaText').value = 'Apply now';
          ['apprenticeshipNameError','employerNameError','shortBenefitError','applyLinkError'].forEach(function (id) {
            setError(id, '');
          });
          ['facebookOutput','instagramOutput','linkedinOutput'].forEach(function (id) {
            document.getElementById(id).value = '';
          });
          updateHeadlinePreview();
          document.getElementById('copyStatus').textContent = 'Fields cleared.';
        });

        document.getElementById('apprenticeshipName').addEventListener('input', updateHeadlinePreview);

        document.querySelectorAll('[data-copy-target]').forEach(function (button) {
          button.addEventListener('click', async function () {
            const target = document.getElementById(button.getAttribute('data-copy-target'));
            if (!target.value) return;
            document.getElementById('copyStatus').textContent=await Toolkit.copyText(target.value,target)?'Copy placed on the clipboard.':'Could not copy; copy the text manually.';
          });
        });

        updateSliderLabels();
        updateHeadlinePreview();
        loadOverlay();
        drawPreview();
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
      } else {
        boot();
      }
    })();
