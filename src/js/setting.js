import { DOM } from "./dom.js";
import { state } from "./state.js"
import { hideModals } from "./modals.js";
import { processRefresh } from "./ui.js";
import { generateId } from "./utils.js";
import Toast from './minitoast.js';

// 由页面 DOM 元素获得 setting 信息
export function getSettingFromDOM(settings) {
    console.log("getSettingFromDOM Settings before: ", settings);
    settings.wallPaperEnable = DOM.wallPaperEnableCheckbox.checked;
    settings.backgroundColor = DOM.bgColorPicker.value;
    settings.textColor = DOM.textColorPicker.value;
    settings.showTitles = DOM.showTitlesCheckbox.checked;
    settings.showAddSiteBtn = DOM.showCreateBookmarkCheckbox.checked;
    // settings.largeTiles = DOM.largeTilesInput.checked;
    settings.showAddGroupsBtn = DOM.showCreateGroupsCheckbox.checked;
    settings.showClock = DOM.showClockCheckbox.checked;
    settings.maxCols = DOM.bookmarkMaxColsSelect.value;
    settings.bookmarkSize = DOM.bookmarkSizeSelect.value;
    settings.bookmarkMargin = DOM.bookmarkMarginSelect.value;
    settings.dialRatio = DOM.bookmarkRatioSelect.value;
    settings.defaultSort = DOM.defaultSortSelect.value;
    settings.addBookmarkBtnPosition = DOM.addBookmarkBtnPositionSelect.value;
    settings.rememberGroup = DOM.rememberGroupCheckbox.checked;
    settings.currentGroupId = state.currentGroupId;
    console.log("getSettingFromDOM Settings after: ", settings);
}

// 保存设置
export async function saveSettings(settings, wallpaperSrc, isGetSettingFromDOM = true) {
    if (isGetSettingFromDOM)
        getSettingFromDOM(settings);

    let dataToSave = {
        settings: settings
    };

    if (wallpaperSrc) {
        console.log("wallpaperSrc saved before: ", state.wallpaperSrc.length < 100 ? state.wallpaperSrc : state.wallpaperSrc.substring(200, 20));
        dataToSave.wallpaperSrc = wallpaperSrc;
        console.log("wallpaperSrc saved after: ", wallpaperSrc.length < 100 ? wallpaperSrc : wallpaperSrc.substring(200, 20));
    }

    console.log("settings before save: settings", settings);
    await chrome.storage.local.set(dataToSave)
        .then(() => {
            state.settings = settings;
            if (wallpaperSrc) {
                state.wallpaperSrc = wallpaperSrc;
            }
            /*
            settingsToast.style.opacity = "1";
            setTimeout(function () {
                settingsToast.style.opacity = "0";
            }, 3500);
             */

            //tabMessagePort.postMessage({updateSettings: true});
        });
}

// Preload the image before setting the background
// 暂时没用
function preloadImage(url) {
    const img = new Image();
    img.src = url;
    return new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
    });
}

///////////////////////////////////////////////////////////////////////////////////
// 导入/导出功能
////////////////////////////////////////////////////////////////////////////////
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

        DOM.exportBtn.setAttribute('href', URL.createObjectURL(blob));
        DOM.exportBtn.download = `yasd-export-${dateString}.json`;
        DOM.exportBtn.classList.remove('disabled');

    });
}

// todo:更改获取数据逻辑为从浏览器本地缓存获取
// 导出当前插件的数据，生成一个 JSON 文件并提供下载。
export function prepareExport() {
    let yasdJson = {
        yasd: {
            version: 3,
            bookmarks: [],
            groups: [],
            settings: {},
            dials: []
        }
    };
}

