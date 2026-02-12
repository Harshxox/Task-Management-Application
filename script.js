// App State
const state = {
    tasks: [],
    habits: [],
    theme: 'light',
    filters: {
        status: 'all', // all, active, completed
        priority: null // null, high, medium, low
    }
};

// DOM Elements
const app = document.getElementById('app');
const navLinks = document.querySelectorAll('.nav-links li');
const contentSections = document.querySelectorAll('.content-section');
const pageTitle = document.getElementById('page-title');
const themeToggle = document.querySelector('.theme-toggle');

// Modals
const taskModal = document.getElementById('task-modal');
const addTaskBtn = document.getElementById('add-task-btn');
const closeModals = document.querySelectorAll('.close-modal');
const taskForm = document.getElementById('task-form');
const habitModal = document.getElementById('habit-modal');
const addHabitBtn = document.getElementById('add-habit-btn');
const habitForm = document.getElementById('habit-form');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
    renderTasks();
    renderUpcomingDeadlines(); // New
    renderHabits();
    updateStats();
    updateDate();
});

function setupEventListeners() {
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const section = link.dataset.section;
            switchSection(section);
        });
    });

    // Theme Toggle
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        state.theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        saveData();
    });

    // Modals
    addTaskBtn.addEventListener('click', () => openModal(taskModal));
    addHabitBtn.addEventListener('click', () => openModal(habitModal));

    closeModals.forEach(btn => {
        btn.addEventListener('click', () => {
            taskModal.classList.remove('active');
            habitModal.classList.remove('active');
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === taskModal) taskModal.classList.remove('active');
        if (e.target === habitModal) habitModal.classList.remove('active');
    });

    // Task Form
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('task-input').value;
        const subject = document.getElementById('task-subject').value;
        const priority = document.getElementById('task-priority').value;
        const date = document.getElementById('task-date').value;

        addTask(name, subject, priority, date);
        taskModal.classList.remove('active');
        taskForm.reset();
    });

    // Task Filters
    const filterBtns = document.querySelectorAll('.task-filters .filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.filter) {
                // Status Filter
                state.filters.status = btn.dataset.filter;
                // Update basic active state for status buttons
                document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            } else if (btn.dataset.priority) {
                // Priority Filter toggle
                if (state.filters.priority === btn.dataset.priority) {
                    state.filters.priority = null; // Toggle off
                    btn.classList.remove('active');
                } else {
                    state.filters.priority = null; // Clear other priority selections
                    document.querySelectorAll('[data-priority]').forEach(b => b.classList.remove('active'));
                    state.filters.priority = btn.dataset.priority;
                    btn.classList.add('active');
                }
            }
            renderTasks();
        });
    });

    // Habit Form
    habitForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('habit-input').value;
        addHabit(name);
        habitModal.classList.remove('active');
        habitForm.reset();
    });
}

// Navigation Logic
function switchSection(sectionId) {
    // Update active link
    navLinks.forEach(link => link.classList.remove('active'));
    document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');

    // Update active section
    contentSections.forEach(section => section.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');

    // Update Title
    pageTitle.textContent = sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
}

// Updated Task Logic
function addTask(name, subject, priority, date) {
    const task = {
        id: Date.now(),
        name,
        subject,
        priority,
        date: date || 'No Due Date',
        completed: false,
        createdAt: Date.now()
    };
    state.tasks.push(task);
    saveData();
    renderTasks();
    renderUpcomingDeadlines();
    updateStats();
}

function toggleTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveData();
        renderTasks();
        renderUpcomingDeadlines();
        updateStats();
    }
}

function deleteTask(id) {
    if (confirm('Delete this task?')) {
        state.tasks = state.tasks.filter(t => t.id !== id);
        saveData();
        renderTasks();
        renderUpcomingDeadlines();
        updateStats();
    }
}

