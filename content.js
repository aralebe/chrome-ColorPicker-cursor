// 監聽來自background script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'colorSelected') {
        // 顯示選擇的顏色
        console.log('Selected color:', message.color);
    }

    if (message.action === "startColorPicker") {
        // 開始顏色選擇
        startColorPicker();
    }
});

// 創建顏色預覽視窗
function createColorPreview(color) {
    // 移除已存在的預覽視窗
    const existingPreview = document.getElementById('color-preview-window');
    if (existingPreview) {
        existingPreview.remove();
    }

    // 創建新的預覽視窗
    const preview = document.createElement('div');
    preview.id = 'color-preview-window';
    preview.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: ${color};
        color: ${getContrastColor(color)};
        padding: 15px 20px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease-in-out;
    `;

    // 添加顏色代碼
    const colorText = document.createElement('span');
    colorText.textContent = color;
    preview.appendChild(colorText);

    // 添加複製按鈕
    const copyButton = document.createElement('button');
    copyButton.textContent = '複製';
    copyButton.style.cssText = `
        background: transparent;
        border: 1px solid ${getContrastColor(color)};
        color: ${getContrastColor(color)};
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
    `;

    copyButton.onmouseover = () => {
        copyButton.style.background = getContrastColor(color);
        copyButton.style.color = color;
    };

    copyButton.onmouseout = () => {
        copyButton.style.background = 'transparent';
        copyButton.style.color = getContrastColor(color);
    };

    copyButton.onclick = async () => {
        await navigator.clipboard.writeText(color);
        copyButton.textContent = '已複製！';
        setTimeout(() => {
            copyButton.textContent = '複製';
        }, 2000);
    };

    preview.appendChild(copyButton);

    // 添加關閉按鈕
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.cssText = `
        background: transparent;
        border: none;
        color: ${getContrastColor(color)};
        font-size: 20px;
        cursor: pointer;
        padding: 0 5px;
        line-height: 1;
    `;

    closeButton.onclick = () => {
        preview.style.animation = 'fadeOut 0.2s ease-in-out';

        // 設置動畫結束後再刪除元素
        preview.addEventListener('animationend', () => {
            preview.remove();
        });
    };


    preview.appendChild(closeButton);

    // 添加動畫樣式，如果還沒被添加過
    if (!document.getElementById('color-preview-animations')) {
        const style = document.createElement('style');
        style.id = 'color-preview-animations';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(preview);

    // 3秒後自動關閉
    setTimeout(() => {
        if (preview.parentElement) {
            preview.style.animation = 'slideOut 0.4s ease-in-out';
            setTimeout(() => {
                if (preview.parentElement) {
                    preview.remove();
                }
            }, 300);
        }
    }, 3000);
}

// 計算對比色（白色或黑色）
function getContrastColor(hexcolor) {
    const r = parseInt(hexcolor.slice(1, 3), 16);
    const g = parseInt(hexcolor.slice(3, 5), 16);
    const b = parseInt(hexcolor.slice(5, 7), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#ffffff';
}

// 顏色選擇器功能
async function startColorPicker() {
    try {
        // 檢查是否支持 EyeDropper API
        if (!window.EyeDropper) {
            console.error('EyeDropper API not supported');
            alert('您的瀏覽器不支持 EyeDropper API');
            return;
        }

        // 確保在用戶交互後調用
        const eyeDropper = new EyeDropper();

        // 確保每次都是新的選擇
        const result = await eyeDropper.open();

        if (result && result.sRGBHex) {
            // 顯示顏色預覽視窗
            createColorPreview(result.sRGBHex);
        } else {
            console.error('No color selected');
            alert('未能獲取顏色值');
        }
    } catch (error) {
        console.error('Error details:', error);
        if (error.name === 'AbortError') {
            // 用戶取消選擇，不需要顯示錯誤
            return;
        }

    }
}
