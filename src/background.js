'use strict';

const defaultThumbPrefix = 'thumb_'; // 缩略图在 storage 中的 key 前缀
const fetchScreenshotTimeout = 5000; // 截图超时时间，单位毫秒
const isSetContextMenus = true; // 是否启用右键菜单功能，默认禁用，我个人不喜欢在右键菜单拉屎的做法
let isMutiRefreshThumbs = false;	// 是否批量刷新缩略图，刷新单个书签缩略图为 false

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
		case 'handleBookmarkChanged':	// 添加、修改书签触发，获得书签的缩略图
			isMutiRefreshThumbs = false
			await handleBookmarkChanged(message.data);
			break;
		case 'refreshThumbs':	// 手动刷新某个书签的缩略图
			isMutiRefreshThumbs = false
			handleManualRefresh(message.data);
			break;
		case 'refreshAllThumbs':	// 刷新当前分组所有书签的缩略图
			isMutiRefreshThumbs = true;
			handleRefreshAllThumbs(message.data);
			break;
		case 'handleBookmarkAddFromPopup':	// 在 popup.js 里点击分组后，发送的新增 bookmark 消息
			isMutiRefreshThumbs = false;
			await handlePopupAction(message.data);
			break;
		case 'offscreenFetchDone':	// 在新增 bookmark 时，由 offscreen 发送回来的缩略图
			handleOffscreenFetchDone(message.data);
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
			await createBookmarkThumb(info);
			break;
		// case 'Remove':
		// 	await refreshOpen();
		// 	return;
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

	getThumbnailAndSendMsg(info.url, id, groupId, { quickRefresh: false, forceScreenshot: false });
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


// 刷新书签的缩略图
function handleManualRefresh(data) {
	if (data.url && (data.url.startsWith('https://') || data.url.startsWith('http://'))) {
		getThumbnailAndSendMsg(data.url, data.id, data.parentId, { quickRefresh: true, forceScreenshot: true }).then(() =>
			chrome.storage.local.remove(defaultThumbPrefix + data.id)
		)
	};
}


// 辅助函数，发送进度到前端（target: 'newtab'，复用你的 sendMessage 风格）
function sendProgressToFrontend(msg) {
	chrome.runtime.sendMessage({
		target: 'newtab',
		...msg  // type 和 data
	}).catch(err => console.error('Send progress error:', err));
}

