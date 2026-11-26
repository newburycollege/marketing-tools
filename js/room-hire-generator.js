document.addEventListener('DOMContentLoaded', function () {

      const baseUrl = 'https://newbury-college.ac.uk/index.php?option=com_rsform&formId=59';

      const status = document.getElementById('roomStatus');
      const outputs = ['urlOutput','emailOutput'];
      function invalidate() { outputs.forEach(id=>document.getElementById(id).value=''); document.getElementById('copyLinkBtn').disabled=true; document.getElementById('copyEmail').disabled=true; status.textContent='Generate a link using the updated details.'; }
      ['bookingRef','rate','rateUnit'].forEach(id=>document.getElementById(id).addEventListener('input',invalidate));
      async function copyText(id) {const field=document.getElementById(id);status.textContent=await Toolkit.copyText(field.value,field)?'Copied to clipboard.':'Could not copy; copy the text manually.';}

      document.getElementById('generateBtn').addEventListener('click', function () {

        const bookingRefRaw = document.getElementById('bookingRef').value.trim();
        let rateRaw = document.getElementById('rate').value.trim();
        const rateUnitRaw = document.getElementById('rateUnit').value;

        invalidate();
        if (!bookingRefRaw || !/^(?:\d+)(?:\.\d{1,2})?$/.test(rateRaw) || !Number.isFinite(Number(rateRaw)) || Number(rateRaw)>999999999) { status.textContent='Enter a booking reference and a valid non-negative rate (up to two decimal places).'; return; }
        rateRaw=Number(rateRaw).toFixed(2);
        document.getElementById('copyLinkBtn').disabled=false; document.getElementById('copyEmail').disabled=false; status.textContent='Link and email generated.';
        const bookingRef = encodeURIComponent(bookingRefRaw);
        const rate = encodeURIComponent(rateRaw);
        const rateUnit = encodeURIComponent(rateUnitRaw);

        const url = `${baseUrl}&form[rate]=${rate}&form[rateUnit]=${rateUnit}&form[bookingRef]=${bookingRef}`;

        document.getElementById('urlOutput').value = url;
        document.getElementById('emailOutput').value =
`Please use the following link to complete your room hire booking:

${url}`;
      });

      document.getElementById('copyEmail').addEventListener('click', function () { copyText('emailOutput'); });
      document.getElementById('copyLinkBtn').addEventListener('click', function () { copyText('urlOutput'); });

    });
