import { state } from "./state.js"
import { DOM } from "./dom.js"
import { getData, saveData } from "./data.js"
import { generateId, hexToCssGradient, rgbaToCssGradient, rgbToHex, getBgColor } from "./utils.js";
import { hideModals, buildCreateBookmarkModal, modalShowEffect } from "./modals.js";
import { showToast, animate, hideSettings } from "./ui.js";
import { onMoveHandler, onEndHandler } from "./events.js";

function rectifyUrl(url) {
    if (url && !url.startsWith('https://') && !url.startsWith('http://')) {
        return 'https://' + url;
    } else {
        return url;
    }
}

// 添加新书签
export function createBookmark() {
    console.log("createBookmark");
    let url = rectifyUrl(DOM.createDialModalURL.value.trim());
    // todo: 真正使用标题而不是 URL 作为标题
    let title = url;
    saveNewBookmark(state.currentGroupId, url, title).then(result => {
        hideModals();
        showToast(' Capturing images...');
        console.log('createBookmark sendMessage');
        chrome.runtime.sendMessage({ target: 'background', type: 'handleBookmarkChanged', data: { id: result, url: url, groupId: state.currentGroupId, changeType: 'Add' } });
    });
}

// 保存新书签
export async function saveNewBookmark(groupId, url, title) {
    if (!url || !title) return;

    const data = await getData();
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
    state.data = data; // 更新全局状态
    buildBookmarksByGroupId(data.bookmarks.filter(b => b.groupId === groupId), groupId);
    return newId;
}

// function getBookmarks(groupId) {
//     chrome.bookmarks.getChildren(groupId).then(result => {
//         if (groupId === selectedGroupId && !result.length && settings.showAddGroupsBtn) {
//             //noBookmarks.style.display = 'block';
//             addGroupButton.style.display = 'none';
//         }
//         printBookmarksByGroupId(result, groupId)
//     }, error => {
//         console.log(error);
//     });
// }

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
        if (state.settings.defaultSort === "first") {
            bookmarks = bookmarks.reverse();
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

                tileMain.append(content, title);
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
    let newBookmarkButton = createNewBookmarkBtnDOM(selectedGroupId);
    if (state.settings.defaultSort !== "first") {
        fragment.appendChild(newBookmarkButton);
    } else {
        fragment.insertBefore(newBookmarkButton, fragment.firstChild);
    }

    // 假如原分组容器不存在，构建指定分组容器，用于放置书签
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

    // Sortable configuration
    new Sortable(groupContainerEl, {
        group: 'shared',
        animation: 160,
        ghostClass: 'selected',
        dragClass: 'dragging',
        filter: ".createDial",
        delay: 500,
        delayOnTouchOnly: true,
        onMove: onMoveHandler,
        onEnd: onEndHandler
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
export function moveBookmark(id, fromParentId, toParentId, oldIndex, newIndex, newSiblingId) {
    let options = {}

    function move(id, options) {
        chrome.bookmarks.move(id, options).then(result => {
            // tabMessagePort.postMessage({ refreshInactive: true });
        }).catch(err => {
            console.log(err);
        });
    }

    if ((toParentId && fromParentId) && toParentId !== fromParentId) {
        options.parentId = toParentId;
    }

    // todo: refactor
    if (state.settings.defaultSort === "first") {
        if (newSiblingId && newSiblingId !== -1) {
            chrome.bookmarks.get(newSiblingId).then(result => {
                if (toParentId === fromParentId && oldIndex >= newIndex) {
                    options.index = Math.max(0, result[0].index);
                    // chrome-only off by 1 bug when moving a bookmark forward
                    if (!chrome.runtime.getBrowserInfo) {
                        options.index++;
                    }
                } else {
                    options.index = Math.max(0, result[0].index + 1);
                }
                move(id, options);
            }).catch(err => {
                console.log(err);
            })
        } else {
            if (!newSiblingId) {
                options.index = 0;
            }
            move(id, options);
        }
    } else {
        if (newSiblingId && newSiblingId !== -1) {
            chrome.bookmarks.get(newSiblingId).then(result => {
                if (toParentId !== fromParentId || oldIndex >= newIndex) {
                    options.index = Math.max(0, result[0].index);
                } else {
                    options.index = Math.max(0, result[0].index - 1);
                    // chrome-only off by 1 bug when moving a bookmark forward
                    if (!chrome.runtime.getBrowserInfo) {
                        options.index++;
                    }
                }
                move(id, options);
            }).catch(err => {
                console.log(err);
            })
        } else {
            move(id, options);
        }
    }
}

// 删除书签
export async function removeBookmark(id) {
    state.data = await getData();

    // 过滤掉要删除的书签
    const updatedBookmarks = state.data.bookmarks.filter(bookmark => bookmark.id !== id);

    // 保存更新后的书签数组
    return new Promise((resolve) => {
        chrome.storage.local.set({
            bookmarks: updatedBookmarks
        }, () => {
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

    showToast(' Capturing images...')
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
        if(bookmark.url && (bookmark.url.startsWith('https://') || bookmark.url.startsWith('http://'))) {
            bookmarkToProcess.push(bookmark);
        }
    });
    chrome.runtime.sendMessage({ target: 'background', type: 'refreshAllThumbs', data: { bookmarks } });
    showToast(' Capturing images...')
    

    // chrome.bookmarks.getChildren(groupId).then(children => {
    //     if (children && children.length) {
    //         for (let child of children) {
    //             if (child.url && (child.url.startsWith('https://') || child.url.startsWith('http://'))) {
    //                 //urls.push(child.url);
    //                 // push an object with the url and the id
    //                 bookmarks.push({ url: child.url, id: child.id, parentId: child.parentId });
    //             }
    //         }
    //         chrome.runtime.sendMessage({ target: 'background', type: 'refreshAllThumbs', data: { bookmarks } });
    //         showToast(' Capturing images...')
    //     }
    // }).catch(err => {
    //     console.log(err);
    // });
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
                        showToast(' Capturing images...')
                    }
                }
            })
    }

    hideModals();
}