// 读取 speed dail 2 的 json，导入数据
export function importFromSD2(json, isMerge = false) {
    const origGroups = Array.isArray(json.groups) ? json.groups : [];
    const origDials = Array.isArray(json.dials) ? json.dials : [];

    const newGroups = [];
    const newBookmarks = [];
    const groupIdMap = {};

    // ----- 不合并：直接清空并覆盖 -----
    if (!isMerge) {
        // 先处理 home 分组（固定）
        groupIdMap["0"] = "home";
        newGroups.push({
            id: "home",
            title: "Index",
            position: 1
        });

        // 处理其他分组
        origGroups.forEach(g => {
            if (g.id === 0) {
                return;
            }
            const key = String(g.id);
            const newId = "G." + generateId();
            groupIdMap[key] = newId;
            newGroups.push({
                id: newId,
                title: g.title,
                position: g.position
            });
        });

        origDials.sort((a, b) => (a.ts_created || 0) - (b.ts_created || 0));

        // 为每个 dial 生成书签，groupId 使用映射（找不到默认 home）
        origDials.forEach(d => {
            const mappedGroupId = groupIdMap[String(d.idgroup)] || 'home';
            const position = newBookmarks.filter(item => item.groupId === mappedGroupId).length + 1;
            newBookmarks.push({
                id: generateId(),
                title: d.title,
                url: d.url,
                groupId: mappedGroupId,
                visits: d.visits,
                position: position,
                thumbnail: d.thumbnail,
                createtime: d.ts_created
            });
        });

        return {
            groups: newGroups,
            bookmarks: newBookmarks,
            settings: state.defaults
        };
    } else {
        // todo: 逻辑还需要完善
        // ----- 合并逻辑：尽量复用同名分组并避免重复书签 -----
        // chrome.storage.local.get(['groups', 'bookmarks']).then(result => {
        //     const existingGroups = Array.isArray(result.groups) ? result.groups.slice() : [];
        //     const existingBookmarks = Array.isArray(result.bookmarks) ? result.bookmarks.slice() : [];

        //     // 索引：按 title 查找已有组（用于尝试复用），并按 id 查找已有组
        //     const groupByTitle = {};
        //     const groupById = {};
        //     existingGroups.forEach(g => {
        //         if (g && g.title) groupByTitle[g.title] = g;
        //         if (g && g.id !== undefined) groupById[String(g.id)] = g;
        //     });

        //     // 确保存在 id 为 'home' 的组（导入的 id=0 会映射到 'home'）
        //     if (!groupById['home']) {
        //         // 尝试找一个原始导入 group.id===0 的 title 来命名 home，否则用 'Home'
        //         const importedHome = origGroups.find(g => g.id === 0);
        //         const homeTitle = importedHome ? importedHome.title : 'Home';
        //         const homeGroup = { id: 'home', title: homeTitle, position: 0 };
        //         existingGroups.push(homeGroup);
        //         groupByTitle[homeTitle] = homeGroup;
        //         groupById['home'] = homeGroup;
        //     }

        //     // 处理每个原始分组：如果已有同名组则复用其 id，否则创建新 id 并加入 existingGroups
        //     origGroups.forEach(g => {
        //         const key = String(g.id);
        //         if (g.id === 0) {
        //             groupIdMap[key] = 'home';
        //         } else {
        //             const sameTitle = groupByTitle[g.title];
        //             if (sameTitle) {
        //                 groupIdMap[key] = sameTitle.id;
        //             } else {
        //                 const newId = 'G.' + generateId();
        //                 const newGroup = { id: newId, title: g.title, position: g.position };
        //                 existingGroups.push(newGroup);
        //                 groupByTitle[newGroup.title] = newGroup;
        //                 groupById[newId] = newGroup;
        //                 groupIdMap[key] = newId;
        //             }
        //         }
        //     });

        //     // 处理书签：检查（url + groupId）是否已存在，若不存在则加入
        //     origDials.forEach(d => {
        //         const mappedGroupId = groupIdMap[String(d.idgroup)] || 'home';
        //         const exists = existingBookmarks.some(b => b.url === d.url && b.groupId === mappedGroupId);
        //         if (!exists) {
        //             existingBookmarks.push({
        //                 id: 'B.' + generateId(),
        //                 title: d.title,
        //                 url: d.url,
        //                 groupId: mappedGroupId,
        //                 visits: d.visits,
        //                 position: d.position,
        //                 thumbnail: d.thumbnail,
        //                 createtime: d.ts_created
        //             });
        //         }
        //     });

        //     // 写回 storage
        //     return chrome.storage.local.set({
        //         groups: existingGroups,
        //         bookmarks: existingBookmarks
        //     });
        // }).then(() => {
        //     hideModals();
        //     processRefresh();
        // }).catch(err => {
        //     console.error(err);
        //     DOM.importExportStatus.innerText = "SD2 import error! Unable to merge bookmarks.";
        // });
    }
}

// todo: 还没有实现
export function importFromFVD(json) {
    let bookmarks = json.db.dials.map(dial => ({
        title: dial.title,
        url: dial.url,
        groupId: dial.group_id
    }));

    let groups = json.db.groups.map(group => ({
        id: group.id,
        title: group.name
    }));
}

// todo: 还没有实现
export function importFromYASD(json) {
    // import from yasd v3 format:
    let yasdData = json.yasd;
}

// todo: 还没有实现
export function importFromOldYASD(json) {
    // import from old yasd format
}
