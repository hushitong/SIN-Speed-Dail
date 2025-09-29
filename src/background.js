// yet another speed dial
// copyright 2019 dev@conceptualspace.net
// absolutely no warranty is expressed or implied

'use strict';

const defaultThumbPrefix = 'thumb_'; // 缩略图在 storage 中的 key 前缀

// EVENT LISTENERS //

// firefox triggers 'moved' for bookmarks saved to different group than default
// firefox triggers 'changed' for bookmarks created manually todo: confirm
// chrome triggers 'created' for bookmarks created manually in bookmark mgr
// chrome.bookmarks.onMoved.addListener(handleBookmarkChanged);
// chrome.bookmarks.onChanged.addListener(handleBookmarkChanged);
// chrome.bookmarks.onCreated.addListener(handleBookmarkChanged);
// chrome.bookmarks.onRemoved.addListener(handleBookmarkRemoved);

// 当用户点击扩展的 工具栏图标（就是在地址栏右边，扩展显示的那个小图标） 时触发
chrome.action.onClicked.addListener(handleBrowserAction);
// 当用户在网页或扩展界面中，点击你扩展创建的右键菜单项时触发。
// 需要先用 chrome.contextMenus.create(...) 创建了菜单项
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);

chrome.runtime.onMessage.addListener(handleMessages);
// 当扩展被安装、更新、浏览器更新时触发
chrome.runtime.onInstalled.addListener(handleInstalled);


// 所有使用sendMessage的地方都会触发这个函数
async function handleMessages(message) {
	console.log("bg message", message);
	// Return early if this message isn't meant for the worker
	if (message.target !== 'background') {
		return;
	}

	// Dispatch the message to an appropriate handler.
	switch (message.type) {
		case 'handleBookmarkChanged':
			handleBookmarkChanged(message.data);
			break;
		case 'refreshThumbs':
			handleManualRefresh(message.data);
			break;
		case 'refreshAllThumbs':
			handleRefreshAllThumbs(message.data);
			break;
		case 'saveThumbnails':	// 在新增 bookmark 时，由 offscreen 发送回来的缩略图
			handleOffscreenFetchDone(message.data, message.forcePageReload);
			break;
		case 'toggleBookmarkCreatedListener':
			toggleBookmarkCreatedListener(message.data);
			break;
		case 'getThumbs':
			handleGetThumbs(message.data);
			break;
		default:
			console.warn(`Unexpected message type received: '${message.type}'.`);
			break;
	}
}

// 添加、删除书签触发
async function handleBookmarkChanged(info) {
	console.log("bg handleBookmarkChanged", info);

	const changeType = info.changeType;

	let bookmarks = null
	switch (changeType) {
		case 'Add':
			// bookmarks = await getBookmarks(groupId
			createBookmarkThumb(info);
			break;
		case 'Remove':
			refreshOpen();
			return;
		// case 'Edit':
		// 	bookmarks = await chrome.bookmarks.get({id: info.id});
		// 	break;
		// case 'Move':
		// 	bookmarks = await chrome.bookmarks.get({id: info.id});
		// 	break;
		default:
			console.warn(`Unexpected changeType received: '${changeType}'.`);
			return;
	}
}

async function createBookmarkThumb(info) {
	const groupId = info.groupId;
	const id = info.id;

	if (!groupId || !id) {
		return
	}

	const thumbData = await chrome.storage.local.get(defaultThumbPrefix + id);
	console.log("org thumbData:", thumbData);

	getThumbnails(info.url, id, groupId, { quickRefresh: false, forceScreenshot: false, forcePageReload: false });
	// getThumbnails(info.url, id, groupId, { quickRefresh: false, forceScreenshot: false, forcePageReload: true });

	// if (bookmark[0].url) {
	// 	const bookmarkUrl = bookmark[0].url
	// 	const bookmarkId = bookmark[0].id
	// 	const parentId = bookmark[0].parentId
	// 	if (bookmarkUrl !== "data:" && bookmarkUrl !== "about:blank") {
	// 		const bookmarkData = await chrome.storage.local.get(bookmarkUrl)
	// 		if (bookmarkData[bookmarkUrl]) {
	// 			// a pre-existing bookmark is being modified; dont fetch new thumbnails
	// 			refreshOpen();
	// 		} else {
	// 			// new bookmark needs images
	// 			getThumbnails(bookmarkUrl, bookmarkId, parentId, {forcePageReload: true});
	// 		}
	// 	}
	// }
}

