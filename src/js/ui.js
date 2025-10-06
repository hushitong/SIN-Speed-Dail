import { DOM } from "./dom.js";
import { state } from "./state.js";
import { getData, saveData } from "./data.js";
import { buildGroupsLinks, buildGroupLink } from "./groups.js";
import { buildBookmarksByGroupId } from "./bookmarks.js";
import { resizeBackground } from "./utils.js";

let windowSize = null;  // 设计用于存储窗口大小信息?
let isToastVisible = false; // 标记提示框（toast）是否可见
let containerSize = null;   // 设计用于存储容器（如书签容器）的尺寸信息
let boxes = [];

// 建立整个书签页面，包括 分组标题列表 和 书签内容列表
export async function buildGroupsAndBookmarksPages(selectedGroupId) {
    // 获得 bookmarks 和 groups 数据
    state.data = await getData(['groups', 'bookmarks']);
    console.log("buildPages state.data", state.data, "selectedGroupId", selectedGroupId);
    const groups = state.data.groups;

    // 如果没有任何分组，添加一个主页分组
    if (groups.length === 0) {
        groups.unshift(state.homeGroup);
        await saveData({ groups }).then(() => {
            console.log("No groups found, added home group");
            state.data.groups = groups;
        });
    }
    // 如果只有home分组然后没有书签，则显示初始设置界面
    if (groups.length === 1 && state.data.bookmarks.length === 0) {
        DOM.addGroupButton.style.display = 'none';
        printNewSetupPage();
        return;
    }

    if (groups.length > 1)
        groups.sort((a, b) => (a.position || 0) - (b.position || 0));

    // 清空原有的分组头内容
    DOM.groupsContainer.innerHTML = '';
    // 重新生成所有分组链接
    buildGroupsLinks(groups);

    // 根据当前选择的分组ID，显示对应的分组书签内容
    const currentGroupBookmarks = state.data.bookmarks.filter(b => b.groupId === selectedGroupId);
    await buildBookmarksByGroupId(currentGroupBookmarks, selectedGroupId);

    // 激活被选择的分组，隐藏没被选择分组
    activeBookmarksContainer(selectedGroupId);
}

// 激活指定分组的书签容器，隐藏其他分组的书签容器
export function activeBookmarksContainer(groupId) {
    let bookmorksContainer = document.getElementById('tileContainer').getElementsByClassName('container');
    console.log("activeBookmorksContainer groupId:", groupId, "bookmorksContainer", bookmorksContainer);
    Array.from(bookmorksContainer).forEach(item => {
        if (item.id === groupId) {
            item.style.display = "flex"
            setTimeout(() => {
                item.style.opacity = "1";
                animate();
            }, 20);
        } else {
            item.style.display = "none";
            setTimeout(() => {
                item.style.opacity = "0";
                animate();
            }, 20);
        }
    });
}

// 没有任何书签时，显示初始界面
export async function printNewSetupPage() {
    let fragment = document.createDocumentFragment();

    let groupContainerEl = document.getElementById(state.currentGroupId);
    if (!groupContainerEl) {
        groupContainerEl = document.createElement('div');
        groupContainerEl.id = state.currentGroupId;
        groupContainerEl.classList.add('container');
        groupContainerEl.style.display = 'flex';
        groupContainerEl.style.opacity = "0";

        setTimeout(() => {
            groupContainerEl.style.opacity = "1";
            animate();
        }, 20);
        document.querySelector(`[groupid="${state.currentGroupId}"]`)?.classList.add('activegroup');
        DOM.bookmarksContainerParent.append(groupContainerEl);
    }

    const noBookmarksDiv = document.createElement('div');
    noBookmarksDiv.className = 'default-content';
    noBookmarksDiv.id = 'noBookmarks';
    noBookmarksDiv.innerHTML = `
        <h1 class="default-content" data-locale="newInstall1">${chrome.i18n.getMessage('newInstall1')}</h1>
        <p class="default-content helpText" data-locale="newInstall2">${chrome.i18n.getMessage('newInstall2')}</p>
        <p class="default-content helpText" data-locale="newInstall3">${chrome.i18n.getMessage('newInstall3')}</p>
        <p class="default-content helpText" data-locale="newInstall4">${chrome.i18n.getMessage('newInstall4')}</p>
        <div class="cta-container">
        <p id="splashImport" class="default-content helpText cta" >
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M260-160q-91 0-155.5-63T40-377q0-78 47-139t123-78q25-92 100-149t170-57q117 0 198.5 81.5T760-520q69 8 114.5 59.5T920-340q0 75-52.5 127.5T740-160H520q-33 0-56.5-23.5T440-240v-206l-64 62-56-56 160-160 160 160-56 56-64-62v206h220q42 0 71-29t29-71q0-42-29-71t-71-29h-60v-80q0-83-58.5-141.5T480-720q-83 0-141.5 58.5T280-520h-20q-58 0-99 41t-41 99q0 58 41 99t99 41h100v80H260Zm220-280Z"/></svg>
            Import
        </p>
        <p id="splashAddDial" class="default-content helpText cta" >
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>
        Add Site
        </p>
        </div>
    `;
    fragment.appendChild(noBookmarksDiv);

    // Optimize container update using batch insert
    groupContainerEl.textContent = ''; // Clears old content efficiently
    groupContainerEl.append(fragment);

    DOM.bookmarksContainerParent.scrollTop = state.scrollPos;
}

