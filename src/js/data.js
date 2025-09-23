// 数据管理函数 - 获得
export async function getData() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['groups', 'bookmarks'], (result) => {
            resolve({
                groups: result.groups || [],
                bookmarks: result.bookmarks || []
            });
        });
    });
}
// 数据管理函数 - 保存
export async function saveData(data) {
    return new Promise((resolve) => {
        chrome.storage.local.set(data, () => {
            resolve();
        });
    });
}