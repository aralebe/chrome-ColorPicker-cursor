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

// 顏色選擇器功能
function startColorPicker() {
    let isPickerActive = true;
    let originalCursor = document.body.style.cursor;
    document.body.style.cursor = 'crosshair';

    function handleMouseOver(e) {
        if (!isPickerActive) return;
        e.preventDefault();
        e.stopPropagation();

        const color = window.getComputedStyle(e.target).backgroundColor;
        const rgbToHex = (rgb) => {
            const values = rgb.match(/\d+/g);
            if (!values) return '#000000';
            return '#' + values.map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
        };

        const hexColor = rgbToHex(color);
        // 創建或更新提示元素
        let tooltip = document.getElementById('color-picker-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'color-picker-tooltip';
            tooltip.style.cssText = `
                position: fixed;
                background: white;
                border: 1px solid #ccc;
                padding: 5px 10px;
                border-radius: 4px;
                font-family: monospace;
                z-index: 10000;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            `;
            document.body.appendChild(tooltip);
        }
        tooltip.textContent = hexColor;
        tooltip.style.left = (e.pageX + 10) + 'px';
        tooltip.style.top = (e.pageY + 10) + 'px';
    }

    function handleClick(e) {
        if (!isPickerActive) return;
        e.preventDefault();
        e.stopPropagation();

        const color = window.getComputedStyle(e.target).backgroundColor;
        const rgbToHex = (rgb) => {
            const values = rgb.match(/\d+/g);
            if (!values) return '#000000';
            return '#' + values.map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
        };



        // 清理
        isPickerActive = false;
        document.body.style.cursor = originalCursor;
        const tooltip = document.getElementById('color-picker-tooltip');
        if (tooltip) tooltip.remove();

        document.removeEventListener('mouseover', handleMouseOver);
        document.removeEventListener('click', handleClick);
    }

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('click', handleClick);
} 