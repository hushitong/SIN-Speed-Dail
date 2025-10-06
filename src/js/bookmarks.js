import { state } from "./state.js"
import { DOM } from "./dom.js"
import { getData, saveData } from "./data.js"
import { visitAddOne, generateId, hexToCssGradient, rgbaToCssGradient, rgbToHex, getBgColor } from "./utils.js";
import { hideModals, buildCreateBookmarkModal, modalShowEffect } from "./modals.js";
import { animate, hideSettings, activeBookmarksContainer } from "./ui.js";
import { onMoveHandler, onGroupMoveEndHandler } from "./events.js";
import { activeGroup, buildGroupsLinks } from "./groups.js";
import Toast from './minitoast.js';

function rectifyUrl(url) {
    if (url && !url.startsWith('https://') && !url.startsWith('http://')) {
        return 'https://' + url;
    } else {
        return url;
    }
}

// 添加新书签
export function quickCreateBookmark() {
    console.log("createBookmark");
    let url = rectifyUrl(DOM.createDialModalURL.value.trim());
    // todo: 真正使用标题而不是 URL 作为标题
    let title = url;
    saveNewBookmark(state.currentGroupId, url, title).then(result => {
        hideModals();
        Toast.success(`成功添加书签，url：${url}`);
        Toast.info(`获取书签缩略图ing...`);
        let sendMessageData = { target: 'background', type: 'handleBookmarkChanged', data: { id: result, url: url, groupId: state.currentGroupId, changeType: 'Add' } };
        console.log('quickCreateBookmark sendMessage', sendMessageData);
        chrome.runtime.sendMessage(sendMessageData);
    });
}

// 保存新书签
export async function saveNewBookmark(groupId, url, title) {
    if (!url || !title) return;

    const data = await getData(['groups', 'bookmarks']);
    data.bookmarks = data.bookmarks || [];
    let isFirstBookmark = false;
    if (data.bookmarks.length === 0)
        isFirstBookmark = true;

    // 获取当前分组的最大位置
    const groupBookmarks = data.bookmarks.filter(b => b.groupId === groupId);
    const maxPosition = groupBookmarks.length > 0
        ? Math.max(...groupBookmarks.map(b => b.position || 0))
        : 0;

    const newId = generateId();
    const newBookmark = {
        id: newId,
        groupId: groupId,
        title: title,
        url: url,
        position: maxPosition + 1,
        thumbnail: null,
        visits: 0,
        createtime: Math.floor(Date.now() / 1000),
    };

    data.bookmarks.push(newBookmark);
    await saveData(data);
    state.data = data;
    buildBookmarksByGroupId(data.bookmarks.filter(b => b.groupId === groupId), groupId);
    activeBookmarksContainer(groupId);
    if (isFirstBookmark) {
        buildGroupsLinks(data.groups)
        activeGroup(groupId);
    }
    return newId;
}

