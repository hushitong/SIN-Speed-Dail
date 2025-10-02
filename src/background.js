'use strict';

const defaultThumbPrefix = 'thumb_'; // 缩略图在 storage 中的 key 前缀
const fetchScreenshotTimeout = 5000; // 截图超时时间，单位毫秒
const isSetContextMenus = true; // 是否启用右键菜单功能，默认禁用，我个人不喜欢在右键菜单拉屎的做法

// EVENT LISTENERS //
chrome.runtime.onMessage.addListener(handleMessages);
// 当用户在网页或扩展界面中，点击你扩展创建的右键菜单项时触发。
// 需要先用 chrome.contextMenus.create(...) 创建了菜单项
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
// 当扩展被安装、更新、浏览器更新时触发
chrome.runtime.onInstalled.addListener(handleInstalled);


// 所有使用sendMessage的地方都会触发这个函数
async function handleMessages(message, sender, sendResponse) {
	console.log("bg message", message);

	if (message.target !== 'background') {
		return;
	}

	switch (message.type) {
		case 'handleBookmarkChanged':
			await handleBookmarkChanged(message.data);
			break;
		case 'refreshThumbs':	// 手动刷新某个书签的缩略图
			handleManualRefresh(message.data);
			break;
		case 'refreshAllThumbs':	// 刷新当前分组所有书签的缩略图
			handleRefreshAllThumbs(message.data);
			break;
		case 'handleBookmarkAddFromPopup':	// 在 popup.js 里点击分组后，发送的新增 bookmark 消息
			await handlePopupAction(message.data);
			break;
		case 'saveThumbnails':	// 在新增 bookmark 时，由 offscreen 发送回来的缩略图
			handleOffscreenFetchDone(message.data, message.forcePageReload);
			break;
		case 'getThumbs':
			handleGetThumbs(message.data);
			break;
		default:
			console.warn(`Unexpected message type received: '${message.type}'.`);
			break;
	}

	// 异步处理完成后，调用 sendResponse 关闭通道（即使无数据返回）
	console.log('Sending response');
	sendResponse({ success: true });
}

