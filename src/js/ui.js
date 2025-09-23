import { DOM } from "./dom.js";
import { state } from "./state.js";
import { getData, saveData } from "./data.js";
import { groupsLinks,groupLink } from "./groups.js";
import { printBookmarksByGroupId as displayGroupBookmarksByGroupId } from "./bookmarks.js";

let windowSize = null;  // 设计用于存储窗口大小信息?
let isToastVisible = false; // 标记提示框（toast）是否可见
let containerSize = null;   // 设计用于存储容器（如书签容器）的尺寸信息
let boxes = [];

// 建立分组页面，初始进入页面时使用
export async function buildDialPages(selectedGroupId) {
    // 获得 bookmarks 和 groups 数据
    state.data = await getData();
    console.log(state.data);
    const groups = state.data.groups;

    // 如果没有任何分组，添加一个主页分组
    if (groups.length === 0) {
        groups.unshift(state.homeGroup);
        saveData({ groups }).then(() => {
            console.log("No groups found, added home group");
            state.data.groups = groups;
        });

        // 如果没有分组和书签，则显示初始设置界面
        if (state.data.bookmarks.length === 0) {
            DOM.addGroupButton.style.display = 'none';
            printNewSetup();
            return;
        }
    }

    // 分组多于1，根据 position 进行排序
    // todo: 需要结合多种条件进行排序： position, 访问次数，最后访问时间等
    if (groups.length > 1)
        groups.sort((a, b) => (a.position || 0) - (b.position || 0));

    // 清空原有的分组头内容
    DOM.groupsContainer.innerHTML = '';
    // 重新生成所有分组链接
    groupsLinks(groups);

    // 根据当前选择的分组ID，显示对应的分组书签内容
    const currentGroupBookmarks = state.data.bookmarks.filter(b => b.groupId === selectedGroupId);
    await displayGroupBookmarksByGroupId(currentGroupBookmarks, selectedGroupId);

    // 在排除当前分组后，处理其他分组的书签
    if (groups.length > 1) {
        for (let group of groups) {
            if (group.id !== selectedGroupId) {
                const bookmarks = state.data.bookmarks.filter(b => b.groupId === group.id);
                await displayGroupBookmarksByGroupId(bookmarks, group.id);
            }
        }
    }
}

// 页面刷新：读取数据，重建分组标题
export async function reBuildGroupPages(inData = null) {
    if (!inData) state.data = await getData();
    const bookmarks = state.data.bookmarks || [];

    if (!bookmarks.length) {
        DOM.addGroupButton.style.display = 'none';
        printNewSetup();
        return;
    }

    const groups = state.data.groups || [];

    // clear any existing data so we can refresh
    DOM.groupsContainer.innerHTML = '';

    // Build group header links
    if (groups && groups.length > 1) {
        for (let group of groups) {
            groupLink(group.title, group.id);
        }
    }

    return
}

