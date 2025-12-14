chrome.commands.onCommand.addListener(async (command) => {
    if (command !== "run-search") return;


    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;


    chrome.storage.sync.get(["positive", "negative"], (data) => {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"]
        });


        chrome.tabs.sendMessage(tab.id, {
            positive: data.positive || "",
            negative: data.negative || ""
        });

        // chrome.scripting.executeScript({
        //     target: { tabId: tab.id },
        //     files: ["content.js"]
        // }).then(() => {
        //     chrome.tabs.sendMessage(tab.id, {
        //         positive: positiveInput.value,
        //         negative: negativeInput.value
        //     });
        // });
    });

});