// 显示自定义右键菜单
export function showContextMenu(el, top, left) {
    if ((document.body.clientWidth - left) < (el.clientWidth + 30)) {
        el.style.left = (left - el.clientWidth) + 'px';
    } else {
        el.style.left = left + 'px';
    }
    if ((document.body.clientHeight - top) < (el.clientHeight + 30)) {
        el.style.top = (top - el.clientHeight) + 'px';
    } else {
        el.style.top = top + 'px';
    }
    el.style.visibility = "visible";
    el.style.opacity = "1";
}

// 隐藏自定义右键菜单
export function hideMenus() {
    let menus = [DOM.menu, DOM.settingsMenu, DOM.groupMenu]
    for (let el of menus) {
        el.style.visibility = "hidden";
        el.style.opacity = "0";
    }
}

// 显示设定页
export function openSettings() {
    DOM.sidenav.style.boxShadow = "0px 2px 8px 0px rgba(0,0,0,0.5)";
    DOM.sidenav.style.transform = "translateX(0%)";
}

// 隐藏设定页
export function hideSettings() {
    DOM.sidenav.style.transform = "translateX(100%)";
    DOM.sidenav.style.boxShadow = "none";
}

// 抖动
export const debounce = (func, delay = 500, immediate = false) => {
    let inDebounce
    return function () {
        const context = this
        const args = arguments
        if (immediate && !inDebounce) {
            func.apply(context, args);
            inDebounce = setTimeout(() => clearTimeout(inDebounce), delay)
        } else {
            clearTimeout(inDebounce)
            inDebounce = setTimeout(() => func.apply(context, args), delay)
        }
    }
}

export const animate = debounce(() => {
    requestAnimationFrame(() => { // Use requestAnimationFrame for smoother updates
        const nodes = document.querySelectorAll(`[id="${state.currentGroupId}"] > .tile`);
        const total = nodes.length;

        if (!nodes.length) return;
        TweenMax.set(nodes, { lazy: false, x: "+=0" }); // maybe lazy doesnt help, cant tell

        const nodePositions = [];
        for (let i = 0; i < total; i++) {
            let node = nodes[i];
            nodePositions.push({
                node,
                transform: node._gsTransform,
                x: node.offsetLeft,
                y: node.offsetTop
            });
        }

        for (let i = 0; i < total; i++) {
            boxes[i] = nodePositions[i];
        }

        layout();

    });
}, 300)

// 进行页面刷新
export const processRefresh = debounce(({ groupsOnly = false, currentGroupId = state.currentGroupId } = {}) => {
    console.log("processRefresh start: processRefresh ", groupsOnly, " currentGroupId", currentGroupId);
    if (groupsOnly) {
        reBuildGroupPages()
    } else {
        // prevent page scroll on refresh
        // react where are you...
        state.scrollPos = DOM.bookmarksContainerParent.scrollTop;
        //noBookmarks.style.display = 'none';
        DOM.addGroupButton.style.display = 'inline';

        //bookmarksContainer.style.opacity = "0";

        buildGroupsAndBookmarksPages(currentGroupId);
        // buildPages(currentGroupId)
    }
}, 650, true);