// 实际作用就是根据 groupId 和 bookmarks 数组，生成指定分组的书签列表的 DOM 节点并插入到页面中
// selectedGroupId 是要显示的分组，bookmarks 是该分组的书签数组
export async function buildBookmarksByGroupId(bookmarks, selectedGroupId) {
    console.log("printBookmarksByGroupId:", bookmarks, selectedGroupId);
    let fragment = document.createDocumentFragment();

    // Collect URLs for batch thumbnail fetching
    //let urls = bookmarks.filter(b => b.url?.startsWith("http")).map(b => b.url);

    // todo: 使用批量获取缩略图，优化性能
    // chrome.runtime.sendMessage({target: 'background', type: 'getThumbs', data: bookmarks})

    // 当该分组具有书签时，生成书签 DOM 节点
    if (bookmarks) {
        switch (state.settings.defaultSort) {
            case "custom":
                bookmarks.sort((a, b) => (a.position || 0) - (b.position || 0));
                break;
            case "visits":
                bookmarks.sort((a, b) => (b.visits || 0) - (a.visits || 0));
                break;
            case "date_ase":
                bookmarks.sort((a, b) => (a.createtime || 0) - (b.createtime || 0));
                break;
            case "date_desc":
                bookmarks.sort((a, b) => (b.createtime || 0) - (a.createtime || 0));
                break;
            default:
                bookmarks.sort((a, b) => (a.position || 0) - (b.position || 0));
        }

        let thumbIds = bookmarks.map(b => state.defaultThumbPrefix + b.id);
        let thumbnails = await chrome.storage.local.get(thumbIds);
        console.log("thumbnails fetched:", thumbnails);

        for (let bookmark of bookmarks.filter(b => b.groupId === selectedGroupId)) {
            // console.log("processing bookmark:", bookmark);
            // if (!bookmark.url && bookmark.title && bookmark.groupId === selectedGroupId) continue;

            if (bookmark.url?.startsWith("http")) {
                let images = thumbnails[state.defaultThumbPrefix + bookmark.id] || {};
                let thumbData = images.thumbnails?.[images.thumbIndex] || null;
                let thumbBg = images.bgColor || null;

                let a = document.createElement('a');
                a.classList.add('tile');
                a.href = bookmark.url;
                a.setAttribute('data-id', bookmark.id);
                a.onclick = (e) => {
                    visitAddOne(bookmark.id);
                };

                let tileMain = document.createElement('div');
                tileMain.classList.add('tile-main');

                let content = document.createElement('div');
                content.setAttribute('id', bookmark.groupId + "-" + bookmark.id);
                content.classList.add('tile-content');
                content.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';

                content.style.backgroundImage = thumbBg ? `url('${thumbData}'), ${thumbBg}` : '';
                // content.style.backgroundColor = thumbBg ? '' : 'rgba(255, 255, 255, 0.5)';

                let title = document.createElement('div');
                title.classList.add('tile-title');
                if (!state.settings.showTitles) {
                    title.classList.add('hide');
                }
                title.textContent = bookmark.title;

                // 显示访问次数
                let visitDiv = document.createElement('div');
                visitDiv.classList.add('tile-visit');
                visitDiv.textContent = (bookmark.visits || 0).toString();
                visitDiv.title = `访问次数：${(bookmark.visits || 0).toString()}次`;
                visitDiv.style.display = 'flex';

                // 显示书签位置，仅用于调试
                let positionDiv = document.createElement('div');
                positionDiv.classList.add('tile-position');
                positionDiv.textContent = (bookmark.position || 0).toString();
                positionDiv.title = `排序序号：${(bookmark.position || 0).toString()}次`;
                positionDiv.style.display = 'flex';

                tileMain.append(content, title, visitDiv, positionDiv);
                a.appendChild(tileMain);

                // 最终 a 生成的数据 example:
                // <a class="tile" href="https://baidu.com" data-id="mfv2c2mnld3jz" style="transform: matrix(1, 0, 0, 1, 0, 0);">
                //     <div class="tile-main">
                //         <div id="mfv1du48juh4b-mfv2c2mnld3jz" class="tile-content"
                //             style="background-color: rgba(255, 255, 255, 0.5);">
                //         </div>
                //         <div class="tile-title">百度</div>
                //     </div>
                // </a>

                fragment.appendChild(a);
            }
        }
    }

    // 添加“新建书签”按钮
    if (state.settings.addBookmarkBtnPosition !== "hidden") {
        let newBookmarkButton = createNewBookmarkBtnDOM(selectedGroupId);
        // 根据不同排序方式，决定新建按钮的位置
        if (state.settings.addBookmarkBtnPosition === "last") {
            fragment.appendChild(newBookmarkButton);
        } else if (state.settings.addBookmarkBtnPosition === "first") {
            fragment.insertBefore(newBookmarkButton, fragment.firstChild);
        }
    }

    // 假如原分组容器不存在，构建指定分组容器，用于放置书签
    // 存在则清空原有内容
    let groupContainerEl = document.getElementById(selectedGroupId);
    if (!groupContainerEl) {
        groupContainerEl = document.createElement('div');
        groupContainerEl.id = selectedGroupId;
        groupContainerEl.classList.add('container');
        groupContainerEl.style.display = 'none';
        groupContainerEl.style.opacity = "0";

        // console.log("printBookmarksByGroupId currentGroupId", state.currentGroupId)
        // if (state.currentGroupId === selectedGroupId) {
        //     groupContainerEl.style.display = "flex"
        //     setTimeout(() => {
        //         groupContainerEl.style.opacity = "1";
        //         animate();
        //     }, 20);
        //     // document.querySelector(`[groupid="${currentGroupId}"]`)?.classList.add('activegroup'); //需要在这里设置当前分组为激活状态吗
        // }
        DOM.bookmarksContainerParent.append(groupContainerEl);
    } else {
        groupContainerEl.innerHTML = '';
    }

    // 基于 Sortable 库，初始化书签列表的拖拽排序功能
    new Sortable(groupContainerEl, {
        group: 'shared',
        // swapThreshold: 0.1,
        animation: 20,
        // easing: "cubic-bezier(1, 0, 0, 1)",
        ghostClass: 'selected',   // 放置占位符的class名（拖拽时显示的占位元素）
        dragClass: 'dragging',  // 正在拖拽项目的class名（拖拽过程中的元素）
        filter: ".createDial",
        onMove: onMoveHandler,
        onEnd: onGroupMoveEndHandler,
        onStart: function (evt) {
            state.targetGroupId = null;
        }
    });

    batchInsert(groupContainerEl, fragment, 50)

    // 分批插入已优化一次性大量 DOM 节点插入的性能
    function batchInsert(parent, fragment, batchSize = 50, onComplete) {
        const nodes = Array.from(fragment.childNodes);
        let index = 0;

        function insertBatch() {
            let slice = nodes.slice(index, index + batchSize);
            parent.append(...slice);
            index += batchSize;

            if (index < nodes.length) {
                requestAnimationFrame(insertBatch);
            } else if (onComplete) {
                requestAnimationFrame(onComplete); // Ensures it runs after DOM updates
            }
        }

        insertBatch();
    }

    DOM.bookmarksContainerParent.scrollTop = state.scrollPos;
}

