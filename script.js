document.addEventListener('DOMContentLoaded', () => {
    // Select DOM elements
    const taskForm = document.getElementById('task-form');
    const taskTitleInput = document.getElementById('task-title');
    const taskSubjectInput = document.getElementById('task-subject');
    const taskDeadlineInput = document.getElementById('task-deadline');
    const taskPriorityInput = document.getElementById('task-priority');
    const taskList = document.getElementById('task-list');
    const filterPrioritySelect = document.getElementById('filter-priority');
    const emptyState = document.getElementById('empty-state');
    const upcomingDeadlinesSection = document.getElementById('upcoming-deadlines');
    const deadlineList = document.getElementById('deadline-list');

    // State
    let tasks = [];
    let habits = []; // Global habits array

    // Theme Logic
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = themeToggleBtn.querySelector('i');

    // Check saved theme or system preference
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        document.body.classList.add('dark-mode');
        themeIcon.classList.replace('fa-moon', 'fa-sun');
    }

    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');

        // Update icon
        if (isDark) {
            themeIcon.classList.replace('fa-moon', 'fa-sun');
            localStorage.setItem('theme', 'dark');
        } else {
            themeIcon.classList.replace('fa-sun', 'fa-moon');
            localStorage.setItem('theme', 'light');
        }
    });

    // Initialize logic
    loadTasks();

    // Apply Animations on load
    document.querySelectorAll('.glass-panel').forEach((el, index) => {
        el.classList.add('animate-entry');
        el.style.animationDelay = `${index * 100}ms`;
    });
    // Habit logic init happens below but variables are needed globally?
    // Wait, habits was defined inside a block later. We should move it up to state.

    // Set default date to today
    const now = new Date();
    const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    taskDeadlineInput.value = today;
    taskDeadlineInput.setAttribute('min', today);

    // Event Listeners
    taskForm.addEventListener('submit', addTask);
    filterPrioritySelect.addEventListener('change', renderTasks);

    // Functions

    function addTask(e) {
        e.preventDefault();

        const title = taskTitleInput.value.trim();
        const subject = taskSubjectInput.value.trim();
        const deadline = taskDeadlineInput.value;
        const priority = taskPriorityInput.value;

        if (!title || !subject || !deadline) return;

        const newTask = {
            id: Date.now(),
            title,
            subject,
            deadline,
            priority,
            completed: false,
            createdAt: new Date().toISOString()
        };

        tasks.push(newTask);
        saveTasks();
        renderTasks();
        taskForm.reset();

        // Reset date to today after reset
        const now = new Date();
        const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        taskDeadlineInput.value = todayStr;
    }

    function deleteTask(id) {
        tasks = tasks.filter(task => task.id !== id);
        saveTasks();
        renderTasks();
    }

    function toggleComplete(id) {
        tasks = tasks.map(task => {
            if (task.id === id) {
                return { ...task, completed: !task.completed };
            }
            return task;
        });
        saveTasks();
        renderTasks();
    }

    function saveTasks() {
        // localStorage.setItem('tasks', JSON.stringify(tasks)); 
        // Note: For this demo, we can persist to local storage if needed, 
        // but it's okay to just keep in memory for the session or if user wants persistence.
        // Let's implement localStorage for better UX.
        localStorage.setItem('tasks', JSON.stringify(tasks));
        checkUpcomingDeadlines();
    }

    function loadTasks() {
        const storedTasks = localStorage.getItem('tasks');
        if (storedTasks) {
            tasks = JSON.parse(storedTasks);
        }
        renderTasks();
        checkUpcomingDeadlines();
    }

    function renderTasks() {
        const filterValue = filterPrioritySelect.value;

        const filteredTasks = tasks.filter(task => {
            if (filterValue === 'All') return true;
            return task.priority === filterValue;
        });

        // Clear list
        taskList.innerHTML = '';

        if (filteredTasks.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');

            // Sort tasks: Incomplete first, then by deadline
            filteredTasks.sort((a, b) => {
                if (a.completed === b.completed) {
                    // Parse dates locally for comparison
                    const dateA = new Date(a.deadline.split('-')[0], a.deadline.split('-')[1] - 1, a.deadline.split('-')[2]);
                    const dateB = new Date(b.deadline.split('-')[0], b.deadline.split('-')[1] - 1, b.deadline.split('-')[2]);
                    return dateA - dateB;
                }
                return a.completed ? 1 : -1;
            });

            filteredTasks.forEach(task => {
                const li = document.createElement('li');
                li.className = `task-item ${task.completed ? 'completed' : ''}`;

                const priorityClass = `priority-${task.priority.toLowerCase()}`;

                li.innerHTML = `
                    <div class="task-content">
                        <div class="checkbox-wrapper">
                            <input type="checkbox" class="task-checkbox" 
                                ${task.completed ? 'checked' : ''} 
                                onchange="window.toggleTaskComplete(${task.id})">
                        </div>
                        <div class="task-details">
                            <div class="task-title">${escapeHtml(task.title)}</div>
                            <div class="task-meta">
                                <span><i class="fa-solid fa-book"></i> ${escapeHtml(task.subject)}</span>
                                <span><i class="fa-regular fa-calendar"></i> ${formatDate(task.deadline)}</span>
                                <span class="priority-badge ${priorityClass}">${task.priority}</span>
                            </div>
                        </div>
                    </div>
                    <button class="delete-btn" onclick="window.deleteTaskItem(${task.id})" title="Delete Task">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                `;
                taskList.appendChild(li);
            });
        }
    }

    function checkUpcomingDeadlines() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcomingTasks = tasks.filter(task => {
            if (task.completed) return false;
            const taskDate = new Date(task.deadline);
            taskDate.setHours(0, 0, 0, 0);

            const diffTime = taskDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return diffDays >= 0 && diffDays <= 3;
        });

        if (upcomingTasks.length > 0) {
            upcomingDeadlinesSection.classList.remove('hidden');
            deadlineList.innerHTML = '';
            upcomingTasks.forEach(task => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>${escapeHtml(task.title)}</strong> due on ${formatDate(task.deadline)}`;
                deadlineList.appendChild(li);
            });
        } else {
            upcomingDeadlinesSection.classList.add('hidden');
        }
    }

    // Helper Functions
    function formatDate(dateString) {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString(undefined, options);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Habit DOM Elements
    const toggleHabitFormBtn = document.getElementById('toggle-habit-form');
    const habitForm = document.getElementById('habit-form');
    const habitTitleInput = document.getElementById('habit-title');
    const habitList = document.getElementById('habit-list');
    const totalHabitsEl = document.getElementById('total-habits');
    const todayCompletionEl = document.getElementById('today-completion');
    const longestStreakEl = document.getElementById('longest-streak');

    // Habit State
    // let habits = []; // Moved to top-level state

    // Initialize Habit Logic
    loadHabits();
    updateHabitStats();

    // Habit Event Listeners
    toggleHabitFormBtn.addEventListener('click', () => {
        habitForm.classList.toggle('hidden');
        if (!habitForm.classList.contains('hidden')) {
            habitTitleInput.focus();
        }
    });

    habitForm.addEventListener('submit', addHabit);

    // Habit Functions
    function addHabit(e) {
        e.preventDefault();
        const title = habitTitleInput.value.trim();
        if (!title) return;

        const newHabit = {
            id: Date.now(),
            title,
            streak: 0,
            completedDates: [] // Store ISO date strings (YYYY-MM-DD)
        };

        habits.push(newHabit);
        saveHabits();
        renderHabits();
        updateHabitStats();

        habitTitleInput.value = '';
        habitForm.classList.add('hidden');
    }

    function deleteHabit(id) {
        if (confirm('Are you sure you want to delete this habit?')) {
            habits = habits.filter(h => h.id !== id);
            saveHabits();
            renderHabits();
            updateHabitStats();
        }
    }

    function toggleHabit(id) {
        const today = getLocalTodayDate();

        habits = habits.map(h => {
            if (h.id === id) {
                const isCompletedToday = h.completedDates.includes(today);
                let newDates;

                if (isCompletedToday) {
                    newDates = h.completedDates.filter(d => d !== today);
                } else {
                    newDates = [...h.completedDates, today];
                }

                // Recalculate streak
                // Sort dates to be sure
                newDates.sort();
                let currentStreak = 0;
                let checkDate = new Date();

                // Simple streak calc: check consecutive days backwards from today
                // If today is done, start from today. If not, start from yesterday (to preserve streak if not done yet today? 
                // Usually streak displays 'current streak'. If I miss yesterday, it's 0. 
                // If I haven't done today yet, but did yesterday, is streak X or X?
                // Visual apps usually show streak X. 

                // Let's implement robust calculation based on consecutive days
                // Convert all to timestamps for easier math

                return {
                    ...h,
                    completedDates: newDates,
                    streak: calculateStreak(newDates)
                };
            }
            return h;
        });

        saveHabits();
        renderHabits();
        updateHabitStats();
    }

    function calculateStreak(dates) {
        if (!dates.length) return 0;

        const sortedDates = [...dates].sort((a, b) => new Date(b) - new Date(a)); // Descending
        const today = getLocalTodayDate();
        const yesterday = getLocalYesterdayDate();

        // If most recent is not today or yesterday, streak is broken -> 0
        // (Unless we treat "streak" as "best streak ever"? No, usually "current streak")

        const lastDate = sortedDates[0];
        if (lastDate !== today && lastDate !== yesterday) {
            return 0;
        }

        let streak = 1;
        let currentDate = new Date(lastDate);

        for (let i = 1; i < sortedDates.length; i++) {
            const prevDate = new Date(sortedDates[i]);

            // Check if strictly exactly 1 day difference
            const diffTime = currentDate - prevDate;
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                streak++;
                currentDate = prevDate;
            } else {
                break;
            }
        }
        return streak;
    }

    function getLocalTodayDate() {
        const now = new Date();
        return new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    }

    function getLocalYesterdayDate() {
        const now = new Date();
        now.setDate(now.getDate() - 1);
        return new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    }

    function saveHabits() {
        localStorage.setItem('habits', JSON.stringify(habits));
    }

    function loadHabits() {
        const storedHabits = localStorage.getItem('habits');
        if (storedHabits) {
            habits = JSON.parse(storedHabits);
        }
        renderHabits();
    }

    function renderHabits() {
        const today = getLocalTodayDate();
        habitList.innerHTML = '';

        habits.forEach(habit => {
            const isCompleted = habit.completedDates.includes(today);
            const li = document.createElement('li');
            li.className = 'habit-card';

            // Progress bar logic (e.g., based on consistency over last 7 days?)
            // Or just a visual static bar for now, or streak based? 
            // Design asked for "progress bars". Let's use 30-day consistency % for the bar?
            // Or maybe "Streak / 30" capped at 100%?
            // Let's do: Consistency over last 7 days.

            const last7Days = [];
            for (let i = 0; i < 7; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                last7Days.push(d.toISOString().split('T')[0]);
            }
            const hits = last7Days.filter(d => habit.completedDates.includes(d)).length;
            const progress = (hits / 7) * 100;

            li.innerHTML = `
                <div class="habit-top">
                    <div class="habit-info">
                        <h3>${escapeHtml(habit.title)}</h3>
                        <span class="streak-badge"><i class="fa-solid fa-fire"></i> ${habit.streak} Day Streak</span>
                    </div>
                     <div class="habit-actions">
                        <button class="check-btn ${isCompleted ? 'completed' : ''}" onclick="window.toggleHabitItem(${habit.id})" title="Mark Complete">
                            <i class="fa-solid fa-check"></i>
                        </button>
                    </div>
                </div>
                <div class="habit-progress-bg">
                    <div class="habit-progress-bar" style="width: ${progress}%"></div>
                </div>
                <button class="habit-delete-btn" onclick="window.deleteHabitItem(${habit.id})" style="position:absolute; bottom: 10px; right: 10px;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;
            habitList.appendChild(li);
        });
    }

    function updateHabitStats() {
        const today = getLocalTodayDate();

        // Total Active
        totalHabitsEl.textContent = habits.length;

        // Today's Completion
        if (habits.length === 0) {
            todayCompletionEl.textContent = "0%";
        } else {
            const completedCount = habits.filter(h => h.completedDates.includes(today)).length;
            const percent = Math.round((completedCount / habits.length) * 100);
            todayCompletionEl.textContent = `${percent}%`;
        }

        // Best Streak
        const bestStreak = Math.max(0, ...habits.map(h => h.streak));
        longestStreakEl.textContent = bestStreak;
    }

    // Expose to window
    window.toggleHabitItem = toggleHabit;
    window.deleteHabitItem = deleteHabit;

    // Helper Functions (Existing)
    // ... exist above ...

    // Dashboard Elements
    const dashTotalEl = document.getElementById('dash-total');
    const dashCompletedEl = document.getElementById('dash-completed');
    const dashPendingEl = document.getElementById('dash-pending');
    const dashScoreEl = document.getElementById('dash-score');

    // Charts
    let taskStatusChartInstance = null;
    let productivityChartInstance = null;

    // Initialize Dashboard
    updateDashboard();

    function updateDashboard() {
        const total = tasks.length;
        const completed = tasks.filter(t => t.completed).length;
        const pending = total - completed;

        dashTotalEl.textContent = total;
        dashCompletedEl.textContent = completed;
        dashPendingEl.textContent = pending;

        // Productivity Score calculation
        // Algorithm: (Task Completion % * 0.6) + (Habit Today Completion % * 0.4)
        // If no tasks/habits, score is 0.

        let taskScore = 0;
        if (total > 0) {
            taskScore = (completed / total) * 100;
        }

        let habitScore = 0;
        const today = getLocalTodayDate();
        if (habits.length > 0) {
            const habitsDone = habits.filter(h => h.completedDates.includes(today)).length;
            habitScore = (habitsDone / habits.length) * 100;
        }

        // Animate Numbers
        animateValue(dashTotalEl, parseInt(dashTotalEl.textContent) || 0, total, 1000);
        animateValue(dashCompletedEl, parseInt(dashCompletedEl.textContent) || 0, completed, 1000);
        animateValue(dashPendingEl, parseInt(dashPendingEl.textContent) || 0, pending, 1000);

        const productivityScore = Math.round((taskScore * 0.6) + (habitScore * 0.4));
        animateValue(dashScoreEl, parseInt(dashScoreEl.textContent) || 0, productivityScore, 1000);

        updateCharts(completed, pending, productivityScore);
    }

    function animateValue(obj, start, end, duration) {
        if (start === end) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.innerHTML = end;
            }
        };
        window.requestAnimationFrame(step);
    }

    // Set Date in Dashboard
    const dateDisplayEl = document.getElementById('current-date');
    if (dateDisplayEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateDisplayEl.textContent = new Date().toLocaleDateString('en-US', options);
    }

    function updateCharts(completed, pending, score) {
        // Task Status Chart (Doughnut)
        const ctxStatus = document.getElementById('taskStatusChart').getContext('2d');

        if (taskStatusChartInstance) {
            taskStatusChartInstance.destroy();
        }

        taskStatusChartInstance = new Chart(ctxStatus, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'Pending'],
                datasets: [{
                    data: [completed, pending],
                    backgroundColor: ['#10b981', '#f59e0b'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                family: "'Outfit', sans-serif"
                            }
                        }
                    }
                }
            }
        });

        // Productivity Trends Chart (Bar - Simulated for demo)
        const ctxProd = document.getElementById('productivityChart').getContext('2d');

        if (productivityChartInstance) {
            productivityChartInstance.destroy();
        }

        // Just simulating last 5 days data for visual appeal since we don't track historical score yet
        const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Today'];
        const data = [65, 59, 80, 81, score];

        productivityChartInstance = new Chart(ctxProd, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Productivity Score',
                    data: data,
                    backgroundColor: '#6366f1',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            display: false
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    // Hook into existing functions to update dashboard
    const originalRenderTasks = renderTasks;
    renderTasks = function () {
        originalRenderTasks();
        updateDashboard();
    };

    const originalUpdateHabitStats = updateHabitStats;
    updateHabitStats = function () {
        originalUpdateHabitStats();
        updateDashboard();
    };

    // Expose functions to global scope for HTML inline handlers
    window.toggleTaskComplete = toggleComplete;
    window.deleteTaskItem = deleteTask;
    window.toggleHabitItem = toggleHabit;
    window.deleteHabitItem = deleteHabit;
});
