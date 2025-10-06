/*
    目的：集中所有事件处理，避免散乱。
*/
import { DOM } from "./dom.js";
import { apply_i18n, parseJson, resizeBackground, filterDials, setInputValue } from "./utils.js";
import {
    saveSettings, getSettingFromDOM,
    prepareExport,
    importFromSD2, importFromFVD, importFromYASD, importFromOldYASD
} from "./setting.js";
import {
    showContextMenu, hideMenus, hideSettings, openSettings, initSettings, buildGroupsAndBookmarksPages,
    applyBackgroundChanged, applyWallpaperEnableChanged, applyBookmarkRelatedChanged, applyOtherChanged,
    processRefresh, layout
} from "./ui.js";
import { addGroupBtn, editBookmarkModal, addImage, modalShowEffect, buildCreateBookmarkModal, hideModals } from "./modals.js"
import {
    saveBookmark, buildBookmarksByGroupId,
    quickCreateBookmark, removeBookmark, moveBookmark,
    setBackgroundImages, refreshThumbnails, refreshAllThumbnails
} from "./bookmarks.js";
import { createGroup, editGroup, removeGroup, moveGroup, activeGroup } from "./groups.js";
import { state } from "./state.js"
import Toast from './minitoast.js';

let targetGroupName = null;
let targetGroupLink = null;
const helpUrl = 'https://conceptualspace.github.io/yet-another-speed-dial/';
const reader = new FileReader();    // 用于读取用户上传的图片文件
let resizing = false;   // 标记是否正在执行窗口 / 元素大小调整操作，用于避免调整过程中重复触发某些逻辑（如布局计算）

