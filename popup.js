const positiveInput = document.getElementById("positive");
const negativeInput = document.getElementById("negative");


// Load saved searches
chrome.storage.sync.get(["positive", "negative"], (data) => {
    if (data.positive) positiveInput.value = data.positive;
    if (data.negative) negativeInput.value = data.negative;
});


// Save searches


document.getElementById("save").addEventListener("click", () => {
    chrome.storage.sync.set({
        positive: positiveInput.value,
        negative: negativeInput.value
    });
});


// Run search


document.getElementById("search").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });


    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
    });


    chrome.tabs.sendMessage(tab.id, {
        positive: positiveInput.value,
        negative: negativeInput.value
    });
});