// 创建添加书签按钮+
function createNewBookmarkBtnDOM(groupId) {
    let anewBookmark = document.createElement('a');
    anewBookmark.classList.add('tile', 'createDial');
    anewBookmark.title = `点击添加新书签`;
    anewBookmark.onclick = () => {
        hideSettings();
        buildCreateBookmarkModal(groupId);
        modalShowEffect(DOM.createDialModalContent, DOM.createDialModal);
    };

    let main = document.createElement('div');
    main.classList.add('tile-main');

    let content = document.createElement('div');
    content.classList.add('tile-content', 'createDial-content');
    main.appendChild(content);
    anewBookmark.appendChild(main);

    return anewBookmark;

    // 最终生成的数据 example:
    // <a class="tile createDial" style="transform: matrix(1, 0, 0, 1, 0, 0);">
    //     <div class="tile-main">
    //         <div class="tile-content createDial-content"></div>
    //     </div>
    // </a>
}

// 移动书签顺序
export async function moveBookmark(type, id, fromGroupId, toGroupId, oldIndex, newIndex, newSiblingId) {
    console.log("moveBookmark", type, id, fromGroupId, toGroupId, oldIndex, newIndex, newSiblingId);

    if (type === "changeGroup") {
        if (toGroupId != null) {
            await getData(['bookmarks']).then(async data => {
                const bookmarks = data.bookmarks;

                const newGroupBookmarks = bookmarks.filter(b => b.groupId === toGroupId);
                const maxPosition = newGroupBookmarks.length > 0
                    ? Math.max(...newGroupBookmarks.map(b => b.position || 0))
                    : 0;
                let newPosition = maxPosition + 1;

                let bookmark = bookmarks.find(b => b.id === id);
                bookmark.groupId = toGroupId;
                const orgPosition = bookmark.position || 0;
                bookmark.position = newPosition;

                const orgGroupBookmarksShouldChangePosition = bookmarks.filter(b => b.groupId === fromGroupId && b.position > orgPosition);
                orgGroupBookmarksShouldChangePosition.forEach(b => {
                    if (b.position) b.position--;
                });

                await saveData({ bookmarks }).then(() => {
                    const bookmarksContainer = document.getElementById(fromGroupId);
                    Array.from(bookmarksContainer.children).forEach(child => {
                        if (child.getAttribute('data-id') === id)
                            bookmarksContainer.removeChild(child);
                    });
                });
            });
        } else {
            console.log("moveBookmark aborted: toGroupId is null");
            return;
        }
    } else if (type === "changeIndex") {
        if (oldIndex != null && newIndex != null && fromGroupId != null) {
            await getData(['bookmarks', 'settings']).then(async data => {
                const bookmarks = data.bookmarks;
                const settings = data.settings;
                const sameGroupBookmarks = bookmarks.filter(b => b.groupId === fromGroupId);

                switch (settings.defaultSort) {
                    case "custom":
                        sameGroupBookmarks.sort((a, b) => (a.position || 0) - (b.position || 0));
                        break;
                    case "visits":
                        sameGroupBookmarks.sort((a, b) => (b.visits || 0) - (a.visits || 0));
                        break;
                    case "date_ase":
                        sameGroupBookmarks.sort((a, b) => (a.createtime || 0) - (b.createtime || 0));
                        break;
                    case "date_desc":
                        sameGroupBookmarks.sort((a, b) => (b.createtime || 0) - (a.createtime || 0));
                        break;
                    default:
                        console.log("moveBookmark aborted: unknown sort type");
                        return;
                }

                if (settings.addBookmarkBtnPosition === "first") {
                    newIndex = Math.max(0, newIndex - 1);
                    oldIndex = Math.max(0, oldIndex - 1);
                }

                const targetBookmark = sameGroupBookmarks[oldIndex];
                if (targetBookmark.id !== id) {
                    console.warn("moveBookmark: target not found", id);
                    return;
                }

                // 从原位置移除，并插入到新位置
                sameGroupBookmarks.splice(oldIndex, 1);
                sameGroupBookmarks.splice(newIndex, 0, targetBookmark);

                // 重新计算 position，从 1 开始
                sameGroupBookmarks.forEach((b, index) => {
                    b.position = index + 1;
                });

                // 把修改同步回 bookmarks 全表
                const updatedBookmarks = bookmarks.map(b => {
                    return (b.groupId === fromGroupId)
                        ? sameGroupBookmarks.find(sb => sb.id === b.id) || b
                        : b;
                });

                settings.defaultSort = "custom";
                await saveData({ settings: settings, bookmarks: updatedBookmarks }).then(() => {
                    buildBookmarksByGroupId(updatedBookmarks, fromGroupId);
                });

                console.log(`Bookmark ${id} moved from ${oldIndex} to ${newIndex}`);
            });
        }
        else {
            console.log("moveBookmark aborted: (oldIndex != null && newIndex != null && fromGroupId != null) is false");
            return;
        }
    }
}

