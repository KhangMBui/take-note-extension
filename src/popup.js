console.log("Popup loaded!");

document.addEventListener("DOMContentLoaded", async () => {
  const noteInput = document.getElementById("editor");
  const saveButton = document.getElementById("saveNote");

  // Get the current active tab's URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab.url; // Use the full URL to specify the note for each page/route

  // Load saved note (if any) for the current website
  chrome.storage.sync.get([url], (result) => {
    if (result[url]) {
      noteInput.innerHTML = result[url]; // Set the saved HTML content in the editor
      console.log(`Loaded note for ${url}:`, result[url]);
    } else {
      console.log(`No note found for ${url}`);
    }
  });

  // Save the note when the save button is clicked
  saveButton.addEventListener("click", () => {
    const note = noteInput.innerHTML; // Get the HTML content from the editor

    // Save the note in Chrome's sync storage
    chrome.storage.sync.set({ [url]: note }, () => {
      alert(`Note saved for ${url}:`, note);
      console.log(`Note saved for ${url}:`, note);
    });
  });
});