async function handleGetThumbs(data, batchSize = 50) {
	console.log("bg handleGetThumbs", data);
	let bookmarks = data.filter(bookmark => bookmark.url?.startsWith("http"));

	if (!bookmarks.length) return;

	// Fetch all thumbnails in batches
	for (let i = 0; i < bookmarks.length; i += batchSize) {
		let batch = bookmarks.slice(i, i + batchSize);

		// Get multiple URLs at once
		let urls = batch.map(bookmark => bookmark.url);
		let results = await chrome.storage.local.get(urls);

		let thumbs = batch
			.map(bookmark => {
				let storedData = results[bookmark.url];
				if (!storedData) return null;

				return {
					id: bookmark.id,
					parentId: bookmark.parentId,
					url: bookmark.url,
					thumbnail: storedData.thumbnails[storedData.thumbIndex || 0],
					bgColor: storedData.bgColor
				};
			})
			.filter(thumb => thumb !== null); // Remove nulls if some bookmarks have no stored data

		if (thumbs.length) {
			chrome.runtime.sendMessage({
				target: 'newtab',
				type: 'thumbBatch',
				data: thumbs
			});
		}

		// todo: maybe replace this with a message port so we dont blast every tab
		// Short delay to avoid overwhelming message passing
		await new Promise(resolve => setTimeout(resolve, 5));
	}
}

// async function getBookmarks(groupId) {
//     return new Promise((resolve) => {
//         chrome.storage.local.get(['bookmarks'], (result) => {
//             resolve({
//                 bookmarks: result.bookmarks.filter(b => b.groupId === groupId) || []
//             });
//         });
//     });
// }
async function getBookmarks(groupId) {
	return new Promise((resolve) => {
		chrome.storage.local.get(['bookmarks'], (result) => {
			// 确保存在 bookmarks 数据且是数组
			const allBookmarks = Array.isArray(result.bookmarks) ? result.bookmarks : [];
			// 过滤出当前分组下的书签
			const filteredBookmarks = allBookmarks.filter(b => b.groupId === groupId);
			resolve(filteredBookmarks); // 直接返回数组而非对象
		});
	});
}



async function handleBookmarkRemoved(id, info) {
	// todo: handle upsert where speed dial group is deleted
	//if (info.node.url && (info.parentId === speedDialId || groupIds.indexOf(info.parentId) !== -1)) {
	if (info.node.url) {
		// remove the thumbnail from local storage
		await chrome.storage.local.remove(info.node.url).catch((err) => {
			console.log(err)
		});
	} else if (info.node.title !== "Speed Dial" && info.node.title !== "New group") {
		// group removed, refresh the tab?
		//refreshOpen()
	}
	// todo: janky when we delete from the ui so disabled for now -- should only refresh inactive dial tabs, if they exist...
	//refreshOpen();
}



// MESSAGE HANDLERS //

// Function to enable or disable the bookmarks.onCreated listener
function toggleBookmarkCreatedListener(data) {
	if (data.enable) {
		chrome.bookmarks.onCreated.addListener(handleBookmarkChanged);
	} else {
		chrome.bookmarks.onCreated.removeListener(handleBookmarkChanged);
	}
}

function handleManualRefresh(data) {
	if (data.url && (data.url.startsWith('https://') || data.url.startsWith('http://'))) {
		chrome.storage.local.remove(data.url).then(() => {
			getThumbnails(data.url, data.id, data.parentId, { forceScreenshot: true }).then(() => {
				//refreshOpen()
			})
		})
	}
}

// 刷新当前分组所有书签的缩略图
async function handleRefreshAllThumbs(data) {
	// 移除所有书签对应的缩略图缓存
	for (let bookmark of data.bookmarks) {
		await chrome.storage.local.remove(defaultThumbPrefix + bookmark.id).catch((err) => {
			console.log(err);
		});
	}
	refreshBatch(data.bookmarks);

	async function refreshBatch(bookmarks, index = 0, retries = 2) {
		const batchSize = 200;
		const delay = 10000;
		const batch = bookmarks.slice(index, index + batchSize);

		if (batch.length) {
			try {
				await Promise.all(batch.map(bookmark => getThumbnails(bookmark.url, bookmark.id, bookmark.groupId, { quickRefresh: true, forceScreenshot: false, forcePageReload: false })));
				// todo show progress in UI
				// todo: we might need to refactor this to promises or timers so the worker doesnt kill the process with a batch scheduled
				setTimeout(() => refreshBatch(bookmarks, index + batchSize, retries), delay);
			} catch (err) {
				console.log(err);
				if (retries > 0) {
					//console.log(`Retrying batch at index ${index}...`);
					setTimeout(() => refreshBatch(bookmarks, index, retries - 1), delay);
				} else {
					//console.log(`Failed to refresh batch at index ${index} after multiple attempts.`);
					setTimeout(() => refreshBatch(bookmarks, index + batchSize, retries), delay);
				}
			}
		} else {
			//refreshOpen(); // not needed here it happens when thumbnails are saved
		}
	}
}

