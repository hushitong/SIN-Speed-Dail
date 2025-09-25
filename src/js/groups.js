import { state } from "./state.js"
import { DOM } from "./dom.js"
import { dragenterHandler, dragleaveHandler } from "./events.js";
import { printBookmarksByGroupId } from "./bookmarks.js";
import { generateId } from "./utils.js";
import { saveData } from "./data.js"
import { showToast, animate, hideSettings } from "./ui.js";
import { hideModals } from "./modals.js";
import { reBuildGroupPages } from "./ui.js"

// 显示某个分组
// 仅修改样式，不重新加载数据再绘制
export function showGroup(groupId) {
    hideSettings();
    let groups = document.getElementsByClassName('container');
    for (let group of groups) {
        if (group.id === groupId) {
            group.style.display = "flex"
            group.style.opacity = "0";
            state.layoutgroup = true;
            // transition between groups. todo more elegant solution
            setTimeout(function () {
                group.style.opacity = "1";
                animate()
            }, 20);
        } else {
            group.style.display = "none";
        }
    }
    // style the active tab
    let groupTitles = document.getElementsByClassName('groupTitle');
    for (let title of groupTitles) {
        if (title.attributes.groupid.value === groupId) {
            title.classList.add('activegroup');
        } else {
            title.classList.remove('activegroup');
        }
    }
}

// 重新生成所有分组链接
export function groupsLinks(groups) {
    if (groups.length >= 1) {
        for (let group of groups) {
            groupLink(group.title, group.id);
        }
    }
}
// 生成单个分组链接，并设置 class 和 click 事件
export function groupLink(groupTitle, groupId) {
    let a = document.createElement('a');
    if (groupId === state.homeGroup.id) {
        a.id = "homegroupLink";
    }

    a.classList.add('groupTitle');
    if (groupId === state.currentGroupId) {
        a.classList.add('activegroup');
    }
    a.setAttribute('groupId', groupId);
    let linkText = document.createTextNode(groupTitle);
    a.appendChild(linkText);

    a.onclick = function () {
        showGroup(groupId);
        state.selectedGroupId = groupId;
        state.currentGroupId = groupId;
        state.scrollPos = 0;
        DOM.bookmarksContainerParent.scrollTop = state.scrollPos;

        state.settings.currentGroupId = groupId;
        chrome.storage.local.set({ settings:state.settings });
    };

    // todo: allow dropping directly on group title?
    a.ondragenter = dragenterHandler;
    a.ondragleave = dragleaveHandler;

    DOM.groupsContainer.appendChild(a);
}

// 添加分组
export function createGroup() {
    let name = DOM.createGroupModalName.value.trim();
    const orgGroupCount = state.data.groups.length;
    const id = "G." + generateId();
    state.data.groups.push({ id: id, title: name, position: orgGroupCount + 1, color: '#6b47aaff' });

    const groups = state.data.groups;
    saveData({ groups }).then(() => {
        hideModals();
        reBuildGroupPages();
        printBookmarksByGroupId([], id);
    });
}

//修改分组
export function editGroup() {
    let title = DOM.editgroupModalName.value.trim();
    state.data.groups.filter(g => g.id === state.targetGroupId)[0].title = title;

    const groups = state.data.groups;
    saveData({ groups }).then(() => {
        hideModals()
    }).catch(err => {
        console.log(err);
    });
}

// 移除分组
export function removeGroup() {
    let updateGroups = state.data.groups.filter(g => g.id !== state.targetGroupId);
    let updateBookmarks = state.data.bookmarks.filter(b => b.groupId !== state.targetGroupId);

    state.data.groups = updateGroups;
    state.data.bookmarks = updateBookmarks;

    saveData({ groups: updateGroups, bookmarks: updateBookmarks }).then(() => {
        hideModals();
        showToast("Goup Remove!",2000);
        if (state.currentGroupId === state.targetGroupId) {
            let homeGroupId = state.homeGroup.id;
            state.currentGroupId = homeGroupId;
            state.settings.currentGroupId = homeGroupId;
            chrome.storage.local.set({ settings: state.settings });
            reBuildGroupPages();
            printBookmarksByGroupId(state.data.bookmarks.filter(b => b.groupId === homeGroupId), homeGroupId);
            showGroup(homeGroupId);
        } else {
            reBuildGroupPages();
        }
    }).catch(err => {
        console.log("removeGroup() ERR " + err);
    });
}

// 移动分组顺序
export function moveGroup(id, oldIndex, newIndex, newSiblingId) {
    console.log("movegroup:", id, oldIndex, newIndex, newSiblingId);
    let options = {};

    function move(id, options) {
        chrome.bookmarks.move(id, options).then(result => {
            // tabMessagePort.postMessage({ refreshInactive: true })
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

