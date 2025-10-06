// author: hushitong with AI
const Toast = (() => {
    const toasts = new Map();
    let toastId = 0;
    const maxToasts = 5;

    function _create(message, type = 'info', hideDelay = 3000) {
        const container = document.getElementById('toast-container');
        if (!container) return console.error('❌ 未找到 #toast-container');

        // 超过最大数量，移除最早的一条
        if (toasts.size >= maxToasts) {
            const [firstId] = toasts.keys();
            _hide(firstId);
        }

        const id = `toast-${++toastId}`;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        // 内容 + 关闭按钮
        const messageEl = document.createElement('div');
        messageEl.className = 'toast-message';
        messageEl.innerText = message;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.innerHTML = '&times;';

        toast.appendChild(messageEl);
        toast.appendChild(closeBtn);

        // 进度条
        const progressBar = document.createElement('div');
        progressBar.className = 'toast-progress';
        toast.appendChild(progressBar);

        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));

        // --- 倒计时逻辑 ---
        let remaining = hideDelay;
        let startTime = Date.now();
        let paused = false;
        let timerId = null;

        function updateProgress() {
            if (!paused) {
                const elapsed = Date.now() - startTime;
                const ratio = Math.max(0, remaining > 0 ? (remaining - elapsed)/hideDelay : 0);
                progressBar.style.transform = `scaleX(${ratio})`;
                if (ratio > 0) requestAnimationFrame(updateProgress);
            }
        }

        function startTimer() {
            startTime = Date.now();
            timerId = setTimeout(() => _hide(id), remaining);
            requestAnimationFrame(updateProgress);
        }

        function pauseTimer() {
            if (!paused) return;
            return;
        }

        // 初始化
        startTimer();

        // 鼠标悬停暂停
        toast.addEventListener('mouseenter', () => {
            if (!paused) {
                paused = true;
                clearTimeout(timerId);
                remaining -= Date.now() - startTime;
            }
        });

        toast.addEventListener('mouseleave', () => {
            if (paused) {
                paused = false;
                startTime = Date.now();
                startTimer();
            }
        });

        // 点击内容复制
        messageEl.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(message);
                messageEl.innerText = '✅ 已复制内容';
                setTimeout(() => _hide(id), 1500);
            } catch {
                messageEl.innerText = '❌ 复制内容失败';
            }
        });

        // 点击关闭按钮
        closeBtn.addEventListener('click', () => _hide(id));

        toasts.set(id, toast);
    }

    function _hide(id) {
        const toast = toasts.get(id);
        if (!toast) return;
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
            toasts.delete(id);
        }, 300);
    }

    return {
        show: _create,
        hide: _hide,
        success: (msg, delay) => _create(msg, 'success', delay),
        error: (msg, delay) => _create(msg, 'error', delay),
        info: (msg, delay) => _create(msg, 'info', delay),
        stats: (msg, delay) => _create(msg, 'stats', delay)
    };
})();

if (typeof window !== 'undefined') window.Toast = Toast;
export default Toast;