// // 根据设置设定界面样式
// export function applySettings(settings = null, wallpaperSrc = null, wallpaperCheckboxChanged = false, wallpaperSrcChanged = false) {
//     console.log("applySettings settings: ", settings);

//     return new Promise(function (resolve, reject) {
//         DOM.settingsBtn.style.setProperty('--settings', 'block');

//         // 提前确定 Promise 的最终状态为 fulfilled，然后继续执行下面代码（后面代码通常是比较耗时且不会影响最终结果的）
//         // 能使调用方提前知道结果执行后面代码
//         resolve();

//         // setDOM(settings);
//     });
// };

// 页面初始化使用，根据设置设定界面样式
export function initSettings(settings, wallpaperSrc) {
    console.log("initSettings settings: ", settings);

    return new Promise(function (resolve, reject) {
        DOM.settingsBtn.style.setProperty('--settings', 'block');

        applyBookmarkRelatedChanged(settings);
        applyOtherChanged(settings);

        // resolve();

        setDOM(settings);
        applyBackgroundChanged(settings.wallPaperEnable, wallpaperSrc);

        console.log("initSettings settings end ");
    });
}

// 根据 settings 设置 DOM
function setDOM(settings) {
    // 设置侧边栏
    DOM.wallPaperEnableCheckbox.checked = settings.wallPaperEnable;
    DOM.bgColorPicker.value = settings.backgroundColor;
    DOM.bgColorPicker_wrapper.style.backgroundColor = settings.backgroundColor;
    DOM.textColorPicker.value = settings.textColor;
    DOM.textColorPicker_wrapper.style.backgroundColor = settings.textColor;
    DOM.showTitlesCheckbox.checked = settings.showTitles;
    DOM.showCreateBookmarkCheckbox.checked = settings.showAddSiteBtn;
    // DOM.largeTilesInput.checked = settings.largeTiles;
    DOM.showCreateGroupsCheckbox.checked = settings.showAddGroupsBtn;
    DOM.showClockCheckbox.checked = settings.showClock;
    DOM.bookmarkMaxColsSelect.value = settings.maxCols;
    DOM.bookmarkSizeSelect.value = settings.bookmarkSize;
    DOM.bookmarkMarginSelect.value = settings.bookmarkMargin;
    DOM.bookmarkRatioSelect.value = settings.dialRatio;
    DOM.defaultSortSelect.value = settings.defaultSort;
    DOM.addBookmarkBtnPositionSelect.value = settings.addBookmarkBtnPosition;
    DOM.rememberGroupCheckbox.checked = settings.rememberGroup;
}

// ImgPreviewDiv 相关事件绑定
function bindImgPreviewDivEvents() {
    console.log("bindImgPreviewDivEvents start");
    DOM.imgPreviewDiv.onload = function (e) {
        console.log("bindImgPreviewDivEvents DOM.imgPreviewDiv.onload");
        if (e.target.src.length < 65) {
            document.body.style.background = `linear-gradient(135deg, #4387a2, #5b268d)`;
        } else {
            document.body.style.background = `url("${e.target.src}") no-repeat top center fixed`;
            document.body.style.backgroundSize = 'cover';
        }

        DOM.backgroundColorContainer.style.display = "none";
        DOM.previewContainer.style.display = 'flex';
        DOM.previewContainer.style.opacity = '1';
        DOM.switchesContainer.style.transform = "translateY(0)";
    }
    DOM.imgPreviewDiv.onerror = function (e) {
        console.log("bindImgPreviewDivEvents DOM.imgPreviewDiv.onerror");
        state.wallpaperSrc = state.defaultWallpaperSrc;
        DOM.imgPreviewDiv.setAttribute('src', state.defaultWallpaperSrc);
        chrome.storage.local.set({ wallpaperSrc: state.defaultWallpaperSrc });
    }
}

