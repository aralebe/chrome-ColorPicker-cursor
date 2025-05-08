chrome.action.onClicked.addListener(async (tab) => {
    try {
        // 在當前標籤頁執行顏色選擇器
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
        });

        // 發送消息給content script來啟動顏色選擇器
        chrome.tabs.sendMessage(tab.id, { action: "startColorPicker" });
    } catch (error) {
        console.error('Error:', error);
    }
});

