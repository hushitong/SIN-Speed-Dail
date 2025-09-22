// yet another speed dial
// copyright 2019 dev@conceptualspace.net
// absolutely no warranty is expressed or implied

'use strict';

// speed dial
const bookmarksContainerParent = document.getElementById('tileContainer');
const bookmarksContainer = bookmarksContainerParent
const foldersContainer = document.getElementById('folders');
const addGroupButton = document.getElementById('addFolderButton');
const menu = document.getElementById('contextMenu');
const folderMenu = document.getElementById('folderMenu');
const settingsMenu = document.getElementById('settingsMenu');
const modal = document.getElementById('tileModal');
const modalContent = document.getElementById('tileModalContent');

const createDialModal = document.getElementById('createDialModal');
const createDialModalContent = document.getElementById('createDialModalContent');
const createDialModalURL = document.getElementById('createDialModalURL');
const createDialModalSave = document.getElementById('createDialModalSave');

const createGroupModal = document.getElementById('createFolderModal');
const createFolderModalContent = document.getElementById('createFolderModalContent');
const createFolderModalName = document.getElementById('createFolderModalName');
const createGroupModalSave = document.getElementById('createFolderModalSave');

const editGroupModal = document.getElementById('editFolderModal');
const editFolderModalContent = document.getElementById('editFolderModalContent');
const editFolderModalName = document.getElementById('editFolderModalName');
const editGroupModalSave = document.getElementById('editFolderModalSave');

const deleteGroupModal = document.getElementById('deleteFolderModal');
const deleteFolderModalContent = document.getElementById('deleteFolderModalContent');
const deleteFolderModalName = document.getElementById('deleteFolderModalName');
const deleteGroupModalSave = document.getElementById('deleteFolderModalSave');

const importExportModal = document.getElementById('importExportModal');
const importExportModalContent = document.getElementById('importExportModalContent');

const refreshAllModal = document.getElementById('refreshAllModal');
const refreshAllModalContent = document.getElementById('refreshAllModalContent');
const refreshAllModalSave = document.getElementById('refreshAllModalSave');

const toast = document.getElementById('toast');
const toastContent = document.getElementById('toastContent');

const closeModal = document.getElementsByClassName("close");
const modalSave = document.getElementById('modalSave');
const sidenav = document.getElementById("sidenav");
const modalTitle = document.getElementById("modalTitle");
const modalURL = document.getElementById("modalURL");
const modalImgContainer = document.getElementById("modalImgContainer");
const modalImgInput = document.getElementById("modalImgFile");
const modalImgBtn = document.getElementById("modalImgBtn");
const modalImgUrlBtn = document.getElementById("modalImgUrlBtn");
const modalImageURLInput = document.getElementById("modalImageURLInput");
const closeImgUrlBtn = document.getElementById("closeImgUrlBtn");
const fetchImageButton = document.getElementById("fetchImageButton");
const modalBgColorPickerInput = document.getElementById("modalBgColorPickerInput");
const modalBgColorPickerBtn = document.getElementById("modalBgColorPickerBtn");
const modalBgColorPreview = document.getElementById("modalBgColorPreview");
const noBookmarks = document.getElementById('noBookmarks');

// settings sidebar
const reader = new FileReader();
const color_picker = document.getElementById("color-picker");
const color_picker_wrapper = document.getElementById("color-picker-wrapper");
const textColor_picker = document.getElementById("textColor-picker");
const textColor_picker_wrapper = document.getElementById("textColor-picker-wrapper");
const imgInput = document.getElementById("file");
const imgPreview = document.getElementById("preview");
const previewOverlay = document.getElementById("previewOverlay");
const switchesContainer = document.getElementById("switchesContainer");
const wallPaperEnabled = document.getElementById("wallpaper");
const previewContainer = document.getElementById("previewContainer");
const backgroundColorContainer = document.getElementById("backgroundColorContainer");
const largeTilesInput = document.getElementById("largeTiles");
const rememberFolderInput = document.getElementById("rememberFolder");
const showTitlesInput = document.getElementById("showTitles");
const showCreateDialInput = document.getElementById("showCreateDial");
const showFoldersInput = document.getElementById("showFolders");
const showClockInput = document.getElementById("showClock");
const showSettingsBtnInput = document.getElementById("showSettingsBtn");
const maxColsInput = document.getElementById("maxcols");
const defaultSortInput = document.getElementById("defaultSort");
const importExportBtn = document.getElementById("importExportBtn");
const importExportStatus = document.getElementById('statusMessage');
const exportBtn = document.getElementById("exportBtn");
const importFileInput = document.getElementById("importFile");
const importFileLabel = document.getElementById("importFileLabel");
const helpBtn = document.getElementById("help");
const dialSizeInput = document.getElementById("dialSize");
const dialRatioInput = document.getElementById("dialRatio");

const searchInput = document.getElementById('searchInput');
const searchContainer = document.getElementById('searchContainer');

// clock
const clock = document.getElementById('clock');

const port = "p-" + new Date().getTime();
let tabMessagePort = null;

chrome.runtime.onMessage.addListener(handleMessages);

let cache = {};
let resizing = false;
let sortable = null;
let targetTileHref = null;
let targetTileId = null;
let targetTileTitle = null;
let targetNode = null;
let targetGroupId = null;
let targetGroupName = null;
let targetGroupLink = null;
// let folders = [];
let data = {};
let settings = null;
let selectedGroupId = null;
let currentGroupId = null;
let scrollPos = 0;
let homeGroupTitle = chrome.i18n.getMessage('home');
let windowSize = null;
let containerSize = null;
let layoutFolder = false;
let boxes = [];
let hourCycle = 'h12';
const locale = navigator.language;
const imageRatio = 1.54;
const helpUrl = 'https://conceptualspace.github.io/yet-another-speed-dial/';
let isToastVisible = false;

let folderIds = [];

const homeGroup = {
    id: 'home',
    title: homeGroupTitle,
    position: 1,
    color: '#333333'
};

let defaults = {
    wallpaper: true,
    wallpaperSrc: 'img/bg.jpg',
    backgroundColor: '#111111',
    largeTiles: true,
    rememberFolder: false,
    showTitles: true,
    showAddSite: true,
    showFolders: true,
    showSettingsBtn: true,
    showClock: true,
    maxCols: '100',
    defaultSort: 'first',
    textColor: '#ffffff',
    dialSize: 'medium',
    dialRatio: 'wide',
    currentGroupId: homeGroup.id,
};

const debounce = (func, delay = 500, immediate = false) => {
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

// detect clock settings
hourCycle = Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hourCycle;

function displayClock() {
    clock.textContent = new Date().toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hourCycle: hourCycle });
    setTimeout(displayClock, 10000);
}

displayClock();

function getBookmarks(folderId) {
    chrome.bookmarks.getChildren(folderId).then(result => {
        if (folderId === selectedGroupId && !result.length && settings.showFolders) {
            //noBookmarks.style.display = 'block';
            addGroupButton.style.display = 'none';
        }
        printBookmarks(result, folderId)
    }, error => {
        console.log(error);
    });
}

// 数据管理函数 - 获得
async function getData() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['groups', 'bookmarks'], (result) => {
            resolve({
                groups: result.groups || [],
                bookmarks: result.bookmarks || []
            });
        });
    });
}
// 数据管理函数 - 保存
async function saveData(data) {
    return new Promise((resolve) => {
        chrome.storage.local.set(data, () => {
            resolve();
        });
    });
}

// 建立分组页面，初始进入页面时使用
async function buildDialPages(selectedGroupId) {
    // 获得 bookmarks 和 groups 数据
    data = await getData();
    console.log(data);
    const groups = data.groups;

    if(groups.length <1){
        // 把主页分组添加到分组列表的开头
        groups.unshift(homeGroup);

        saveData({ groups,settings });
    }

    // 排序分组
    groups.sort((a, b) => (a.position || 0) - (b.position || 0));

    // 如果没有分组和书签，则显示初始设置界面
    if (groups.length <= 1 && data.bookmarks.length === 0) {
        addGroupButton.style.display = 'none';
        printNewSetup();
        return;
    }

    // clear any existing data so we can refresh
    foldersContainer.innerHTML = '';

    // Build folder header links
    if (groups && groups.length >= 1) {
        for (let group of groups) {
            groupLink(group.title, group.id);
        }
    }

    // Process the current folder's children first
    const currentBookmarks = data.bookmarks.filter(b => b.groupId === selectedGroupId);
    await printBookmarks(currentBookmarks, selectedGroupId);

    // 在排除当前分组后，处理其他分组的书签，主要是添加分组容器并且在容器内显示+号按钮
    if (groups.length > 1) {
        for (let group of groups) {
            if (group.id !== selectedGroupId) {
                const children = data.bookmarks.filter(b => b.groupId === group.id);
                await printBookmarks(children, group.id);
            }
        }
    }
}

