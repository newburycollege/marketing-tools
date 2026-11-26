(function () {
      const OUTPUT_SIZE = 1080;
      const RED_SECTION_HEIGHT_RATIO = 0.397;
      const RED_SECTION_CORNER_RADIUS = 100;
      const ICON_SIZE = 48;
      const TEXT_MARGIN_LEFT = 60;
      const TEXT_COLOR = '#ffffff';
      const RED_COLOR = '#F42941';
      const RED_SECTION_OPACITY = 0.8;
      const RED_SECTION_BLUR_PX = 20;
      const DARK_BADGE_COLOR = '#262626';

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
        const updatePreviewButton = document.getElementById('updatePreviewButton');
        const clearDetailsButton = document.getElementById('clearDetailsButton');
        const detailsStatus = document.getElementById('detailsStatus');

        let backgroundImage = null;

        function updateSliderLabels() {
          zoomValue.textContent = Number(zoomRange.value).toFixed(2) + '×';
          xValue.textContent = xRange.value;
          yValue.textContent = yRange.value;
        }

        function roundedRectPath(ctx, x, y, width, height, radius) {
          const safeRadius = Math.min(radius, width / 2, height / 2);
          ctx.beginPath();
          ctx.moveTo(x + safeRadius, y);
          ctx.lineTo(x + width - safeRadius, y);
          ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
          ctx.lineTo(x + width, y + height - safeRadius);
          ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
          ctx.lineTo(x + safeRadius, y + height);
          ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
          ctx.lineTo(x, y + safeRadius);
          ctx.quadraticCurveTo(x, y, x + safeRadius, y);
          ctx.closePath();
        }

        function redSectionPath(ctx, yStart) {
          ctx.beginPath();
          ctx.moveTo(0, OUTPUT_SIZE);
          ctx.lineTo(0, yStart + RED_SECTION_CORNER_RADIUS);
          ctx.quadraticCurveTo(0, yStart, RED_SECTION_CORNER_RADIUS, yStart);
          ctx.lineTo(OUTPUT_SIZE - RED_SECTION_CORNER_RADIUS, yStart);
          ctx.quadraticCurveTo(OUTPUT_SIZE, yStart, OUTPUT_SIZE, yStart + RED_SECTION_CORNER_RADIUS);
          ctx.lineTo(OUTPUT_SIZE, OUTPUT_SIZE);
          ctx.closePath();
        }

        function getBackgroundPlacement(image) { return Toolkit.cropPlacement(image,OUTPUT_SIZE,zoomRange.value,xRange.value,yRange.value); }

        function drawPlacedBackground(ctx, image, placement) {
          ctx.drawImage(
            image,
            placement.x,
            placement.y,
            placement.width,
            placement.height
          );
        }

        function drawRedSection(ctx, yStart, image, placement) {
          ctx.save();
          redSectionPath(ctx, yStart);
          ctx.clip();

          if (image && placement) {
            ctx.filter = 'blur(' + RED_SECTION_BLUR_PX + 'px)';
            drawPlacedBackground(ctx, image, placement);
            ctx.filter = 'none';
          }

          ctx.globalAlpha = RED_SECTION_OPACITY;
          ctx.fillStyle = RED_COLOR;
          ctx.fillRect(0, yStart, OUTPUT_SIZE, OUTPUT_SIZE - yStart);
          ctx.restore();
        }

        function drawVacancyBadge(ctx, yStart) {
          const badgeY = yStart - 29;
          const badgeX = 97;
          const badgeWidth = 277;
          const badgeHeight = 71;
          const badgeRadius = badgeHeight / 2;

          ctx.fillStyle = DARK_BADGE_COLOR;
          roundedRectPath(ctx, badgeX, badgeY, badgeWidth, badgeHeight, badgeRadius);
          ctx.fill();

          ctx.fillStyle = TEXT_COLOR;
          ctx.font = 'bold 44px Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('VACANCY', badgeX + badgeWidth / 2, badgeY + badgeHeight / 2 + 6);
        }

        function wrapText(ctx, text, maxWidth) {
          const words = text.split(/\s+/).filter(Boolean);
          const lines = [];
          let line = '';

          words.forEach(function (word) {
            const testLine = line ? line + ' ' + word : word;
            if (ctx.measureText(testLine).width > maxWidth && line) {
              lines.push(line);
              line = word;
            } else {
              line = testLine;
            }
          });

          if (line) {
            lines.push(line);
          }
          return lines;
        }

        function fitTextWithEllipsis(ctx, text, maxWidth) {
          if (ctx.measureText(text).width <= maxWidth) {
            return text;
          }

          let shortened = text;
          while (shortened.length > 1 && ctx.measureText(shortened + '…').width > maxWidth) {
            shortened = shortened.slice(0, -1).trimEnd();
          }
          return shortened + '…';
        }

        function getJobTitleLayout(ctx, jobTitle, maxWidth, maxHeight) {
          const minimumFontSize = 44;

          for (let fontSize = 92; fontSize >= minimumFontSize; fontSize -= 2) {
            const lineHeight = Math.round(fontSize * 1.08);
            ctx.font = 'bold ' + fontSize + 'px Arial, sans-serif';
            const lines = wrapText(ctx, jobTitle, maxWidth);
            const widestLine = lines.reduce(function (widest, line) {
              return Math.max(widest, ctx.measureText(line).width);
            }, 0);

            if (lines.length <= 2 && widestLine <= maxWidth && (lines.length * lineHeight) <= maxHeight) {
              return { fontSize: fontSize, lineHeight: lineHeight, lines: lines };
            }
          }

          ctx.font = 'bold ' + minimumFontSize + 'px Arial, sans-serif';
          const fallbackLines = wrapText(ctx, jobTitle, maxWidth);
          const firstLine = fallbackLines[0] || '';
          const remainingText = fallbackLines.slice(1).join(' ');
          return {
            fontSize: minimumFontSize,
            lineHeight: Math.round(minimumFontSize * 1.08),
            lines: [
              fitTextWithEllipsis(ctx, firstLine, maxWidth),
              fitTextWithEllipsis(ctx, remainingText, maxWidth)
            ].filter(Boolean)
          };
        }

        function drawJobTitle(ctx, yStart, jobTitle) {
          const titleX = 108;
          const titleY = yStart + 82;
          const maxWidth = OUTPUT_SIZE - titleX - 90;
          const maxHeight = 144;
          const layout = getJobTitleLayout(ctx, jobTitle, maxWidth, maxHeight);

          ctx.fillStyle = TEXT_COLOR;
          ctx.font = 'bold ' + layout.fontSize + 'px Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';

          layout.lines.forEach(function (line, index) {
            ctx.fillText(line, titleX, titleY + (index * layout.lineHeight));
            if(line.endsWith('…')) document.getElementById('detailsStatus').textContent='Some text is shortened on the graphic. Check the preview.';
          });
        }

        function drawIcon(ctx, iconName, x, y) {
          const scale = ICON_SIZE / 32;
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(scale, scale);
          ctx.strokeStyle = TEXT_COLOR;
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          if (iconName === 'pin') {
            ctx.beginPath();
            ctx.moveTo(16, 31);
            ctx.bezierCurveTo(12, 26, 5, 20, 5, 12);
            ctx.bezierCurveTo(5, 6.5, 10, 2, 16, 2);
            ctx.bezierCurveTo(22, 2, 27, 6.5, 27, 12);
            ctx.bezierCurveTo(27, 20, 20, 26, 16, 31);
            ctx.closePath();
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(16, 13, 4, 0, Math.PI * 2);
            ctx.stroke();
          } else if (iconName === 'clock') {
            ctx.beginPath();
            ctx.arc(16, 16, 14, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(16, 8);
            ctx.lineTo(16, 16);
            ctx.lineTo(22, 20);
            ctx.stroke();
          } else if (iconName === 'money') {
            const frontNoteOffsetX = -1 / scale;
            const frontNoteCentreX = 14 + frontNoteOffsetX;

            roundedRectPath(ctx, frontNoteOffsetX, 7, 28, 19, 4);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(7, 4);
            ctx.lineTo(25, 4);
            ctx.quadraticCurveTo(30, 4, 30, 9);
            ctx.lineTo(30, 22);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(frontNoteCentreX, 16.5, 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(6 + frontNoteOffsetX, 13);
            ctx.lineTo(6 + frontNoteOffsetX, 20);
            ctx.moveTo(22 + frontNoteOffsetX, 13);
            ctx.lineTo(22 + frontNoteOffsetX, 20);
            ctx.stroke();
          } else if (iconName === 'calendar') {
            roundedRectPath(ctx, 3, 5, 26, 24, 4);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(4, 12);
            ctx.lineTo(28, 12);
            ctx.moveTo(10, 2);
            ctx.lineTo(10, 8);
            ctx.moveTo(22, 2);
            ctx.lineTo(22, 8);
            ctx.stroke();
            [10, 16, 22].forEach(function (dotX) {
              [17, 23].forEach(function (dotY) {
                ctx.beginPath();
                ctx.arc(dotX, dotY, 1, 0, Math.PI * 2);
                ctx.fillStyle = TEXT_COLOR;
                ctx.fill();
              });
            });
          }

          ctx.restore();
        }

        function drawDetailItem(ctx, x, y, iconName, text, maxTextWidth) {
          drawIcon(ctx, iconName, x, y);
          ctx.fillStyle = TEXT_COLOR;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';

          let fontSize = 38;
          const minimumFontSize = 20;
          while (fontSize > minimumFontSize) {
            ctx.font = fontSize + 'px Arial, sans-serif';
            if (ctx.measureText(text).width <= maxTextWidth) {
              break;
            }
            fontSize -= 1;
          }
          ctx.font = fontSize + 'px Arial, sans-serif';

          if(ctx.measureText(text).width>maxTextWidth) document.getElementById('detailsStatus').textContent='Some text is shortened on the graphic. Check the preview.';
          ctx.fillText(
            fitTextWithEllipsis(ctx, text, maxTextWidth),
            x + TEXT_MARGIN_LEFT,
            y + ICON_SIZE / 2
          );
        }

        function formatClosingDate(value) {
          const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
          if (!match) {
            return '';
          }

          const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
          return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }).format(date);
        }

        function formatSalary() {
          const salaryValue = document.getElementById('salary').value;
          const amount = Number(salaryValue);
          if (!salaryValue || !Number.isFinite(amount) || amount < 0) {
            return '';
          }

          const selectedPeriod = document.querySelector('input[name="salaryPeriod"]:checked');
          const period = selectedPeriod ? selectedPeriod.value : 'annum';
          const fractionDigits = period === 'hour' || !Number.isInteger(amount) ? 2 : 0;
          const formattedAmount = new Intl.NumberFormat('en-GB', {
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: 2
          }).format(amount);
          let salaryText = '£' + formattedAmount + (period === 'hour' ? '/hour' : ' p.a.');

          if (document.getElementById('salaryProRata').checked) {
            salaryText += ', pro-rata';
          }
          return salaryText;
        }

        function drawJobDetails(ctx, yStart) {
          const location = document.getElementById('location').value.trim();
          const employmentType = document.getElementById('employmentType').value.trim();
          const salary = formatSalary();
          const closingDate = formatClosingDate(document.getElementById('closingDate').value);

          const leftX = 100;
          const rightX = 559;
          const firstRowY = yStart + 238;
          const secondRowY = firstRowY + 90;
          const leftTextWidth = rightX - (leftX + TEXT_MARGIN_LEFT) - 8;
          const rightTextWidth = OUTPUT_SIZE - (rightX + TEXT_MARGIN_LEFT) - 42;

          if (location) {
            drawDetailItem(ctx, leftX, firstRowY, 'pin', location, leftTextWidth);
          }

          if (employmentType) {
            drawDetailItem(ctx, rightX, firstRowY, 'clock', employmentType, rightTextWidth);
          }

          if (salary) {
            drawDetailItem(ctx, leftX, secondRowY, 'money', salary, leftTextWidth);
          }

          if (closingDate) {
            drawDetailItem(
              ctx,
              rightX,
              secondRowY,
              'calendar',
              'Closes ' + closingDate,
              rightTextWidth
            );
          }
        }

        function drawPreview() {
          if(detailsStatus.textContent.includes('shortened')) detailsStatus.textContent='';
          previewCtx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
          previewCtx.fillStyle = '#e6e6e6';
          previewCtx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

          if (!backgroundImage) {
            imageStatus.textContent = 'Upload a background image to begin.';
            downloadImageButton.disabled = true;
            return;
          }

          const backgroundPlacement = getBackgroundPlacement(backgroundImage);
          drawPlacedBackground(previewCtx, backgroundImage, backgroundPlacement);

          const jobTitle = document.getElementById('jobTitle').value.trim();
          if (jobTitle) {
            const redSectionY = OUTPUT_SIZE * (1 - RED_SECTION_HEIGHT_RATIO);
            drawRedSection(previewCtx, redSectionY, backgroundImage, backgroundPlacement);
            drawVacancyBadge(previewCtx, redSectionY);
            drawJobTitle(previewCtx, redSectionY, jobTitle);
            drawJobDetails(previewCtx, redSectionY);
            imageStatus.textContent = 'Preview updated with job details.';
          } else {
            imageStatus.textContent = 'Enter a job title to see the vacancy overlay.';
          }

          const salaryInput=document.getElementById('salary'); const invalidSalary=salaryInput.validity.badInput || (salaryInput.value!=='' && (!Number.isFinite(Number(salaryInput.value)) || Number(salaryInput.value)<0));
          downloadImageButton.disabled = !jobTitle || invalidSalary;
          if(invalidSalary) imageStatus.textContent='Enter a valid non-negative salary.';
        }

        let imageRequest = 0;
        async function loadImageFromFile(file, callback) { const request=++imageRequest; if(!file)return; backgroundImage=null; drawPreview(); imageStatus.textContent='Loading image…'; try { const img=await Toolkit.loadImage(file); if(request===imageRequest)callback(img); } catch(e) { if(request===imageRequest)imageStatus.textContent=e.message; } }

        function buildExportCanvas() {
          const offscreen = document.createElement('canvas');
          offscreen.width = OUTPUT_SIZE;
          offscreen.height = OUTPUT_SIZE;
          const ctx = offscreen.getContext('2d');

          ctx.fillStyle = '#e6e6e6';
          ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

          let backgroundPlacement = null;
          if (backgroundImage) {
            backgroundPlacement = getBackgroundPlacement(backgroundImage);
            drawPlacedBackground(ctx, backgroundImage, backgroundPlacement);
          }

          const jobTitle = document.getElementById('jobTitle').value.trim();
          if (jobTitle) {
            const redSectionY = OUTPUT_SIZE * (1 - RED_SECTION_HEIGHT_RATIO);
            drawRedSection(ctx, redSectionY, backgroundImage, backgroundPlacement);
            drawVacancyBadge(ctx, redSectionY);
            drawJobTitle(ctx, redSectionY, jobTitle);
            drawJobDetails(ctx, redSectionY);
          }

          return offscreen;
        }

        async function downloadCanvasAsPng() {
          drawPreview();
          if (!backgroundImage || downloadImageButton.disabled) {
            imageStatus.textContent = 'No image available to download.';
            return;
          }

          const jobTitleValue = document.getElementById('jobTitle').value.trim();
          const safeName = Toolkit.safeName(jobTitleValue,'hr-vacancy').toLowerCase();
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

        ['jobTitle','location','employmentType','salary','closingDate','salaryProRata'].forEach(id=>document.getElementById(id).addEventListener('input',drawPreview));
        document.querySelectorAll('input[name=salaryPeriod]').forEach(el=>el.addEventListener('change',drawPreview));
        updatePreviewButton.addEventListener('click', function () {
          drawPreview();
          if(!detailsStatus.textContent.includes('shortened')) detailsStatus.textContent = 'Preview updated with your details.';
        });

        clearDetailsButton.addEventListener('click', function () {
          ['jobTitle', 'location', 'employmentType', 'salary', 'closingDate'].forEach(function (id) {
            document.getElementById(id).value = '';
          });
          document.querySelector('input[name="salaryPeriod"][value="annum"]').checked = true;
          document.getElementById('salaryProRata').checked = false;
          document.getElementById('jobTitleError').textContent = '';
          detailsStatus.textContent = 'Fields cleared.';
          drawPreview();
        });

        updateSliderLabels();
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
      } else {
        boot();
      }
    })();
