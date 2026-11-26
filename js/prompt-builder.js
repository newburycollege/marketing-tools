(function () {
      function initialisePromptBuilder() {
        const form = document.getElementById('promptBuilderForm');
        const postType = document.getElementById('postType');
        if (!form || !postType) {
          return false;
        }

        if (form.dataset.initialised === 'true') {
          return true;
        }
        form.dataset.initialised = 'true';

        const guidance = document.getElementById('dynamicGuidance');
        const promptOutput = document.getElementById('promptOutput');
        const promptSummary = document.getElementById('promptSummary');
        const copyPromptButton = document.getElementById('copyPromptButton');
        const clearPromptButton = document.getElementById('clearPromptButton');

        const sections = {
          news: document.getElementById('newsFields'),
          vacancy: document.getElementById('vacancyFields'),
          event: document.getElementById('eventFields')
        };

        function clearSection(section) {
          const inputs = section.querySelectorAll('input, textarea');
          inputs.forEach(function (field) {
            field.value = '';
            field.classList.remove('error-input');
          });
        }

        function setError(fieldId, errorId, message) {
          const field = document.getElementById(fieldId);
          const error = document.getElementById(errorId);
          if (field) field.classList.toggle('error-input', Boolean(message)); if(field) {field.setAttribute('aria-invalid',String(Boolean(message)));field.setAttribute('aria-describedby',errorId);}
          if (error) error.textContent = message || '';
        }

        function toggleSections() {
          const selected = postType.value;
          Object.keys(sections).forEach(function (key) {
            const section = sections[key];
            if (!section) return;
            const hidden = key !== selected;
            section.classList.toggle('prompt-section--hidden', hidden);
            // Preserve entered content when switching post type.
          });
        }

        function updateGuidance() {
          if (postType.value === 'news') {
            guidance.textContent = 'Focus on student experience, outcomes and positive impact. Highlight achievements, visits and opportunities.';
          } else if (postType.value === 'vacancy') {
            guidance.textContent = 'Focus on career progression, employer credibility and benefits such as salary, experience and training.';
          } else {
            guidance.textContent = 'Focus on what attendees will gain, who it is for and why they should attend. Make the value clear.';
          }
        }

        function buildPromptText(data) {
          const hashtagLine = data.campaignHashtag
            ? '#NewburyCollege #CareersNotCourses ' + (data.campaignHashtag.startsWith('#') ? data.campaignHashtag : '#'+data.campaignHashtag)
            : '#NewburyCollege #CareersNotCourses';

          let contextBlock = '';
          let typeInstruction = '';
          let typeSpecificCTA = '';

          if (data.postType === 'news') {
            contextBlock = [
              'Content type: News item, celebration, guest speaker or trip.',
              'Main topic: ' + data.titleOrTopic + '.',
              data.newsPeople ? 'People involved: ' + data.newsPeople + '.' : '',
              'Summary: ' + data.summary + '.',
              data.benefit ? 'Why it matters: ' + data.benefit + '.' : '',
              data.newsOutcome ? 'Positive outcome or highlight: ' + data.newsOutcome + '.' : ''
            ].filter(Boolean).join('\n');
            typeInstruction = '- Focus on storytelling, student experience and positive outcomes.';
            typeSpecificCTA = data.cta ? 'Include this call to action if appropriate: ' + data.cta + '.' : 'Include a suitable call to action only if it feels natural.';
          } else if (data.postType === 'vacancy') {
            contextBlock = [
              'Content type: Apprenticeship vacancy.',
              'Vacancy or main topic: ' + data.titleOrTopic + '.',
              data.employer ? 'Employer: ' + data.employer + '.' : '',
              'Summary: ' + data.summary + '.',
              data.vacancyBenefits ? 'Key selling points: ' + data.vacancyBenefits + '.' : '',
              data.deadline ? 'Application deadline: ' + data.deadline + '.' : '',
              data.benefit ? 'Why it matters: ' + data.benefit + '.' : ''
            ].filter(Boolean).join('\n');
            typeInstruction = '- Emphasise progression, employer credibility and career benefits.';
            typeSpecificCTA = data.cta ? 'Encourage applications clearly using this call to action where appropriate: ' + data.cta + '.' : 'Encourage applications clearly.';
          } else {
            contextBlock = [
              'Content type: Event.',
              'Event name or main topic: ' + data.titleOrTopic + '.',
              data.eventDate ? 'Date and time: ' + data.eventDate + '.' : '',
              data.location ? 'Location: ' + data.location + '.' : '',
              'Summary: ' + data.summary + '.',
              data.eventDetails ? 'What attendees will get from it: ' + data.eventDetails + '.' : '',
              data.benefit ? 'Why it matters: ' + data.benefit + '.' : ''
            ].filter(Boolean).join('\n');
            typeInstruction = '- Make the value of attending the event clear and compelling.';
            typeSpecificCTA = data.cta ? 'Encourage attendance or booking clearly using this call to action where appropriate: ' + data.cta + '.' : 'Encourage attendance or booking clearly.';
          }

          const emojiInstruction = data.strictMode
            ? 'Do not use emojis under any circumstances.'
            : (data.emojiRule === 'none' ? 'Do not use emojis.' : 'Restrict emojis heavily and only use them if absolutely necessary.');

          const optionalAudience = data.audience ? 'Target audience: ' + data.audience + '.' : '';
          const optionalLink = data.link ? 'If appropriate, include this link naturally at the end of each post: ' + data.link : '';

          return [
            'Write social media content for Newbury College.',
            '',
            'Create three separate versions of the post for:',
            '- Facebook',
            '- Instagram',
            '- LinkedIn',
            '',
            'Context:',
            contextBlock,
            optionalAudience,
            optionalLink,
            '',
            'Requirements:',
            '- Use UK English.',
            '- Do not use em dashes or en dashes.',
            '- Do not use American spelling.',
            '- Use a ' + data.tone + ' tone.',
            '- Keep each post suitable for its platform.',
            '- Keep the language clear, polished and ready to publish.',
            '- Avoid waffle and unnecessary filler.',
            '- Include the hashtags ' + hashtagLine + ' at the end.',
            '- ' + emojiInstruction,
            typeInstruction,
            '- ' + typeSpecificCTA,
            '',
            'Output format:',
            '- Facebook post clearly labelled',
            '- Instagram caption clearly labelled',
            '- LinkedIn post clearly labelled'
          ].filter(Boolean).join('\n');
        }

        form.addEventListener('input',()=>{promptOutput.value=''; copyPromptButton.disabled=true; promptSummary.textContent='Generate a prompt using the updated details.';});
        form.addEventListener('submit', function (event) {
          event.preventDefault();
          const type = postType.value;
          const titleOrTopic = document.getElementById('titleOrTopic').value.trim();
          const summary = document.getElementById('summary').value.trim();
          let valid = true;

          if (!titleOrTopic) {
            setError('titleOrTopic', 'titleOrTopicError', 'Enter a title or main topic.');
            valid = false;
          } else {
            setError('titleOrTopic', 'titleOrTopicError', '');
          }

          if (!summary) {
            setError('summary', 'summaryError', 'Enter the key information for this post.');
            valid = false;
          } else {
            setError('summary', 'summaryError', '');
          }

          if (type === 'vacancy') {
            const employer = document.getElementById('employer').value.trim();
            if (!employer) {
              setError('employer', 'employerError', 'Enter an employer for the apprenticeship vacancy.');
              valid = false;
            } else {
              setError('employer', 'employerError', '');
            }
          } else {
            setError('employer', 'employerError', '');
          }

          if (type === 'event') {
            const eventDate = document.getElementById('eventDate').value.trim();
            if (!eventDate) {
              setError('eventDate', 'eventDateError', 'Enter a date and time for the event.');
              valid = false;
            } else {
              setError('eventDate', 'eventDateError', '');
            }
          } else {
            setError('eventDate', 'eventDateError', '');
          }

          const rawLink=document.getElementById('link').value.trim(); if(rawLink) { try {const u=new URL(rawLink); if(!['http:','https:'].includes(u.protocol))throw new Error(); document.getElementById('link').removeAttribute('aria-invalid');}catch(e){valid=false;document.getElementById('link').setAttribute('aria-invalid','true');} } else document.getElementById('link').removeAttribute('aria-invalid');
          if (!valid) {
            promptOutput.value = '';
            copyPromptButton.disabled = true;
            promptSummary.textContent = 'Please complete the highlighted fields and try again.';
            return;
          }

          const data = {
            postType: type,
            titleOrTopic: titleOrTopic,
            audience: document.getElementById('audience').value.trim(),
            summary: summary,
            benefit: document.getElementById('benefit').value.trim(),
            cta: document.getElementById('cta').value.trim(),
            newsPeople: document.getElementById('newsPeople').value.trim(),
            newsOutcome: document.getElementById('newsOutcome').value.trim(),
            employer: document.getElementById('employer').value.trim(),
            deadline: document.getElementById('deadline').value.trim(),
            vacancyBenefits: document.getElementById('vacancyBenefits').value.trim(),
            eventDate: document.getElementById('eventDate').value.trim(),
            location: document.getElementById('location').value.trim(),
            eventDetails: document.getElementById('eventDetails').value.trim(),
            link: document.getElementById('link').value.trim(),
            campaignHashtag: document.getElementById('campaignHashtag').value.trim(),
            emojiRule: document.getElementById('emojiRule').value,
            tone: document.getElementById('tone').value,
            strictMode: document.getElementById('strictMode').checked
          };

          promptOutput.value = buildPromptText(data);
          copyPromptButton.disabled = false;
          promptSummary.textContent = 'Prompt generated for ' + postType.options[postType.selectedIndex].text + '.';
        });

        copyPromptButton.addEventListener('click', async function () {
          if (!promptOutput.value) return;
          promptSummary.textContent=await Toolkit.copyText(promptOutput.value,promptOutput)?'Prompt copied to clipboard.':'Could not copy; copy the prompt manually.';
        });

        clearPromptButton.addEventListener('click', function () {
          form.reset();
          setError('titleOrTopic', 'titleOrTopicError', '');
          setError('summary', 'summaryError', '');
          setError('employer', 'employerError', '');
          setError('eventDate', 'eventDateError', '');
          toggleSections();
          updateGuidance();
          promptOutput.value = '';
          copyPromptButton.disabled = true;
          promptSummary.textContent = 'Complete the form above to generate a prompt.';
        });

        postType.addEventListener('change', function () {
          toggleSections();
          updateGuidance();
          promptOutput.value = '';
          copyPromptButton.disabled = true;
          promptSummary.textContent = 'Complete the form above to generate a prompt.';
        });

        toggleSections();
        updateGuidance();
        return true;
      }

      function bootPromptBuilder() {
        if (initialisePromptBuilder()) return;
        console.error("Toolkit shell unavailable.");
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootPromptBuilder);
      } else {
        bootPromptBuilder();
      }
    })();
