import { DOM } from "./dom.js";
import { state } from "./state.js"
import { hideModals } from "./modals.js";
import { processRefresh, showToast } from "./ui.js";
import { generateId } from "./utils.js";

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
    settings.dialRatio = DOM.bookmarkRatioSelect.value;
    settings.defaultSort = DOM.defaultSortSelect.value;
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
    // exports yasd json file that includes all bookmarks within the root speed dial group, along with the yasd settings and thumbnails from storage
    // in the following format:

    /*
    const yasdJson = {
        "yasd": {
            "bookmarks":[
                {"id":123,"title":"Site Title","url":"https://www.website.com","index":1,"groupid":3}
            ],
            "groups":[
                {"id":123,"title":"group Title","index":1}
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
            groups: [],
            settings: {},
            dials: []
        }
    };
    // // Get bookmarks and groups within the speed dial group
    // chrome.bookmarks.getSubTree(state.selectedGroupId).then(bookmarkTreeNodes => {
    //     function traverseBookmarks(nodes, parentId = null) {
    //         nodes.forEach(node => {
    //             if (node.url) {
    //                 yasdJson.yasd.bookmarks.push({
    //                     id: node.id,
    //                     title: node.title,
    //                     url: node.url,
    //                     index: node.index,
    //                     groupid: parentId
    //                 });
    //             } else {
    //                 yasdJson.yasd.groups.push({
    //                     id: node.id,
    //                     title: node.title,
    //                     index: node.index
    //                 });
    //                 if (node.children) {
    //                     traverseBookmarks(node.children, node.id);
    //                 }
    //             }
    //         });
    //     }
    //     traverseBookmarks(bookmarkTreeNodes[0].children);

    //     // Get YASD settings and thumbnails from storage
    //     chrome.storage.local.get(null).then(items => {
    //         for (const [key, value] of Object.entries(items)) {
    //             if (key.startsWith('settings')) {
    //                 yasdJson.yasd.settings[key] = value;
    //             } else if (key.startsWith('http')) {
    //                 let thumbnails = [];
    //                 if (value.thumbnails && value.thumbnails.length) {
    //                     thumbnails.push(value.thumbnails[value.thumbIndex]);
    //                 }
    //                 yasdJson.yasd.dials.push({
    //                     [key]: {
    //                         thumbnails: thumbnails,
    //                         thumbIndex: 0,
    //                         bgColor: value.bgColor
    //                     }
    //                 });
    //             }
    //         }

    //         // Save as file; requires downloads permission
    //         const blob = new Blob([JSON.stringify(yasdJson)], { type: 'application/json' });
    //         const today = new Date();
    //         const dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}-v3`;

    //         DOM.exportBtn.setAttribute('href', URL.createObjectURL(blob));
    //         DOM.exportBtn.download = `yasd-export-${dateString}.json`;
    //         DOM.exportBtn.classList.remove('disabled');
    //     });
    // });
}

// 读取 speed dail 2 的 json，导入数据
// export function importFromSD2(json, isMerge = false) {
//     // let bookmarks = json.dials.map(dial => ({
//     //     title: dial.title,
//     //     url: dial.url,
//     //     groupId: dial.idgroup,
//     //     visits: dial.visits,
//     //     position: dial.position,
//     //     thumbnail: dial.thumbnail,
//     //     createtime: dial.ts_created,

//     // }));

//     // let groups = json.groups.map(group => ({
//     //     id: group.id,
//     //     title: group.title,
//     //     position: group.position,
//     // }));

//     const origGroups = Array.isArray(json.groups) ? json.groups : [];
//     const origDials = Array.isArray(json.dials) ? json.dials : [];

//     // map: 原始 group.id (字符串) -> 新 group id ("home" 或 "G.xxxx")
//     const groupIdMap = {};

//     // ----- 不合并：直接清空并覆盖 -----
//     if (!isMerge) {
//         const newGroups = [];
//         const groupIdMap = {};

//         // 先处理 home 分组（固定）
//         groupIdMap["0"] = "home";
//         newGroups.push({
//             id: "home",
//             title: "Index",
//             position: 1
//         });

//         // 处理其他分组
//         origGroups.forEach(g => {
//             if (g.id === 0) {
//                 return;
//             }
//             const key = String(g.id);
//             const newId = "G." + generateId();
//             groupIdMap[key] = newId;
//             newGroups.push({
//                 id: newId,
//                 title: g.title,
//                 position: g.position
//             });
//         });

//         // 为每个 dial 生成书签，groupId 使用映射（找不到默认 home）
//         origDials.forEach(d => {
//             const mappedGroupId = groupIdMap[String(d.idgroup)] || 'home';
//             newBookmarks.push({
//                 id: generateId(),
//                 title: d.title,
//                 url: d.url,
//                 groupId: mappedGroupId,
//                 visits: d.visits,
//                 position: d.position,
//                 thumbnail: d.thumbnail,
//                 createtime: d.ts_created
//             });
//         });
//     }

//     // // 清空并写入
//     // chrome.storage.local.clear().then(() => {
//     //     return chrome.storage.local.set({
//     //         groups: newGroups,
//     //         bookmarks: newBookmarks
//     //     });
//     // }).then(() => {
//     //     hideModals();
//     //     processRefresh();
//     // }).catch(err => {
//     //     console.error(err);
//     //     DOM.importExportStatus.innerText = "SD2 import error! Unable to save bookmarks.";
//     // });

//     return;
// }

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

        // 为每个 dial 生成书签，groupId 使用映射（找不到默认 home）
        origDials.forEach(d => {
            const mappedGroupId = groupIdMap[String(d.idgroup)] || 'home';
            newBookmarks.push({
                id: generateId(),
                title: d.title,
                url: d.url,
                groupId: mappedGroupId,
                visits: d.visits,
                position: d.position,
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
                    let existsIngroup = existingBookmarks.some(b => b.parentId === parentId);
                    if (!existsIngroup) {
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
            importExportStatus.innerText = "FVD import error! Unable to create groups.";
        });

    }).catch(err => {
        console.log(err);
        importExportStatus.innerText = "Something went wrong. Please try again";
    });
}

export function importFromYASD(json) {
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

        // Create groups and get their IDs
        let groupPromises = yasdData.groups.sort((a, b) => a.index - b.index).map(group => {
            return chrome.bookmarks.search({ title: group.title }).then(existinggroups => {
                const matchinggroups = existinggroups.filter(f => f.parentId === selectedGroupId);
                if (matchinggroups.length > 0) {
                    return { oldId: group.id, newId: matchinggroups[0].id };
                } else {
                    return chrome.bookmarks.create({
                        title: group.title,
                        parentId: selectedGroupId
                    }).then(node => {
                        return { oldId: group.id, newId: node.id };
                    });
                }
            });
        });

        Promise.all(groupPromises).then(groupIdMappings => {
            let groupIdMap = {};
            groupIdMappings.forEach(mapping => {
                groupIdMap[mapping.oldId] = mapping.newId;
            });

            // Create bookmarks using the new group IDs
            let bookmarkPromises = yasdData.bookmarks.map(bookmark => {
                let parentId = groupIdMap[bookmark.groupid] || selectedGroupId;
                return chrome.bookmarks.search({ url: bookmark.url }).then(existingBookmarks => {
                    let existsIngroup = existingBookmarks.some(b => b.parentId === parentId);
                    if (!existsIngroup) {
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
            importExportStatus.innerText = "Error! Unable to create groups.";
        });
    }).catch(err => {
        console.log(err);
        importExportStatus.innerText = "Something went wrong. Please try again.";
    });
}

export function importFromOldYASD(json) {
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
