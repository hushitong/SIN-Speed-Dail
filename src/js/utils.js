import { state } from "./state.js";
import { animate } from "./ui.js";
import { getData, saveData } from "./data.js";

let translations = {}; // 缓存翻译
export async function apply_i18n(locale) {
    translations = await loadTranslations(locale);
    document.querySelectorAll("[data-locale]").forEach(elem => {
        if (translations[elem.dataset.locale])
            elem.textContent = translations[elem.dataset.locale].message;
    });
}
async function loadTranslations(locale) {
    try {
        const url = chrome.runtime.getURL(`_locales/${locale}/messages.json`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('加载翻译失败');
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        // 回退到默认语言，例如 'en'
        return await loadTranslations('en');
    }
}

// 程序化设置输入框（如颜色选择器）的值，并触发input事件。
export function setInputValue(inputElement, value) {
    inputElement.value = value;
    inputElement.dispatchEvent(new Event('input'));
}

// 读取文件内容并解析为 JSON
export function parseJson(event) {
    return JSON.parse(event.target.result);
}

// 生成唯一ID
export function generateId() {
    return crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
}

// 访问某个书签，更新其访问次数
export function visitAddOne(id) {
    getData(['bookmarks']).then(data => {
        let bookmarks = data.bookmarks || [];
        let bookmark = bookmarks.find(b => b.id === id);
        if (bookmark) {
            bookmark.visits = (bookmark.visits || 0) + 1;
            saveData({ bookmarks });
        }
    });
}

// 根据屏幕高度调整背景图片大小，并返回处理后的图片 DataURI。
export function resizeBackground(dataURI) {
    return new Promise(function (resolve, reject) {
        let img = new Image();
        img.onload = function () {
            if (this.height > screen.height) {
                let height = screen.height;
                let ratio = height / this.height;
                let width = Math.round(this.width * ratio);

                let canvas = document.createElement('canvas');
                let ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.imageSmoothingEnabled = true;

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(this, 0, 0, width, height);

                // todo: remove this whenever firefox supports webp. in meantime we fallback to jpg for speed
                if (chrome.runtime.getBrowserInfo) {
                    const newDataURI = canvas.toDataURL('image/jpeg', 0.8);
                    resolve(newDataURI);
                } else {
                    const newDataURI = canvas.toDataURL('image/webp', 0.87);
                    resolve(newDataURI);
                }
            } else {
                resolve(dataURI);
            }
        };
        img.src = dataURI;
    })
}

// 根据搜索词过滤书签，显示匹配项并隐藏不匹配项
export function filterDials(searchTerm) {
    const currentGroupId = state.currentGroupId;
    const bookmarks = document.querySelectorAll(`[id="${currentGroupId}"] > .tile`);

    bookmarks.forEach(dial => {
        if (!state.settings.showAddSiteBtn && dial.classList.contains('createDial')) {
            // dont show the create dial button
            return;
        }

        const title = dial.querySelector('.tile-title')?.textContent.toLowerCase();
        const url = dial.href.toLowerCase();

        if (title && title.includes(searchTerm) || url.includes(searchTerm)) {
            // Fade-in and scale-up for matching thumbnails
            TweenMax.to(dial, 0.3, {
                opacity: 1,
                scale: 1,
                display: 'block',
                ease: Power2.easeOut
            });
        } else {
            // Fade-out and scale-down for non-matching thumbnails
            TweenMax.to(dial, 0.3, {
                opacity: 0,
                scale: 0.8,
                display: 'none',
                ease: Power2.easeIn
            });
        }
    });

    // Recalculate layout after filtering
    animate();
}

// 计算图片的背景色，返回 RGBA 数组（[r, g, b, a]）。
// todo: duped in offscreen logic; punt this to a worker
export function getBgColor(img) {
    let imgWidth = img.naturalWidth;
    let imgHeight = img.naturalHeight;
    let canvas = offscreenCanvasShim(imgWidth, imgHeight);
    let context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(img, 0, 0);

    let totalPixels = 0;
    let avgColor = [0, 0, 0, 0];
    let colorCounts = {};
    let hasTransparentPixel = false;

    // background color algorithm
    // think the results are best when sampling 2 pixels deep from the edges
    // 1px gives bad results from image artifacts, more than 2px means we average away any natural framing/background in the image

    // Sample the top and bottom edges
    for (let x = 0; x < imgWidth; x += 2) { // Sample every other pixel
        for (let y = 0; y < 2; y++) {
            let pixelTop = context.getImageData(x, y, 1, 1).data;
            let pixelBottom = context.getImageData(x, imgHeight - 1 - y, 1, 1).data;
            let colorKeyTop = `${pixelTop[0]},${pixelTop[1]},${pixelTop[2]},${pixelTop[3]}`;
            let colorKeyBottom = `${pixelBottom[0]},${pixelBottom[1]},${pixelBottom[2]},${pixelBottom[3]}`;
            colorCounts[colorKeyTop] = (colorCounts[colorKeyTop] || 0) + 1;
            colorCounts[colorKeyBottom] = (colorCounts[colorKeyBottom] || 0) + 1;
            avgColor[0] += pixelTop[0] + pixelBottom[0];
            avgColor[1] += pixelTop[1] + pixelBottom[1];
            avgColor[2] += pixelTop[2] + pixelBottom[2];
            avgColor[3] += pixelTop[3] + pixelBottom[3];
            totalPixels += 2;
            if (pixelTop[3] < 255 || pixelBottom[3] < 255) {
                hasTransparentPixel = true;
            }
        }
    }

    // Sample the left and right edges
    for (let y = 2; y < imgHeight - 2; y += 2) { // Sample every other pixel
        for (let x = 0; x < 2; x++) {
            let pixelLeft = context.getImageData(x, y, 1, 1).data;
            let pixelRight = context.getImageData(imgWidth - 1 - x, y, 1, 1).data;
            let colorKeyLeft = `${pixelLeft[0]},${pixelLeft[1]},${pixelLeft[2]},${pixelLeft[3]}`;
            let colorKeyRight = `${pixelRight[0]},${pixelRight[1]},${pixelRight[2]},${pixelRight[3]}`;
            colorCounts[colorKeyLeft] = (colorCounts[colorKeyLeft] || 0) + 1;
            colorCounts[colorKeyRight] = (colorCounts[colorKeyRight] || 0) + 1;
            avgColor[0] += pixelLeft[0] + pixelRight[0];
            avgColor[1] += pixelLeft[1] + pixelRight[1];
            avgColor[2] += pixelLeft[2] + pixelRight[2];
            avgColor[3] += pixelLeft[3] + pixelRight[3];
            totalPixels += 2;
            if (pixelLeft[3] < 255 || pixelRight[3] < 255) {
                hasTransparentPixel = true;
            }
        }
    }

    avgColor = avgColor.map(color => color / totalPixels);
    avgColor[3] = avgColor[3] / 255; // Normalize alpha value

    let mostCommonColor = null;
    let maxCount = 0;
    for (let colorKey in colorCounts) {
        let color = colorKey.split(',').map(Number);
        let similarColorKey = Object.keys(colorCounts).find(key => {
            let keyColor = key.split(',').map(Number);
            return colorsAreSimilar(color, keyColor);
        });

        if (similarColorKey && similarColorKey !== colorKey) {
            colorCounts[similarColorKey] += colorCounts[colorKey];
            delete colorCounts[colorKey];
        }

        if (colorCounts[similarColorKey || colorKey] > maxCount) {
            maxCount = colorCounts[similarColorKey || colorKey];
            mostCommonColor = color;
        }
    }

    if (maxCount > totalPixels / 2) {
        mostCommonColor[3] = mostCommonColor[3] / 255; // Normalize alpha value
        return [mostCommonColor[0], mostCommonColor[1], mostCommonColor[2], mostCommonColor[3]];

    } else {
        if (hasTransparentPixel) {
            avgColor[3] = 0; // Make the gradient transparent if any pixel is transparent
        }
        return [avgColor[0], avgColor[1], avgColor[2], avgColor[3]];
    }
}

// 创建画布（canvas）的兼容层，优先使用OffscreenCanvas（性能更优），不支持时降级为普通canvas。
function offscreenCanvasShim(w, h) {
    try {
        return new OffscreenCanvas(w, h);
    } catch (err) {
        // offscreencanvas not supported in ff
        let canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        return canvas;
    }
}

// 判断两个颜色是否相似。
function colorsAreSimilar(color1, color2, tolerance = 2) {
    return Math.abs(color1[0] - color2[0]) <= tolerance &&
        Math.abs(color1[1] - color2[1]) <= tolerance &&
        Math.abs(color1[2] - color2[2]) <= tolerance &&
        Math.abs(color1[3] - color2[3]) <= tolerance;
}

// 将 RGB 数组（[r, g, b]）转换为十六进制颜色字符串（如#ffffff）。
export function rgbToHex(rgbArray) {
    // todo: support alpha value
    // Convert RGB values to hex color
    let r = Math.round(rgbArray[0]);
    let g = Math.round(rgbArray[1]);
    let b = Math.round(rgbArray[2]);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// 将十六进制颜色字符串（如#ffffff）转换为 RGBA 数组（[r, g, b, a]）。
function hexToRgba(hex) {
    // Convert hex color to RGBA values
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    let a = 1; // Default alpha value
    return [r, g, b, a];
}

// 将十六进制颜色转换为 CSS 渐变字符串（本质为纯色渐变）。
export function hexToCssGradient(hex) {
    // Convert hex color to CSS gradient string
    let rgba = hexToRgba(hex);
    return rgbaToCssGradient(rgba);
}

// 将 RGBA 数组转换为 CSS 渐变字符串（本质为纯色渐变）。
export function rgbaToCssGradient(rgba) {
    // Convert RGBA values to CSS gradient string
    // gradient is used as a shortcut to set the background color at same time as image
    return `linear-gradient(to bottom, rgba(${rgba[0]},${rgba[1]},${rgba[2]},${rgba[3]}) 50%, rgba(${rgba[0]},${rgba[1]},${rgba[2]},${rgba[3]}) 50%)`;
}

// 从 CSS 渐变字符串中提取 RGBA 值，返回 RGBA 数组。
export function cssGradientToHex(gradientString) {
    // css string is in format: 'linear-gradient(to bottom, rgba(255,255,255,1) 50%, rgba(0,0,0,1) 50%)'
    const rgbaString = gradientString.split('rgba(')[1].split(')')[0];
    const [r, g, b, a] = rgbaString.split(',').map(Number);
    return [r, g, b, a];
}