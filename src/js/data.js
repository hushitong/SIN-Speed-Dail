// 数据管理函数 - 获得
export async function getData(keys = ['groups', 'bookmarks']) {
    return new Promise((resolve) => {
        chrome.storage.local.get(keys, (result) => {
            resolve(result);
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