// 刷新当前分组所有书签的缩略图
async function handleRefreshAllThumbs(data) {
	// 移除所有书签对应的缩略图缓存
	for (let bookmark of data.bookmarks) {
		await chrome.storage.local.remove(defaultThumbPrefix + bookmark.id).catch((err) => {
			console.log(err);
		});
	}

	const total = data.bookmarks.length;
	let progress = { current: 0, total, success: 0, failed: 0, errors: [] };
	// 发送开始信号给前端
	sendProgressToFrontend({ type: 'ThumbProgress', data: { ...progress, status: 'start' } });

	refreshBatch(data.bookmarks, progress);

	// 初次进行处理，没有重试机制
	async function refreshBatch(bookmarks, progress, index = 0) {
		const batchSize = 1;
		const batch = bookmarks.slice(index, index + batchSize);

		if (batch.length) {
			// 用 Promise.allSettled，确保总是 resolve 但可检查失败
			const settledResults = await Promise.allSettled(batch.map(async (bookmark) => {
				await getThumbnail(bookmark.url, bookmark.id, bookmark.groupId, { quickRefresh: true, forceScreenshot: false });
				return bookmark.id;
			}));

			// 处理每个结果，更新 progress
			let batchFailedCount = 0;
			settledResults.forEach((result, i) => {
				const bookmark = batch[i];
				if (result.status === 'fulfilled') {
					// 成功：更新计数 + 发送 ThumbSuccess
					progress.success++;
					progress.current++;
					sendProgressToFrontend({ type: 'ThumbProgress', data: { ...progress, status: 'success', bookmark: bookmark.title } });
				} else {
					const singleErr = result.reason;
					progress.failed++;
					progress.current++;
					progress.errors.push({ id: bookmark.id, url: bookmark.url, err: singleErr.message, bookmark });
					sendProgressToFrontend({ type: 'ThumbProgress', data: { ...progress, status: 'failed', bookmark: bookmark.title } });
					batchFailedCount++;
				}
			});
			refreshBatch(bookmarks, progress, index + batchSize);
		} else {
			console.log(`Initial refresh all thumbs completed: ${progress.success} success, ${progress.failed} failed`);

			// 如果有错误，触发重试
			if (progress.errors.length > 0) {
				sendProgressToFrontend({ type: 'ThumbProgress', data: { ...progress, status: 'initial_complete' } });
				refreshBatchRetry(progress);
			} else {
				sendProgressToFrontend({ type: 'ThumbProgress', data: { ...progress, status: 'complete' } });
			}
		}
	}
	// 重试获取缩略图有错误的书签
	async function refreshBatchRetry(progress) {
		const delay = 5000;  // 重试延迟
		let retryErrors = [];  // 收集最终未修复的错误
		let retrySuccess = 0;

		// 发送重试开始信号
		sendProgressToFrontend({ type: 'ThumbProgress', data: { ...progress, status: 'retry_start', retryCount: progress.errors.length } });

		// 逐个处理每个错误 bookmark（串行，避免并发问题）
		for (let errorItem of progress.errors) {
			const bookmark = errorItem.bookmark;
			let retryAttempts = 2;

			while (retryAttempts > 0) {
				try {
					await getThumbnail(bookmark.url, bookmark.id, bookmark.groupId, { quickRefresh: true, forceScreenshot: false });

					progress.success++;
					progress.failed--;
					retrySuccess++;
					sendProgressToFrontend({ type: 'ThumbProgress', data: { ...progress, status: 'retry_success', bookmark: bookmark.title } });

					// 从 errors 中移除这个（可选，保持 records 完整或清理）
					// progress.errors = progress.errors.filter(e => e.id !== bookmark.id);

					break;  // 成功，跳出 while
				} catch (retryErr) {
					console.log(`Retry failed for ${bookmark.id}:`, retryErr.message);
					retryAttempts--;
					if (retryAttempts > 0) {
						await new Promise(resolve => setTimeout(resolve, delay));
					} else {
						// 最终失败：保留原错误记录
						retryErrors.push(errorItem);
						sendProgressToFrontend({ type: 'ThumbProgress', data: { ...progress, status: 'retry_failed', bookmark: bookmark.title } });
					}
				}
			}
		}

		progress.errors = retryErrors;
		sendProgressToFrontend({ type: 'ThumbProgress', data: { ...progress, status: 'retry_complete', retrySuccess } });
		console.log(`Retry completed: ${retrySuccess} recovered, ${progress.errors.length} still failed`);
	}
}
// 调用 getThumbnail，然后只处理 newtab 消息
async function getThumbnailAndSendMsg(url, id, groupId, options = { quickRefresh: false, forceScreenshot: false }) {
	console.log("bg getThumbnails", url, id, groupId, options);

	try {
		// 调用核心函数（包含 offscreen）
		await getThumbnail(url, id, groupId, options);

		// 只处理：发送 ThumbSuccess 到 newtab（原有逻辑）
		chrome.runtime.sendMessage({
			target: 'newtab',
			type: 'ThumbSuccess',
			data: { id, groupId, url }
		}).catch(err => console.error('Send success error:', err));
	} catch (err) {
		console.log("getThumbnails err:", err);
		sendProgressToFrontend({ type: 'thumbUpdateErr', data: { url, err: err.message } });
	}
}
// 生成缩略图，假如存在 screenshot 就用 screenshot，否则传消息给 offscreen 进行截图
async function getThumbnail(url, id, groupId, options = { quickRefresh: false, forceScreenshot: false }) {
	console.log("bg getThumbnailsWithoutSendMsg", url, id, groupId, options);

	if (!url || !id) {
		console.log("getThumbnailsWithoutSendMsg: missing url or id")
		throw new Error("Missing url or id");
	}

	let screenshot = null;
	try {
		screenshot = await fetchScreenshot(url);
		console.log(`bg url:${url} get screenshot length:`, screenshot ? screenshot.length : 0);

		// 新增：offscreen 处理
		await setupOffscreenDocument('offscreen.html');
		const offscreenResponse = await chrome.runtime.sendMessage({
			target: 'offscreen',
			data: {
				url,
				id,
				groupId: groupId,
				screenshot: screenshot,
				quickRefresh: options.quickRefresh,
			}
		});
		console.log('offscreen response:', offscreenResponse);

		// 返回 offscreen 结果，供调用方进一步处理
		return { id, groupId, url, response: offscreenResponse };
	} catch (err) {
		console.log("getThumbnailsWithoutSendMsg err:", err);
		throw err;  // 抛出，让外层统一处理（包括 newtab 消息）
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

	await getThumbnailAndSendMsg(tab.url, newId, groupId, { quickRefresh: false, forceScreenshot: true })

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
async function handleOffscreenFetchDone(data) {
	console.log("bg handleOffscreenFetchDone", data);
	saveThumbnails(data.url, data.id, data.parentId, data.thumbs, data.bgColor);

	async function saveThumbnails(url, id, groupId, images, bgColor) {
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

		chrome.runtime.sendMessage({
			target: 'newtab',
			type: 'thumbUpdateSuccess',
			data: [{
				id,
				groupId: groupId,
				url,
				thumbnail: images[0],
				bgColor,
				isMutiRefreshThumbs
			}]
		});
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