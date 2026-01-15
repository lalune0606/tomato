class TomatoTimer {
    constructor() {
        // 状态变量
        this.isRunning = false;
        this.isWorkTime = true;
        this.timeLeft = 25 * 60; // 默认25分钟（秒）
        this.totalSeconds = 25 * 60;
        this.workDuration = 25 * 60;
        this.breakDuration = 5 * 60;
        this.pomodoroCount = 0;
        this.currentTaskId = null;
        
        // 任务管理
        this.tasks = this.loadTasks();
        this.currentTask = null;
        
        // 计时器引用
        this.timer = null;
        
        // DOM元素
        this.elements = {
            timeDisplay: document.getElementById('time'),
            timerLabel: document.getElementById('timer-label'),
            statusWork: document.querySelector('.badge.work'),
            statusBreak: document.querySelector('.badge.break'),
            startBtn: document.getElementById('start-btn'),
            pauseBtn: document.getElementById('pause-btn'),
            resetBtn: document.getElementById('reset-btn'),
            skipBtn: document.getElementById('skip-btn'),
            taskInput: document.getElementById('task-input'),
            taskPomos: document.getElementById('task-pomos'),
            addTaskBtn: document.getElementById('add-task-btn'),
            taskList: document.getElementById('task-list'),
            todayCount: document.getElementById('today-count'),
            totalCount: document.getElementById('total-count'),
            bellSound: document.getElementById('bell-sound'),
            settingsPanel: document.getElementById('settings-panel'),
            statsPanel: document.getElementById('stats-panel')
        };
        
        // 初始化
        this.init();
    }
    
    init() {
        // 加载设置
        this.loadSettings();
        
        // 更新显示
        this.updateDisplay();
        this.updateTaskList();
        this.updateStats();
        
        // 绑定事件
        this.bindEvents();
        
        // 加载统计
        this.loadStats();
        
        console.log('番茄钟初始化完成');
    }
    
    bindEvents() {
        // 控制按钮事件
        this.elements.startBtn.addEventListener('click', () => this.start());
        this.elements.pauseBtn.addEventListener('click', () => this.pause());
        this.elements.resetBtn.addEventListener('click', () => this.reset());
        this.elements.skipBtn.addEventListener('click', () => this.skip());
        
        // 任务管理事件
        this.elements.addTaskBtn.addEventListener('click', () => this.addTask());
        this.elements.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });
        
        // 底部导航事件
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                this.switchPage(page);
            });
        });
        
        // 面板关闭按钮
        document.getElementById('close-settings').addEventListener('click', () => {
            this.elements.settingsPanel.classList.remove('show');
        });
        
        document.getElementById('close-stats').addEventListener('click', () => {
            this.elements.statsPanel.classList.remove('show');
        });
        
        // 保存设置
        document.addEventListener('click', (e) => {
            if (e.target.closest('.save-settings')) {
                this.saveSettings();
                this.showNotification('设置已保存');
            }
        });
    }
    
    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.elements.startBtn.disabled = true;
            this.elements.pauseBtn.disabled = false;
            
            this.timer = setInterval(() => this.tick(), 1000);
            
            // 开始音效
            if (this.settings.soundEnabled) {
                this.playSound();
            }
        }
    }
    
    pause() {
        if (this.isRunning) {
            this.isRunning = false;
            this.elements.startBtn.disabled = false;
            this.elements.pauseBtn.disabled = true;
            
            clearInterval(this.timer);
        }
    }
    
    reset() {
        this.pause();
        this.isWorkTime = true;
        this.timeLeft = this.workDuration;
        this.totalSeconds = this.workDuration;
        this.updateDisplay();
        this.updateProgressRing();
    }
    
    skip() {
        this.switchMode();
    }
    
    tick() {
        this.timeLeft--;
        
        if (this.timeLeft <= 0) {
            this.completeSession();
        }
        
        this.updateDisplay();
        this.updateProgressRing();
    }
    
    completeSession() {
        clearInterval(this.timer);
        this.isRunning = false;
        
        // 播放结束音效
        if (this.settings.soundEnabled) {
            this.playSound();
        }
        
        // 显示通知
        if (this.settings.notificationsEnabled && 'Notification' in window) {
            this.showBrowserNotification();
        }
        
        // 更新番茄计数
        if (this.isWorkTime) {
            this.pomodoroCount++;
            this.savePomodoroRecord();
            this.updateStats();
            
            // 更新当前任务的进度
            if (this.currentTask) {
                this.updateTaskProgress();
            }
        }
        
        // 切换模式
        this.switchMode();
        
        // 如果设置中启用了自动开始，开始下一个计时器
        if (this.settings.autoStart) {
            setTimeout(() => this.start(), 1000);
        }
    }
    
    switchMode() {
        this.isWorkTime = !this.isWorkTime;
        
        if (this.isWorkTime) {
            this.timeLeft = this.workDuration;
            this.totalSeconds = this.workDuration;
            this.elements.statusWork.classList.remove('hidden');
            this.elements.statusBreak.classList.add('hidden');
            this.elements.timerLabel.textContent = '专注时间';
        } else {
            this.timeLeft = this.breakDuration;
            this.totalSeconds = this.breakDuration;
            this.elements.statusWork.classList.add('hidden');
            this.elements.statusBreak.classList.remove('hidden');
            this.elements.timerLabel.textContent = '休息时间';
        }
        
        this.updateDisplay();
        this.updateProgressRing();
        this.elements.startBtn.disabled = false;
        this.elements.pauseBtn.disabled = true;
    }
    
    updateDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        this.elements.timeDisplay.textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updateProgressRing() {
        const circle = document.querySelector('.progress-ring__circle');
        const radius = 130;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (this.timeLeft / this.totalSeconds) * circumference;
        
        circle.style.strokeDasharray = circumference;
        circle.style.strokeDashoffset = offset;
        
        // 根据模式改变颜色
        circle.style.stroke = this.isWorkTime ? '#e74c3c' : '#2ecc71';
    }
    
    // 任务管理方法
    addTask() {
        const title = this.elements.taskInput.value.trim();
        const targetPomos = parseInt(this.elements.taskPomos.value);
        
        if (!title) {
            this.showNotification('请输入任务标题');
            return;
        }
        
        const task = {
            id: Date.now().toString(),
            title,
            targetPomos,
            completedPomos: 0,
            isCompleted: false,
            createdAt: new Date().toISOString(),
            pomodoros: []
        };
        
        this.tasks.push(task);
        this.saveTasks();
        this.updateTaskList();
        
        // 清空输入
        this.elements.taskInput.value = '';
        this.elements.taskInput.focus();
        
        this.showNotification('任务已添加');
    }
    
    updateTaskList() {
        const taskList = this.elements.taskList;
        taskList.innerHTML = '';
        
        this.tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item ${task.isCompleted ? 'completed' : ''}`;
            li.innerHTML = `
                <input type="checkbox" class="task-checkbox" ${task.isCompleted ? 'checked' : ''} data-id="${task.id}">
                <div class="task-content">
                    <div class="task-title">${task.title}</div>
                    <div class="task-progress">${task.completedPomos}/${task.targetPomos} 番茄</div>
                </div>
                <div class="task-actions">
                    <button class="task-action-btn" title="开始任务" data-id="${task.id}">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="task-action-btn" title="删除任务" data-id="${task.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            // 绑定事件
            const checkbox = li.querySelector('.task-checkbox');
            const startBtn = li.querySelector('.task-action-btn:nth-child(1)');
            const deleteBtn = li.querySelector('.task-action-btn:nth-child(2)');
            
            checkbox.addEventListener('change', (e) => {
                this.toggleTaskComplete(task.id);
            });
            
            startBtn.addEventListener('click', (e) => {
                this.selectTask(task.id);
            });
            
            deleteBtn.addEventListener('click', (e) => {
                this.deleteTask(task.id);
            });
            
            taskList.appendChild(li);
        });
    }
    
    selectTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            this.currentTask = task;
            this.showNotification(`已选择任务: ${task.title}`);
            
            // 高亮显示当前任务
            document.querySelectorAll('.task-item').forEach(item => {
                item.classList.remove('active-task');
            });
            
            const taskElement = document.querySelector(`[data-id="${taskId}"]`).closest('.task-item');
            if (taskElement) {
                taskElement.classList.add('active-task');
                taskElement.style.borderLeft = '4px solid #e74c3c';
            }
        }
    }
    
    toggleTaskComplete(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.isCompleted = !task.isCompleted;
            this.saveTasks();
            this.updateTaskList();
        }
    }
    
    deleteTask(taskId) {
        if (confirm('确定要删除这个任务吗？')) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveTasks();
            this.updateTaskList();
            this.showNotification('任务已删除');
        }
    }
    
    updateTaskProgress() {
        if (this.currentTask) {
            const task = this.tasks.find(t => t.id === this.currentTask.id);
            if (task && !task.isCompleted) {
                task.completedPomos++;
                task.pomodoros.push({
                    startTime: new Date().toISOString(),
                    duration: this.workDuration / 60 // 分钟
                });
                
                // 检查是否完成任务
                if (task.completedPomos >= task.targetPomos) {
                    task.isCompleted = true;
                    this.showNotification(`恭喜！已完成任务: ${task.title}`);
                }
                
                this.saveTasks();
                this.updateTaskList();
            }
        }
    }
    
    // 设置管理
    loadSettings() {
        const defaultSettings = {
            workDuration: 25,
            breakDuration: 5,
            longBreakDuration: 15,
            longBreakInterval: 4,
            soundEnabled: true,
            notificationsEnabled: true,
            autoStart: false,
            theme: 'light'
        };
        
        const savedSettings = localStorage.getItem('tomatoSettings');
        this.settings = savedSettings ? JSON.parse(savedSettings) : defaultSettings;
        
        // 应用设置到计时器
        this.workDuration = this.settings.workDuration * 60;
        this.breakDuration = this.settings.breakDuration * 60;
        this.timeLeft = this.workDuration;
        this.totalSeconds = this.workDuration;
        
        this.renderSettings();
    }
    
    renderSettings() {
        const settingsContent = document.querySelector('.panel-content');
        settingsContent.innerHTML = `
            <div class="setting-item">
                <span class="setting-label">专注时长（分钟）</span>
                <div class="setting-control">
                    <input type="number" id="work-duration" value="${this.settings.workDuration}" min="1" max="60">
                </div>
            </div>
            <div class="setting-item">
                <span class="setting-label">短休息时长（分钟）</span>
                <div class="setting-control">
                    <input type="number" id="break-duration" value="${this.settings.breakDuration}" min="1" max="30">
                </div>
            </div>
            <div class="setting-item">
                <span class="setting-label">长休息时长（分钟）</span>
                <div class="setting-control">
                    <input type="number" id="long-break-duration" value="${this.settings.longBreakDuration}" min="5" max="60">
                </div>
            </div>
            <div class="setting-item">
                <span class="setting-label">长休息间隔（番茄数）</span>
                <div class="setting-control">
                    <input type="number" id="long-break-interval" value="${this.settings.longBreakInterval}" min="2" max="10">
                </div>
            </div>
            <div class="setting-item">
                <span class="setting-label">提示音效</span>
                <div class="setting-control">
                    <input type="checkbox" id="sound-enabled" ${this.settings.soundEnabled ? 'checked' : ''}>
                </div>
            </div>
            <div class="setting-item">
                <span class="setting-label">浏览器通知</span>
                <div class="setting-control">
                    <input type="checkbox" id="notifications-enabled" ${this.settings.notificationsEnabled ? 'checked' : ''}>
                </div>
            </div>
            <div class="setting-item">
                <span class="setting-label">自动开始下一个</span>
                <div class="setting-control">
                    <input type="checkbox" id="auto-start" ${this.settings.autoStart ? 'checked' : ''}>
                </div>
            </div>
            <div style="margin-top: 30px;">
                <button class="btn btn-primary save-settings" style="width: 100%;">
                    保存设置
                </button>
            </div>
            <div style="margin-top: 15px;">
                <button class="btn btn-secondary" id="export-data" style="width: 100%;">
                    导出数据
                </button>
            </div>
            <div style="margin-top: 15px;">
                <button class="btn btn-secondary" id="reset-data" style="width: 100%;">
                    重置所有数据
                </button>
            </div>
        `;
    }
    
    saveSettings() {
        this.settings.workDuration = parseInt(document.getElementById('work-duration').value);
        this.settings.breakDuration = parseInt(document.getElementById('break-duration').value);
        this.settings.longBreakDuration = parseInt(document.getElementById('long-break-duration').value);
        this.settings.longBreakInterval = parseInt(document.getElementById('long-break-interval').value);
        this.settings.soundEnabled = document.getElementById('sound-enabled').checked;
        this.settings.notificationsEnabled = document.getElementById('notifications-enabled').checked;
        this.settings.autoStart = document.getElementById('auto-start').checked;
        
        localStorage.setItem('tomatoSettings', JSON.stringify(this.settings));
        
        // 更新计时器
        this.workDuration = this.settings.workDuration * 60;
        this.breakDuration = this.settings.breakDuration * 60;
        this.reset();
    }
    
    // 数据存储
    saveTasks() {
        localStorage.setItem('tomatoTasks', JSON.stringify(this.tasks));
    }
    
    loadTasks() {
        const tasks = localStorage.getItem('tomatoTasks');
        return tasks ? JSON.parse(tasks) : [];
    }
    
    savePomodoroRecord() {
        const today = new Date().toDateString();
        const records = JSON.parse(localStorage.getItem('pomodoroRecords') || '{}');
        
        if (!records[today]) {
            records[today] = 0;
        }
        
        records[today]++;
        localStorage.setItem('pomodoroRecords', JSON.stringify(records));
    }
    
    loadStats() {
        const records = JSON.parse(localStorage.getItem('pomodoroRecords') || '{}');
        const today = new Date().toDateString();
        
        // 更新今日计数
        const todayCount = records[today] || 0;
        this.elements.todayCount.textContent = `今日: ${todayCount}`;
        
        // 计算总计
        const totalCount = Object.values(records).reduce((sum, count) => sum + count, 0);
        this.elements.totalCount.textContent = `总计: ${totalCount}`;
        
        // 更新统计面板
        this.updateStatsPanel(records);
    }
    
    updateStats() {
        this.loadStats();
    }
    
    updateStatsPanel(records) {
        // 更新统计面板显示
        const today = new Date().toDateString();
        const todayPomos = records[today] || 0;
        
        // 计算本周总计
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        let weekPomos = 0;
        
        for (const [date, count] of Object.entries(records)) {
            const recordDate = new Date(date);
            if (recordDate >= startOfWeek) {
                weekPomos += count;
            }
        }
        
        // 更新DOM
        document.getElementById('today-pomos').textContent = todayPomos;
        document.getElementById('week-pomos').textContent = weekPomos;
        document.getElementById('total-time').textContent = 
            `${Math.floor(Object.values(records).reduce((sum, count) => sum + count, 0) * 25 / 60)}小时`;
        
        // 绘制图表
        this.renderChart(records);
    }
    
    renderChart(records) {
        const ctx = document.getElementById('pomo-chart').getContext('2d');
        
        // 获取最近7天的数据
        const dates = [];
        const counts = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateString = date.toDateString();
            dates.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
            counts.push(records[dateString] || 0);
        }
        
        // 如果图表已存在，销毁它
        if (window.pomoChart) {
            window.pomoChart.destroy();
        }
        
        // 创建新图表
        window.pomoChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dates,
                datasets: [{
                    label: '番茄数',
                    data: counts,
                    backgroundColor: '#e74c3c',
                    borderColor: '#c0392b',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }
    
    // 页面切换
    switchPage(page) {
        // 更新导航按钮状态
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`).classList.add('active');
        
        // 显示对应面板
        switch (page) {
            case 'settings':
                this.elements.settingsPanel.classList.add('show');
                this.renderSettings();
                break;
            case 'stats':
                this.elements.statsPanel.classList.add('show');
                this.loadStats();
                break;
            case 'tasks':
                // 主页面就是任务视图
                window.scrollTo({ top: document.querySelector('.tasks-section').offsetTop, behavior: 'smooth' });
                break;
            default:
                // timer页面
                window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
    
    // 工具方法
    playSound() {
        this.elements.bellSound.currentTime = 0;
        this.elements.bellSound.play().catch(e => console.log('播放音效失败:', e));
    }
    
    showBrowserNotification() {
        if (Notification.permission === 'granted') {
            const notification = new Notification(
                this.isWorkTime ? '休息时间到！' : '专注时间开始！',
                {
                    body: this.isWorkTime ? '站起来走走，喝点水吧~' : '准备好开始下一个番茄钟了吗？',
                    icon: 'icons/icon-192x192.png'
                }
            );
            
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        }
    }
    
    showNotification(message, duration = 3000) {
        // 创建或获取通知元素
        let notification = document.querySelector('.notification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'notification';
            document.body.appendChild(notification);
        }
        
        notification.textContent = message;
        notification.classList.add('show');
        
        // 自动隐藏
        setTimeout(() => {
            notification.classList.remove('show');
        }, duration);
    }
    
    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const app = new TomatoTimer();
    
    // 请求通知权限
    if ('Notification' in window && Notification.permission === 'default') {
        setTimeout(() => {
            if (confirm('是否允许番茄钟发送通知提醒？')) {
                Notification.requestPermission();
            }
        }, 2000);
    }
    
    // 导出到全局，方便调试
    window.tomatoApp = app;
});