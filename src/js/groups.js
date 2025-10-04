import { state } from "./state.js"
import { DOM } from "./dom.js"
import { dragenterHandler, dragleaveHandler, dragoverHandler, dropHandler } from "./events.js";
import { buildBookmarksByGroupId } from "./bookmarks.js";
import { generateId } from "./utils.js";
import { getData, saveData } from "./data.js"
import { showToast, animate, hideSettings } from "./ui.js";
import { hideModals } from "./modals.js";
import { printNewSetupPage, activeBookmorksContainer } from "./ui.js"

// 显示某个分组
// 仅修改样式，不重新加载数据再绘制
export function activeGroup(groupId) {
    console.log("activeGroup:", groupId);
    hideSettings();
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

// 页面刷新：读取数据，重建分组标题
export async function reBuildGroupPages(inData = null) {
    if (!inData) state.data = await getData();
    const bookmarks = state.data.bookmarks || [];

    if (!bookmarks.length) {
        DOM.addGroupButton.style.display = 'none';
        printNewSetupPage();
        return;
    }

    const groups = state.data.groups || [];

    // clear any existing data so we can refresh
    DOM.groupsContainer.innerHTML = '';

    // Build group header links
    if (groups && groups.length > 1) {
        for (let group of groups) {
            buildGroupLink(group.title, group.id);
        }
    }

    return;
}
// 重新生成所有分组链接
export function buildGroupsLinks(groups) {
    if (groups.length >= 1) {
        for (let group of groups) {
            buildGroupLink(group.title, group.id);
        }
    }
}

// 生成单个分组链接，并设置 class 和 click 事件
export function buildGroupLink(groupTitle, groupId) {
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

    // 点击分组链接时，显示对应分组的书签
    // 每次切换分组时，重新加载该分组的书签数据并绘制
    a.onclick = function () {
        console.log("Switch to group:", groupId);
        activeGroup(groupId);
        getData(['bookmarks']).then(data => {
            buildBookmarksByGroupId(data.bookmarks.filter(bookmark => bookmark.groupId === groupId), groupId).then(() => {
                activeBookmorksContainer(groupId);
            });
        });
        // state.selectedGroupId = groupId;
        state.currentGroupId = groupId;
        state.scrollPos = 0;
        DOM.bookmarksContainerParent.scrollTop = state.scrollPos;

        state.settings.currentGroupId = groupId;
        chrome.storage.local.set({ settings: state.settings });
    };

    // 可拖拽目标为设定了 draggable="true" 的元素
    // 绑定拖拽事件：当可拖拽元素进入该目标时触发
    a.ondragenter = dragenterHandler;
    // 绑定拖拽事件：当可拖拽元素离开该目标时触发
    a.ondragleave = dragleaveHandler;
    // 绑定拖拽事件：当可拖拽元素在该目标上方移动时持续触发
    // 必须阻止默认行为，才能允许 drop 事件的触发
    // 不阻止默认行为，当可拖拽元素在该目标释放时其触发流程为： dragenter  →  dragleave  →  dragend
    a.ondragover = dragoverHandler;
    // 绑定拖拽事件：当可拖拽元素在该目标释放时触发
    a.ondrop = dropHandler;

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
        buildBookmarksByGroupId([], id);
    });
}

// 修改分组
export function editGroup() {
    let title = DOM.editgroupModalName.value.trim();
    state.data.groups.filter(g => g.id === state.targetGroupId)[0].title = title;

    const groups = state.data.groups;
    saveData({ groups }).then(() => {
        hideModals();
        reBuildGroupPages();
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
        showToast("Goup Remove!", 2000);
        if (state.currentGroupId === state.targetGroupId) {
            let homeGroupId = state.homeGroup.id;
            state.currentGroupId = homeGroupId;
            state.settings.currentGroupId = homeGroupId;
            chrome.storage.local.set({ settings: state.settings });
            reBuildGroupPages();
            buildBookmarksByGroupId(state.data.bookmarks.filter(b => b.groupId === homeGroupId), homeGroupId);
            activeBookmorksContainer(homeGroupId);
            activeGroup(homeGroupId);
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

    getData(['groups', 'settings']).then(async data => {
        const groups = data.groups;
        const targetGroup = groups[oldIndex];
        if (targetGroup.id !== id) {
            console.warn("moveGroup: target not found", id);
            return;
        }
        groups.splice(oldIndex, 1);
        groups.splice(newIndex, 0, targetGroup);
        groups.forEach((b, index) => {
            b.position = index + 1;
        });

        await saveData({ groups: groups });
        console.log(`Group ${id} moved from ${oldIndex} to ${newIndex}`);
    });
}

