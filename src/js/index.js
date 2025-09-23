// yet another speed dial
// copyright 2019 dev@conceptualspace.net
// absolutely no warranty is expressed or implied

'use strict';

import { initEvents } from "./events.js"
import { state } from "./state.js"
import { onEndHandler } from "./events.js";
import { DOM } from "./dom.js";
import { saveSettings } from "./setting.js";
import { applySettings, buildDialPages as buildBookmarkPages } from "./ui.js";

// let tabMessagePort = null;

 
// 时钟相关
let hourCycle = 'h12';
hourCycle = Intl.DateTimeFormat(navigator.language, { hour: 'numeric' }).resolvedOptions().hourCycle;
function displayClock() {
    DOM.clock.textContent = new Date().toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hourCycle: hourCycle });
    setTimeout(displayClock, 10000);
}
displayClock();

// 入口
function init() {
    initEvents();

    document.querySelectorAll('[data-locale]').forEach(elem => {
        elem.innerText = chrome.i18n.getMessage(elem.dataset.locale)
    })

    new Promise(resolve => chrome.storage.local.get('settings', resolve))
        .then(result => {
            if (result) {
                if (result.settings) {
                    state.settings = Object.assign({}, state.defaults, result.settings);
                } else {
                    state.settings = state.defaults;
                }
            }

            state.currentGroupId = state.settings.currentGroupId;
            state.selectedGroupId = state.settings.currentGroupId;
            applySettings(state.settings)
                .then(() => {
                    saveSettings(state.settings);
                    buildBookmarkPages(state.selectedGroupId)
                });
        });

    DOM.sidenav.style.display = "flex";

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

}

init();