// 生成缩略图,假如存在 screenshot 就用 screenshot,否则传消息给 offscreen 进行截图
async function getThumbnails(url, id, groupId, options = { quickRefresh: false, forceScreenshot: false, forcePageReload: false }) {
	console.log("bg getThumbnails", url, id, groupId, options);

	if (!url || !id) {
		console.log("getThumbnails: missing url or id")
		return
	}
	// take screenshot if applicable
	let screenshot = null;
	// const tabs = await chrome.tabs.query({ windowId: chrome.windows.WINDOW_ID_CURRENT, active: true })

	// if (tabs && tabs.length && tabs[0].url === url) {
	// 	screenshot = await chrome.tabs.captureVisibleTab()
	// }
	screenshot = await fetchScreenshot(url).catch(err => {
		console.log(err);
	})

	console.log("bg screenshot length:", screenshot ? screenshot.length : 0);

	// cant parse images from dom in service worker: delegate to offscreen document
	await setupOffscreenDocument('offscreen.html');

	chrome.runtime.sendMessage({
		target: 'offscreen',
		data: {
			url,
			id,
			groupId: groupId,
			screenshot: screenshot,
			quickRefresh: options.quickRefresh,
			forcePageReload: options.forcePageReload,
		}
	});
}

// 处理由 Offscreen document 发送回来的缩略图数据
async function handleOffscreenFetchDone(data, forcePageReload) {
	console.log("bg handleOffscreenFetchDone", data, forcePageReload);
	saveThumbnails(data.url, data.id, data.parentId, data.thumbs, data.bgColor, forcePageReload);

	async function saveThumbnails(url, id, groupId, images, bgColor, forcePageReload = false) {
		console.log("bg saveThumbnails");
		if (images && images.length) {
			let thumbnails = [];
			const thumbId = defaultThumbPrefix + id;
			let orgThumbData = await chrome.storage.local.get(thumbId);
			if (orgThumbData && orgThumbData.thumbnails) {
				thumbnails = orgThumbData.thumbnails;
			}
			thumbnails.push(images);
			thumbnails = thumbnails.flat();
			await chrome.storage.local.set({ [thumbId]: { thumbnails, thumbIndex: 0, bgColor } })
		}
		// refresh open new tab page
		if (forcePageReload) {
			// we have new sites, reload the page
			refreshOpen();
		} else {
			// just update existing images
			chrome.runtime.sendMessage({
				target: 'newtab',
				type: 'thumbBatch',
				data: [{
					id,
					groupId: groupId,
					url,
					thumbnail: images[0],
					bgColor
				}]
			});
		}
	}
}

function refreshOpen() {
	chrome.runtime.sendMessage({
		target: 'newtab',
		data: { refresh: true }
	});
}

function reloadGroups() {
	chrome.runtime.sendMessage({
		target: 'newtab',
		data: { reloadGroups: true }
	});
}


