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

// 統一的顏色處理工具對象
const ColorUtil = {
    // 從各種格式轉換為RGB格式
    parseColor: function (color) {
        // 創建臨時元素來計算顏色
        const tempEl = document.createElement('div');
        tempEl.style.color = color;
        tempEl.style.display = 'none';
        document.body.appendChild(tempEl);

        // 獲取計算後的顏色 (總是返回rgb/rgba格式)
        const computedColor = window.getComputedStyle(tempEl).color;
        document.body.removeChild(tempEl);

        return computedColor;
    },

    // 從RGB/RGBA轉換為十六進制
    rgbToHex: function (rgb) {
        // 提取數字
        const values = rgb.match(/\d+/g);
        if (!values || values.length < 3) return '#000000';

        // 轉換前3個值 (r,g,b) 為十六進制
        return '#' + values.slice(0, 3).map(x => {
            const hex = parseInt(x).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    },

    // 獲取真實的元素背景顏色（處理透明背景）
    getElementBackgroundColor: function (element) {
        let el = element;
        let bgColor = window.getComputedStyle(el).backgroundColor;

        // 如果背景是透明的，向上查找父元素直到找到非透明背景
        while ((bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') &&
            el.parentElement &&
            el !== document.documentElement) {
            el = el.parentElement;
            bgColor = window.getComputedStyle(el).backgroundColor;
        }

        // 如果所有元素都是透明的，返回白色作為默認值
        if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
            return 'rgb(255, 255, 255)';
        }

        return bgColor;
    },

    // 獲取顏色的所有格式
    getColorFormats: function (colorValue) {
        // 首先確保我們有RGB格式
        const rgbColor = this.parseColor(colorValue);

        // 提取RGB值
        const rgbValues = rgbColor.match(/\d+/g);
        if (!rgbValues) return {
            hex: '#000000',
            rgb: 'rgb(0, 0, 0)',
            rgba: 'rgba(0, 0, 0, 1)'
        };

        // 構建各種格式
        const hex = this.rgbToHex(rgbColor);

        // 根據是RGB還是RGBA構建適當的字符串
        let rgb, rgba;
        if (rgbValues.length >= 4) {
            // 已經是RGBA
            rgba = rgbColor;
            rgb = `rgb(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]})`;
        } else {
            // 是RGB
            rgb = rgbColor;
            rgba = `rgba(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]}, 1)`;
        }

        return { hex, rgb, rgba };
    },

    // 計算對比色（白色或黑色）- 優化版本
    getContrastColor: function (color) {
        // 確保我們使用RGB值進行計算
        const rgbColor = this.parseColor(color);
        const values = rgbColor.match(/\d+/g);

        if (!values || values.length < 3) return '#ffffff';

        const r = parseInt(values[0]);
        const g = parseInt(values[1]);
        const b = parseInt(values[2]);

        // 使用亮度公式計算對比色
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness >= 128 ? '#000000' : '#ffffff';
    }
};

// 顏色選擇器功能 (原始鼠標懸停版本)
function startColorPickerMouse() {
    let isPickerActive = true;
    let originalCursor = document.body.style.cursor;
    document.body.style.cursor = 'crosshair';

    function handleMouseOver(e) {
        if (!isPickerActive) return;
        e.preventDefault();
        e.stopPropagation();

        // 獲取真實的背景顏色並轉換格式
        const bgColor = ColorUtil.getElementBackgroundColor(e.target);
        const colorFormats = ColorUtil.getColorFormats(bgColor);

        // 創建或更新提示元素
        let tooltip = document.getElementById('color-picker-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'color-picker-tooltip';
            tooltip.style.cssText = `
                position: fixed;
                background: white;
                border: 1px solid #ccc;
                padding: 8px 12px;
                border-radius: 4px;
                font-family: monospace;
                z-index: 10000;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                display: flex;
                flex-direction: column;
                gap: 4px;
            `;
            document.body.appendChild(tooltip);
        }

        // 更新提示內容，增加顏色預覽和多種格式
        tooltip.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 20px; height: 20px; background-color: ${colorFormats.hex}; border: 1px solid #ccc;"></div>
                <span>${colorFormats.hex}</span>
            </div>
            <div>${colorFormats.rgb}</div>
        `;

        tooltip.style.left = (e.pageX + 10) + 'px';
        tooltip.style.top = (e.pageY + 10) + 'px';
    }

    function handleClick(e) {
        if (!isPickerActive) return;
        e.preventDefault();
        e.stopPropagation();

        // 獲取真實的背景顏色並轉換格式
        const bgColor = ColorUtil.getElementBackgroundColor(e.target);
        const colorFormats = ColorUtil.getColorFormats(bgColor);

        // 顯示顏色預覽視窗
        createColorPreview(colorFormats.hex);

        // 清理
        isPickerActive = false;
        document.body.style.cursor = originalCursor;
        const tooltip = document.getElementById('color-picker-tooltip');
        if (tooltip) tooltip.remove();

        document.removeEventListener('mouseover', handleMouseOver);
        document.removeEventListener('click', handleClick);
        document.removeEventListener('keydown', handleKeyDown);
    }

    // 添加ESC鍵退出功能
    function handleKeyDown(e) {
        if (e.key === 'Escape') {
            isPickerActive = false;
            document.body.style.cursor = originalCursor;
            const tooltip = document.getElementById('color-picker-tooltip');
            if (tooltip) tooltip.remove();

            document.removeEventListener('mouseover', handleMouseOver);
            document.removeEventListener('click', handleClick);
            document.removeEventListener('keydown', handleKeyDown);
        }
    }

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);

    // 顯示啟動提示
    const startMsg = document.createElement('div');
    startMsg.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #2196F3;
        color: white;
        padding: 10px 20px;
        border-radius: 4px;
        font-family: sans-serif;
        z-index: 10001;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    startMsg.textContent = '顏色選擇器已啟動，點擊任意元素選取顏色，或按ESC取消';
    document.body.appendChild(startMsg);

    // 2秒後移除啟動提示
    setTimeout(() => {
        if (startMsg.parentNode) {
            startMsg.parentNode.removeChild(startMsg);
        }
    }, 2000);
}

// 創建顏色預覽視窗
function createColorPreview(color) {
    // 確保顏色是有效的十六進制格式
    if (!color.startsWith('#')) {
        color = ColorUtil.getColorFormats(color).hex;
    }

    // 獲取對比色以確保文字可讀性
    const contrastColor = ColorUtil.getContrastColor(color);

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
        color: ${contrastColor};
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

    // 獲取所有顏色格式
    const formats = ColorUtil.getColorFormats(color);

    // 創建顏色信息容器
    const colorInfo = document.createElement('div');
    colorInfo.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 5px;
    `;

    // 添加各種顏色格式
    colorInfo.innerHTML = `
        <div><strong>HEX:</strong> ${formats.hex}</div>
        <div><strong>RGB:</strong> ${formats.rgb}</div>
    `;

    preview.appendChild(colorInfo);

    // 添加複製按鈕
    const copyButton = document.createElement('button');
    copyButton.textContent = '複製';
    copyButton.style.cssText = `
        background: transparent;
        border: 1px solid ${contrastColor};
        color: ${contrastColor};
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
    `;

    copyButton.onmouseover = () => {
        copyButton.style.background = contrastColor;
        copyButton.style.color = color;
    };

    copyButton.onmouseout = () => {
        copyButton.style.background = 'transparent';
        copyButton.style.color = contrastColor;
    };

    copyButton.onclick = async () => {
        try {
            await navigator.clipboard.writeText(formats.hex);
            copyButton.textContent = '已複製！';
            setTimeout(() => {
                copyButton.textContent = '複製';
            }, 2000);
        } catch (err) {
            console.error('無法複製到剪貼板:', err);
        }
    };

    preview.appendChild(copyButton);

    // 添加關閉按鈕
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.cssText = `
        background: transparent;
        border: none;
        color: ${contrastColor};
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

// 顏色選擇器功能 (EyeDropper API版本)
async function startColorPicker() {
    try {
        // 檢查是否支持 EyeDropper API
        if (window.EyeDropper) {
            // 確保每次都是新的選擇
            const eyeDropper = new EyeDropper();
            const result = await eyeDropper.open();

            if (result && result.sRGBHex) {
                // 顯示顏色預覽視窗
                createColorPreview(result.sRGBHex);
            } else {
                console.error('No color selected');
                alert('未能獲取顏色值');
            }
        } else {
            console.log('EyeDropper API not supported, falling back to mouse picker');
            // 如果不支持EyeDropper，退回到鼠標選擇器版本
            startColorPickerMouse();
        }
    } catch (error) {
        console.error('Error details:', error);
        if (error.name === 'AbortError') {
            // 用戶取消選擇，不需要顯示錯誤
            return;
        }

        // 如果EyeDropper出錯，退回到鼠標選擇器版本
        console.log('EyeDropper failed, falling back to mouse picker');
        startColorPickerMouse();
    }
}