// 初始化事件绑定
export function initEvents() {
    console.log("initEvents start");
    // 监听来自后台的消息
    chrome.runtime.onMessage.addListener(handleMessages);

    // document.addEventListener('DOMContentLoaded', () => {
    //     const settings =  chrome.storage.local.get("settings");
    //     apply_i18n(settings.i18nLanguage);
    // });

    // 替代右键菜单
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
            state.targetNode = e.target.parentElement.parentElement;
            state.targetTileHref = e.target.parentElement.parentElement.href;
            state.targetTileId = e.target.id;
            state.targetTileTitle = e.target.nextElementSibling.innerText;
            showContextMenu(DOM.menu, e.pageY, e.pageX);
            return false;
        } else if (e.target.classList.contains('groupTitle') && e.target.id !== "homegroupLink") {
            targetGroupLink = e.target;
            state.targetGroupId = e.target.attributes.groupId.nodeValue;
            targetGroupName = e.target.textContent;
            showContextMenu(DOM.groupMenu, e.pageY, e.pageX);
            return false;
        } else if (e.target === document.body || e.target.className === 'groups' || e.target.className === 'container' || e.target.className === 'tileContainer' || e.target.className === 'cta-container' || e.target.className === 'default-content' || e.target.className === 'default-content helpText') {
            showContextMenu(DOM.settingsMenu, e.pageY, e.pageX);
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
        console.log("mousedown event target", e.target);
        hideMenus();
        if (e.target.type === 'text' || e.target.id === 'maxcols' || e.target.id === 'defaultSort' || e.target.id === 'addBookmarkBtnPosition' || e.target.id === 'bookmarkSize' || e.target.id === 'dialRatio' || e.target.id === 'bookmarkMargin') {
            return
        }
        if (e.target.className.baseVal === 'gear') {
            openSettings();
            return;
        }
        if (e.target.closest('#splashAddDial')) {
            e.preventDefault();
            buildCreateBookmarkModal(state.currentGroupId);
            modalShowEffect(DOM.createDialModalContent, DOM.createDialModal);
            return;
        }
        if (e.target.closest('#splashImport')) {
            e.preventDefault();
            modalShowEffect(DOM.importExportModalContent, DOM.importExportModal);
            //importFileInput.click();
            return;
        }

        console.log("select classname:" + e.target.className);
        switch (e.target.className) {
            // todo: invert this
            case 'default-content':
            case 'default-content helpText':
            case 'tile-content':
            case 'tile-title':
            case 'container':
            case 'tileContainer':
            case 'cta-container':
            case 'groups':
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
                        chrome.tabs.create({ url: state.targetTileHref });
                        break;
                    case 'newBackgroundTab':
                        chrome.tabs.create({ url: state.targetTileHref, active: false });
                        break;
                    case 'newWin':
                        chrome.windows.create({ "url": state.targetTileHref });
                        break;
                    case 'newPrivate':
                        chrome.windows.create({ "url": state.targetTileHref, "incognito": true });
                        break;
                    case 'newBookmark':
                        // prevent default required to stop focus from leaving the modal input
                        e.preventDefault();
                        buildCreateBookmarkModal(state.currentGroupId);
                        modalShowEffect(DOM.createDialModalContent, DOM.createDialModal);
                        break;
                    case 'editBookmark':
                        const id = state.targetTileId.split('-')[1];
                        editBookmarkModal(state.targetTileHref, state.targetTileTitle, id).then(() => {
                            modalShowEffect(DOM.modalContent, DOM.modal);
                        });
                        break;
                    case 'refresh':
                        refreshThumbnails(state.targetTileHref, state.targetTileId);
                        break;
                    case 'refreshAllThumbnails':
                        console.log("events refreshAll");
                        modalShowEffect(DOM.refreshAllModalContent, DOM.refreshAllModal);
                        break;
                    case 'delete':
                        removeBookmark(state.targetTileId.split('-')[1]);
                        break;
                    case 'newgroup':
                        e.preventDefault();
                        addGroupBtn();
                        break;
                    case 'editgroup':
                        DOM.editgroupModalName.value = targetGroupName;
                        modalShowEffect(DOM.editgroupModalContent, DOM.editGroupModal);
                        break;
                    case 'deletegroup':
                        DOM.deletegroupModalName.textContent = targetGroupName;
                        modalShowEffect(DOM.deletegroupModalContent, DOM.deleteGroupModal);
                        break;
                }
                break;
            default:
                e.preventDefault();
        }
    });

    // 键盘下压事件
    window.addEventListener("keydown", event => {
        if (event.code === "Escape") {
            hideMenus();
            hideModals();
        } else if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
            event.preventDefault();
            DOM.searchInput.value = '';
            DOM.searchContainer.classList.toggle('active');
            filterDials('');
            setTimeout(() => DOM.searchInput.focus(), 200);
        }
    });

    // 窗口大小调整
    window.addEventListener('resize', onResize);

    DOM.createBookmarkModalSave.addEventListener("click", quickCreateBookmark);
    DOM.editBookmarkModalSave.addEventListener("click", saveBookmark);
    DOM.addGroupButton.addEventListener("click", addGroupBtn);
    DOM.createGroupModalSave.addEventListener("click", createGroup);
    DOM.editGroupModalSave.addEventListener("click", editGroup);
    DOM.deleteGroupModalSave.addEventListener("click", removeGroup);
    DOM.refreshAllModalSave.addEventListener("click", refreshAllThumbnails);    // 刷新当前分组所有缩略图

    Array.from(DOM.closeModal).forEach(button => {
        button.onclick = function (e) {
            e.preventDefault();
            hideModals();
        };
    });

    DOM.modalTitle.addEventListener('keydown', e => {
        if (e.code === "Enter") {
            e.preventDefault();
            saveBookmark();
        }
    });

    DOM.modalURL.addEventListener('keydown', e => {
        if (e.code === "Enter") {
            e.preventDefault();
            saveBookmark();
        }
    });

    DOM.createDialModalURL.addEventListener('keydown', e => {
        if (e.code === "Enter") {
            e.preventDefault();
            quickCreateBookmark();
        }
    });

    // 书签形状
    DOM.bookmarkRatioSelect.oninput = function (e) {
        saveSettings(state.settings);
        applyBookmarkRelatedChanged(state.settings);
    }

    // 书签最大列数
    DOM.bookmarkMaxColsSelect.oninput = function (e) {
        saveSettings(state.settings);
        applyBookmarkRelatedChanged(state.settings);
    }

    // 书签大小
    DOM.bookmarkSizeSelect.oninput = function (e) {
        saveSettings(state.settings);
        applyBookmarkRelatedChanged(state.settings);
    }

    // 书签间隔
    DOM.bookmarkMarginSelect.oninput = function (e) {
        saveSettings(state.settings);
        applyBookmarkRelatedChanged(state.settings);
    }

    // 书签默认排序方式
    DOM.defaultSortSelect.oninput = function (e) {
        if (state.settings.defaultSort !== DOM.defaultSortSelect.value) {
            processRefresh();
            saveSettings(state.settings);
        }
    }

    // 新增书签按钮位置
    DOM.addBookmarkBtnPositionSelect.oninput = function (e) {
        if (state.settings.addBookmarkBtnPosition !== DOM.addBookmarkBtnPositionSelect.value) {
            saveSettings(state.settings);
            buildBookmarksByGroupId(state.data.bookmarks.filter(b => b.groupId === state.currentGroupId), state.currentGroupId);
        }
    }

    // 背景颜色取色器
    DOM.bgColorPicker.onchange = function () {
        DOM.bgColorPicker_wrapper.style.backgroundColor = DOM.bgColorPicker.value;
        saveSettings(state.settings);
        applyBackgroundChanged(false);
        // applySettings(state.settings);
    };

    // 选择文本颜色
    DOM.textColorPicker.onchange = function () {
        DOM.textColorPicker_wrapper.style.backgroundColor = DOM.textColorPicker.value;
        if (state.settings.textColor !== DOM.textColorPicker.value) {
            saveSettings(state.settings);
            applyOtherChanged(state.settings);
            // applySettings(state.settings);
        }
    };

    // 是否显示书签标题
    DOM.showTitlesCheckbox.oninput = function (e) {
        saveSettings(state.settings);
        applyOtherChanged(state.settings);
        // applySettings(state.settings);
    }

    // 是否显示添加书签按钮
    DOM.showCreateBookmarkCheckbox.oninput = function (e) {
        saveSettings(state.settings);
        applyOtherChanged(state.settings);
        // applySettings(state.settings);
    }

    // 是否显示添加分组按钮
    DOM.showCreateGroupsCheckbox.oninput = function (e) {
        saveSettings(state.settings);
        applyOtherChanged(state.settings);
        // applySettings(state.settings);
    }

    // 是否显示时钟
    DOM.showClockCheckbox.oninput = function (e) {
        saveSettings(state.settings);
        applyOtherChanged(state.settings);
        // applySettings(state.settings);
    }

    // 是否记住上次分组
    DOM.rememberGroupCheckbox.oninput = function (e) {
        // 暂时没效果，打算去除
        saveSettings(state.settings);
        // applySettings(state.settings);
    }

    DOM.imgPreviewOverlayDiv.onclick = function () {
        DOM.imgInputFile.click();
    }

    // 是否使用背景图
    DOM.wallPaperEnableCheckbox.oninput = function (e) {
        console.log("DOM.wallPaperEnableCheckbox.oninput : ", e.target.checked);
        saveSettings(state.settings, state.defaultWallpaperSrc);
        applyWallpaperEnableChanged(true);
        // applySettings(state.settings, null, true);
    }

    // file 选择了文件
    DOM.imgInputFile.onchange = function () {
        readURL(this);
    };
    function readURL(input) {
        if (input.files && input.files[0]) {
            reader.readAsDataURL(input.files[0]);
        }
    }

    // 图片文件读取完成
    reader.onload = function (e) {
        console.log("reader.onload");

        resizeBackground(e.target.result).then(imagedata => {
            DOM.imgPreviewDiv.setAttribute('src', imagedata);
            DOM.imgPreviewDiv.style.display = 'block';
            // dynamically set text color based on background
            /*
            getAverageRGB(imagedata).then(rgb => {
                let textColor = contrast(rgb);
                settings.textColor = textColor
                document.documentElement.style.setProperty('--color', textColor);
            });
             */
            // state.settings = getSettingFromDOM(state.settings);
            saveSettings(state.settings, imagedata);
            // 能上传背景图，那使用背景图选项必然是 true
            applyBackgroundChanged(true, imagedata);
        })
    };


    DOM.modalImgBtn.addEventListener('click', function () {
        document.getElementById('modalImgFile').click();
    });

    DOM.modalImgInput.onchange = function () {
        readImage(this).then(image => {
            resizeThumb(image).then(resizedImage => {
                addImage(resizedImage);
            })
        });
    };

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

    // add image from url button clicked, show the input field
    DOM.modalImgUrlBtn.addEventListener('click', function (event) {
        event.preventDefault();
        document.getElementById('modalBtnContainer').style.display = 'none';
        document.getElementById('imageUrlContainer').style.display = 'flex';
        DOM.modalImageURLInput.focus();
    });

    DOM.closeImgUrlBtn.addEventListener('click', function (event) {
        event.preventDefault();
        document.getElementById('modalBtnContainer').style.display = 'flex';
        document.getElementById('imageUrlContainer').style.display = 'none';
        DOM.modalImageURLInput.value = '';
    });

    // fetch the image from the url
    DOM.fetchImageButton.addEventListener('click', function (event) {
        event.preventDefault();
        const imageUrl = DOM.modalImageURLInput.value.trim();
        if (imageUrl) {
            resizeThumb(imageUrl).then(resizedImage => {
                addImage(resizedImage);
            }).catch(error => {
                // todo: show error message to user in the modal
                console.error('Error adding image from URL:', error);
            });
        }
    });

    DOM.modalBgColorPickerBtn.addEventListener('click', function () {
        // todo: support alpha
        // eyedropper currently chrome on windows/mac only
        if ('EyeDropper' in window) {
            const eyeDropper = new EyeDropper();
            eyeDropper.open().then(result => {
                const color = result.sRGBHex;
                setInputValue(DOM.modalBgColorPickerInput, color);
            }).catch(error => {
                console.log('Error opening color picker:', error);
            });
        } else {
            document.getElementById('modalBgColorPickerInput').click();
        }
    });

    DOM.modalBgColorPickerInput.addEventListener('input', function () {
        const color = this.value; // in hex
        // set the our button color to match
        DOM.modalBgColorPreview.style.fill = color;
    });

    document.getElementById('closeSettingsBtn').addEventListener('click', () => {
        hideSettings();
    });

    // 清空设定
    DOM.initSettingBtn.onclick = function () {
        // 弹出确认框，提示用户操作后果
        const isConfirm = confirm('确定要清除所有设置吗？此操作将所有用户设置，且不可恢复。');

        // 只有用户点击“确定”（isConfirm 为 true）时才执行
        if (isConfirm) {
            hideSettings();
            state.settings = state.defaults;
            state.wallpaperSrc = state.defaultWallpaperSrc;
            saveSettings(state.settings, state.wallpaperSrc, false).then(() => {
                initSettings(state.settings, state.wallpaperSrc);
                buildGroupsAndBookmarksPages(state.currentGroupId);
                Toast.success("已恢复初始设置");
            });
        }
    }

    // 清空所有数据
    DOM.clearAllBtn.onclick = function () {
        // 弹出确认框，提示用户操作后果
        const isConfirm = confirm('确定要清除数据吗？此操作将所有用户设置，且不可恢复。');
        // 只有用户点击“确定”（isConfirm 为 true）时才执行
        if (isConfirm) {
            // 清空 chrome.storage.local 中的所有数据
            chrome.storage.local.clear(function () {
                if (chrome.runtime.lastError) {
                    console.error("清空数据失败：", chrome.runtime.lastError);
                    Toast.error(`清空数据失败：${chrome.runtime.lastError}`);
                } else {
                    console.log("所有数据已成功清空");
                    Toast.success("所有数据已成功清空");
                    location.reload();
                }
            });
        }
    }

    // 点击 导入/导出 按钮
    DOM.importExportBtn.onclick = function () {
        hideSettings();
        DOM.importExportStatus.innerText = "";
        DOM.exportBtn.classList.add('disabled');
        // prepareExport();
        modalShowEffect(DOM.importExportModalContent, DOM.importExportModal);
    }

    DOM.helpBtn.onclick = function () {
        chrome.tabs.create({ url: helpUrl });
    }

    // 搜索
    DOM.searchInput.addEventListener('input', function (e) {
        const searchTerm = e.target.value.toLowerCase();
        filterDials(searchTerm);
    });
    document.getElementById('closeSearch').addEventListener('click', () => {
        DOM.searchInput.value = '';
        DOM.searchContainer.classList.remove('active');
        filterDials('');
    });

    // 导入
    DOM.importFileLabel.onclick = function () {
        DOM.importFileInput.click();
    }
    DOM.importFileInput.onchange = function (event) {
        console.log("DOM.importFileInput.onchange");
        let filereader = new FileReader();

        filereader.onload = function (event) {
            let json = null;
            try {
                json = parseJson(event);
            } catch (error) {
                DOM.importExportStatus.innerText = "Error! Unable to parse file.";
            }

            if (!json) {
                DOM.importExportStatus.innerText = "Could not get any datas from this file.";
                return;
            }

            if (json.dials && json.groups) {
                const data = importFromSD2(json);
                if (data) {
                    // 清空并写入
                    chrome.storage.local.clear().then(() => {
                        state.currentGroupId = state.homeGroup.id;

                        return chrome.storage.local.set({
                            groups: data.groups,
                            bookmarks: data.bookmarks,
                            settings: data.settings
                        });
                    }).then(() => {
                        state.currentGroupId = state.homeGroup.id;
                        state.data = data;
                        hideModals();
                        initSettings(data.settings, state.defaultWallpaperSrc);
                        console.log(state.currentGroupId, "=========================================", data.settings.currentGroupId)
                        buildGroupsAndBookmarksPages(data.settings.currentGroupId);
                        // processRefresh({ currentGroupId: state.homeGroup.id });
                        Toast.success("导入成功！");
                    }).catch(err => {
                        console.error(err);
                        DOM.importExportStatus.innerText = "SD2 import error! Unable to save bookmarks.";
                    });
                }
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
    console.log("initEvents End");
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

// 处理获取的消息
function handleMessages(message) {
    console.log(message);
    if (message.target !== 'newtab') {
        return
    }

    if (message.data.refresh) {
        // hideToast();
        processRefresh();
    } else if (message.data.reloadGroups) {
        // hideToast();
        processRefresh({ groupsOnly: true });
    } else if (message.type === 'thumbBatch') {
        // lets update the backgroundImage with the thumbnail for each element using its id (parentId + id)
        // data.thumbs is an array of objects containing id, parentId, thumbnail and bgcolor
        //console.log(message.data);
        // todo: background not working?

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
        setBackgroundImages(message.data);
        // hideToast();
    } else if (message.type === 'GetThumbErr') {
        // error getting thumbnail for url
        // data is an array of objects containing id, groupId, url and err
        console.log("Error getting thumbnail for url:", message.data);
        // hideToast();
        Toast.error("Error getting thumbnail for url: " + message.data[0].url + " : " + message.data[0].err);
    }
}

// 处理窗口调整大小事件
function onResize() {
    if (!resizing) {
        requestAnimationFrame(() => {
            layout();
            resizing = false;
        });
        resizing = true;
    }
}

// Sortable 拖拽排序事件结束后的处理函数
// 用于 书签列表 和 分组列表 拖拽排序
// todo: 需要修改完善
// evt.clone - 拖拽的克隆元素
// evt.from - 原始容器
// evt.to - 目标容器
export function onGroupMoveEndHandler(evt) {
    console.log("onEndHandler", evt, "evt.clone.href:", evt.clone.href);
    // 拖拽书签
    if (evt && evt.clone.href) {
        let id = evt.clone.dataset.id;  // 书签ID
        let fromGroupId = dewrap(evt.from.id);  // 原始分组ID
        let toGroupId = state.targetGroupId;  // 目标分组ID
        let newSiblingId = evt.item.nextElementSibling ? evt.item.nextElementSibling.dataset.id : null; // 新邻居ID
        let newSiblingGroupId = newSiblingId ? dewrap(evt.item.nextElementSibling.parentElement.id) : null; // 新邻居的GroupId
        let oriTargetId = evt.originalEvent.target.id;
        let oldIndex = evt.oldIndex;    // 原始位置
        let newIndex = evt.newIndex;    // 新位置

        console.log(`onEndHandler: id=${id}, fromGroupId=${fromGroupId}, toGroupId=${toGroupId}, oldIndex=${oldIndex}, newIndex=${newIndex}, newSiblingId=${newSiblingId}, newSiblingGroupId=${newSiblingGroupId}, oriTargetId=${oriTargetId}, state.currentGroupId=${state.currentGroupId}`);

        // // 处理跨分组拖拽但目标不匹配的情况
        // if (fromGroupId !== toGroupId && toGroupId !== evt.originalEvent.target.id) {
        //     // sortable's position doesn't match the dom's drop target
        //     // this may happen if the tile is dragged over a sortable list but then ultimately dropped somewhere else
        //     // for example directly on the group name, or directly onto the new dial button. so use the currentgroup as the target
        //     toGroupId = state.currentGroupId ? state.currentGroupId : state.targetGroupId;
        // }

        // // 处理同一分组内但目标不是当前分组的情况
        // if (fromGroupId === toGroupId && fromGroupId !== state.currentGroupId) {
        //     // occurs when there is no sortable target -- for example dropping the dial onto the group name
        //     // or some space of the page outside the sortable container element
        //     toGroupId = state.currentGroupId ? state.currentGroupId : state.targetGroupId;
        // }

        // // 处理邻居分组不匹配的情况
        // // if the sibling's parent doesnt match the parent we are moving to discard this sibling
        // // can occur when dropping onto a non sortable target (like group name)
        // if (newSiblingGroupId && newSiblingGroupId !== toGroupId) {
        //     newSiblingId = -1;
        // }

        // 移动书签到其他分组
        if (fromGroupId && toGroupId && fromGroupId !== toGroupId) {
            moveBookmark("changeGroup", id, fromGroupId, toGroupId, oldIndex, newIndex, newSiblingId)
        }
        // 同一分组内调整书签顺序
        if (!toGroupId && oldIndex !== newIndex) {
            moveBookmark("changeIndex", id, fromGroupId, toGroupId, oldIndex, newIndex, newSiblingId)
        }
    }
    // 拖拽分组
    else if (evt && evt.clone.classList.contains('groupTitle')) {
        let oldIndex = evt.oldIndex;
        let newIndex = evt.newIndex;
        // console.log(`onEndHandler: id=${id}, oldIndex=${oldIndex}, newIndex=${newIndex}`);

        if (newIndex !== oldIndex) {
            if (evt.clone.attributes.groupid) {
                let id = evt.clone.attributes.groupid.value;
                let newSiblingId = evt.item.nextElementSibling ? evt.item.nextElementSibling.attributes.groupid.value : null;
                moveGroup(id, oldIndex, newIndex, newSiblingId)
            }
        }
    }
}

// 拖拽事件处理函数：当可拖拽元素进入目标时触发
export function dragenterHandler(ev) {
    console.log("dragenterHandler", ev.target);
    // temporary fix for firefox < v92
    // firefox returns a text node instead of an element
    if (ev.target.nodeType === 3) {
        if (ev.target.parentElement.classList.contains("groupTitle")) {
            // avoid repaints
            if (state.currentGroupId !== ev.target.parentElement.attributes.groupid.value) {
                state.targetGroupId = ev.target.parentElement.attributes.groupid.value;
                // activeGroup(state.currentGroupId)
            }
        }
    }
    else if (ev.target.classList.contains("groupTitle")) {
        // avoid repaints
        // todo replace style changes with class;
        if (state.currentGroupId !== ev.target.attributes.groupid.value) {
            ev.target.style.padding = "20px";
            ev.target.style.outline = "2px dashed white";
            state.targetGroupId = ev.target.attributes.groupid.value;
            // activeGroup(state.currentGroupId)
        }
    }
}

// 拖拽事件处理函数：当可拖拽元素在目标容器内移动时持续触发
export function dragoverHandler(ev) {
    ev.preventDefault();
    console.log("dragoverHandler", ev);
}

// 拖拽事件处理函数：当可拖拽元素被放置到目标时触发
export function dropHandler(ev) {
    console.log("dropHandler", ev);
    if (ev.target.nodeType === 3) {
        return
    }
    else if (ev.target.classList.contains("groupTitle")) {
        ev.target.removeAttribute("style");
    }
}

// 拖拽事件处理函数：当可拖拽元素离开目标时触发
export function dragleaveHandler(ev) {
    console.log("dragleaveHandler", ev);
    state.targetGroupId = state.currentGroupId;
    // temporary fix for firefox < v92
    if (ev.target.nodeType === 3) {
        return
    }
    else if (ev.target.classList.contains("groupTitle")) {
        ev.target.removeAttribute("style");
    }
}

// 书签排序移动时触发
export function onMoveHandler(evt) {
    console.log("onMoveHandler", evt);
    if (evt.related) {
        if (evt.to.children.length > 1) {
            // when no bookmarks are present we keep the createdial enabled so we have a drop target for dials dragged into group
            return !evt.related.classList.contains('createDial');
        } else {
            // force new dial to drop before add dial button
            evt.to.prepend(evt.dragged);
            return false;
        }
    }
}

function dewrap(str) {
    // unlike group tabs, main dial container doesnt include the group id
    // todo: cleanup
    if (str === "wrap") {
        return state.targetGroupId
    } else {
        return str
    }
}