// yet another speed dial
// copyright 2019 dev@conceptualspace.net
// absolutely no warranty is expressed or implied

'use strict';

import { initEvents } from "./events.js"
import { state } from "./state.js"
import { onEndHandler } from "./events.js";
import { DOM } from "./dom.js";
import { saveSettings } from "./setting.js";
import { initSettings, buildPages as buildBookmarkPages } from "./ui.js";

// let tabMessagePort = null;


// 时钟相关
let hourCycle = 'h12';
function displayClock() {
    DOM.clock.textContent = new Date().toLocaleString('zh-CN', {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit"
    });
    setTimeout(displayClock, 10000);
}
displayClock();

// 入口
function init() {
    console.log("Project init start");

    initEvents();

    // 本地化
    document.querySelectorAll('[data-locale]').forEach(elem => {
        elem.innerText = chrome.i18n.getMessage(elem.dataset.locale)
    })

    new Promise(resolve => chrome.storage.local.get(["settings", "wallpaperSrc"], resolve))
        .then(result => {
            let wallpaperSrc = null;
            if (result) {
                if (result.settings) {
                    state.settings = Object.assign({}, state.defaults, result.settings);
                } else {
                    state.settings = state.defaults;
                }
                wallpaperSrc = result.wallpaperSrc ?? state.defaultWallpaperSrc;
                state.wallpaperSrc = wallpaperSrc;
            }
            state.currentGroupId = state.settings.currentGroupId;
            state.selectedGroupId = state.settings.currentGroupId;
            console.log("Project init before saveSettings");
            saveSettings(state.settings, wallpaperSrc, false).then(() => {
                // applySettings(state.settings, wallpaperSrc);
                initSettings(state.settings, wallpaperSrc);
                buildBookmarkPages(state.selectedGroupId);
            });
        });

    DOM.sidenav.style.display = "flex";

    // 基于Sortable库，初始化的分组列表的拖拽排序功能
    new Sortable(DOM.groupsContainer, {
        animation: 150,
        forceFallback: true,
        fallbackTolerance: 4,
        filter: "#homegroupLink",
        ghostClass: 'selected',
        onMove: function (evt) {
            return evt.related.id !== 'homegroupLink';
        },
        onEnd: onEndHandler
    });

    console.log("Project init end");

}

init();