// 显示初始设置界面
export async function printNewSetup() {
    let fragment = document.createDocumentFragment();

    // Ensure the container exists
    let groupContainerEl = document.getElementById(state.selectedGroupId);
    console.log("new install，@speedDialId:", state.selectedGroupId);
    if (!groupContainerEl) {
        groupContainerEl = document.createElement('div');
        groupContainerEl.id = state.selectedGroupId;
        groupContainerEl.classList.add('container');
        groupContainerEl.style.display = state.currentGroupId === state.selectedGroupId ? 'flex' : 'none';
        groupContainerEl.style.opacity = "0";

        if (state.currentGroupId === state.selectedGroupId) {
            setTimeout(() => {
                groupContainerEl.style.opacity = "1";
                animate();
            }, 20);
            document.querySelector(`[groupid="${state.currentGroupId}"]`)?.classList.add('activegroup');
        }
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

export function hideMenus() {
    let menus = [DOM.menu, DOM.settingsMenu, DOM.groupMenu]
    for (let el of menus) {
        el.style.visibility = "hidden";
        el.style.opacity = "0";
    }
}


export function openSettings() {
    DOM.sidenav.style.boxShadow = "0px 2px 8px 0px rgba(0,0,0,0.5)";
    DOM.sidenav.style.transform = "translateX(0%)";
}

export function hideSettings() {
    DOM.sidenav.style.transform = "translateX(100%)";
    DOM.sidenav.style.boxShadow = "none";
}

export function hideToast() {
    if (isToastVisible) {
        DOM.toast.style.transform = "translateX(100%)";
        DOM.toastContent.innerText = '';
        isToastVisible = false;
    }
}

export function showToast(message) {
    if (!isToastVisible) {
        DOM.toastContent.innerText = message;
        DOM.toast.style.transform = "translateX(0%)";
        isToastVisible = true;
    }
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
        const nodes = document.querySelectorAll(`[id="${state.selectedGroupId}"] > .tile`);
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
export const processRefresh = debounce(({ groupsOnly = false } = {}) => {
    if (groupsOnly) {
        reBuildGroupPages()
    } else {
        // prevent page scroll on refresh
        // react where are you...
        state.scrollPos = bookmarksContainerParent.scrollTop;
        //noBookmarks.style.display = 'none';
        addGroupButton.style.display = 'inline';

        //bookmarksContainer.style.opacity = "0";

        buildDialPages(currentGroupId)
    }
}, 650, true);

// 根据设置应用样式
export function applySettings(settings) {
    return new Promise(function (resolve, reject) {
        // apply settings to speed dial

        if (settings.wallpaper && settings.wallpaperSrc) {
            // perf hack for default gradient bg image. user selected images are data URIs
            if (settings.wallpaperSrc.length < 65) {
                document.body.style.background = `linear-gradient(135deg, #4387a2, #5b268d)`;
            } else {
                document.body.style.background = `url("${settings.wallpaperSrc}") no-repeat top center fixed`;
                document.body.style.backgroundSize = 'cover';
            }
        } else {
            document.body.style.background = settings.backgroundColor;
        }

        if (settings.textColor) {
            document.documentElement.style.setProperty('--color', settings.textColor);
        }

        if (settings.maxCols && settings.maxCols !== "100") {
            //todo cleanup - fixed values
            let dialWidth = 220;
            let dialMargin = 18 * 2; // 18px on each side

            switch (settings.dialSize) {
                case "large":
                    dialWidth = 256;
                    break;
                case "small":
                    dialWidth = 178;
                    break;
                case "x-small":
                    dialWidth = 130;
                    break;
                default:
                    dialWidth = 220;
            }

            const containerWidth = settings.maxCols * (dialWidth + dialMargin);
            document.documentElement.style.setProperty('--columns', `${containerWidth}px`);
            layout();
        } else {
            document.documentElement.style.setProperty('--columns', '100%');
            layout();
        }

        if (settings.dialSize && settings.dialSize !== "medium") {
            let dialWidth, dialHeight, dialContentHeight;
            switch (settings.dialSize) {
                case "large":
                    dialWidth = '256px';
                    dialHeight = settings.dialRatio === "square" ? '274px' : '162px';
                    dialContentHeight = settings.dialRatio === "square" ? '256px' : '144px';
                    break;
                case "small":
                    dialWidth = '178px';
                    dialHeight = settings.dialRatio === "square" ? '196px' : '118px';
                    dialContentHeight = settings.dialRatio === "square" ? '178px' : '100px';
                    break;
                case "x-small":
                    dialWidth = '130px';
                    dialHeight = settings.dialRatio === "square" ? '148px' : '100px';
                    dialContentHeight = settings.dialRatio === "square" ? '130px' : '82px';
                    break;
                default:
                    dialWidth = '220px';
                    dialHeight = settings.dialRatio === "square" ? '238px' : '142px';
                    dialContentHeight = settings.dialRatio === "square" ? '220px' : '124px';
            }
            document.documentElement.style.setProperty('--dial-width', dialWidth);
            document.documentElement.style.setProperty('--dial-height', dialHeight);
            document.documentElement.style.setProperty('--dial-content-height', dialContentHeight);
        } else {
            document.documentElement.style.setProperty('--dial-width', '220px');
            if (settings.dialRatio === "square") {
                document.documentElement.style.setProperty('--dial-height', '238px');
                document.documentElement.style.setProperty('--dial-content-height', '220px');
            } else {
                document.documentElement.style.setProperty('--dial-height', '142px');
                document.documentElement.style.setProperty('--dial-content-height', '124px');
            }
        }

        if (settings.showgroups) {
            document.documentElement.style.setProperty('--show-groups', 'inline');
        } else {
            document.documentElement.style.setProperty('--show-groups', 'none');
        }

        if (settings.showClock) {
            DOM.clock.style.setProperty('--clock', 'block');
        } else {
            DOM.clock.style.setProperty('--clock', 'none');
        }

        if (settings.showSettingsBtn) {
            DOM.settingsBtn.style.setProperty('--settings', 'block');
        } else {
            DOM.settingsBtn.style.setProperty('--settings', 'none');
        }

        if (!settings.showTitles) {
            document.documentElement.style.setProperty('--title-opacity', '0');
        } else {
            document.documentElement.style.setProperty('--title-opacity', '1');
        }

        if (!settings.showAddSite) {
            document.documentElement.style.setProperty('--create-dial-display', 'none');
        } else {
            document.documentElement.style.setProperty('--create-dial-display', 'block');
        }


        resolve();

        // populate settings nav
        DOM.wallPaperEnabled.checked = settings.wallpaper;
        DOM.color_picker.value = settings.backgroundColor;
        DOM.color_picker_wrapper.style.backgroundColor = settings.backgroundColor;
        DOM.textColor_picker.value = settings.textColor;
        DOM.textColor_picker_wrapper.style.backgroundColor = settings.textColor;
        DOM.showTitlesInput.checked = settings.showTitles;
        DOM.showCreateDialInput.checked = settings.showAddSite;
        DOM.largeTilesInput.checked = settings.largeTiles;
        DOM.showgroupsInput.checked = settings.showgroups;
        DOM.showClockInput.checked = settings.showClock;
        DOM.showSettingsBtnInput.checked = settings.showSettingsBtn;
        DOM.maxColsInput.value = settings.maxCols;
        DOM.dialSizeInput.value = settings.dialSize;
        DOM.dialRatioInput.value = settings.dialRatio;
        DOM.defaultSortInput.value = settings.defaultSort;
        DOM.rememberGroupInput.checked = settings.rememberGroup;

        if (settings.wallpaperSrc) {
            DOM.imgPreview.setAttribute('src', settings.wallpaperSrc);
            //imgPreview.style.display = 'block';
            DOM.imgPreview.onload = function (e) {
                if (settings.wallpaper) {
                    DOM.backgroundColorContainer.style.display = "none";
                    DOM.previewContainer.style.opacity = '1';
                    DOM.switchesContainer.style.transform = "translateY(0)";

                    //backgroundColorContainer.style.display = 'none';
                } else {
                    DOM.backgroundColorContainer.style.display = "flex";
                    DOM.previewContainer.style.opacity = '0';
                    DOM.switchesContainer.style.transform = `translateY(-${previewContainer.offsetHeight}px)`;
                }
            }
            DOM.imgPreview.onerror = function (e) {
                // reset to default on error with user image
                settings.wallpaperSrc = 'img/bg.jpg';
                DOM.imgPreview.setAttribute('src', settings.wallpaperSrc);
                chrome.storage.local.set({ settings });
            }
        }

    });
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
            let duration = layoutgroup ? 0 : 0.7;
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