// 删除书签
export async function removeBookmark(id) {
    state.data = await getData();
    let title = state.data.bookmarks.find(bookmark => bookmark.id === id)?.title;
    
    // 过滤掉要删除的书签
    const updatedBookmarks = state.data.bookmarks.filter(bookmark => bookmark.id !== id);

    // 保存更新后的书签数组
    return new Promise((resolve) => {
        chrome.storage.local.set({
            bookmarks: updatedBookmarks
        }, () => {
            Toast.success(`成功移除书签，title：${title}`);
            chrome.runtime.sendMessage({ target: 'background', type: 'handleBookmarkChanged', data: { groupId: state.currentGroupId, changeType: 'Remove' } });
            resolve(true);
        });
    });
}


///////////////////////////////////////////////////////////////
// 书签缩略图相关
///////////////////////////////////////////////////////////////

// 根据书签url，到本地存储找对应的缩略图，其key为Thumb.加书签id组合成
export function getThumbsFromLocal(bookmarkId) {
    const localKey = state.defaultThumbPrefix + bookmarkId;
    console.log("getThumbsFromLocal", localKey);
    return chrome.storage.local.get(localKey)
        .then(result => {
            if (result[localKey]) {
                return result[localKey];
            }
        });
}


export function refreshThumbnails(url, tileid) {
    // the div id is "groupid-boookmarkid"
    let parentId = tileid.split("-")[0];
    let id = tileid.split("-")[1];

    Toast.info(' Capturing images...')
    chrome.runtime.sendMessage({ target: 'background', type: 'refreshThumbs', data: { url, id, parentId } });
}


