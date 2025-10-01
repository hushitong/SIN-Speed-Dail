// 获取分组数据并渲染列表
chrome.storage.local.get('groups', (data) => {
  const groups = data.groups || [];  // 如果没有数据，默认空数组
  const groupList = document.getElementById('group-list');

  groups.forEach(group => {
    const li = document.createElement('li');
    li.textContent = group.title;
    li.dataset.groupId = group.id;  // 存储 group id
    li.addEventListener('click', handleGroupSelect);
    groupList.appendChild(li);
  });
});

// 处理用户选择分组
function handleGroupSelect(event) {
  console.log("handleGroupSelect called,", event.target);
  const selectedGroupId = event.target.dataset.groupId;

  // 发送消息给 background.js，添加当前标签页到选中的分组
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    chrome.runtime.sendMessage({
      target: 'background', 
      type: 'handleBookmarkAddFromPopup',
      data: { url: currentTab.url, title: currentTab.title || currentTab.url, groupId: selectedGroupId }
    }).then(response => {
      console.log('Background response:', response);  // 可选：处理响应
    }).catch(err => {
      console.error('SendMessage error:', err);  // 捕获 promise reject，避免 uncaught
    });
  });
}

const closeWindowTimeout = 3000; // 3秒后自动关闭弹窗
// 新增：监听来自 background.js 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Popup received message:", message, sender);

  if (message.target === 'popup' && message.type === 'handleBookmarkAdded') {
    const messageDiv = document.getElementById('message');
    const groupList = document.getElementById('group-list');
    const title = document.querySelector('h3');

    // 隐藏列表和标题，只显示消息（页面自动居中）
    if (groupList) groupList.style.display = 'none';
    if (title) title.style.display = 'none';

    if (message.data.isAdded) {
      messageDiv.textContent = '书签添加成功！';
      messageDiv.classList.add('success', 'visible');
    } else {
      messageDiv.textContent = '书签添加失败，请重试。';
      messageDiv.classList.add('error', 'visible');
    }
    
    setTimeout(() => {
      window.close();
    }, closeWindowTimeout);
    
    return true;  // 如果需要异步响应，可返回 true
  }
});