function renderTasks() {
    const taskList = document.getElementById('task-list');
    taskList.innerHTML = '';

    // Filter Logic
    const filteredTasks = state.tasks.filter(task => {
        // Status Filter
        const statusMatch = (state.filters.status === 'all') ||
            (state.filters.status === 'active' && !task.completed) ||
            (state.filters.status === 'completed' && task.completed);

        // Priority Filter
        const priorityMatch = !state.filters.priority || (task.priority === state.filters.priority);

        return statusMatch && priorityMatch;
    });

    // Sorting: Incomplete first, then by date logic usually. For now just reverse id (newest first)
    filteredTasks.sort((a, b) => b.id - a.id);

    if (filteredTasks.length === 0) {
        taskList.innerHTML = '<div class="empty-state"><p>No tasks found matching filters.</p></div>';
        return;
    }

    filteredTasks.forEach(task => {
        const taskEl = document.createElement('div');
        taskEl.className = `task-card ${task.completed ? 'completed' : ''}`;
        if (task.completed) {
            taskEl.style.opacity = '0.6';
        }

        taskEl.innerHTML = `
            <div class="task-checkbox" onclick="toggleTask(${task.id})">
                <i class="ph ph-check"></i>
            </div>
            
            <div class="task-details">
                <h4>${task.name}</h4>
                <div class="task-badges">
                    <span class="badge badge-subject">${task.subject}</span>
                    <span class="badge badge-priority-${task.priority}">${task.priority}</span>
                    <span class="text-secondary" style="font-size: 0.8rem; display: flex; align-items: center; gap: 4px;">
                        <i class="ph ph-calendar-blank"></i> ${formatDate(task.date)}
                    </span>
                </div>
            </div>

            <div class="task-actions">
                <button class="action-btn delete" onclick="deleteTask(${task.id})">
                    <i class="ph ph-trash"></i>
                </button>
            </div>
        `;
        taskList.appendChild(taskEl);
    });
}

function renderUpcomingDeadlines() {
    const upcomingList = document.getElementById('upcoming-list');
    upcomingList.innerHTML = '';

    // Get active tasks with dates
    const upcoming = state.tasks
        .filter(t => !t.completed && t.date !== 'No Due Date')
        .sort((a, b) => new Date(a.date) - new Date(b.date)) // Ascending date
        .slice(0, 5); // Next 5

    if (upcoming.length === 0) {
        upcomingList.innerHTML = '<p style="padding: 1rem; color: var(--text-secondary); font-size: 0.9rem;">No upcoming deadlines.</p>';
        return;
    }

    upcoming.forEach(task => {
        const div = document.createElement('div');
        div.className = 'upcoming-item';

        // Format date: "Oct 12"
        const d = new Date(task.date);
        const day = d.getDate();
        const month = d.toLocaleString('default', { month: 'short' });

        div.innerHTML = `
            <div class="upcoming-date">
                <div style="font-size: 0.7rem; text-transform: uppercase;">${month}</div>
                <div style="font-size: 1.1rem; line-height: 1;">${day}</div>
            </div>
            <div class="upcoming-info">
                <h4>${task.name}</h4>
                <span>${task.subject}</span>
            </div>
        `;
        upcomingList.appendChild(div);
    });
}

