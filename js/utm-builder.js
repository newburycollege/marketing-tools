document.addEventListener('DOMContentLoaded', function () {
      const form = document.getElementById('utmForm');
      const copyButton = document.getElementById('copyButton');
      const clearButton = document.getElementById('clearButton');
      const resultField = document.getElementById('utmResult');
      const summary = document.getElementById('utmSummary');

      const requiredFields = [
        { id: 'baseUrl', errorId: 'baseUrlError', label: 'destination URL' },
        { id: 'source', errorId: 'sourceError', label: 'utm_source' },
        { id: 'medium', errorId: 'mediumError', label: 'utm_medium' },
        { id: 'campaign', errorId: 'campaignError', label: 'utm_campaign' }
      ];

      function cleanValue(value, style, removePunctuation) {
        let output = value.trim();
        if (!output) return '';
        if (removePunctuation === 'yes') {
          output = output.replace(/[’'".,:;!?()\[\]{}\/\&]+/g, ' ');
        }
        output = output.replace(/\s+/g, ' ').trim();
        if (style === 'hyphen-lower') {
          output = output.toLowerCase().replace(/\s+/g, '-');
        } else if (style === 'underscore-lower') {
          output = output.toLowerCase().replace(/\s+/g, '_');
        }
        return output;
      }

      function setError(fieldId, errorId, message) {
        const field = document.getElementById(fieldId);
        const error = document.getElementById(errorId);
        field.classList.toggle('error-input', Boolean(message)); if(field) {field.setAttribute('aria-invalid',String(Boolean(message)));field.setAttribute('aria-describedby',errorId);}
        error.textContent = message || '';
      }

      function validateUrl(value) {
        try {
          const parsed = new URL(value);
          return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch (error) {
          return false;
        }
      }

      function buildLink() {
        const namingStyle = document.getElementById('namingStyle').value;
        const removePunctuation = document.getElementById('removePunctuation').value;
        let valid = true;

        requiredFields.forEach(function (item) {
          const rawValue = document.getElementById(item.id).value;
          if (!rawValue.trim()) {
            setError(item.id, item.errorId, 'Enter a value for ' + item.label + '.');
            valid = false;
          } else {
            setError(item.id, item.errorId, '');
          }
        });

        const baseUrl = document.getElementById('baseUrl').value.trim();
        if (baseUrl && !validateUrl(baseUrl)) {
          setError('baseUrl', 'baseUrlError', 'Enter a valid URL starting with http:// or https://');
          valid = false;
        }

        if (!valid) {
          resultField.value = '';
          copyButton.disabled = true;
          summary.textContent = 'Please correct the highlighted fields and try again.';
          return;
        }

        const parsedUrl = new URL(baseUrl);
        const source = cleanValue(document.getElementById('source').value, namingStyle, removePunctuation);
        const medium = cleanValue(document.getElementById('medium').value, namingStyle, removePunctuation);
        const campaign = cleanValue(document.getElementById('campaign').value, namingStyle, removePunctuation);
        const content = cleanValue(document.getElementById('content').value, namingStyle, removePunctuation);
        const term = cleanValue(document.getElementById('term').value, namingStyle, removePunctuation);

        const cleaned = {source, medium, campaign};
        for (const [id,value] of Object.entries(cleaned)) if (!value) { setError(id,id+'Error','Enter a value containing usable characters.'); valid=false; }
        if (!valid) { resultField.value=''; copyButton.disabled=true; summary.textContent='Please correct the highlighted fields.'; return; }
        parsedUrl.searchParams.set('utm_source', source);
        parsedUrl.searchParams.set('utm_medium', medium);
        parsedUrl.searchParams.set('utm_campaign', campaign);
        if (content) parsedUrl.searchParams.set('utm_content', content); else parsedUrl.searchParams.delete('utm_content');
        if (term) parsedUrl.searchParams.set('utm_term', term); else parsedUrl.searchParams.delete('utm_term');

        resultField.value = parsedUrl.toString();
        copyButton.disabled = false;

        const summaryParts = ['Source: ' + source, 'Medium: ' + medium, 'Campaign: ' + campaign];
        if (content) summaryParts.push('Content: ' + content);
        if (term) summaryParts.push('Term: ' + term);
        summary.textContent = summaryParts.join(' | ');
      }

      form.addEventListener('input', () => {resultField.value=''; copyButton.disabled=true; summary.textContent='Build a link using the updated details.';});
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        buildLink();
      });

      copyButton.addEventListener('click', async function () {
        if (!resultField.value) return;
        summary.textContent = await Toolkit.copyText(resultField.value,resultField) ? 'Tracked link copied to clipboard.' : 'Could not copy. Select and copy the link manually.';
      });

      clearButton.addEventListener('click', function () {
        form.reset();
        requiredFields.forEach(function (item) { setError(item.id, item.errorId, ''); });
        resultField.value = '';
        copyButton.disabled = true;
        summary.textContent = 'Complete the form above to generate a tracked link.';
      });
    });