// 添加、删除书签触发
async function handleBookmarkChanged(info) {
	console.log("bg handleBookmarkChanged", info);

	const changeType = info.changeType;

	let bookmarks = null
	switch (changeType) {
		case 'Add':
			// bookmarks = await getBookmarks(groupId
			await createBookmarkThumb(info);
			break;
		case 'Remove':
			await refreshOpen();
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
}

async function handleGetThumbs(data, batchSize = 50) {
	console.log("bg handleGetThumbs", data);
	let bookmarks = data.filter(bookmark => bookmark.url?.startsWith("http"));

	if (!bookmarks.length) return;

	// Fetch all thumbnails in batches
	for (let i = 0; i < bookmarks.length; i += batchSize) {
		let batch = bookmarks.slice(i, i + batchSize);

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


// MESSAGE HANDLERS //
function handleManualRefresh(data) {
	if (data.url && (data.url.startsWith('https://') || data.url.startsWith('http://'))) {
		chrome.storage.local.remove(data.url).then(() => {
			getThumbnails(data.url, data.id, data.parentId, { quickRefresh: true, forceScreenshot: true, forcePageReload: false }).then(() => {
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
	try {
		screenshot = await fetchScreenshot(url);
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
		}).then(response => {
			console.log('offscreen response:', response);  // 可选：处理响应
		}).catch(err => {
			console.error('SendMessage error:', err);  // 捕获 promise reject，避免 uncaught
		});;
	}
	catch (err) {
		console.log("getThumbnails err:", err);
		chrome.runtime.sendMessage({
			target: 'newtab',
			type: 'GetThumbErr',
			data: [{
				id,
				groupId: groupId,
				url,
				err: err.message
			}]
		}).then(response => {
			console.log('newtab response:', response);  // 可选：处理响应
		}).catch(err => {
			console.error('SendMessage error:', err);  // 捕获 promise reject，避免 uncaught
		});
		// todo：告知用户
	}
}

async function refreshOpen() {
	await chrome.runtime.sendMessage({
		target: 'newtab',
		data: { refresh: true }
	});
}

async function reloadGroups() {
	await chrome.runtime.sendMessage({
		target: 'newtab',
		data: { reloadGroups: true }
	});
}


// 当用户在网页或扩展界面中，点击你扩展创建的右键菜单项时触发的事件
async function handleContextMenuClick(info, tab) {
	console.log("handleContextMenuClick", info, tab);
	if (info.menuItemId === 'addToSpeedDial') {
		await createBookmarkNotFromNewtab("contextMenu", tab)
	}
}
// 当用户点击扩展的 工具栏图标（就是在地址栏右边，扩展显示的那个小图标） 时触发的事件
async function handlePopupAction(tab) {
	console.log("handleBrowserAction", tab);

	return await createBookmarkNotFromNewtab("popup", tab);
}
// 新增书签的处理方法
async function createBookmarkNotFromNewtab(from, tab) {
	console.log("createBookmarkNotFromNewtab", tab);

	let groupId;
	const data = await getData(['bookmarks', 'settings']);
	if (from === "contextMenu") {
		groupId = data.settings.currentGroupId;
	} else if (from === "popup") {
		groupId = tab.groupId;
	} else {
		console.log("createBookmarkNotFromNewtab: unknown from", from);
		return;
	}

	// 获取当前分组的最大位置
	const groupBookmarks = data.bookmarks.filter(b => b.groupId === groupId);
	const maxPosition = groupBookmarks.length > 0
		? Math.max(...groupBookmarks.map(b => b.position || 0))
		: 0;

	const newId = generateId();
	const newBookmark = {
		id: newId,
		groupId: groupId,
		title: tab.title || tab.url,
		url: tab.url,
		position: maxPosition + 1,
		thumbnail: null,
		visits: 0,
		createtime: Math.floor(Date.now() / 1000),
	};

	data.bookmarks.push(newBookmark);
	await saveData(data).then(() => {
		if (from === "popup") {
			chrome.runtime.sendMessage({
				target: 'popup',
				type: 'handleBookmarkAdded',
				data: { isAdded: true }
			});
		}
	});

	await getThumbnails(tab.url, newId, groupId, { quickRefresh: false, forceScreenshot: true, forcePageReload: false })


	// 生成唯一ID
	function generateId() {
		return crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
	}

	async function getData(keys = ['groups', 'bookmarks']) {
		return new Promise((resolve) => {
			chrome.storage.local.get(keys, (result) => {
				// 为了避免result中缺少对应key时返回undefined，这里可以统一处理默认值
				const data = keys.reduce((acc, key) => {
					acc[key] = result[key] || [];
					return acc;
				}, {});
				resolve(data);
			});
		});
	}
	// 数据管理函数 - 保存
	async function saveData(data) {
		return new Promise((resolve) => {
			chrome.storage.local.set(data, () => {
				resolve();
			});
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
		const previousVersion = details.previousVersion; // 旧版本
		const currentVersion = chrome.runtime.getManifest().version; // 新版本

		console.log("SIN Speed Dail，升级：", previousVersion, "→", currentVersion);

		// 保留处理，以防未来需要
		// if (isVersionLessThan(previousVersion, "1.0.0")) {
		// 	// 某些版本升级后，需要做一些特殊处理，比如数据迁移、数据清理、数据初始化等
		// 	// await migrateOldData();
		// }
	}

	try {
		// remove existing menus to avoid issues with previous versions
		await chrome.contextMenus.removeAll();

		// 在浏览器右键菜单中添加 "Add to Speed Dial" 选项
		if (isSetContextMenus) {
			chrome.contextMenus.create({
				title: "Add to Speed Dial",
				contexts: ["page"],
				documentUrlPatterns: ["https://*/*", "http://*/*"],
				id: "addToSpeedDial",
			});
		}
	} catch (error) {
		console.log("Error managing context menus:", error.message);
	}
}
// 版本比较函数，判断 v1 是否小于 v2
function isVersionLessThan(v1, v2) {
	const a = v1.split('.').map(Number);
	const b = v2.split('.').map(Number);

	for (let i = 0; i < Math.max(a.length, b.length); i++) {
		const n1 = a[i] || 0;
		const n2 = b[i] || 0;
		if (n1 < n2) return true;
		if (n1 > n2) return false;
	}
	return false;
}

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

// 如果目标页面就是当前 tab，直接用 chrome.tabs.captureVisibleTab 截图。
// 否则：新开一个后台 tab，等页面加载完成后截图，再关闭。
// 不能使用 popup，因为 popup 有可能由于浏览器策略被延迟/挂起，而不能准时激活 onUpdated 方法
async function fetchScreenshot(url) {
	return new Promise((resolve, reject) => {
		try {
			chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
				if (chrome.runtime.lastError) {
					return reject(chrome.runtime.lastError || new Error("tabs.query failed"));
				}

				let activeTab = tabs[0]; // 当前活跃标签（因为 query 指定 active: true）

				if (activeTab && activeTab.url && activeTab.url.startsWith(url)) {
					// 当前活跃标签匹配 URL（右键菜单场景或类似）
					// 检查是否被阻塞
					const finalUrl = activeTab.url;
					if (finalUrl.startsWith('extension://') || finalUrl.includes('document-blocked.html')) {
						return reject(new Error("Page blocked by extension (e.g., ad blocker)"));
					}

					// 直接捕获当前可见标签（无需激活，因为已是活跃）
					chrome.tabs.captureVisibleTab(activeTab.windowId, { format: 'png' }, (dataUrl) => {
						if (chrome.runtime.lastError || !dataUrl) {
							reject(chrome.runtime.lastError || new Error("captureVisibleTab failed"));
						} else {
							resolve(dataUrl);
						}
					});
				} else {
					// URL 不匹配当前活跃标签：新建后台标签处理
					chrome.windows.getCurrent({ populate: true }, (currentWindow) => {
						if (chrome.runtime.lastError) {
							return reject(chrome.runtime.lastError || new Error("Failed to get current window"));
						}

						const windowId = currentWindow.id;
						const previousActiveTab = currentWindow.tabs.find(tab => tab.active);

						chrome.tabs.create({ url: url, active: false, windowId: windowId }, (newTab) => {
							if (chrome.runtime.lastError) {
								return reject(chrome.runtime.lastError || new Error("Failed to create tab"));
							}

							const tabId = newTab.id;

							let timeoutId = setTimeout(() => {
								chrome.tabs.onUpdated.removeListener(onUpdated);
								chrome.tabs.remove(tabId);
								reject(new Error("Timeout: Page took too long to load"));
							}, 10000); // 10 秒超时

							function onUpdated(updatedTabId, changeInfo) {
								if (updatedTabId === tabId && changeInfo.status === 'complete') {
									clearTimeout(timeoutId);
									chrome.tabs.onUpdated.removeListener(onUpdated);

									// 检查是否被阻塞
									chrome.tabs.get(tabId, (tab) => {
										if (chrome.runtime.lastError) {
											chrome.tabs.remove(tabId);
											return reject(chrome.runtime.lastError);
										}

										const finalUrl = tab.url;
										if (finalUrl.startsWith('extension://') || finalUrl.includes('document-blocked.html')) {
											chrome.tabs.remove(tabId);
											return reject(new Error("Page blocked by extension (e.g., ad blocker)"));
										}

										// 临时激活标签以捕获截图
										chrome.tabs.update(tabId, { active: true }, () => {
											if (chrome.runtime.lastError) {
												chrome.tabs.remove(tabId);
												return reject(chrome.runtime.lastError);
											}

											setTimeout(() => {
												// 捕获截图
												chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, (dataUrl) => {
													const captureError = chrome.runtime.lastError;

													// 无论成功失败，关闭新标签并恢复原活跃标签
													chrome.tabs.remove(tabId, () => {
														if (previousActiveTab && previousActiveTab.id !== tabId) {
															chrome.tabs.update(previousActiveTab.id, { active: true });
														}
													});

													if (captureError || !dataUrl) {
														reject(captureError || new Error("captureVisibleTab failed"));
													} else {
														resolve(dataUrl);
													}
												});
											}, 300); // 等待300ms，确保页面渲染完成再截图
										});
									});
								}
							}

							chrome.tabs.onUpdated.addListener(onUpdated);
						});
					});
				}
			});
		} catch (err) {
			reject(err);
		}
	});
}

// async function fetchScreenshot(url) {
// 	return new Promise((resolve, reject) => {
// 		try {
// 			// 先查询当前窗口和当前活跃标签，以便稍后恢复
// 			chrome.windows.getCurrent({ populate: true }, (currentWindow) => {
// 				if (chrome.runtime.lastError) {
// 					return reject(chrome.runtime.lastError || new Error("Failed to get current window"));
// 				}

// 				const windowId = currentWindow.id;
// 				const previousActiveTab = currentWindow.tabs.find(tab => tab.active);

// 				// 在当前窗口创建一个后台标签（active: false）
// 				chrome.tabs.create({ url: url, active: false, windowId: windowId }, (newTab) => {
// 					if (chrome.runtime.lastError) {
// 						return reject(chrome.runtime.lastError || new Error("Failed to create tab"));
// 					}

// 					const tabId = newTab.id;

// 					let timeoutId = setTimeout(() => {
// 						chrome.tabs.onUpdated.removeListener(onUpdated);
// 						chrome.tabs.remove(tabId);
// 						reject(new Error("Timeout: Page took too long to load"));
// 					}, 10000); // 10 秒超时

// 					function onUpdated(updatedTabId, changeInfo) {
// 						if (updatedTabId === tabId && changeInfo.status === 'complete') {
// 							clearTimeout(timeoutId);
// 							chrome.tabs.onUpdated.removeListener(onUpdated);

// 							// 检查是否被阻塞
// 							chrome.tabs.get(tabId, (tab) => {
// 								if (chrome.runtime.lastError) {
// 									chrome.tabs.remove(tabId);
// 									return reject(chrome.runtime.lastError);
// 								}

// 								const finalUrl = tab.url;
// 								if (finalUrl.startsWith('extension://') || finalUrl.includes('document-blocked.html')) {
// 									chrome.tabs.remove(tabId);
// 									return reject(new Error("Page blocked by extension (e.g., ad blocker)"));
// 								}

// 								// 临时激活该标签以确保可见并捕获截图
// 								chrome.tabs.update(tabId, { active: true }, () => {
// 									if (chrome.runtime.lastError) {
// 										chrome.tabs.remove(tabId);
// 										return reject(chrome.runtime.lastError);
// 									}

// 									// 捕获截图
// 									chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, (dataUrl) => {
// 										const captureError = chrome.runtime.lastError;

// 										// 无论成功与否，都关闭新标签并恢复原活跃标签
// 										chrome.tabs.remove(tabId, () => {
// 											if (previousActiveTab) {
// 												chrome.tabs.update(previousActiveTab.id, { active: true });
// 											}
// 										});

// 										if (captureError || !dataUrl) {
// 											reject(captureError || new Error("captureVisibleTab failed"));
// 										} else {
// 											resolve(dataUrl);
// 										}
// 									});
// 								});
// 							});
// 						}
// 					}

// 					chrome.tabs.onUpdated.addListener(onUpdated);
// 				});
// 			});
// 		} catch (err) {
// 			reject(err);
// 		}
// 	});
// }