/*
    state.js (共享状态管理)

    目的：管理全局变量，避免全局污染。
    导出：一个对象或类，包含 data、settings、currentGroupId 等。提供 getter/setter。
*/
const homeGroupId = 'home';

export let state = {
    data: {},
    settings: null,
    wallpaperSrc: null, // 存储背景图地址
    defaultWallpaperSrc: "img/bg.jpg",  // 背景图默认地址
    currentGroupId: null,
    selectedGroupId: null,

    homeGroup: {
        id: homeGroupId,
        title: chrome.i18n.getMessage('home'),
        position: 1,
        color: '#333333'
    },

    // 默认设置
    defaults: {
        wallPaperEnable: true,
        backgroundColor: '#242B05',
        textColor: '#ffffff',
        // largeTiles: true,
        rememberGroup: false,
        showTitles: true,
        showAddSiteBtn: true,
        showAddGroupsBtn: true,
        showClock: true,
        maxCols: '100',
        defaultSort: 'first',
        bookmarkSize: 'medium',
        dialRatio: 'wide',
        currentGroupId: homeGroupId,
    },

    scrollPos: 0,   // 存储书签容器的滚动位置，用于分组切换或刷新后恢复之前的滚动状态。
    layoutgroup: false,

    targetTileTitle: null, // 存储当前操作的书签（tile）的唯一 ID，用于删除、编辑等操作时定位具体书签。
    targetTileHref: null,  // 存储当前操作的书签（tile）的 URL 链接，用于上下文菜单、编辑模态框等场景中获取目标书签的链接信息。
    targetNode: null,  // 存储当前操作的 DOM 节点（如书签元素、分组元素），用于拖拽、上下文菜单定位等场景。
    targetGroupId: null,   // 存储当前操作的分组的唯一 ID，用于分组编辑、删除、移动等操作时定位具体分组。
};

export function initState(initialSettings) {
    state.settings = initialSettings;
    // ... 初始化其他状态
}

export function getState(key) {
    return state[key];
}

export function setState(key, value) {
    state[key] = value;
}