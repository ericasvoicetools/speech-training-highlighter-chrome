// Saves options to chrome.storage
const saveOptions = () => {
    const settings = {};
    for (const element of document.getElementsByClassName("color-setting")) {
        settings[element.id] = element.value;
    }
  
    chrome.storage.sync.set(
      settings,
      () => {
        // Update status to let user know options were saved.
        const status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(() => {
          status.textContent = '';
        }, 750);
      }
    );
  };
  
  // Restores select box and checkbox state using the preferences
  // stored in chrome.storage.
  const restoreOptions = () => {
    chrome.storage.sync.get(
        {
            "dark-vowel": "#ff0000",
            "medium-vowel": "#8B0000",
            "dark-voiced-consonant": "#0080FF",
            "nasal-consonant": "#DAA520",
            "approximant": "#9ACD32"
        },
      (items) => {
        for (const [key, value] of Object.entries(items)) {
            document.getElementById(key).value = value;
        }
      }
    );
  };
  
  document.addEventListener('DOMContentLoaded', restoreOptions);
  document.getElementById('save').addEventListener('click', saveOptions);
