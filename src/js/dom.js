// 统一管理 DOM 元素的引用
export const DOM = {
    bookmarksContainerParent: document.getElementById('tileContainer'),
    bookmarksContainer: document.getElementById('tileContainer'),
    groupsContainer: document.getElementById('groups'),
    addGroupButton: document.getElementById('addgroupButton'),
    menu: document.getElementById('contextMenu'),
    groupMenu: document.getElementById('groupMenu'),
    settingsMenu: document.getElementById('settingsMenu'),
    modal: document.getElementById('tileModal'),
    modalContent: document.getElementById('tileModalContent'),

    createDialModal: document.getElementById('createDialModal'),
    createDialModalContent: document.getElementById('createDialModalContent'),
    createBookmarkTitle: document.getElementById('createBookmarkTitle'),
    createBookmarkURL: document.getElementById('createBookmarkURL'),
    createBookmarkModalSave: document.getElementById('createDialModalSave'),

    createGroupModal: document.getElementById('creategroupModal'),
    createGroupModalContent: document.getElementById('creategroupModalContent'),
    createGroupModalName: document.getElementById('creategroupModalName'),
    createGroupModalSave: document.getElementById('creategroupModalSave'),

    editGroupModal: document.getElementById('editgroupModal'),
    editgroupModalContent: document.getElementById('editgroupModalContent'),
    editgroupModalName: document.getElementById('editgroupModalName'),
    editGroupModalSave: document.getElementById('editgroupModalSave'),

    deleteGroupModal: document.getElementById('deletegroupModal'),
    deletegroupModalContent: document.getElementById('deletegroupModalContent'),
    deletegroupModalName: document.getElementById('deletegroupModalName'),
    deleteGroupModalSave: document.getElementById('deletegroupModalSave'),

    importExportModal: document.getElementById('importExportModal'),
    importExportModalContent: document.getElementById('importExportModalContent'),
    importExportStatus: document.getElementById('statusMessage'),
    exportBtn: document.getElementById("exportBtn"),
    importFileInput: document.getElementById("importFile"),
    importFileLabel: document.getElementById("importFileLabel"),

    refreshAllModal: document.getElementById('refreshAllModal'),
    refreshAllModalContent: document.getElementById('refreshAllModalContent'),
    refreshAllModalSave: document.getElementById('refreshAllModalSave'),

    toast: document.getElementById('toast'),
    toastContent: document.getElementById('toastContent'),

    closeModal: document.getElementsByClassName("close"),  // 注意：这是一个集合 (HTMLCollection)，使用时需循环或 Array.from
    editBookmarkModalSave: document.getElementById('modalSave'),
    sidenav: document.getElementById("sidenav"),
    modalTitle: document.getElementById("modalTitle"),
    modalURL: document.getElementById("modalURL"),
    modalImgContainer: document.getElementById("modalImgContainer"),
    modalImgInput: document.getElementById("modalImgFile"),
    modalImgBtn: document.getElementById("modalImgBtn"),
    modalImgUrlBtn: document.getElementById("modalImgUrlBtn"),
    modalImageURLInput: document.getElementById("modalImageURLInput"),
    closeImgUrlBtn: document.getElementById("closeImgUrlBtn"),
    fetchImageButton: document.getElementById("fetchImageButton"),
    modalBgColorPickerInput: document.getElementById("modalBgColorPickerInput"),
    modalBgColorPickerBtn: document.getElementById("modalBgColorPickerBtn"),
    modalBgColorPreview: document.getElementById("modalBgColorPreview"),
    noBookmarks: document.getElementById('noBookmarks'),

    // settings sidebar
    wallPaperEnableCheckbox: document.getElementById("wallpaper"),  // 是否使用壁纸
    previewContainer: document.getElementById("previewContainer"),
    imgInputFile: document.getElementById("file"),  // 选择本地壁纸文件
    imgPreviewDiv: document.getElementById("preview"),
    imgPreviewOverlayDiv: document.getElementById("previewOverlay"),
    switchesContainer: document.getElementById("switchesContainer"),
    backgroundColorContainer: document.getElementById("backgroundColorContainer"),
    bgColorPicker: document.getElementById("color-picker"),
    bgColorPicker_wrapper: document.getElementById("color-picker-wrapper"),
    textColorPicker: document.getElementById("textColor-picker"),
    textColorPicker_wrapper: document.getElementById("textColor-picker-wrapper"),
    // largeTilesInput: document.getElementById("largeTiles"),
    settingsBtn: document.getElementById("settingsBtn"),    // 设置按钮，点击打开设置侧边栏
    defaultSortSelect: document.getElementById("defaultSort"),  // 书签默认排序方式
    addBookmarkBtnPositionSelect: document.getElementById("addBookmarkBtnPosition"), // 新增书签按钮位置
    bookmarkSizeSelect: document.getElementById("bookmarkSize"),    // 书签大小
    bookmarkMarginSelect:document.getElementById("bookmarkMargin"),   // 书签间隔
    bookmarkRatioSelect: document.getElementById("dialRatio"),  // 书签形状
    bookmarkMaxColsSelect: document.getElementById("maxcols"),  // 书签列数
    showTitlesCheckbox: document.getElementById("showTitles"),  // 是否显示书签标题
    showClockCheckbox: document.getElementById("showClock"),   // 是否显示时钟
    showCreateBookmarkCheckbox: document.getElementById("showCreateDial"),  // 是否显示新增书签按钮+
    showCreateGroupsCheckbox: document.getElementById("showgroups"),    // 是否显示新增分组按钮
    rememberGroupCheckbox: document.getElementById("remembergroup"),    // 是否记住当前选择分组
    initSettingBtn: document.getElementById("initSettingBtn"),  // 清空设定按钮
    clearAllBtn: document.getElementById("clearAllBtn"),    //清空所有数据
    importExportBtn: document.getElementById("importExportBtn"),
    helpBtn: document.getElementById("help"),

    searchContainer: document.getElementById('searchContainer'),
    searchInput: document.getElementById('searchInput'),

    clock: document.getElementById('clock'),
};

// 错误处理示例：检查关键元素是否存在
Object.keys(DOM).forEach(key => {
    if (!DOM[key] && DOM[key] !== null) {  // 允许 null，但警告缺失
        console.warn(`DOM element '${key}' not found.`);
    }
});
