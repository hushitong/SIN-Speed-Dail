/*
    modals.js (模态框管理)
    目的：所有模态框的构建、显示、隐藏。
    移动的函数：buildCreateDialModal, buildModal, addImage, createDial, hideModals, modalShowEffect 等所有模态相关。
    依赖：导入 ui.js (渲染)、bookmarks.js (保存书签)、utils.js。
    注意：模态框变量（如 modal, createDialModal）可以作为模块常量。
*/
import { DOM } from "./dom.js"
import { state } from "./state.js";
import { getThumbs } from "./bookmarks.js";
import { setInputValue, rgbToHex, cssGradientToHex,filterDials } from "./utils.js";
import { hideSettings } from "./ui.js";

// 显示添加书签模态框
export function buildCreateBookmarkModal(parentGroupId) {
    DOM.createDialModalURL.value = '';
    DOM.createDialModalURL.parentId = parentGroupId ? parentGroupId : state.selectedGroupId;
    DOM.createDialModalURL.focus();
}

// 显示编辑书签模态框
export async function editBookmarkModal(url, title) {
    // nuke any previous modal
    let carousel = document.getElementById("carousel");
    if (carousel) {
        DOM.modalImgContainer.removeChild(carousel);
    }

    let customCarousel = document.getElementById("customCarousel");
    if (customCarousel) {
        DOM.modalImgContainer.removeChild(customCarousel);
    }

    let newCarousel = document.createElement('div');
    newCarousel.setAttribute('id', 'carousel');
    DOM.modalImgContainer.appendChild(newCarousel);

    //let createdCarousel = document.getElementById('carousel');
    DOM.modalTitle.value = title;
    DOM.modalURL.value = url;
    let images = await getThumbs(url);
    if (images && images.thumbnails.length) {
        // clunky af
        let index = images.thumbIndex;
        let imgDiv = document.createElement('div');
        let img = document.createElement('img');
        img.crossOrigin = 'Anonymous';
        img.setAttribute('src', images.thumbnails[index]);
        img.onerror = function () {
            img.setAttribute('src', 'img/default.png'); // todo: image is borked, cleanup
        };
        imgDiv.appendChild(img);

        img.onload = function () {
            // read the bg color and set the color picker preview
            // todo: stop storing bg in gradient format jesus
            let bgColor = cssGradientToHex(images.bgColor);
            if (bgColor) {
                setInputValue(DOM.modalBgColorPickerInput, rgbToHex(bgColor))
            }
        }

        newCarousel.appendChild(imgDiv);
        for (let [i, image] of images.thumbnails.entries()) {
            if (i !== index) {
                let imgDiv = document.createElement('div');
                let img = document.createElement('img');
                img.crossOrigin = 'Anonymous';
                img.setAttribute('src', image);
                img.onerror = function () {
                    img.setAttribute('src', 'img/default.png'); // todo: cleanup
                };
                imgDiv.appendChild(img);
                newCarousel.appendChild(imgDiv);
            }
        }
        $('#carousel').flexCarousel({ height: '180px' });

        // listen for carousel navigation to updade the bg color button preview
        let fcNext = document.querySelector('.fc-next');
        if (fcNext) {
            fcNext.addEventListener('click', function () {
                let cc = document.getElementById('customCarousel');
                if (cc) {
                    selectedImageSrc = customCarousel.children[0].src;
                    let bgColor = getBgColor(customCarousel.children[0]);
                    if (bgColor) {
                        setInputValue(modalBgColorPickerInput, rgbToHex(bgColor))
                    }
                } else {
                    let imageNodes = document.getElementsByClassName('fc-slide');
                    for (let node of imageNodes) {
                        // div with order "2" is the one being displayed by the carousel
                        if (node.style.order === '2') {

                            // sometimes the carousel puts images inside a <figure class="fc-image"> elem
                            if (node.children[0].className === "fc-image") {
                                //selectedImageSrc = node.children[0].children[0].src;
                                let bgColor = getBgColor(node.children[0].children[0]);
                                if (bgColor) {
                                    //setInputValue(modalBgColorPickerInput, rgbToHex(bgColor))
                                    setInputValue(modalBgColorPickerInput, rgbToHex(bgColor))
                                }
                            } else {
                                //selectedImageSrc = node.children[0].src;
                                let bgColor = getBgColor(node.children[0]);
                                if (bgColor) {
                                    setInputValue(modalBgColorPickerInput, rgbToHex(bgColor))
                                }
                            }
                        }
                    }
                }
            });
        }

        let fcPrev = document.querySelector('.fc-prev');
        if (fcPrev) {
            fcPrev.addEventListener('click', function () {
                let cc = document.getElementById('customCarousel');
                if (cc) {
                    selectedImageSrc = customCarousel.children[0].src;
                    let bgColor = getBgColor(customCarousel.children[0]);
                    if (bgColor) {
                        setInputValue(modalBgColorPickerInput, rgbToHex(bgColor))
                    }
                } else {
                    let imageNodes = document.getElementsByClassName('fc-slide');
                    for (let node of imageNodes) {
                        // div with order "2" is the one being displayed by the carousel
                        if (node.style.order === '2') {

                            // sometimes the carousel puts images inside a <figure class="fc-image"> elem
                            if (node.children[0].className === "fc-image") {
                                //selectedImageSrc = node.children[0].children[0].src;
                                let bgColor = getBgColor(node.children[0].children[0]);
                                if (bgColor) {
                                    //setInputValue(modalBgColorPickerInput, rgbToHex(bgColor))
                                    setInputValue(modalBgColorPickerInput, rgbToHex(bgColor))
                                }
                            } else {
                                //selectedImageSrc = node.children[0].src;
                                let bgColor = getBgColor(node.children[0]);
                                if (bgColor) {
                                    setInputValue(modalBgColorPickerInput, rgbToHex(bgColor))
                                }
                            }
                        }
                    }
                }
            });
        }

    }
}

