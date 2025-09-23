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
    createDialModalURL: document.getElementById('createDialModalURL'),
    createDialModalSave: document.getElementById('createDialModalSave'),

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

    refreshAllModal: document.getElementById('refreshAllModal'),
    refreshAllModalContent: document.getElementById('refreshAllModalContent'),
    refreshAllModalSave: document.getElementById('refreshAllModalSave'),

    toast: document.getElementById('toast'),
    toastContent: document.getElementById('toastContent'),

    closeModal: document.getElementsByClassName("close"),  // 注意：这是一个集合 (HTMLCollection)，使用时需循环或 Array.from
    modalSave: document.getElementById('modalSave'),
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
    color_picker: document.getElementById("color-picker"),
    color_picker_wrapper: document.getElementById("color-picker-wrapper"),
    textColor_picker: document.getElementById("textColor-picker"),
    textColor_picker_wrapper: document.getElementById("textColor-picker-wrapper"),
    imgInput: document.getElementById("file"),
    imgPreview: document.getElementById("preview"),
    previewOverlay: document.getElementById("previewOverlay"),
    switchesContainer: document.getElementById("switchesContainer"),
    wallPaperEnabled: document.getElementById("wallpaper"),
    previewContainer: document.getElementById("previewContainer"),
    backgroundColorContainer: document.getElementById("backgroundColorContainer"),
    largeTilesInput: document.getElementById("largeTiles"),
    rememberGroupInput: document.getElementById("remembergroup"),
    showTitlesInput: document.getElementById("showTitles"),
    showCreateDialInput: document.getElementById("showCreateDial"),
    showgroupsInput: document.getElementById("showgroups"),
    showClockInput: document.getElementById("showClock"),   // 是否显示时钟
    showSettingsBtnInput: document.getElementById("showSettingsBtn"),   // 是否显示设置按钮
    settingsBtn: document.getElementById("settingsBtn"),
    maxColsInput: document.getElementById("maxcols"),
    defaultSortInput: document.getElementById("defaultSort"),
    importExportBtn: document.getElementById("importExportBtn"),
    importExportStatus: document.getElementById('statusMessage'),
    exportBtn: document.getElementById("exportBtn"),
    importFileInput: document.getElementById("importFile"),
    importFileLabel: document.getElementById("importFileLabel"),
    helpBtn: document.getElementById("help"),
    dialSizeInput: document.getElementById("dialSize"),
    dialRatioInput: document.getElementById("dialRatio"),

    searchInput: document.getElementById('searchInput'),
    searchContainer: document.getElementById('searchContainer'),

    clock: document.getElementById('clock'),
};

// 错误处理示例：检查关键元素是否存在
Object.keys(DOM).forEach(key => {
    if (!DOM[key] && DOM[key] !== null) {  // 允许 null，但警告缺失
        console.warn(`DOM element '${key}' not found.`);
    }
});