// 页面刷新：仅刷新分组标题
async function reBuildGroupPages() {
    data = await getData();
    const bookmarks = data.bookmarks || [];

    if (!bookmarks.length) {
        addGroupButton.style.display = 'none';
        printNewSetup();
        return;
    }

    const groups = data.groups || [];

    // clear any existing data so we can refresh
    foldersContainer.innerHTML = '';

    // Build folder header links
    if (groups && groups.length > 1) {
        for (let group of groups) {
            groupLink(group.title, group.id);
        }
    }

    return
}

// 删除书签
async function removeBookmark(id) {
    data = await getData();

    // 过滤掉要删除的书签
    const updatedBookmarks = data.bookmarks.filter(bookmark => bookmark.id !== id);
    
    // 保存更新后的书签数组
    return new Promise((resolve) => {
        chrome.storage.local.set({
            bookmarks: updatedBookmarks
        }, () => {
            chrome.runtime.sendMessage({ target: 'background', type: 'handleBookmarkChanged', data: { groupId:currentGroupId,changeType:'Remove' } });
            resolve(true);
        });
    });
}

// 移动分组顺序
function moveGroup(id, oldIndex, newIndex, newSiblingId) {
    console.log("moveFolder:", id, oldIndex, newIndex, newSiblingId);
    let options = {};

    function move(id, options) {
        chrome.bookmarks.move(id, options).then(result => {
            tabMessagePort.postMessage({ refreshInactive: true })
        }).catch(err => {
            console.log(err);
        })
    }

    if (newSiblingId && newSiblingId !== -1) {
        chrome.bookmarks.get(newSiblingId).then(result => {
            if (oldIndex >= newIndex) {
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

// 移动书签顺序
function moveBookmark(id, fromParentId, toParentId, oldIndex, newIndex, newSiblingId) {
    let options = {}

    function move(id, options) {
        chrome.bookmarks.move(id, options).then(result => {
            tabMessagePort.postMessage({ refreshInactive: true });
        }).catch(err => {
            console.log(err);
        });
    }

    if ((toParentId && fromParentId) && toParentId !== fromParentId) {
        options.parentId = toParentId;
    }

    // todo: refactor
    if (settings.defaultSort === "first") {
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

// 显示某个分组
function showGroup(groupId) {
    hideSettings();
    let groups = document.getElementsByClassName('container');
    for (let group of groups) {
        if (group.id === groupId) {
            group.style.display = "flex"
            group.style.opacity = "0";
            layoutFolder = true;
            // transition between folders. todo more elegant solution
            setTimeout(function () {
                //layoutFolder = id;
                group.style.opacity = "1";
                animate()
            }, 20);
        } else {
            group.style.display = "none";
        }
    }
    // style the active tab
    let folderTitles = document.getElementsByClassName('folderTitle');
    for (let title of folderTitles) {
        if (title.attributes.folderid.value === groupId) {
            title.classList.add('activeFolder');
        } else {
            title.classList.remove('activeFolder');
        }
    }
}

function getThumbs(bookmarkUrl) {
    return chrome.storage.local.get(bookmarkUrl)
        .then(result => {
            if (result[bookmarkUrl]) {
                return result[bookmarkUrl];
            }
        });
}

function printFolderBookmarks() {
    for (let folder of folders) {
        getBookmarks(folder)
    }
}

// 生成分组链接
function groupLink(groupTitle, groupId) {
    let a = document.createElement('a');
    if (groupId === homeGroup.id) {
        a.id = "homeFolderLink";
    }
    
    a.classList.add('folderTitle');
    if(groupId === currentGroupId){
        a.classList.add('activeFolder');
    }
    a.setAttribute('folderId', groupId);
    let linkText = document.createTextNode(groupTitle);
    a.appendChild(linkText);

    a.onclick = function () {
        showGroup(groupId);
        selectedGroupId = groupId;
        currentGroupId = groupId;
        scrollPos = 0;
        bookmarksContainerParent.scrollTop = scrollPos;

        settings.currentGroupId = groupId;
        chrome.storage.local.set({ settings });
    };

    // todo: allow dropping directly on folder title?
    a.ondragenter = dragenterHandler;
    a.ondragleave = dragleaveHandler;

    foldersContainer.appendChild(a);
}

function addGroupBtn() {
    hideSettings();
    createFolderModalName.value = '';
    createFolderModalName.focus();
    createGroupModal.style.transform = "translateX(0%)";
    createGroupModal.style.opacity = "1";
    createFolderModalContent.style.transform = "scale(1)";
    createFolderModalContent.style.opacity = "1";
}

function createGroup() {
    let name = createFolderModalName.value.trim();
    const orgGroupCount = data.groups.length;
    data.groups.push({ id: generateId(), title: name, position: orgGroupCount + 1, color: '#6b47aaff' });

    const groups = data.groups;
    saveData({ groups }).then(() => {
        hideModals()
    });
}

function editGroup() {
    let title = editFolderModalName.value.trim();
    data.groups.filter(g => g.id === targetGroupId)[0].title = title;

    const groups = data.groups;
    saveData({ groups }).then(() => {
        hideModals()
    }).catch(err => {
        console.log(err);
    });
}

function refreshThumbnails(url, tileid) {
    //tabMessagePort.postMessage({refreshThumbs: true, url});
    // the div id is "folderid-boookmarkid"
    let parentId = tileid.split("-")[0];
    let id = tileid.split("-")[1];

    showToast(' Capturing images...')
    chrome.runtime.sendMessage({ target: 'background', type: 'refreshThumbs', data: { url, id, parentId } });
}

function removeFolder() {
    chrome.bookmarks.removeTree(targetGroupId).then(() => {
        hideModals();
        targetGroupLink?.remove();
        folders.splice(folders.indexOf(targetGroupId), 1);
        if (!folders.length) {
            //document.getElementById('homeFolderLink').remove();
            // todo: better manager this state
        }

        if (currentGroup === targetGroupId) {
            currentGroup = selectedGroupId;;
            bookmarksContainerParent.scrollTop = scrollPos;
            showGroup(selectedGroupId);
            settings.currentFolder = selectedGroupId;
            chrome.storage.local.set({ settings })
        }

        // todo: clean up this node or do it on refresh
        // document.getElementById(targetFolder).remove();
    });
}

function getChildren(groupId) {
    return new Promise((resolve, reject) => {
        chrome.bookmarks.getChildren(groupId).then(children => {
            resolve(children);
        });
    });
}

function refreshAllThumbnails() {
    let bookmarks = [];
    let parent = currentGroup ? currentGroup : selectedGroupId;

    hideModals();

    chrome.bookmarks.getChildren(parent).then(children => {
        if (children && children.length) {
            for (let child of children) {
                if (child.url && (child.url.startsWith('https://') || child.url.startsWith('http://'))) {
                    //urls.push(child.url);
                    // push an object with the url and the id
                    bookmarks.push({ url: child.url, id: child.id, parentId: child.parentId });
                }
            }
            //tabMessagePort.postMessage({refreshAll: true, urls});
            chrome.runtime.sendMessage({ target: 'background', type: 'refreshAllThumbs', data: { bookmarks } });
            showToast(' Capturing images...')
        }
    }).catch(err => {
        console.log(err);
    });
}


// assumes 'bookmarks' param is content of a folder (from getBookmarks)
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

// 显示初始设置界面
async function printNewSetup() {
    let fragment = document.createDocumentFragment();

    // Ensure the container exists
    let folderContainerEl = document.getElementById(selectedGroupId);
    console.log("new install，@speedDialId:", selectedGroupId);
    if (!folderContainerEl) {
        folderContainerEl = document.createElement('div');
        folderContainerEl.id = selectedGroupId;
        folderContainerEl.classList.add('container');
        folderContainerEl.style.display = currentGroupId === selectedGroupId ? 'flex' : 'none';
        folderContainerEl.style.opacity = "0";

        if (currentGroupId === selectedGroupId) {
            setTimeout(() => {
                folderContainerEl.style.opacity = "1";
                animate();
            }, 20);
            document.querySelector(`[folderid="${currentGroupId}"]`)?.classList.add('activeFolder');
        }
        bookmarksContainerParent.append(folderContainerEl);
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
    folderContainerEl.textContent = ''; // Clears old content efficiently
    folderContainerEl.append(fragment);

    bookmarksContainerParent.scrollTop = scrollPos;
}

function createNewDialButton(groupId) {
    let aNewDial = document.createElement('a');
    aNewDial.classList.add('tile', 'createDial');
    aNewDial.onclick = () => {
        hideSettings();
        buildCreateDialModal(groupId);
        modalShowEffect(createDialModalContent, createDialModal);
    };

    let main = document.createElement('div');
    main.classList.add('tile-main');

    let content = document.createElement('div');
    content.classList.add('tile-content', 'createDial-content');
    main.appendChild(content);
    aNewDial.appendChild(main);

    return aNewDial;
}

async function printBookmarks(bookmarks, selectedGroupId) {
    console.log("printBookmarks:", bookmarks, selectedGroupId);
    let fragment = document.createDocumentFragment();

    // Collect URLs for batch thumbnail fetching
    //let urls = bookmarks.filter(b => b.url?.startsWith("http")).map(b => b.url);

    // lets message the background script to do it  
    
    // reverse the bookmarks if settings.defaultSort === "first")
    if (settings.defaultSort === "first") {
        bookmarks = bookmarks.reverse();
    }
    // chrome.runtime.sendMessage({target: 'background', type: 'getThumbs', data: bookmarks})
    //let thumbnails = await chrome.storage.local.get(urls);

    // Process bookmarks
    if (bookmarks) {
        for (let bookmark of bookmarks) {
            console.log("processing bookmark:", bookmark);
            // if (!bookmark.url && bookmark.title && bookmark.groupId === selectedGroupId) continue;

            if (bookmark.url?.startsWith("http")) {
                //let images = thumbnails[bookmark.url] || {};
                //let thumbUrl = images.thumbnails?.[images.thumbIndex] || null;
                //let thumbBg = images.bgColor || null;

                let a = document.createElement('a');
                a.classList.add('tile');
                a.href = bookmark.url;
                a.setAttribute('data-id', bookmark.id);

                let main = document.createElement('div');
                main.classList.add('tile-main');

                let content = document.createElement('div');
                content.setAttribute('id', bookmark.groupId + "-" + bookmark.id);
                content.classList.add('tile-content');
                //content.style.backgroundImage = thumbBg ? `url('${thumbUrl}'), ${thumbBg}` : '';
                //content.style.backgroundColor = thumbBg ? '' : 'rgba(255, 255, 255, 0.5)';
                content.style.backgroundColor =  'rgba(255, 255, 255, 0.5)';

                let title = document.createElement('div');
                title.classList.add('tile-title');
                if (!settings.showTitles) {
                    title.classList.add('hide');
                }
                title.textContent = bookmark.title;

                main.append(content, title);
                a.appendChild(main);
                fragment.appendChild(a);
            }
        }
    }

    let newDialButton = createNewDialButton(selectedGroupId);

    if (settings.defaultSort !== "first") {
        fragment.appendChild(newDialButton);
    } else {
        fragment.insertBefore(newDialButton, fragment.firstChild);
    }

    // Ensure the container exists
    let folderContainerEl = document.getElementById(selectedGroupId);
    if (!folderContainerEl) {
        folderContainerEl = document.createElement('div');
        folderContainerEl.id = selectedGroupId;
        folderContainerEl.classList.add('container');
        folderContainerEl.style.display = currentGroupId === selectedGroupId ? 'flex' : 'none';
        //folderContainerEl.style.opacity = settings.rememberFolder && currentFolder === parentId ? '0' : '1';
        folderContainerEl.style.opacity = "0";

        if (currentGroupId === selectedGroupId) {
            setTimeout(() => {
                folderContainerEl.style.opacity = "1";
                animate();
            }, 20);
            document.querySelector(`[folderid="${currentGroupId}"]`)?.classList.add('activeFolder');
        }
        bookmarksContainerParent.append(folderContainerEl);
    }

    // Sortable configuration
    new Sortable(folderContainerEl, {
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

    // Optimize container update using batch insert
    folderContainerEl.textContent = ''; // todo: is this even required here? would innerHTML = '' be preferable?
    batchInsert(folderContainerEl, fragment, 50)

    bookmarksContainerParent.scrollTop = scrollPos;
}

function showContextMenu(el, top, left) {
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

function hideMenus() {
    let menus = [menu, settingsMenu, folderMenu]
    for (let el of menus) {
        el.style.visibility = "hidden";
        el.style.opacity = "0";
    }
}

function openSettings() {
    sidenav.style.boxShadow = "0px 2px 8px 0px rgba(0,0,0,0.5)";
    sidenav.style.transform = "translateX(0%)";
}

function hideSettings() {
    sidenav.style.transform = "translateX(100%)";
    sidenav.style.boxShadow = "none";
}

function hideModals() {
    let modals = [modal, createDialModal, createGroupModal, editGroupModal, deleteGroupModal, refreshAllModal, importExportModal];
    let modalContents = [modalContent, createDialModalContent, createFolderModalContent, editFolderModalContent, deleteFolderModalContent, refreshAllModalContent, importExportModalContent]

    for (let button of document.getElementsByTagName('button')) {
        button.blur();
    }

    for (let input of document.getElementsByTagName('input')) {
        input.blur();
    }

    for (let el of modalContents) {
        el.style.transform = "scale(0.8)";
        el.style.opacity = "0";
    }

    for (let el of modals) {
        el.style.opacity = "0";
        setTimeout(function () {
            el.style.transform = "translateX(100%)";
        }, 160);
    }

    // Reset modalBtnContainer and imageUrlContainer
    document.getElementById('modalBtnContainer').style.display = 'flex';
    document.getElementById('imageUrlContainer').style.display = 'none';
    modalImageURLInput.value = '';

    // hide search
    searchInput.blur();
    searchContainer.classList.remove('active');

    if (searchInput.value) {
        searchInput.value = ''; // Clear the search input
        filterDials(''); // Only call if there was a search term
    }

}

function modalShowEffect(contentEl, modalEl) {
    modalEl.style.transform = "translateX(0%)";
    modalEl.style.opacity = "1";
    contentEl.style.transform = "scale(1)";
    contentEl.style.opacity = "1";
}

function hideToast() {
    if (isToastVisible) {
        toast.style.transform = "translateX(100%)";
        toastContent.innerText = '';
        isToastVisible = false;
    }
}

function showToast(message) {
    if (!isToastVisible) {
        toastContent.innerText = message;
        toast.style.transform = "translateX(0%)";
        isToastVisible = true;
    }
}

function buildCreateDialModal(parentId) {
    createDialModalURL.value = '';
    createDialModalURL.parentId = parentId ? parentId : selectedGroupId;
    createDialModalURL.focus();
}

async function buildModal(url, title) {
    // nuke any previous modal
    let carousel = document.getElementById("carousel");
    if (carousel) {
        modalImgContainer.removeChild(carousel);
    }

    let customCarousel = document.getElementById("customCarousel");
    if (customCarousel) {
        modalImgContainer.removeChild(customCarousel);
    }

    let newCarousel = document.createElement('div');
    newCarousel.setAttribute('id', 'carousel');
    modalImgContainer.appendChild(newCarousel);

    //let createdCarousel = document.getElementById('carousel');
    modalTitle.value = title;
    modalURL.value = url;
    let images = await getThumbs(url);
    if (images && images.thumbnails.length) {
        // clunky af
        let index = images.thumbIndex;
        let imgDiv = document.createElement('div');
        let img = document.createElement('img');
        img.crossOrigin = 'Anonymous';
        img.setAttribute('src', images.thumbnails[index]);
        img.onerror = function () {
            img.setAttribute('src', 'img/default.png'); // todo: image is borked, cleanup
        };
        imgDiv.appendChild(img);

        img.onload = function () {
            // read the bg color and set the color picker preview
            // todo: stop storing bg in gradient format jesus
            let bgColor = cssGradientToHex(images.bgColor);
            if (bgColor) {
                setInputValue(modalBgColorPickerInput, rgbToHex(bgColor))
            }
        }

        newCarousel.appendChild(imgDiv);
        for (let [i, image] of images.thumbnails.entries()) {
            if (i !== index) {
                let imgDiv = document.createElement('div');
                let img = document.createElement('img');
                img.crossOrigin = 'Anonymous';
                img.setAttribute('src', image);
                img.onerror = function () {
                    img.setAttribute('src', 'img/default.png'); // todo: cleanup
                };
                imgDiv.appendChild(img);
                newCarousel.appendChild(imgDiv);
            }
        }
        $('#carousel').flexCarousel({ height: '180px' });

        // listen for carousel navigation to updade the bg color button preview
        let fcNext = document.querySelector('.fc-next');
        if (fcNext) {
            fcNext.addEventListener('click', function () {
                let cc = document.getElementById('customCarousel');
                if (cc) {
                    selectedImageSrc = customCarousel.children[0].src;
                    let bgColor = getBgColor(customCarousel.children[0]);
                    if (bgColor) {
                        setInputValue(modalBgColorPickerInput, rgbToHex(bgColor))
                    }
                } else {
                    let imageNodes = document.getElementsByClassName('fc-slide');
                    for (let node of imageNodes) {
                        // div with order "2" is the one being displayed by the carousel
                        if (node.style.order === '2') {
                            
                            // sometimes the carousel puts images inside a <figure class="fc-image"> elem
                            if (node.children[0].className === "fc-image") {
                                //selectedImageSrc = node.children[0].children[0].src;
                                let bgColor = getBgColor(node.children[0].children[0]);
                                if (bgColor) {
                                    //setInputValue(modalBgColorPickerInput, rgbToHex(bgColor))
                                    setInputValue(modalBgColorPickerInput, rgbToHex(bgColor))
                                }
                            } else {
                                //selectedImageSrc = node.children[0].src;
                                let bgColor = getBgColor(node.children[0]);
                                if (bgColor) {
                                    setInputValue(modalBgColorPickerInput, rgbToHex(bgColor))
                                }
                            }
                        }
                    }
                }
            });
        }

        let fcPrev = document.querySelector('.fc-prev');
        if (fcPrev) {
            fcPrev.addEventListener('click', function () {
                let cc = document.getElementById('customCarousel');
                if (cc) {
                    selectedImageSrc = customCarousel.children[0].src;
                    let bgColor = getBgColor(customCarousel.children[0]);
                    if (bgColor) {
                        setInputValue(modalBgColorPickerInput, rgbToHex(bgColor))
                    }
                } else {
                    let imageNodes = document.getElementsByClassName('fc-slide');
                    for (let node of imageNodes) {
                        // div with order "2" is the one being displayed by the carousel
                        if (node.style.order === '2') {
                            
                            // sometimes the carousel puts images inside a <figure class="fc-image"> elem
                            if (node.children[0].className === "fc-image") {
                                //selectedImageSrc = node.children[0].children[0].src;
                                let bgColor = getBgColor(node.children[0].children[0]);
                                if (bgColor) {
                                    //setInputValue(modalBgColorPickerInput, rgbToHex(bgColor))
                                    setInputValue(modalBgColorPickerInput, rgbToHex(bgColor))
                                }
                            } else {
                                //selectedImageSrc = node.children[0].src;
                                let bgColor = getBgColor(node.children[0]);
                                if (bgColor) {
                                    setInputValue(modalBgColorPickerInput, rgbToHex(bgColor))
                                }
                            }
                        }
                    }
                }
            });
        }

    }
}

function rectifyUrl(url) {
    if (url && !url.startsWith('https://') && !url.startsWith('http://')) {
        return 'https://' + url;
    } else {
        return url;
    }
}

// 添加新书签
function createDial() {
    console.log('createDial', createDialModalURL);
    let url = rectifyUrl(createDialModalURL.value.trim());
    // todo: 真正使用标题而
    let title = url;
    saveNewBookmark(currentGroupId, url, title).then(_ => {
        hideModals();
        showToast(' Capturing images...')
        chrome.runtime.sendMessage({ target: 'background', type: 'handleBookmarkChanged', data: { groupId:currentGroupId,changeType:'Add' } });
    });
}

// 保存新书签
async function saveNewBookmark(groupId, url, title) {
    if (!url || !title) return;
    
    const data = await getData();
    // 获取当前分组的最大位置
    const groupBookmarks = data.bookmarks.filter(b => b.groupId === groupId);
    const maxPosition = groupBookmarks.length > 0 
        ? Math.max(...groupBookmarks.map(b => b.position || 0)) 
        : 0;
    
    const newBookmark = {
        id: generateId(),
        groupId: groupId,
        title: title,
        url: url,
        position: maxPosition + 1,
        thumbnail: null,
        visits: 0,
        createtime: new Date().toISOString()
    };
    
    data.bookmarks.push(newBookmark);
    await saveData(data);
}

// 生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function openAllTabs() {
    let folder = currentGroup ? document.getElementById(currentGroup) : document.getElementById('wrap');

    if (folder) {
        let dials = [...folder.getElementsByClassName('tile')];

        dials?.forEach(dial => {
            if (dial.href) {
                chrome.tabs.create({
                    url: dial.href,
                    active: false
                });
            }
        });
    }
}

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

function colorsAreSimilar(color1, color2, tolerance = 2) {
    return Math.abs(color1[0] - color2[0]) <= tolerance &&
           Math.abs(color1[1] - color2[1]) <= tolerance &&
           Math.abs(color1[2] - color2[2]) <= tolerance &&
           Math.abs(color1[3] - color2[3]) <= tolerance;
}

// calculate the bg color of a given image. returns rgba array [r, g, b, a]
// todo: duped in offscreen logic; punt this to a worker
function getBgColor(img) {
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

function rgbToHex(rgbArray) {
    // todo: support alpha value
    // Convert RGB values to hex color
    let r = Math.round(rgbArray[0]);
    let g = Math.round(rgbArray[1]);
    let b = Math.round(rgbArray[2]);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function hexToRgba(hex) {
    // Convert hex color to RGBA values
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    let a = 1; // Default alpha value
    return [r, g, b, a];
}

function rgbaToCssGradient(rgba) {
    // Convert RGBA values to CSS gradient string
    // gradient is used as a shortcut to set the background color at same time as image
    return `linear-gradient(to bottom, rgba(${rgba[0]},${rgba[1]},${rgba[2]},${rgba[3]}) 50%, rgba(${rgba[0]},${rgba[1]},${rgba[2]},${rgba[3]}) 50%)`;
}

function hexToCssGradient(hex) {
    // Convert hex color to CSS gradient string
    let rgba = hexToRgba(hex);
    return rgbaToCssGradient(rgba);
}

function cssGradientToHex(gradientString) {
    // css string is in format: 'linear-gradient(to bottom, rgba(255,255,255,1) 50%, rgba(0,0,0,1) 50%)'
    const rgbaString = gradientString.split('rgba(')[1].split(')')[0];
    const [r, g, b, a] = rgbaString.split(',').map(Number);
    return [r, g, b, a];
}

function saveBookmarkSettings() {
    // todo: cleanup this abomination when im not on drugs
    let title = modalTitle.value;
    let url = targetTileHref;
    let newUrl = rectifyUrl(modalURL.value.trim());
    let selectedImageSrc = null;
    let thumbIndex = 0;
    let imageNodes = document.getElementsByClassName('fc-slide');
    let bgColor = null;
    let colorPickerColor = modalBgColorPickerInput.value;

    let customCarousel = document.getElementById('customCarousel');
    if (customCarousel) {
        selectedImageSrc = customCarousel.children[0].src;
        bgColor = getBgColor(customCarousel.children[0]);
        if (colorPickerColor && colorPickerColor !== rgbToHex(bgColor)) {
            //console.log("colors dont match, using the picker!")
            bgColor = hexToCssGradient(colorPickerColor);
        } else {
            bgColor = rgbaToCssGradient(bgColor);
        }
        targetNode.children[0].children[0].style.backgroundImage = `url('${selectedImageSrc}'), ${bgColor}`;
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
                chrome.storage.local.set({ [newUrl]: { thumbnails, thumbIndex, bgColor } }).then(result => {
                    //tabMessagePort.postMessage({updateCache: true, url: newUrl, i: thumbIndex});
                    if (title !== targetTileTitle) {
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
                targetNode.children[0].children[0].style.backgroundImage = `url('${selectedImageSrc}'), ${bgColor}`;
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
                            if (title !== targetTileTitle || url !== newUrl) {
                                updateTitle()
                            }
                        });
                    } else {
                        if (title !== targetTileTitle || url !== newUrl) {
                            updateTitle()
                        }
                    }
                } else {
                    if (title !== targetTileTitle || url !== newUrl) {
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

// todo: why did i debounce animate but not layout? (because we want tiles to move immediately as manually resizing window)
function layout(force = false) {
    if (force || layoutFolder || containerSize !== getComputedStyle(bookmarksContainer).maxWidth || windowSize !== window.innerWidth) {
        windowSize = window.innerWidth;
        containerSize = getComputedStyle(bookmarksContainer).maxWidth;

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

        // layoutFolder true on folder open -- zero duration because we are just setting the positions of the dials, so whenever
        // a resize occurs the animation will start from the right position
        if (nodesToAnimate.length > 0 || force) {
            let duration = layoutFolder ? 0 : 0.7;
            TweenMax.staggerTo(nodesToAnimate, duration, { x: 0, y: 0, stagger: { amount: 0.2 }, ease });
        }

        layoutFolder = false;
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

const animate = debounce(() => {
    requestAnimationFrame(() => { // Use requestAnimationFrame for smoother updates
    // let currentParent;
    // if (currentGroup) {
    //     currentParent = currentGroup
    // }
    const nodes = document.querySelectorAll(`[id="${selectedGroupId}"] > .tile`);
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

function readURL(input) {
    if (input.files && input.files[0]) {
        reader.readAsDataURL(input.files[0]);
    }
}

function resizeBackground(dataURI) {
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

// todo: completely offload this shit to the worker
function resizeThumb(dataURI) {
    return new Promise(function (resolve, reject) {
        let img = new Image();
        img.onload = async function () {
            if (this.height > 256 && this.width > 256) {
                // when im less lazy check use optimal w/h based on image
                // set height to 256 and scale
                let height = 256;
                let ratio = height / this.height;
                let width = Math.round(this.width * ratio);

                let canvas = new OffscreenCanvas(width, height)
                let ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.imageSmoothingEnabled = true;
                ctx.drawImage(this, 0, 0, width, height);

                // Use convertToBlob instead of toDataURL
                const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.85 });
                const reader = new FileReader();
                reader.onload = function (e) {
                    resolve(e.target.result); // Resolve with the data URI
                };
                reader.onerror = function (err) {
                    reject(err);
                };
                reader.readAsDataURL(blob)
            } else {
                resolve(dataURI);
            }
        };
        img.src = dataURI;
    })
}

function readImage(input) {
    return new Promise(function (resolve, reject) {
        let filereader = new FileReader();
        filereader.onload = function (e) {
            resolve(e.target.result);
        };
        if (input.files && input.files[0]) {
            filereader.readAsDataURL(input.files[0]);
        }
    });
}

//todo: deletability yo
function addImage(image) {
    let carousel = document.getElementById('carousel');
    if (carousel) {
        carousel.style.display = "none";
        let customCarousel = document.getElementById('customCarousel');
        if (customCarousel) {
            customCarousel.remove();
        }
        customCarousel = document.createElement('div');
        customCarousel.setAttribute('id', 'customCarousel');
        customCarousel.style.height = "180px";

        let preview = document.createElement('img');
        preview.style.height = '100%';
        preview.style.width = '100%';
        preview.style.objectFit = 'contain';
        preview.setAttribute('src', image);

        customCarousel.appendChild(preview);
        modalImgContainer.appendChild(customCarousel);

        // set the color picker to the new image bg color
        preview.onload = function() {
            let bgColor = getBgColor(preview);
            if (bgColor) {
                setInputValue(modalBgColorPickerInput, rgbToHex(bgColor))
            }
        };
    }
}

// 根据设置应用样式
function applySettings() {
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

        if (settings.showFolders) {
            document.documentElement.style.setProperty('--show-folders', 'inline');
        } else {
            document.documentElement.style.setProperty('--show-folders', 'none');
        }

        if (settings.showClock) {
            clock.style.setProperty('--clock', 'block');
        } else {
            clock.style.setProperty('--clock', 'none');
        }

        if (settings.showSettingsBtn) {
            settingsBtn.style.setProperty('--settings', 'block');
        } else {
            settingsBtn.style.setProperty('--settings', 'none');
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
        wallPaperEnabled.checked = settings.wallpaper;
        color_picker.value = settings.backgroundColor;
        color_picker_wrapper.style.backgroundColor = settings.backgroundColor;
        textColor_picker.value = settings.textColor;
        textColor_picker_wrapper.style.backgroundColor = settings.textColor;
        showTitlesInput.checked = settings.showTitles;
        showCreateDialInput.checked = settings.showAddSite;
        largeTilesInput.checked = settings.largeTiles;
        showFoldersInput.checked = settings.showFolders;
        showClockInput.checked = settings.showClock;
        showSettingsBtnInput.checked = settings.showSettingsBtn;
        maxColsInput.value = settings.maxCols;
        dialSizeInput.value = settings.dialSize;
        dialRatioInput.value = settings.dialRatio;
        defaultSortInput.value = settings.defaultSort;
        rememberFolderInput.checked = settings.rememberFolder;

        if (settings.wallpaperSrc) {
            imgPreview.setAttribute('src', settings.wallpaperSrc);
            //imgPreview.style.display = 'block';
            imgPreview.onload = function (e) {
                if (settings.wallpaper) {
                    backgroundColorContainer.style.display = "none";
                    previewContainer.style.opacity = '1';
                    switchesContainer.style.transform = "translateY(0)";

                    //backgroundColorContainer.style.display = 'none';
                } else {
                    backgroundColorContainer.style.display = "flex";
                    previewContainer.style.opacity = '0';
                    switchesContainer.style.transform = `translateY(-${previewContainer.offsetHeight}px)`;
                }
            }
            imgPreview.onerror = function (e) {
                // reset to default on error with user image
                settings.wallpaperSrc = 'img/bg.jpg';
                imgPreview.setAttribute('src', settings.wallpaperSrc);
                chrome.storage.local.set({ settings });
            }
        }

    });
}

// 保存设置
function saveSettings() {
    settings.wallpaper = wallPaperEnabled.checked;
    settings.wallpaperSrc = imgPreview.src;
    settings.backgroundColor = color_picker.value;
    settings.textColor = textColor_picker.value;
    settings.showTitles = showTitlesInput.checked;
    settings.showAddSite = showCreateDialInput.checked;
    settings.largeTiles = largeTilesInput.checked;
    settings.showFolders = showFoldersInput.checked;
    settings.showClock = showClock.checked;
    settings.showSettingsBtn = showSettingsBtn.checked;
    settings.maxCols = maxColsInput.value;
    settings.dialSize = dialSizeInput.value;
    settings.dialRatio = dialRatioInput.value;
    settings.defaultSort = defaultSortInput.value;
    settings.rememberFolder = rememberFolderInput.checked;
    settings.currentFolder = currentGroup ? currentGroup : selectedGroupId;

    applySettings();

    chrome.storage.local.set({ settings })
        .then(() => {
            /*
            settingsToast.style.opacity = "1";
            setTimeout(function () {
                settingsToast.style.opacity = "0";
            }, 3500);
             */

            //tabMessagePort.postMessage({updateSettings: true});
        });
}

// override context menu
document.addEventListener("contextmenu", function (e) {
    if (e.target.type === 'text' && (e.target.id === 'modalTitle' || e.target.id === 'modalURL' || e.target.id === 'modalImageURLInput' || e.target.id === 'createDialModalURL')) {
        return;
    }
    e.preventDefault();
    // prevent settings from being opened and immediately hidden when right-clicking the gear icon
    if (e.target.id === 'settingsDiv') {
        return;
    }
    hideSettings();
    if (e.target.className === 'tile-content') {
        targetNode = e.target.parentElement.parentElement;
        targetTileHref = e.target.parentElement.parentElement.href;
        targetTileId = e.target.id;
        targetTileTitle = e.target.nextElementSibling.innerText;
        showContextMenu(menu, e.pageY, e.pageX);
        return false;
    } else if (e.target.classList.contains('folderTitle') && e.target.id !== "homeFolderLink") {
        targetGroupLink = e.target;
        targetGroupId = e.target.attributes.folderId.nodeValue;
        targetGroupName = e.target.textContent;
        showContextMenu(folderMenu, e.pageY, e.pageX);
        return false;
    } else if (e.target === document.body || e.target.className === 'folders' || e.target.className === 'container' || e.target.className === 'tileContainer' || e.target.className === 'cta-container' || e.target.className === 'default-content' || e.target.className === 'default-content helpText') {
        showContextMenu(settingsMenu, e.pageY, e.pageX);
        return false;
    }
});

// todo: tidy this up
window.addEventListener("click", e => {
    if (typeof e.target.className === 'string' && e.target.className.indexOf('settingsCtl') >= 0) {
        return;
    }
    if (e.target.className === 'tile-content' || e.target.className === 'tile-title') {
        return;
    }
    e.preventDefault();
});

// listen for menu item
window.addEventListener("mousedown", e => {
    console.log(e.target);
    hideMenus();
    if (e.target.type === 'text' || e.target.id === 'maxcols' || e.target.id === 'defaultSort' || e.target.id === 'dialSize' || e.target.id === 'dialRatio') {
        return
    }
    if (e.target.className.baseVal === 'gear') {
        openSettings();
        return;
    }
    if (e.target.closest('#splashAddDial')) {
        e.preventDefault();
        buildCreateDialModal(currentGroupId);
        modalShowEffect(createDialModalContent, createDialModal);
        return;
    }
    if (e.target.closest('#splashImport')) {
        e.preventDefault();
        modalShowEffect(importExportModalContent, importExportModal);
        //importFileInput.click();
        return;
    }

    console.log("classname:"+e.target.className);
    switch (e.target.className) {
        // todo: invert this
        case 'default-content':
        case 'default-content helpText':
        case 'tile-content':
        case 'tile-title':
        case 'container':
        case 'tileContainer':
        case 'cta-container':
        case 'folders':
            hideSettings();
            break;
        case 'modal':
            hideModals();
            break;
        case 'menu-option':
            switch (e.target.id) {
                case 'openSettings':
                    openSettings();
                    break;
                case 'newTab':
                    chrome.tabs.create({ url: targetTileHref });
                    break;
                case 'newBackgroundTab':
                    chrome.tabs.create({ url: targetTileHref, active: false });
                    break;
                case 'newWin':
                    chrome.windows.create({ "url": targetTileHref });
                    break;
                case 'newPrivate':
                    chrome.windows.create({ "url": targetTileHref, "incognito": true });
                    break;
                case 'openAll':
                    openAllTabs();
                    break;
                case 'edit':
                    buildModal(targetTileHref, targetTileTitle).then(() => {
                        modalShowEffect(modalContent, modal);
                    });
                    break;
                case 'refresh':
                    refreshThumbnails(targetTileHref, targetTileId);
                    break;
                case 'refreshAll':
                    modalShowEffect(refreshAllModalContent, refreshAllModal);
                    break;
                case 'delete':
                    console.log("deleting "+ e.target);
                    removeBookmark(targetTileId.split('-')[1]);
                    break;
                case 'editFolder':
                    editFolderModalName.value = targetGroupName;
                    modalShowEffect(editFolderModalContent, editGroupModal);
                    break;
                case 'deleteFolder':
                    deleteFolderModalName.textContent = targetGroupName;
                    modalShowEffect(deleteFolderModalContent, deleteGroupModal);
                    break;
                case 'newDial':
                    // prevent default required to stop focus from leaving the modal input
                    e.preventDefault();
                    buildCreateDialModal(currentGroup);
                    modalShowEffect(createDialModalContent, createDialModal);
                    break;
                case 'newFolder':
                    e.preventDefault();
                    addGroupBtn();
                    break;
            }
            break;
        default:
            e.preventDefault();
    }
});

window.addEventListener("keydown", event => {
    if (event.code === "Escape") {
        hideMenus();
        hideModals();
    } else if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault(); // Prevent the default browser behavior
        searchContainer.classList.toggle('active');
        // focus it
        setTimeout(() => searchInput.focus(), 200); // cant focus it immediate with the transition, Delay focus to ensure visibility
    }
});

modalSave.addEventListener("click", saveBookmarkSettings);
createDialModalSave.addEventListener("click", createDial);
addGroupButton.addEventListener("click", addGroupBtn);
createGroupModalSave.addEventListener("click", createGroup);
editGroupModalSave.addEventListener("click", editGroup);
deleteGroupModalSave.addEventListener("click", removeFolder);
refreshAllModalSave.addEventListener("click", refreshAllThumbnails);

for (let button of closeModal) {
    button.onclick = function (e) {
        e.preventDefault();
        hideModals();
    };
}

modalTitle.addEventListener('keydown', e => {
    if (e.code === "Enter") {
        e.preventDefault();
        saveBookmarkSettings();
    }
});

modalURL.addEventListener('keydown', e => {
    if (e.code === "Enter") {
        e.preventDefault();
        saveBookmarkSettings();
    }
});

createDialModalURL.addEventListener('keydown', e => {
    if (e.code === "Enter") {
        e.preventDefault();
        createDial();
    }
});

modalImgBtn.addEventListener('click', function () {
    document.getElementById('modalImgFile').click();
});

modalImgInput.onchange = function () {
    readImage(this).then(image => {
        resizeThumb(image).then(resizedImage => {
            addImage(resizedImage);
        })
    });
};


maxColsInput.oninput = function (e) {
    saveSettings()
}

dialSizeInput.oninput = function (e) {
    saveSettings()
}

dialRatioInput.oninput = function (e) {
    saveSettings()
}

defaultSortInput.oninput = function (e) {
    if (settings.defaultSort !== defaultSortInput.value) {
        processRefresh();
        saveSettings()
    }
}

wallPaperEnabled.oninput = function (e) {
    saveSettings()
}

color_picker.onchange = function () {
    color_picker_wrapper.style.backgroundColor = color_picker.value;
    saveSettings()
};

textColor_picker.onchange = function () {
    textColor_picker_wrapper.style.backgroundColor = textColor_picker.value;
    if (settings.textColor !== textColor_picker.value) {
        saveSettings()
    }
};

showTitlesInput.oninput = function (e) {
    saveSettings()
}

showCreateDialInput.oninput = function (e) {
    saveSettings()
}

showFoldersInput.oninput = function (e) {
    saveSettings()
}

showClockInput.oninput = function (e) {
    saveSettings()
}

rememberFolderInput.oninput = function (e) {
    saveSettings()
}

showSettingsBtnInput.oninput = function (e) {
    saveSettings()
}

reader.onload = function (e) {
    resizeBackground(e.target.result).then(imagedata => {
        imgPreview.setAttribute('src', imagedata);
        imgPreview.style.display = 'block';
        // dynamically set text color based on background
        /*
        getAverageRGB(imagedata).then(rgb => {
            let textColor = contrast(rgb);
            settings.textColor = textColor
            document.documentElement.style.setProperty('--color', textColor);
        });
         */
        saveSettings()
    })
};

imgInput.onchange = function () {
    readURL(this);
};

previewOverlay.onclick = function () {
    imgInput.click();
}

// add image from url button clicked, show the input field
modalImgUrlBtn.addEventListener('click', function (event) {
    event.preventDefault();
    document.getElementById('modalBtnContainer').style.display = 'none';
    document.getElementById('imageUrlContainer').style.display = 'flex';
    modalImageURLInput.focus();
});

closeImgUrlBtn.addEventListener('click', function (event) {
    event.preventDefault();
    document.getElementById('modalBtnContainer').style.display = 'flex';
    document.getElementById('imageUrlContainer').style.display = 'none';
    modalImageURLInput.value = '';
});

// fetch the image from the url
fetchImageButton.addEventListener('click', function (event) {
    event.preventDefault();
    const imageUrl = modalImageURLInput.value.trim();
    if (imageUrl) {
        resizeThumb(imageUrl).then(resizedImage => {
            addImage(resizedImage);
        }).catch(error => {
            // todo: show error message to user in the modal
            console.error('Error adding image from URL:', error);
        });
    }
});

modalBgColorPickerBtn.addEventListener('click', function () {
    // todo: support alpha
    // eyedropper currently chrome on windows/mac only
    if ('EyeDropper' in window) {
        const eyeDropper = new EyeDropper();
        eyeDropper.open().then(result => {
            const color = result.sRGBHex;
            setInputValue(modalBgColorPickerInput, color);
        }).catch(error => {
            console.log('Error opening color picker:', error);
        });
    } else {
        document.getElementById('modalBgColorPickerInput').click();
    }
});

modalBgColorPickerInput.addEventListener('input', function () {
    const color = this.value; // in hex
    // set the our button color to match
    modalBgColorPreview.style.fill = color;
});

// helper function for when we set the color picker value programmatically to update our button
function setInputValue(inputElement, value) {
    inputElement.value = value;
    inputElement.dispatchEvent(new Event('input'));
}

document.getElementById('closeSettingsBtn').addEventListener('click', () => {
    hideSettings();
});


function prepareExportV1() {
    chrome.storage.local.get(null).then(function (items) {
        // filter out unused thumbnails to keep exported file efficient
        let filteredItems = {};
        for (const [key, value] of Object.entries(items)) {
            if (key.startsWith('http')) {
                let thumbnails = [];
                let thumbIndex = 0;
                let bgColor = null;

                if (value.thumbnails && value.thumbnails.length) {
                    thumbnails.push(value.thumbnails[value.thumbIndex]);
                }
                if (value.bgColor) {
                    bgColor = value.bgColor;
                }
                filteredItems[key] = {
                    thumbnails: thumbnails,
                    thumbIndex: thumbIndex,
                    bgColor: value.bgColor
                };
            } else if (key.startsWith('settings')) {
                filteredItems[key] = value;
            }
        }

        // save as file; requires downloads permission
        const blob = new Blob([JSON.stringify(filteredItems)], { type: 'application/json' })
        const today = new Date();
        const dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

        exportBtn.setAttribute('href', URL.createObjectURL(blob));
        exportBtn.download = `yasd-export-${dateString}.json`;
        exportBtn.classList.remove('disabled');

    });
}

function prepareExport() {
    // exports yasd json file that includes all bookmarks within the root speed dial folder, along with the yasd settings and thumbnails from storage
    // in the following format:

    /*
    const yasdJson = {
        "yasd": {
            "bookmarks":[
                {"id":123,"title":"Site Title","url":"https://www.website.com","index":1,"folderid":3}
            ],
            "folders":[
                {"id":123,"title":"Folder Title","index":1}
            ],
            "settings":{
                "showClock":true,
                "backgroundImage":""
            },
            "dials": [
                {"https://361114779041.signin.aws.amazon.com/console":{"thumbnails":["data:image/webp;asdfasdf.png","sdfsdfsdfsdfsdf"],"thumbIndex":0,"bgColor":"red"}},
                {"https://361114779041.signin.aws.amazon.com/console":{"thumbnails":["data:image/webp;asdfasdf.png","sdfsdfsdfsdfsdf"],"thumbIndex":0,"bgColor":"red"}}
            ]
        }
    }
    */

    let yasdJson = {
        yasd: {
            version: 3,
            bookmarks: [],
            folders: [],
            settings: {},
            dials: []
        }
    };

    // Get bookmarks and folders within the speed dial folder
    chrome.bookmarks.getSubTree(selectedGroupId).then(bookmarkTreeNodes => {
        function traverseBookmarks(nodes, parentId = null) {
            nodes.forEach(node => {
                if (node.url) {
                    yasdJson.yasd.bookmarks.push({
                        id: node.id,
                        title: node.title,
                        url: node.url,
                        index: node.index,
                        folderid: parentId
                    });
                } else {
                    yasdJson.yasd.folders.push({
                        id: node.id,
                        title: node.title,
                        index: node.index
                    });
                    if (node.children) {
                        traverseBookmarks(node.children, node.id);
                    }
                }
            });
        }
        traverseBookmarks(bookmarkTreeNodes[0].children);

        // Get YASD settings and thumbnails from storage
        chrome.storage.local.get(null).then(items => {
            for (const [key, value] of Object.entries(items)) {
                if (key.startsWith('settings')) {
                    yasdJson.yasd.settings[key] = value;
                } else if (key.startsWith('http')) {
                    let thumbnails = [];
                    if (value.thumbnails && value.thumbnails.length) {
                        thumbnails.push(value.thumbnails[value.thumbIndex]);
                    }
                    yasdJson.yasd.dials.push({
                        [key]: {
                            thumbnails: thumbnails,
                            thumbIndex: 0,
                            bgColor: value.bgColor
                        }
                    });
                }
            }

            // Save as file; requires downloads permission
            const blob = new Blob([JSON.stringify(yasdJson)], { type: 'application/json' });
            const today = new Date();
            const dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}-v3`;

            exportBtn.setAttribute('href', URL.createObjectURL(blob));
            exportBtn.download = `yasd-export-${dateString}.json`;
            exportBtn.classList.remove('disabled');
        });
    });
}


importExportBtn.onclick = function () {
    hideSettings();
    importExportStatus.innerText = "";
    exportBtn.classList.add('disabled');
    prepareExport();
    modalShowEffect(importExportModalContent, importExportModal);
}

helpBtn.onclick = function () {
    chrome.tabs.create({ url: helpUrl });
}

importFileLabel.onclick = function () {
    importFileInput.click();
}

function parseJson(event) {
    try {
        return JSON.parse(event.target.result);
    } catch (err) {
        console.log(err);
        importExportStatus.innerText = "Error! Unable to parse file.";
        return null;
    }
}

// Add event listener for search input
searchInput.addEventListener('input', function (e) {
    const searchTerm = e.target.value.toLowerCase();
    filterDials(searchTerm);
});

function filterDials(searchTerm) {
    const currentParent = currentGroup;
    const dials = document.querySelectorAll(`[id="${currentParent}"] > .tile`);

    dials.forEach(dial => {
        if (!settings.showAddSite && dial.classList.contains('createDial')) {
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


document.getElementById('closeSearch').addEventListener('click', () => {
    const searchInput = document.getElementById('searchInput');
    const searchContainer = document.getElementById('searchContainer');
    
    searchInput.value = ''; // Clear the search input
    searchContainer.classList.remove('active'); // Hide the search container
    filterDials('');
});


importFileInput.onchange = function (event) {
    let filereader = new FileReader();

    filereader.onload = function (event) {
        let json = parseJson(event);
        if (!json) return;

        // quiet the listeners so yasd doesnt go crazy
        chrome.runtime.sendMessage({ target: 'background', type: 'toggleBookmarkCreatedListener', data: { enable: false } });
        //todo: proceed once we get a response
        //todo: re-enable listener when import complete
        //todo: add an option to fetch new thumbnails or use the included ones

        if (json.dials && json.groups) {
            importFromSD2(json);
        } else if (json.db) {
            importFromFVD(json);
        } else if (json.yasd) {
            importFromYASD(json);
        } else {
            importFromOldYASD(json);
        }
    };

    if (event && event.target && event.target.files) {
        filereader.readAsText(event.target.files[0]);
    }
};

function importFromSD2(json) {
    let bookmarks = json.dials.map(dial => ({
        title: dial.title,
        url: dial.url,
        idgroup: dial.idgroup
    }));

    let groups = json.groups.map(group => ({
        id: group.id,
        title: group.title
    }));

    chrome.storage.local.clear().then(() => {
        // Create groups and bookmarks
        let groupPromises = groups.map(group => {
            if (group.id === 0) {
                return Promise.resolve(selectedGroupId);
            } else {
                return chrome.bookmarks.search({ title: group.title }).then(existingGroups => {
                    const matchingGroups = existingGroups.filter(group => group.parentId === selectedGroupId);
                    if (matchingGroups.length > 0) {
                        return matchingGroups[0].id;
                    } else {
                        return chrome.bookmarks.create({
                            title: group.title,
                            parentId: selectedGroupId
                        }).then(node => node.id);
                    }
                });
            }
        });

        Promise.all(groupPromises).then(groupIds => {
            bookmarks.forEach(bookmark => {
                let parentId = groupIds[bookmark.idgroup];
                chrome.bookmarks.search({ url: bookmark.url }).then(existingBookmarks => {
                    let existsInFolder = existingBookmarks.some(b => b.parentId === parentId);
                    if (!existsInFolder) {
                        chrome.bookmarks.create({
                            title: bookmark.title,
                            url: bookmark.url,
                            parentId: parentId
                        });
                    }
                });
            });

            hideModals();
            // refresh page
            processRefresh();
        }).catch(err => {
            console.log(err)
            importExportStatus.innerText = "SD2 import error! Unable to create folders."
        });

    }).catch(err => {
        console.log(err)
        importExportStatus.innerText = "Something went wrong. Please try again"
    });
}

function importFromFVD(json) {
    let bookmarks = json.db.dials.map(dial => ({
        title: dial.title,
        url: dial.url,
        groupId: dial.group_id
    }));

    let groups = json.db.groups.map(group => ({
        id: group.id,
        title: group.name
    }));

    // clear previous settings and import
    chrome.storage.local.clear().then(() => {
        // Create groups and bookmarks
        let groupPromises = groups.map(group => {
            if (group.id === 1) {
                return Promise.resolve(selectedGroupId);
            } else {
                return chrome.bookmarks.search({ title: group.title }).then(existingGroups => {
                    const matchingGroups = existingGroups.filter(group => group.parentId === selectedGroupId);
                    if (matchingGroups.length > 0) {
                        return matchingGroups[0].id;
                    } else {
                        return chrome.bookmarks.create({
                            title: group.title,
                            parentId: selectedGroupId
                        }).then(node => node.id);
                    }
                });
            }
        });

        Promise.all(groupPromises).then(groupIds => {
            bookmarks.forEach(bookmark => {
                let parentId = groupIds[bookmark.groupId];
                chrome.bookmarks.search({ url: bookmark.url }).then(existingBookmarks => {
                    let existsInFolder = existingBookmarks.some(b => b.parentId === parentId);
                    if (!existsInFolder) {
                        chrome.bookmarks.create({
                            title: bookmark.title,
                            url: bookmark.url,
                            parentId: parentId
                        });
                    }
                });
            });

            hideModals();
            // refresh page
            processRefresh();
        }).catch(err => {
            console.log(err);
            importExportStatus.innerText = "FVD import error! Unable to create folders.";
        });

    }).catch(err => {
        console.log(err);
        importExportStatus.innerText = "Something went wrong. Please try again";
    });
}

function importFromYASD(json) {
    // import from yasd v3 format:
    let yasdData = json.yasd;
        
    // Clear previous settings and import new data
    chrome.storage.local.clear().then(() => {
        // Store settings
        if (yasdData.settings) {
            chrome.storage.local.set({ settings: yasdData.settings });
        }

        // Store dials
        let dialPromises = yasdData.dials.map(dial => {
            let url = Object.keys(dial)[0];
            let dialData = dial[url];
            return chrome.storage.local.set({ [url]: dialData });
        });

        // Create folders and get their IDs
        let folderPromises = yasdData.folders.sort((a, b) => a.index - b.index).map(folder => {
            return chrome.bookmarks.search({ title: folder.title }).then(existingFolders => {
                const matchingFolders = existingFolders.filter(f => f.parentId === selectedGroupId);
                if (matchingFolders.length > 0) {
                    return { oldId: folder.id, newId: matchingFolders[0].id };
                } else {
                    return chrome.bookmarks.create({
                        title: folder.title,
                        parentId: selectedGroupId
                    }).then(node => {
                        return { oldId: folder.id, newId: node.id };
                    });
                }
            });
        });

        Promise.all(folderPromises).then(folderIdMappings => {
            let folderIdMap = {};
            folderIdMappings.forEach(mapping => {
                folderIdMap[mapping.oldId] = mapping.newId;
            });

            // Create bookmarks using the new folder IDs
            let bookmarkPromises = yasdData.bookmarks.map(bookmark => {
                let parentId = folderIdMap[bookmark.folderid] || selectedGroupId;
                return chrome.bookmarks.search({ url: bookmark.url }).then(existingBookmarks => {
                    let existsInFolder = existingBookmarks.some(b => b.parentId === parentId);
                    if (!existsInFolder) {
                        return chrome.bookmarks.create({
                            title: bookmark.title,
                            url: bookmark.url,
                            parentId: parentId
                        });
                    }
                });
            });

            Promise.all([...dialPromises, ...bookmarkPromises]).then(() => {
                hideModals();
                // Refresh page
                processRefresh();
            }).catch(err => {
                console.log(err);
                importExportStatus.innerText = "Error! Unable to import bookmarks and dials.";
            });
        }).catch(err => {
            console.log(err);
            importExportStatus.innerText = "Error! Unable to create folders.";
        });
    }).catch(err => {
        console.log(err);
        importExportStatus.innerText = "Something went wrong. Please try again.";
    });
}

function importFromOldYASD(json) {
    // import from old yasd format
    chrome.storage.local.clear().then(() => {
        chrome.storage.local.set(json).then(result => {
            hideModals();
            // refresh page
            //tabMessagePort.postMessage({handleImport: true});
            processRefresh();
        }).catch(err => {
            console.log(err)
            importExportStatus.innerText = "Error! Unable to parse file."
        });
    }).catch(err => {
        console.log(err)
        importExportStatus.innerText = "Error! Please try again"
    })
}

// native handlers for folder tab target
function dragenterHandler(ev) {
    // temporary fix for firefox < v92
    // firefox returns a text node instead of an element
    if (ev.target.nodeType === 3) {
        if (ev.target.parentElement.classList.contains("folderTitle")) {
            // avoid repaints
            if (currentGroup !== ev.target.parentElement.attributes.folderid.value) {
                currentGroup = ev.target.parentElement.attributes.folderid.value;
                showGroup(currentGroup)
            }
        }
    }
    else if (ev.target.classList.contains("folderTitle")) {
        // avoid repaints
        // todo replace style changes with class;
        if (currentGroup !== ev.target.attributes.folderid.value) {
            ev.target.style.padding = "20px";
            ev.target.style.outline = "2px dashed white";
            currentGroup = ev.target.attributes.folderid.value;
            showGroup(currentGroup)
        }
    }
}

function dragleaveHandler(ev) {
    // temporary fix for firefox < v92
    if (ev.target.nodeType === 3) {
        return
    }
    else if (ev.target.classList.contains("folderTitle")) {
        ev.target.style.padding = "0";
        ev.target.style.outline = "none";
    }
}

// Sortable helper fns
function onMoveHandler(evt) {
    if (evt.related) {
        if (evt.to.children.length > 1) {
            // when no bookmarks are present we keep the createdial enabled so we have a drop target for dials dragged into folder
            return !evt.related.classList.contains('createDial');
        } else {
            // force new dial to drop before add dial button
            evt.to.prepend(evt.dragged);
            return false;
        }
    }
}

function dewrap(str) {
    // unlike folder tabs, main dial container doesnt include the folder id
    // todo: cleanup
    if (str === "wrap") {
        return selectedGroupId
    } else {
        return str
    }
}

function onEndHandler(evt) {
    if (evt && evt.clone.href) {
        let id = evt.clone.dataset.id;
        let fromParentId = dewrap(evt.from.id);
        let toParentId = dewrap(evt.to.id);
        let newSiblingId = evt.item.nextElementSibling ? evt.item.nextElementSibling.dataset.id : null;
        let newSiblingParentId = newSiblingId ? dewrap(evt.item.nextElementSibling.parentElement.id) : null;
        let oldIndex = evt.oldIndex;
        let newIndex = evt.newIndex;

        // todo: test if this is needed
        if (fromParentId !== toParentId && toParentId !== evt.originalEvent.target.id) {
            // sortable's position doesn't match the dom's drop target
            // this may happen if the tile is dragged over a sortable list but then ultimately dropped somewhere else
            // for example directly on the folder name, or directly onto the new dial button. so use the currentFolder as the target
            toParentId = currentGroup ? currentGroup : selectedGroupId;
        }

        if (fromParentId === toParentId && fromParentId !== currentGroup) {
            // occurs when there is no sortable target -- for example dropping the dial onto the folder name
            // or some space of the page outside the sortable container element
            toParentId = currentGroup ? currentGroup : selectedGroupId;
        }

        // if the sibling's parent doesnt match the parent we are moving to discard this sibling
        // can occur when dropping onto a non sortable target (like folder name)
        if (newSiblingParentId && newSiblingParentId !== toParentId) {
            newSiblingId = -1;
        }

        if ((fromParentId && toParentId && fromParentId !== toParentId) || oldIndex !== newIndex) {
            moveBookmark(id, fromParentId, toParentId, oldIndex, newIndex, newSiblingId)
        }
    } else if (evt && evt.clone.classList.contains('folderTitle')) {
        let oldIndex = evt.oldIndex;
        let newIndex = evt.newIndex;

        if (newIndex !== oldIndex) {
            if (evt.clone.attributes.folderid) {
                let id = evt.clone.attributes.folderid.value;
                let newSiblingId = evt.item.nextElementSibling ? evt.item.nextElementSibling.attributes.folderid.value : null;
                moveGroup(id, oldIndex, newIndex, newSiblingId)
            }
        }
    }
}

// 进行页面刷新
const processRefresh = debounce(({ groupsOnly = false } = {}) => {
    if (groupsOnly) {
        reBuildGroupPages()
    } else {
        // prevent page scroll on refresh
        // react where are you...
        scrollPos = bookmarksContainerParent.scrollTop;
        //noBookmarks.style.display = 'none';
        addGroupButton.style.display = 'inline';

        //bookmarksContainer.style.opacity = "0";

        //getBookmarks(speedDialId)
        buildDialPages(currentGroupId)
    }
}, 650, true);


// Preload the image before setting the background
function preloadImage(url) {
    const img = new Image();
    img.src = url;
    return new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
    });
}


function setBackgroundImages(thumbnails) {
    const elementsToUpdate = [];
    const observers = new Map();

    thumbnails.forEach(thumb => {
        const id = thumb.parentId + "-" + thumb.id;
        let element = document.getElementById(id);

        if (element) {
            elementsToUpdate.push({ element, thumb });
        } else {
            let observer = observers.get(thumb.parentId);
            if (!observer) {
                const parentElement = document.getElementById(thumb.parentId);
                if (!parentElement) return; // Skip if parent is missing

                observer = new MutationObserver((mutations, obs) => {
                    thumbnails.forEach(t => {
                        const el = document.getElementById(t.parentId + "-" + t.id);
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
                observers.set(thumb.parentId, observer);
            }
        }
    });

    if (elementsToUpdate.length) {
        batchApplyImages(elementsToUpdate);
    }
}

function batchApplyImages(elements) {
    requestAnimationFrame(() => {
        elements.forEach(({ element, thumb }) => {
            element.style.backgroundColor = "unset";
            element.style.backgroundImage = `url('${thumb.thumbnail}'), ${thumb.bgColor}`;
        });
    });
}

// 获取消息
function handleMessages(message) {
    console.log(message);
    if (!message.target === 'newtab') {
        return
    }

    if (message.data.refresh) {
        hideToast();
        processRefresh();
    } else if(message.data.reloadGroups) {
        hideToast();
        processRefresh({ groupsOnly: true });
    } else if(message.type === 'thumbBatch') {
        // lets update the backgroundImage with the thumbnail for each element using its id (parentId + id)
        // data.thumbs is an array of objects containing id, parentId, thumbnail and bgcolor
        //console.log(message.data);
        // todo: background not working?
        setBackgroundImages(message.data);
        hideToast();
    }
}

function onResize() {
    if (!resizing) {
        requestAnimationFrame(() => {
            layout();
            resizing = false;
        });
        resizing = true;
    }
}

function init() {
    document.querySelectorAll('[data-locale]').forEach(elem => {
        elem.innerText = chrome.i18n.getMessage(elem.dataset.locale)
    })

    new Promise(resolve => chrome.storage.local.get('settings', resolve))
    .then(result => {
        console.log(settings);
        if (result) {
            if (result.settings) {
                settings = Object.assign({}, defaults, result.settings);
            } else {
                settings = defaults;
            }
        }

        currentGroupId = settings.currentGroupId;
        selectedGroupId = settings.currentGroupId;
        applySettings()
            .then(() => buildDialPages(selectedGroupId));
    });

    sidenav.style.display = "flex";

    new Sortable(foldersContainer, {
        animation: 150,
        forceFallback: true,
        fallbackTolerance: 4,
        filter: "#homeFolderLink",
        ghostClass: 'selected',
        onMove: function (evt) {
            return evt.related.id !== 'homeFolderLink';
        },
        onEnd: onEndHandler
    });

    window.addEventListener('resize', onResize);

}

init();