// 当用户在网页或扩展界面中，点击你扩展创建的右键菜单项时触发的事件
function handleContextMenuClick(info, tab) {
	if (info.menuItemId === 'addToSpeedDial') {
		createBookmarkFromContextMenu(tab)
	}
}
// 当用户点击扩展的 工具栏图标（就是在地址栏右边，扩展显示的那个小图标） 时触发的事件
function handleBrowserAction(tab) {
	// if tab is a web page bookmark it to speed dial
	console.log(tab);
	if (tab.url && (tab.url.startsWith('https://') || tab.url.startsWith('http://'))) {
		createBookmarkFromContextMenu(tab);
		chrome.action.setBadgeText({ text: "✔", tabId: tab.id })
		chrome.action.setBadgeBackgroundColor({ color: '#13ac4e' }); // Green color
	} else {
		//chrome.tabs.create({ url: "https://github.com/conceptualspace/yet-another-speed-dial" });
	}
}
// 新增书签的处理方法
async function createBookmarkFromContextMenu(tab) {
	// get the speed dial group id
	let speedDialId = null;
	const bookmarks = await chrome.bookmarks.search({ title: 'Speed Dial' })
	if (bookmarks && bookmarks.length) {
		for (let bookmark of bookmarks) {
			if (!bookmark.url) {
				speedDialId = bookmark.id;
				break;
			}
		}
	}

	// check for doopz
	if (speedDialId) {
		let match = false;
		chrome.bookmarks.getSubTree(speedDialId).then(node => {
			for (const bookmark of node[0].children) {
				if (tab.url === bookmark.url) {
					match = true;
					break;
				}
			}
			if (!match) {
				chrome.bookmarks.create({
					parentId: speedDialId,
					title: tab.title,
					url: tab.url
				})
			}
		});
	}
}

// 当扩展被安装、更新、浏览器更新时触发
async function handleInstalled(details) {
	if (details.reason === "install") {
		// set uninstall URL
		// chrome.runtime.setUninstallURL("https://forms.gle/6vJPx6eaMV5xuxQk9");
		// todo: detect existing speed dial group
	} else if (details.reason === 'update') {
		if (details.previousVersion < '3.3') {
			const url = chrome.runtime.getURL("updated.html");
			chrome.tabs.create({ url });
		}
		// perform any migrations here...
	}

	try {
		// remove existing menus to avoid issues with previous versions
		await chrome.contextMenus.removeAll();

		// create context menu
		chrome.contextMenus.create({
			title: "Add to Speed Dial",
			contexts: ["page"],
			documentUrlPatterns: ["https://*/*", "http://*/*"],
			id: "addToSpeedDial",
		});
	} catch (error) {
		console.log("Error managing context menus:", error.message);
	}
}
// UTILS

// offscreen document setup
let creating; // A global promise to avoid concurrency issues
async function setupOffscreenDocument(path) {
	// Check all windows controlled by the service worker to see if one
	// of them is the offscreen document with the given path
	const offscreenUrl = chrome.runtime.getURL(path);
	const existingContexts = await chrome.runtime.getContexts({
		contextTypes: ['OFFSCREEN_DOCUMENT'],
		documentUrls: [offscreenUrl]
	});

	if (existingContexts.length > 0) {
		return;
	}

	// create offscreen document
	if (creating) {
		await creating;
	} else {
		creating = chrome.offscreen.createDocument({
			url: path,
			reasons: [chrome.offscreen.Reason.DOM_PARSER],
			justification: 'parse document for image tags to use as thumbnail'
		});
		await creating;
		creating = null;
	}
}


// 如果目标页面就是当前 tab，直接用 chrome.tabs.captureVisibleTab 截图。
// 否则：新开一个后台 tab，等页面加载完成后截图，再关闭。
async function fetchScreenshot(url) {
	return new Promise((resolve, reject) => {
		try {
			chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
				let activeTab = tabs.find(t => t.url && t.url.startsWith(url));

				if (activeTab) {
					// 当前 tab 是目标 URL
					chrome.tabs.update(activeTab.id, { active: true }, () => {
						chrome.tabs.captureVisibleTab(activeTab.windowId, { format: 'png' }, (dataUrl) => {
							if (chrome.runtime.lastError || !dataUrl) {
								reject(chrome.runtime.lastError || new Error("captureVisibleTab failed"));
							} else {
								resolve(dataUrl);
							}
						});
					});
				} else {
					// 新建激活 tab
					chrome.tabs.create({ url, active: true }, (tab) => {
						const tabId = tab.id;
						const windowId = tab.windowId;

						function onUpdated(updatedTabId, changeInfo) {
							if (updatedTabId === tabId && changeInfo.status === 'complete') {
								chrome.tabs.onUpdated.removeListener(onUpdated);

								chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, (dataUrl) => {
									if (chrome.runtime.lastError || !dataUrl) {
										reject(chrome.runtime.lastError || new Error("captureVisibleTab failed"));
									} else {
										resolve(dataUrl);
									}
									chrome.tabs.remove(tabId);
								});
							}
						}

						chrome.tabs.onUpdated.addListener(onUpdated);
					});
				}
			});
		} catch (err) {
			reject(err);
		}
	});
}