// 刷新分组上所有书签的缩略图
export async function refreshAllThumbnails() {
    let bookmarks = [];
    let bookmarkToProcess = [];
    const groupId = state.currentGroupId;

    hideModals();

    const data = await getData(['bookmarks']);
    bookmarks = data.bookmarks.filter(b => b.groupId === groupId);

    bookmarks.forEach(bookmark => {
        if (bookmark.url && (bookmark.url.startsWith('https://') || bookmark.url.startsWith('http://'))) {
            bookmarkToProcess.push(bookmark);
        }
    });
    chrome.runtime.sendMessage({ target: 'background', type: 'refreshAllThumbs', data: { bookmarks } });
    Toast.info(' Capturing images...')
}

///////////////////////////////////////////////////////////////
// settings related
///////////////////////////////////////////////////////////////

// 获得由background.js发送回来的书签缩略图数据，批量设置书签缩略图
// Data example:
// target: 'newtab',
// type: 'thumbBatch',
// data: [{
//     id,
//     groupId: groupId,
//     url,
//     thumbnail: images[0],
//     bgColor
// }]
export function setBackgroundImages(thumbDatas) {
    console.log("setBackgroundImages", thumbDatas);
    const elementsToUpdate = [];
    const observers = new Map();

    thumbDatas.forEach(thumb => {
        const id = thumb.groupId + "-" + thumb.id;
        let element = document.getElementById(id);  // 获得需要设置背景图的 DOM 元素

        if (element) {  // 如果元素已经在 DOM 中，则直接更新
            elementsToUpdate.push({ element, thumb });
        } else {    // 如果元素还没被插入 DOM，则使用 MutationObserver 监听其父元素的变化
            let observer = observers.get(thumb.groupId);
            if (!observer) {
                const parentElement = document.getElementById(thumb.groupId);
                if (!parentElement) return; // Skip if parent is missing

                observer = new MutationObserver((mutations, obs) => {
                    thumbDatas.forEach(t => {
                        const el = document.getElementById(t.groupId + "-" + t.id);
                        if (el) {
                            elementsToUpdate.push({ element: el, thumb: t });
                        }
                    });

                    if (elementsToUpdate.length) {
                        batchApplyImages(elementsToUpdate);
                        obs.disconnect();
                    }
                });

                observer.observe(parentElement, { childList: true, subtree: true });
                observers.set(thumb.groupId, observer);
            }
        }
    });

    if (elementsToUpdate.length) {
        batchApplyImages(elementsToUpdate);
    }
}

function batchApplyImages(elements) {
    console.log("batchApplyImages", elements);
    requestAnimationFrame(() => {
        elements.forEach(({ element, thumb }) => {
            element.style.backgroundColor = "unset";
            element.style.backgroundImage = `url('${thumb.thumbnail}'), ${thumb.bgColor}`;
        });
    });
}