// 设置背景图或背景颜色
export function applyBackgroundChanged(wallPaperEnable, wallpaperSrc) {
    console.log("applyBackgroundChanged wallPaperEnable: ", wallPaperEnable);
    console.log("applyBackgroundChanged wallpaperSrc: ", wallpaperSrc?.length < 100 ? wallpaperSrc : wallpaperSrc?.substring(200, 20));
    // 启用背景图并且上传了背景图
    if (wallPaperEnable && wallpaperSrc) {
        bindImgPreviewDivEvents();

        DOM.imgPreviewDiv.setAttribute('src', wallpaperSrc);
        DOM.imgPreviewDiv.style.display = 'block';
        DOM.previewContainer.style.display = 'flex';
        DOM.previewContainer.style.opacity = '1';
    }
    else {
        DOM.backgroundColorContainer.style.display = "flex";
        DOM.previewContainer.style.display = 'none';
        DOM.previewContainer.style.opacity = '0';
        DOM.switchesContainer.style.transform = `translateY(-${DOM.previewContainer.offsetHeight}px)`;

        document.body.style.background = DOM.bgColorPicker.value;
    }
}

// "是否显示背景图"checkbox变更
export function applyWallpaperEnableChanged(isWallpaperCheckboxChanged) {
    console.log("applyWallpaperEnableChanged isWallpaperCheckboxChanged: ", isWallpaperCheckboxChanged);
    if (isWallpaperCheckboxChanged) {
        // 由不显示背景图 变为 显示背景图
        // 1. 不显示背景色取色器、显示背景图选择器
        // 2. 设置背景src为初始背景
        // 3. 背景变为初始背景
        if (DOM.wallPaperEnableCheckbox.checked === true) {
            bindImgPreviewDivEvents();

            DOM.backgroundColorContainer.style.display = "none";
            DOM.previewContainer.style.display = 'flex';
            DOM.previewContainer.style.opacity = '1';
            DOM.switchesContainer.style.transform = "translateY(0)";

            DOM.imgPreviewDiv.setAttribute('src', state.defaultWallpaperSrc);
        }

        // 由显示背景图 变为 不显示背景图
        // 1. 显示背景色取色器、不显示背景图选择器
        // 2. 设置背景src为初始背景
        // 3. 背景变为设定的背景色
        if (DOM.wallPaperEnableCheckbox.checked === false) {
            DOM.backgroundColorContainer.style.display = "flex";
            DOM.previewContainer.style.display = 'none';
            DOM.previewContainer.style.opacity = '0';
            DOM.switchesContainer.style.transform = `translateY(-${DOM.previewContainer.offsetHeight}px)`;

            document.body.style.background = DOM.bgColorPicker.value;
        }
    }
}

// 修改书签相关 如： 大小、书签数、样式
export function applyBookmarkRelatedChanged(settings) {
    let bookmarkWidth, bookmarkHeight, bookmarkContentHeight, bookmarkMargin;

    // 书签大小
    switch (settings?.bookmarkSize) {
        case "x-large":
            bookmarkWidth = 280;
            bookmarkHeight = settings.dialRatio === "square" ? '298px' : '175px';
            bookmarkContentHeight = settings.dialRatio === "square" ? '280px' : '157px';
            break;
        case "large":
            bookmarkWidth = 256;
            bookmarkHeight = settings.dialRatio === "square" ? '274px' : '162px';
            bookmarkContentHeight = settings.dialRatio === "square" ? '256px' : '144px';
            break;
        case "medium":
            bookmarkWidth = 220;
            bookmarkHeight = settings.dialRatio === "square" ? '238px' : '142px';
            bookmarkContentHeight = settings.dialRatio === "square" ? '220px' : '124px';
            break;
        case "small":
            bookmarkWidth = 178;
            bookmarkHeight = settings.dialRatio === "square" ? '196px' : '118px';
            bookmarkContentHeight = settings.dialRatio === "square" ? '178px' : '100px';
            break;
        case "x-small":
            bookmarkWidth = 130;
            bookmarkHeight = settings.dialRatio === "square" ? '148px' : '100px';
            bookmarkContentHeight = settings.dialRatio === "square" ? '130px' : '82px';
            break;
        default:
            bookmarkWidth = 220;
            bookmarkHeight = settings.dialRatio === "square" ? '238px' : '142px';
            bookmarkContentHeight = settings.dialRatio === "square" ? '220px' : '124px';
    }
    document.documentElement.style.setProperty('--dial-width', bookmarkWidth + 'px');
    document.documentElement.style.setProperty('--dial-height', bookmarkHeight);
    document.documentElement.style.setProperty('--dial-content-height', bookmarkContentHeight);


    // 书签间隔
    switch (settings?.bookmarkMargin) {
        case 'near':
            bookmarkMargin = 7
            break;
        case 'middle':
            bookmarkMargin = 11
            break;
        case 'far':
            bookmarkMargin = 15
            break;
        default:
            bookmarkMargin = 7
    }
    document.documentElement.style.setProperty('--dial-margin', bookmarkMargin + 'px');


    if (settings.maxCols && settings.maxCols !== "100") {
        const containerWidth = settings.maxCols * (bookmarkWidth + bookmarkMargin);
        document.documentElement.style.setProperty('--columns', `${containerWidth}px`);
        layout();
    } else {
        document.documentElement.style.setProperty('--columns', '100%');
        layout();
    }
}

