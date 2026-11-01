/* Include this file in each app after fetching the user's preferences.
   Call AccessPrefs.apply(preferences). */
window.AccessPrefs = (() => {
  function apply(p = {}) {
    const body = document.body;
    body.classList.toggle('a11y-high-contrast', !!p.high_contrast);
    body.classList.toggle('a11y-underline', !!p.underline_links);
    body.classList.toggle('a11y-spacing', !!p.increased_spacing);
    body.classList.toggle('a11y-large-controls', !!p.large_controls);
    body.classList.toggle('a11y-reduced-motion', !!p.reduced_motion);
    body.classList.toggle('a11y-easy-read', !!p.easy_read);
    const scale = Math.max(100, Math.min(200, Number(p.text_scale) || 100));
    body.style.fontSize = scale + '%';
    body.dataset.keyboardSupport = String(!!p.keyboard_support);
    body.dataset.writtenCommunication = String(!!p.written_communication);
    body.dataset.readAloud = String(!!p.read_aloud);
  }

  function initializeQuickAccess() {
    const preferenceForm = document.querySelector('form.preferences');
    const presets = {
      visual: { text_scale: 150, high_contrast: true, underline_links: true, read_aloud: true },
      hearing: { written_communication: true },
      mobility: { large_controls: true, keyboard_support: true },
      communication: { written_communication: true },
      easy_read: { easy_read: true, increased_spacing: true },
      multiple: {
        text_scale: 150,
        high_contrast: true,
        underline_links: true,
        increased_spacing: true,
        large_controls: true,
        reduced_motion: true,
        easy_read: true,
        read_aloud: true,
        written_communication: true,
        keyboard_support: true
      }
    };

    let previewPreferences = () => {};
    if (preferenceForm) {
      previewPreferences = () => {
        const preview = {};
        preferenceForm.querySelectorAll('input[name]').forEach(control => {
          preview[control.name] = control.type === 'checkbox' ? control.checked : Number(control.value);
        });
        apply(preview);
        const easyReadPreference = preferenceForm.elements.namedItem('easy_read');
        const easyReadButton = document.getElementById('easyReadQuickToggle');
        if (easyReadButton) {
          easyReadButton.setAttribute('aria-pressed', String(easyReadPreference.checked));
          easyReadButton.textContent = easyReadPreference.checked ? 'Turn off Easy Read preview' : 'Turn on Easy Read preview';
        }
      };

      preferenceForm.addEventListener('change', previewPreferences);
      preferenceForm.querySelectorAll('[data-access-preset]').forEach(button => {
        button.addEventListener('click', () => {
          const preset = presets[button.dataset.accessPreset];
          preferenceForm.querySelectorAll('input[type="checkbox"]').forEach(input => {
            input.checked = false;
          });
          preferenceForm.elements.namedItem('text_scale').value = '100';
          Object.entries(preset).forEach(([name, value]) => {
            const control = preferenceForm.elements.namedItem(name);
            if (control.type === 'checkbox') {
              control.checked = value;
            } else {
              control.value = String(value);
            }
          });
          const scaleOutput = document.getElementById('scaleOutput');
          const textScale = preferenceForm.elements.namedItem('text_scale');
          if (scaleOutput) scaleOutput.value = textScale.value + '%';
          previewPreferences();
          if (document.getElementById('quickAccessMessage')) {
            document.getElementById('quickAccessMessage').textContent = 'Preset selected. Save preferences to apply it across all pages.';
          }
        });
      });
    }

    const readButton = document.getElementById('readPageButton');
    const pauseButton = document.getElementById('pausePageButton');
    const stopButton = document.getElementById('stopPageButton');
    const status = document.getElementById('speechStatus');

    function setStatus(message) {
      if (status) status.textContent = message;
    }

    if (readButton) {
      readButton.addEventListener('click', () => {
        if (!('speechSynthesis' in window)) {
          setStatus('Read aloud is not supported by this browser.');
          return;
        }
        window.speechSynthesis.cancel();
        const content = document.querySelector('main');
        const utterance = new SpeechSynthesisUtterance(content ? content.innerText : document.body.innerText);
        utterance.rate = 0.9;
        utterance.onend = () => setStatus('Finished reading the page.');
        utterance.onerror = () => setStatus('The browser could not read this page.');
        window.speechSynthesis.speak(utterance);
        setStatus('Reading started.');
      });
    }

    if (pauseButton) {
      pauseButton.addEventListener('click', () => {
        if (!('speechSynthesis' in window)) {
          setStatus('Read aloud is not supported by this browser.');
        } else if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
          setStatus('Reading resumed.');
        } else if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          setStatus('Reading paused.');
        } else {
          setStatus('There is no reading in progress.');
        }
      });
    }

    if (stopButton) {
      stopButton.addEventListener('click', () => {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        setStatus('Reading stopped.');
      });
    }

    const easyReadToggle = document.getElementById('easyReadQuickToggle');
    const easyReadPreference = document.querySelector('input[name="easy_read"]');
    const quickAccessMessage = document.getElementById('quickAccessMessage');
    if (easyReadToggle && easyReadPreference) {
      easyReadToggle.addEventListener('click', () => {
        easyReadPreference.checked = !easyReadPreference.checked;
        previewPreferences();
        quickAccessMessage.textContent = 'Preview changed. Save preferences to keep this setting on every page.';
      });
    }

    const normalButton = document.getElementById('normalPreferences');
    const preferencesForm = normalButton && normalButton.form;
    if (normalButton && preferencesForm) {
      normalButton.addEventListener('click', () => {
        preferencesForm.querySelectorAll('input[type="checkbox"]').forEach(input => {
          input.checked = false;
        });
        const textScale = preferencesForm.elements.namedItem('text_scale');
        textScale.value = '100';
        const scaleOutput = document.getElementById('scaleOutput');
        if (scaleOutput) scaleOutput.value = '100%';
        apply({});
        const easyReadButton = document.getElementById('easyReadQuickToggle');
        if (easyReadButton) {
          easyReadButton.setAttribute('aria-pressed', 'false');
          easyReadButton.textContent = 'Turn on Easy Read preview';
        }
        if (quickAccessMessage) quickAccessMessage.textContent = 'Normal settings selected. Save preferences to apply them across all pages.';
      });
    }
  }

  initializeQuickAccess();
  return { apply };
})();
