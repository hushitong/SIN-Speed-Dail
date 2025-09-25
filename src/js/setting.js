import { DOM } from "./dom.js";
import { state } from "./state.js"

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

        exportBtn.setAttribute('href', URL.createObjectURL(blob));
        exportBtn.download = `yasd-export-${dateString}.json`;
        exportBtn.classList.remove('disabled');

    });
}

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

    // Get bookmarks and groups within the speed dial group
    chrome.bookmarks.getSubTree(selectedGroupId).then(bookmarkTreeNodes => {
        function traverseBookmarks(nodes, parentId = null) {
            nodes.forEach(node => {
                if (node.url) {
                    yasdJson.yasd.bookmarks.push({
                        id: node.id,
                        title: node.title,
                        url: node.url,
                        index: node.index,
                        groupid: parentId
                    });
                } else {
                    yasdJson.yasd.groups.push({
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

export function importFromSD2(json) {
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
            console.log(err)
            importExportStatus.innerText = "SD2 import error! Unable to create groups."
        });

    }).catch(err => {
        console.log(err)
        importExportStatus.innerText = "Something went wrong. Please try again"
    });
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