// 设置其他，如：字体颜色、是否显示添加分组按钮、是否显示时钟、是否显示书签标题、是否显示添加书签按钮
export function applyOtherChanged(settings) {
    if (settings.textColor) {
        document.documentElement.style.setProperty('--color', settings.textColor);
    }

    if (settings.showAddGroupsBtn) {
        document.documentElement.style.setProperty('--show-groups', 'inline');
    } else {
        document.documentElement.style.setProperty('--show-groups', 'none');
    }

    if (settings.showClock) {
        DOM.clock.style.setProperty('--clock', 'block');
    } else {
        DOM.clock.style.setProperty('--clock', 'none');
    }

    if (!settings.showTitles) {
        document.documentElement.style.setProperty('--title-opacity', '0');
    } else {
        document.documentElement.style.setProperty('--title-opacity', '1');
    }

    if (!settings.showAddSiteBtn) {
        document.documentElement.style.setProperty('--create-dial-display', 'none');
    } else {
        document.documentElement.style.setProperty('--create-dial-display', 'block');
    }
}

// todo: why did i debounce animate but not layout? (because we want tiles to move immediately as manually resizing window)
export function layout(force = false) {
    if (force || state.layoutgroup || containerSize !== getComputedStyle(DOM.bookmarksContainer).maxWidth || windowSize !== window.innerWidth) {
        windowSize = window.innerWidth;
        containerSize = getComputedStyle(DOM.bookmarksContainer).maxWidth;

        let nodesToAnimate = [];
        let positions = [];

        // avoid layout thrashing
        // batch reads
        for (let i = 0; i < boxes.length; i++) {
            let box = boxes[i];
            positions[i] = {
                node: box.node,
                x: box.node.offsetLeft,
                y: box.node.offsetTop,
                lastX: box.x,
                lastY: box.y
            };
        }

        // batch writes
        for (let i = 0; i < boxes.length; i++) {
            let box = positions[i];
            if (box.lastX !== box.x || box.lastY !== box.y || force) {
                const x = boxes[i].transform.x + box.lastX - box.x;
                const y = boxes[i].transform.y + box.lastY - box.y;
                TweenMax.set(box.node, { x, y });
                nodesToAnimate.push(box.node);
            }
            boxes[i].x = box.x;
            boxes[i].y = box.y;
        }

        // layoutgroup true on group open -- zero duration because we are just setting the positions of the dials, so whenever
        // a resize occurs the animation will start from the right position
        if (nodesToAnimate.length > 0 || force) {
            let duration = state.layoutgroup ? 0 : 0.7;
            TweenMax.staggerTo(nodesToAnimate, duration, { x: 0, y: 0, stagger: { amount: 0.2 }, ease });
        }

        state.layoutgroup = false;
    }
}

function ease(progress) {
    const omega = 12;
    const zeta = 0.8;
    const beta = Math.sqrt(1.0 - zeta * zeta);
    progress = 1 - Math.cos(progress * Math.PI / 2);
    progress = 1 / beta *
        Math.exp(-zeta * omega * progress) *
        Math.sin(beta * omega * progress + Math.atan(beta / zeta));
    return 1 - progress;
}