// Helpers
function formatDate(dateStr) {
    if (dateStr === 'No Due Date') return dateStr;
    const options = { month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
}

// Habit Logic
function addHabit(name) {
    const habit = {
        id: Date.now(),
        name,
        streak: 0,
        completedToday: false,
        lastChecked: null,
        createdAt: Date.now(),
        daysChecked: 0 // Total days checked ever
    };
    state.habits.push(habit);
    saveData();
    renderHabits();
    updateStats();
}

function toggleHabit(id) {
    const habit = state.habits.find(h => h.id === id);
    if (!habit) return;

    const today = new Date().toDateString();

    if (habit.completedToday) {
        // Untoggle
        habit.completedToday = false;
        habit.streak = Math.max(0, habit.streak - 1);
        habit.daysChecked = Math.max(0, habit.daysChecked - 1);
        habit.lastChecked = null; // Ideal: revert to prev date if tracking history
    } else {
        habit.completedToday = true;
        habit.streak++;
        habit.daysChecked++;
        habit.lastChecked = today;
    }

    saveData();
    renderHabits();
    updateStats();
}

function renderHabits() {
    const habitGrid = document.getElementById('habit-grid');
    habitGrid.innerHTML = '';

    if (state.habits.length === 0) {
        habitGrid.innerHTML = '<div class="empty-state"><p>No habits tracked yet.</p></div>';
        return;
    }

    state.habits.forEach(habit => {
        const habitEl = document.createElement('div');
        habitEl.className = 'habit-card';

        // Check if day changed (reset daily status if needed)
        // Note: Real apps track history per date. For demo, we just reset 'completedToday' if date mismatches.
        const today = new Date().toDateString();
        if (habit.lastChecked !== today && habit.lastChecked !== null) {
            if (habit.completedToday) {
                // It was completed yesterday (or prior), but today is new day
                // This logic simplifies: if you reload page next day, it resets.
                habit.completedToday = false;
                // If missed yesterday, streak resets? skipping complexity for now to keep smooth UI
                saveData();
            }
        }

        // Calculate Consistency
        // Days since creation (including today)
        const msPerDay = 1000 * 60 * 60 * 24;
        const daysSinceCreation = Math.floor((Date.now() - habit.createdAt) / msPerDay) + 1;
        const consistency = Math.min(100, Math.round((habit.daysChecked / daysSinceCreation) * 100)) || 0;

        habitEl.innerHTML = `
            <div class="habit-header">
                <div class="habit-info">
                    <h4>${habit.name}</h4>
                    <div class="habit-streak">
                        <i class="ph ph-fire" style="color: ${habit.streak > 0 ? 'var(--accent-orange)' : 'var(--text-light)'}"></i> 
                        ${habit.streak} day streak
                    </div>
                </div>
                <button class="habit-check-btn ${habit.completedToday ? 'completed' : ''}" onclick="toggleHabit(${habit.id})">
                    <i class="ph ph-check"></i>
                </button>
            </div>
            
            <div class="habit-progress">
                <div class="progress-label">
                    <span>Consistency</span>
                    <span>${consistency}%</span>
                </div>
                <div class="progress-track">
                    <div class="progress-fill" style="width: ${consistency}%"></div>
                </div>
            </div>
        `;
        habitGrid.appendChild(habitEl);
    });
}

// Stats & Helpers
function updateStats() {
    const totalTasks = state.tasks.length;
    const completedTasks = state.tasks.filter(t => t.completed).length;
    const pendingTasks = totalTasks - completedTasks;

    const totalHabits = state.habits.length;
    const completedHabitsToday = state.habits.filter(h => h.completedToday).length;

    // Task Completion %
    const taskProgress = totalTasks === 0 ? 0 : (completedTasks / totalTasks);

    // Habit Completion %
    const habitProgress = totalHabits === 0 ? 0 : (completedHabitsToday / totalHabits);

    // Productivity Score (WEIGHTED: 70% Tasks, 30% Habits)
    // If no habits, 100% tasks. If no tasks, 100% habits.
    let score = 0;
    if (totalTasks === 0 && totalHabits === 0) {
        score = 0;
    } else if (totalTasks === 0) {
        score = habitProgress * 100;
    } else if (totalHabits === 0) {
        score = taskProgress * 100;
    } else {
        score = ((taskProgress * 0.7) + (habitProgress * 0.3)) * 100;
    }

    score = Math.round(score);

    // Update Dashboard DOM
    setText('dash-total', totalTasks);
    setText('dash-completed', completedTasks);
    setText('dash-pending', pendingTasks);
    setText('dash-habits-count', totalHabits);

    // Update Score
    setText('dash-score', `${score}%`);
    const ring = document.getElementById('productivity-ring');
    if (ring) {
        ring.style.setProperty('--percent', score);
    }
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function updateDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = new Date().toLocaleDateString('en-US', options);
    document.getElementById('date-display').textContent = dateStr;
}

function openModal(modal) {
    modal.classList.add('active');
}

function saveData() {
    localStorage.setItem('focusForgeState', JSON.stringify(state));
}

function loadData() {
    const saved = localStorage.getItem('focusForgeState');
    if (saved) {
        const parsed = JSON.parse(saved);
        state.tasks = parsed.tasks || [];
        state.habits = parsed.habits || [];
        state.theme = parsed.theme || 'light';

        if (state.theme === 'dark') {
            document.body.classList.add('dark-mode');
        }
    }
}