// 显示添加分组模态框
export function addGroupBtn() {
    console.log("addgroupBtn");
    hideSettings();
    DOM.createGroupModalName.value = '';
    DOM.createGroupModalName.focus();
    DOM.createGroupModal.style.transform = "translateX(0%)";
    DOM.createGroupModal.style.opacity = "1";
    DOM.createGroupModalContent.style.transform = "scale(1)";
    DOM.createGroupModalContent.style.opacity = "1";
}

//todo: deletability yo
export function addImage(image) {
    let carousel = document.getElementById('carousel');
    if (carousel) {
        carousel.style.display = "none";
        let customCarousel = document.getElementById('customCarousel');
        if (customCarousel) {
            customCarousel.remove();
        }
        customCarousel = document.createElement('div');
        customCarousel.setAttribute('id', 'customCarousel');
        customCarousel.style.height = "180px";

        let preview = document.createElement('img');
        preview.style.height = '100%';
        preview.style.width = '100%';
        preview.style.objectFit = 'contain';
        preview.setAttribute('src', image);

        customCarousel.appendChild(preview);
        DOM.modalImgContainer.appendChild(customCarousel);

        // set the color picker to the new image bg color
        preview.onload = function () {
            let bgColor = getBgColor(preview);
            if (bgColor) {
                setInputValue(DOM.modalBgColorPickerInput, rgbToHex(bgColor))
            }
        };
    }
}

// 隐藏所有模态框
export function hideModals() {
    let modals = [DOM.modal, DOM.createDialModal, DOM.createGroupModal, DOM.editGroupModal, DOM.deleteGroupModal, DOM.refreshAllModal, DOM.importExportModal];
    let modalContents = [DOM.modalContent, DOM.createDialModalContent, DOM.createGroupModalContent, DOM.editgroupModalContent, DOM.deletegroupModalContent, DOM.refreshAllModalContent, DOM.importExportModalContent]

    for (let button of document.getElementsByTagName('button')) {
        button.blur();
    }

    for (let input of document.getElementsByTagName('input')) {
        input.blur();
    }

    for (let el of modalContents) {
        el.style.transform = "scale(0.8)";
        el.style.opacity = "0";
    }

    for (let el of modals) {
        el.style.opacity = "0";
        setTimeout(function () {
            el.style.transform = "translateX(100%)";
        }, 160);
    }

    // Reset modalBtnContainer and imageUrlContainer
    document.getElementById('modalBtnContainer').style.display = 'flex';
    document.getElementById('imageUrlContainer').style.display = 'none';
    DOM.modalImageURLInput.value = '';

    // hide search
    DOM.searchInput.blur();
    DOM.searchContainer.classList.remove('active');

    if (DOM.searchInput.value) {
        DOM.searchInput.value = ''; // Clear the search input
        filterDials(''); // Only call if there was a search term
    }

}

export function modalShowEffect(contentEl, modalEl) {
    modalEl.style.transform = "translateX(0%)";
    modalEl.style.opacity = "1";
    contentEl.style.transform = "scale(1)";
    contentEl.style.opacity = "1";
}