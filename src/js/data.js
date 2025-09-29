// 数据管理函数 - 获得
export async function getData(keys = ['groups', 'bookmarks']) {
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
export async function saveData(data) {
    return new Promise((resolve) => {
        chrome.storage.local.set(data, () => {
            resolve();
        });
    });
}