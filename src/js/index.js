'use strict';

import { initEvents } from "./events.js"
import { state } from "./state.js"
import { getData } from "./data.js";
import { onGroupMoveEndHandler } from "./events.js";
import { DOM } from "./dom.js";
import { saveSettings } from "./setting.js";
import { initSettings, buildGroupsAndBookmarksPages } from "./ui.js";
import { apply_i18n } from "./utils.js";

// let tabMessagePort = null;

// 时钟相关
let hourCycle = 'h12';
function displayClock() {
    DOM.clock.textContent = new Date().toLocaleString('zh-CN', {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
    setTimeout(displayClock, 200);
}
displayClock();

// 入口
async function init() {
    console.log("Project init start");

    initEvents();
    // apply_i18n();
    // await getData(['aa']).then(async data => {
    //     console.log("init get data from storage:", data);
    // });
    await getData(['settings', 'wallpaperSrc']).then(async data => {
        console.log("init get data from storage:", data);
        let wallpaperSrc = null;
        let isNeedUpdate = false;

        if (data.settings) {
            console.log(data.settings);
            state.settings = data.settings;
        } else {
            state.settings = state.defaults;
            isNeedUpdate = true;
        }
        if (data.wallpaperSrc) {
            state.wallpaperSrc = data.wallpaperSrc;
            wallpaperSrc = data.wallpaperSrc;
        } else {
            state.wallpaperSrc = state.defaultWallpaperSrc;
            wallpaperSrc = state.defaultWallpaperSrc;
            isNeedUpdate = true;
        }

        state.currentGroupId = state.settings.currentGroupId;
        if (isNeedUpdate) {
            await saveSettings(state.settings, wallpaperSrc, false);
        }
        let i18nLanguage = (state.settings.i18nLanguage).replace('-', '_');
        apply_i18n(i18nLanguage);

        initSettings(state.settings, wallpaperSrc);
        buildGroupsAndBookmarksPages(state.currentGroupId);
    });

    DOM.sidenav.style.display = "flex";

    // 基于 Sortable 库，初始化分组列表的拖拽排序功能
    new Sortable(DOM.groupsContainer, {
        animation: 150,
        forceFallback: true,     // 是否忽略HTML5拖放行为，强制使用降级方案（模拟拖拽）
        fallbackTolerance: 4,   // 指定鼠标需要移动多少像素才被视为拖拽（像素）
        draggable: ".groupTitle",
        filter: "#homegroupLink",
        // preventOnFilter: true,
        ghostClass: 'selected',
        onMove: function (evt) {
            return evt.related.id !== 'homegroupLink';
        },
        onEnd: onGroupMoveEndHandler
    });

    console.log("Project init end");

}

init();