// 修改书签
export function saveBookmark() {
    let id = state.targetTileId.split('-')[1];
    // todo: cleanup this abomination when im not on drugs
    let title = DOM.modalTitle.value;
    let url = state.targetTileHref;
    let newUrl = rectifyUrl(DOM.modalURL.value.trim());
    let selectedImageSrc = null;
    let thumbIndex = 0;
    let imageNodes = document.getElementsByClassName('fc-slide');
    let bgColor = null;
    let colorPickerColor = DOM.modalBgColorPickerInput.value;

    let customCarousel = document.getElementById('customCarousel');
    console.log("saveBookmarkSettings", id, title, url, newUrl, imageNodes, customCarousel, colorPickerColor);
    if (customCarousel) {
        selectedImageSrc = customCarousel.children[0].src;
        bgColor = getBgColor(customCarousel.children[0]);
        if (colorPickerColor && colorPickerColor !== rgbToHex(bgColor)) {
            //console.log("colors dont match, using the picker!")
            bgColor = hexToCssGradient(colorPickerColor);
        } else {
            bgColor = rgbaToCssGradient(bgColor);
        }
        state.targetNode.children[0].children[0].style.backgroundImage = `url('${selectedImageSrc}'), ${bgColor}`;
        //targetNode.children[0].children[0].style.backgroundColor = bgColor;
        chrome.storage.local.get(url)
            .then(result => {
                let thumbnails = [];
                if (result[url]) {
                    thumbnails = result[url].thumbnails;
                    thumbnails.push(selectedImageSrc);
                    thumbIndex = thumbnails.indexOf(selectedImageSrc);
                } else {
                    thumbnails.push(selectedImageSrc);
                    thumbIndex = 0;
                }
                chrome.storage.local.set({ [state.defaultThumbPrefix + id]: { thumbnails, thumbIndex, bgColor } }).then(result => {
                    //tabMessagePort.postMessage({updateCache: true, url: newUrl, i: thumbIndex});
                    if (title !== state.targetTileTitle) {
                        updateTitle()
                    }
                });
            });
    } else {
        for (let node of imageNodes) {
            // div with order "2" is the one being displayed by the carousel
            if (node.style.order === '2' || imageNodes.length === 1) {
                // sometimes the carousel puts images inside a <figure class="fc-image"> elem
                if (node.children[0].className === "fc-image") {
                    selectedImageSrc = node.children[0].children[0].src;
                    bgColor = getBgColor(node.children[0].children[0]);
                } else {
                    selectedImageSrc = node.children[0].src;
                    bgColor = getBgColor(node.children[0]);
                }

                if (colorPickerColor && colorPickerColor !== rgbToHex(bgColor)) {
                    bgColor = hexToCssGradient(colorPickerColor);
                } else {
                    bgColor = rgbaToCssGradient(bgColor);
                }

                // update tile
                state.targetNode.children[0].children[0].style.backgroundImage = `url('${selectedImageSrc}'), ${bgColor}`;
                //targetNode.children[0].children[0].style.backgroundColor = bgColor;
                break;
            }
        }

        chrome.storage.local.get(url)
            .then(result => {
                if (result[url]) {
                    let thumbnails = result[url].thumbnails;
                    thumbIndex = thumbnails.indexOf(selectedImageSrc);
                    if (thumbIndex >= 0) {
                        chrome.storage.local.set({ [newUrl]: { thumbnails, thumbIndex, bgColor } }).then(result => {
                            //tabMessagePort.postMessage({updateCache: true, url: newUrl, i: thumbIndex});
                            if (title !== state.targetTileTitle || url !== newUrl) {
                                updateTitle()
                            }
                        });
                    } else {
                        if (title !== state.targetTileTitle || url !== newUrl) {
                            updateTitle()
                        }
                    }
                } else {
                    if (title !== state.targetTileTitle || url !== newUrl) {
                        updateTitle()
                    }
                }
            });
    }

    // find image index
    function updateTitle() {
        // allow ui to respond immediately while bookmark updated
        //targetNode.children[0].children[1].textContent = title;
        // sortable ids changed so rewrite to storage
        //let order = sortable.toArray();
        //chrome.storage.local.set({"sort":order});
        // todo: temp hack to match all until we start using bookmark ids
        chrome.bookmarks.search({ url })
            .then(bookmarks => {
                if (bookmarks.length <= 1 && (url !== newUrl)) {
                    // cleanup unused thumbnails
                    chrome.storage.local.remove(url)
                }
                for (let bookmark of bookmarks) {
                    let currentParent = currentGroup ? currentGroup : selectedGroupId
                    if (bookmark.parentId === currentParent) {
                        chrome.bookmarks.update(bookmark.id, {
                            title,
                            url: newUrl
                        });
                    }

                    if (url !== newUrl && toastContent.innerText === '') {
                        Toast.info(' Capturing images...')
                    }
                }
            })
    }

    hideModals();
}

