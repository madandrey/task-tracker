/**
 * TaskFlow - Professional Task Tracker
 * Main JavaScript Application (Production Version)
 */

// ==================== State Management ====================
const state = {
    tasks: [],
    projects: [],
    labels: [],
    statistics: null,
    filters: {
        project_id: null,
        priority: null,
        label_id: null,
        search: ''
    },
    currentView: 'board',
    editingTaskId: null,
    theme: localStorage.getItem('theme') || 'dark'
};

// ==================== API Service ====================
const API = {
    baseUrl: '/api',

    async request(endpoint, options = {}) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        });
        if (!response.ok && response.status !== 204) {
            const error = await response.json().catch(() => ({ detail: 'Request failed' }));
            throw new Error(error.detail || 'Request failed');
        }
        if (response.status === 204) return null;
        return response.json();
    },

    // Tasks
    getTasks: (filters = {}) => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value) params.append(key, value);
        });
        return API.request(`/tasks?${params}`);
    },
    getTask: (id) => API.request(`/tasks/${id}`),
    createTask: (task) => API.request('/tasks', { method: 'POST', body: JSON.stringify(task) }),
    updateTask: (id, updates) => API.request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    deleteTask: (id) => API.request(`/tasks/${id}`, { method: 'DELETE' }),
    archiveTask: (id) => API.request(`/tasks/${id}/archive`, { method: 'POST' }),

    // Subtasks
    createSubtask: (subtask) => API.request('/subtasks', { method: 'POST', body: JSON.stringify(subtask) }),
    updateSubtask: (id, updates) => API.request(`/subtasks/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    deleteSubtask: (id) => API.request(`/subtasks/${id}`, { method: 'DELETE' }),

    // Comments
    createComment: (comment) => API.request('/comments', { method: 'POST', body: JSON.stringify(comment) }),
    deleteComment: (id) => API.request(`/comments/${id}`, { method: 'DELETE' }),

    // Projects
    getProjects: () => API.request('/projects'),
    createProject: (project) => API.request('/projects', { method: 'POST', body: JSON.stringify(project) }),
    deleteProject: (id) => API.request(`/projects/${id}`, { method: 'DELETE' }),

    // Labels
    getLabels: () => API.request('/labels'),
    createLabel: (label) => API.request('/labels', { method: 'POST', body: JSON.stringify(label) }),
    deleteLabel: (id) => API.request(`/labels/${id}`, { method: 'DELETE' }),

    // Statistics
    getStatistics: () => API.request('/statistics'),

    // Export
    exportJSON: () => API.request('/export/json'),
    exportCSV: () => API.request('/export/csv')
};

// ==================== DOM Elements ====================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const elements = {
    // Containers
    todoTasks: $('#todoTasks'),
    inProgressTasks: $('#inProgressTasks'),
    doneTasks: $('#doneTasks'),
    statsGrid: $('#statsGrid'),
    archiveList: $('#archiveList'),
    
    // Counts
    todoCount: $('#todoCount'),
    inProgressCount: $('#inProgressCount'),
    doneCount: $('#doneCount'),
    
    // Task Modal
    taskModal: $('#taskModal'),
    taskForm: $('#taskForm'),
    taskId: $('#taskId'),
    taskTitle: $('#taskTitle'),
    taskDescription: $('#taskDescription'),
    taskPriority: $('#taskPriority'),
    taskProject: $('#taskProject'),
    taskDueDate: $('#taskDueDate'),
    taskStatus: $('#taskStatus'),
    taskStatusGroup: $('#taskStatusGroup'),
    taskModalTitle: $('#taskModalTitle'),
    labelsPicker: $('#labelsPicker'),
    subtasksSection: $('#subtasksSection'),
    subtasksList: $('#subtasksList'),
    newSubtaskInput: $('#newSubtaskInput'),
    commentsSection: $('#commentsSection'),
    commentsList: $('#commentsList'),
    newCommentInput: $('#newCommentInput'),
    
    // Project Modal
    projectModal: $('#projectModal'),
    projectForm: $('#projectForm'),
    projectName: $('#projectName'),
    projectColor: $('#projectColor'),
    
    // Label Modal
    labelModal: $('#labelModal'),
    labelForm: $('#labelForm'),
    labelName: $('#labelName'),
    labelColor: $('#labelColor'),
    
    // Confirm Modal
    confirmModal: $('#confirmModal'),
    confirmTitle: $('#confirmTitle'),
    confirmMessage: $('#confirmMessage'),
    confirmOk: $('#confirmOk'),
    confirmCancel: $('#confirmCancel'),
    
    // Navigation
    projectsList: $('#projectsList'),
    labelsList: $('#labelsList'),
    filterChips: $('#filterChips'),
    searchInput: $('#searchInput'),
    pageTitle: $('#pageTitle'),
    
    // Views
    boardView: $('#boardView'),
    statisticsView: $('#statisticsView'),
    archiveView: $('#archiveView'),
    
    // Theme
    themeToggle: $('#themeToggle'),
    
    // Other
    toastContainer: $('#toastContainer'),
    loadingOverlay: $('#loadingOverlay'),
    sidebar: $('.sidebar'),
    mobileMenuBtn: $('#mobileMenuBtn')
};

// ==================== Utility Functions ====================
const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1).replace('_', ' ');

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', { 
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
};

const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
};

const isToday = (dueDate) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const today = new Date();
    return due.toDateString() === today.toDateString();
};

const debounce = (fn, delay) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
};

// ==================== Toast Notifications ====================
function showToast(message, type = 'info') {
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${escapeHtml(message)}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// ==================== Loading State ====================
function showLoading() {
    elements.loadingOverlay.classList.add('active');
}

function hideLoading() {
    elements.loadingOverlay.classList.remove('active');
}

// ==================== Confirm Dialog ====================
function showConfirm(title, message) {
    return new Promise((resolve) => {
        elements.confirmTitle.textContent = title;
        elements.confirmMessage.textContent = message;
        elements.confirmModal.classList.add('active');
        
        const handleOk = () => {
            cleanup();
            resolve(true);
        };
        
        const handleCancel = () => {
            cleanup();
            resolve(false);
        };
        
        const cleanup = () => {
            elements.confirmModal.classList.remove('active');
            elements.confirmOk.removeEventListener('click', handleOk);
            elements.confirmCancel.removeEventListener('click', handleCancel);
        };
        
        elements.confirmOk.addEventListener('click', handleOk);
        elements.confirmCancel.addEventListener('click', handleCancel);
    });
}

// ==================== Theme Management ====================
function initTheme() {
    document.body.setAttribute('data-theme', state.theme);
    updateThemeIcon();
}

function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', state.theme);
    localStorage.setItem('theme', state.theme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const icon = state.theme === 'dark' ? '🌙' : '☀️';
    elements.themeToggle.querySelector('.theme-icon').textContent = icon;
}

// ==================== View Navigation ====================
function switchView(view) {
    state.currentView = view;
    
    // Update nav items
    $$('.nav-item[data-view]').forEach(item => {
        item.classList.toggle('active', item.dataset.view === view);
    });
    
    // Update views
    $$('.view').forEach(v => v.classList.remove('active'));
    $(`#${view}View`).classList.add('active');
    
    // Update title
    const titles = { board: 'Board', statistics: 'Statistics', archive: 'Archive' };
    elements.pageTitle.textContent = titles[view] || 'Board';
    
    // Load view data
    if (view === 'statistics') loadStatistics();
    else if (view === 'archive') loadArchive();
}

// ==================== Rendering ====================
function renderTasks() {
    const todoTasks = state.tasks.filter(t => t.status === 'todo');
    const inProgressTasks = state.tasks.filter(t => t.status === 'in_progress');
    const doneTasks = state.tasks.filter(t => t.status === 'done');

    elements.todoTasks.innerHTML = todoTasks.length 
        ? todoTasks.map(renderTaskCard).join('') 
        : renderEmptyState('📝', 'No tasks to do');
    
    elements.inProgressTasks.innerHTML = inProgressTasks.length 
        ? inProgressTasks.map(renderTaskCard).join('') 
        : renderEmptyState('⚡', 'Nothing in progress');
    
    elements.doneTasks.innerHTML = doneTasks.length 
        ? doneTasks.map(renderTaskCard).join('') 
        : renderEmptyState('✨', 'Complete some tasks!');

    elements.todoCount.textContent = todoTasks.length;
    elements.inProgressCount.textContent = inProgressTasks.length;
    elements.doneCount.textContent = doneTasks.length;

    attachDragListeners();
}

function renderTaskCard(task) {
    const project = task.project;
    const priorityEmoji = { urgent: '🚨', high: '🔴', medium: '🟡', low: '🟢' };
    const overdue = isOverdue(task.due_date) && task.status !== 'done';
    const today = isToday(task.due_date);
    
    const subtaskTotal = task.subtasks?.length || 0;
    const subtaskDone = task.subtasks?.filter(s => s.is_completed).length || 0;
    const commentCount = task.comments?.length || 0;

    const labelsHtml = (task.labels || []).map(l => `
        <span class="task-label" style="background: ${l.color}20; color: ${l.color};">${escapeHtml(l.name)}</span>
    `).join('');

    return `
        <div class="task-card ${overdue ? 'overdue' : ''}" draggable="true" data-task-id="${task.id}">
            <div class="task-header">
                <span class="task-title" onclick="editTask(${task.id})">${escapeHtml(task.title)}</span>
                <div class="task-actions">
                    <button class="task-action-btn" onclick="editTask(${task.id})" title="Edit">✏️</button>
                    <button class="task-action-btn" onclick="archiveTaskAction(${task.id})" title="Archive">📦</button>
                    <button class="task-action-btn delete" onclick="deleteTaskAction(${task.id})" title="Delete">🗑️</button>
                </div>
            </div>
            ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
            ${labelsHtml ? `<div class="task-labels">${labelsHtml}</div>` : ''}
            <div class="task-meta">
                <div class="task-meta-left">
                    <span class="task-priority ${task.priority}">
                        ${priorityEmoji[task.priority]} ${capitalize(task.priority)}
                    </span>
                    ${task.due_date ? `
                        <span class="task-due ${overdue ? 'overdue' : ''} ${today ? 'today' : ''}">
                            📅 ${formatDate(task.due_date)}
                        </span>
                    ` : ''}
                    ${subtaskTotal > 0 ? `
                        <span class="task-subtasks">☑️ ${subtaskDone}/${subtaskTotal}</span>
                    ` : ''}
                    ${commentCount > 0 ? `
                        <span class="task-subtasks">💬 ${commentCount}</span>
                    ` : ''}
                </div>
                ${project ? `
                    <span class="task-project" style="color: ${project.color}; border-color: ${project.color}30; background: ${project.color}15;">
                        ${escapeHtml(project.name)}
                    </span>
                ` : ''}
            </div>
        </div>
    `;
}

function renderEmptyState(icon, text) {
    return `
        <div class="empty-state">
            <div class="empty-state-icon">${icon}</div>
            <p class="empty-state-text">${text}</p>
        </div>
    `;
}

function renderProjects() {
    elements.projectsList.innerHTML = state.projects.map(p => `
        <div class="project-nav-item" onclick="filterByProject(${p.id})">
            <div class="project-info">
                <div class="project-dot" style="background: ${p.color}"></div>
                <span class="project-name">${escapeHtml(p.name)}</span>
            </div>
            <button class="delete-btn-small" onclick="event.stopPropagation(); deleteProjectAction(${p.id})" title="Delete">×</button>
        </div>
    `).join('') || '<p style="color: var(--text-muted); padding: 8px 12px; font-size: 13px;">No projects</p>';

    // Update project select
    const projectOptions = `<option value="">No Project</option>` + 
        state.projects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    elements.taskProject.innerHTML = projectOptions;
}

function renderLabels() {
    elements.labelsList.innerHTML = state.labels.map(l => `
        <div class="label-nav-item" onclick="filterByLabel(${l.id})">
            <div class="label-info">
                <div class="label-dot" style="background: ${l.color}"></div>
                <span class="label-name">${escapeHtml(l.name)}</span>
            </div>
            <button class="delete-btn-small" onclick="event.stopPropagation(); deleteLabelAction(${l.id})" title="Delete">×</button>
        </div>
    `).join('') || '<p style="color: var(--text-muted); padding: 8px 12px; font-size: 13px;">No labels</p>';

    renderLabelsPicker();
}

function renderLabelsPicker(selectedIds = []) {
    elements.labelsPicker.innerHTML = state.labels.map(l => `
        <div class="label-option ${selectedIds.includes(l.id) ? 'selected' : ''}" 
             style="background: ${l.color}20; color: ${l.color};"
             data-label-id="${l.id}"
             onclick="toggleLabelSelection(${l.id})">
            ${escapeHtml(l.name)}
        </div>
    `).join('') || '<p style="color: var(--text-muted); font-size: 13px;">No labels available</p>';
}

function renderFilterChips() {
    const chips = [];
    
    if (state.filters.project_id) {
        const project = state.projects.find(p => p.id === parseInt(state.filters.project_id));
        if (project) {
            chips.push(`<div class="filter-chip">📁 ${escapeHtml(project.name)} <button class="remove-chip" onclick="clearFilter('project_id')">×</button></div>`);
        }
    }
    
    if (state.filters.label_id) {
        const label = state.labels.find(l => l.id === parseInt(state.filters.label_id));
        if (label) {
            chips.push(`<div class="filter-chip">🏷️ ${escapeHtml(label.name)} <button class="remove-chip" onclick="clearFilter('label_id')">×</button></div>`);
        }
    }
    
    if (state.filters.search) {
        chips.push(`<div class="filter-chip">🔍 "${escapeHtml(state.filters.search)}" <button class="remove-chip" onclick="clearFilter('search')">×</button></div>`);
    }
    
    elements.filterChips.innerHTML = chips.join('');
}

function renderStatistics() {
    const stats = state.statistics;
    if (!stats) return;
    
    elements.statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-card-header">
                <span class="stat-card-title">Total Tasks</span>
                <span class="stat-card-icon">📊</span>
            </div>
            <div class="stat-card-value">${stats.total_tasks}</div>
            <div class="stat-card-subtitle">${stats.overdue_count} overdue</div>
        </div>
        
        <div class="stat-card">
            <div class="stat-card-header">
                <span class="stat-card-title">Completion Rate</span>
                <span class="stat-card-icon">✅</span>
            </div>
            <div class="stat-card-value">${stats.completion_rate}%</div>
            <div class="stat-bar">
                <div class="stat-bar-fill" style="width: ${stats.completion_rate}%; background: var(--status-done);"></div>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="stat-card-header">
                <span class="stat-card-title">Completed This Week</span>
                <span class="stat-card-icon">🏆</span>
            </div>
            <div class="stat-card-value">${stats.completed_this_week}</div>
            <div class="stat-card-subtitle">tasks completed</div>
        </div>
        
        <div class="stat-card">
            <div class="stat-card-header">
                <span class="stat-card-title">Status Overview</span>
                <span class="stat-card-icon">📈</span>
            </div>
            <div class="stat-list">
                <div class="stat-list-item">
                    <span class="stat-list-label"><span class="status-dot todo"></span> To Do</span>
                    <span class="stat-list-value">${stats.todo_count}</span>
                </div>
                <div class="stat-list-item">
                    <span class="stat-list-label"><span class="status-dot in-progress"></span> In Progress</span>
                    <span class="stat-list-value">${stats.in_progress_count}</span>
                </div>
                <div class="stat-list-item">
                    <span class="stat-list-label"><span class="status-dot done"></span> Done</span>
                    <span class="stat-list-value">${stats.done_count}</span>
                </div>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="stat-card-header">
                <span class="stat-card-title">By Priority</span>
                <span class="stat-card-icon">🎯</span>
            </div>
            <div class="stat-list">
                ${Object.entries(stats.tasks_by_priority).map(([priority, count]) => `
                    <div class="stat-list-item">
                        <span class="stat-list-label">${capitalize(priority)}</span>
                        <span class="stat-list-value">${count}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="stat-card">
            <div class="stat-card-header">
                <span class="stat-card-title">By Project</span>
                <span class="stat-card-icon">📁</span>
            </div>
            <div class="stat-list">
                ${Object.entries(stats.tasks_by_project).map(([project, count]) => `
                    <div class="stat-list-item">
                        <span class="stat-list-label">${escapeHtml(project)}</span>
                        <span class="stat-list-value">${count}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderArchive() {
    const archived = state.tasks.filter(t => t.status === 'archived');
    
    elements.archiveList.innerHTML = archived.length ? archived.map(t => `
        <div class="archive-item">
            <div class="archive-item-info">
                <span class="archive-item-title">${escapeHtml(t.title)}</span>
                <span class="archive-item-date">Archived ${formatDate(t.updated_at)}</span>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="deleteTaskAction(${t.id})">Delete</button>
        </div>
    `).join('') : renderEmptyState('📦', 'No archived tasks');
}

// ==================== Drag and Drop ====================
function attachDragListeners() {
    $$('.task-card').forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });

    $$('.tasks-container').forEach(container => {
        container.addEventListener('dragover', handleDragOver);
        container.addEventListener('dragleave', handleDragLeave);
        container.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    e.target.classList.add('dragging');
    e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    $$('.tasks-container').forEach(c => c.classList.remove('drag-over'));
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

async function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const taskId = e.dataTransfer.getData('text/plain');
    const newStatus = e.currentTarget.closest('.column').dataset.status;
    
    await API.updateTask(taskId, { status: newStatus });
    showToast('Task moved successfully', 'success');
    await loadTasks();
}

// ==================== Modal Handlers ====================
function openTaskModal(task = null) {
    state.editingTaskId = task?.id || null;
    
    elements.taskModalTitle.textContent = task ? 'Edit Task' : 'New Task';
    elements.taskId.value = task?.id || '';
    elements.taskTitle.value = task?.title || '';
    elements.taskDescription.value = task?.description || '';
    elements.taskPriority.value = task?.priority || 'medium';
    elements.taskProject.value = task?.project_id || '';
    elements.taskStatus.value = task?.status || 'todo';
    
    // Due date
    if (task?.due_date) {
        const date = new Date(task.due_date);
        elements.taskDueDate.value = date.toISOString().slice(0, 16);
    } else {
        elements.taskDueDate.value = '';
    }
    
    // Show/hide edit-only sections
    elements.taskStatusGroup.style.display = task ? 'block' : 'none';
    elements.subtasksSection.style.display = task ? 'block' : 'none';
    elements.commentsSection.style.display = task ? 'block' : 'none';
    
    // Labels
    const selectedLabelIds = (task?.labels || []).map(l => l.id);
    renderLabelsPicker(selectedLabelIds);
    
    // Subtasks
    if (task) {
        renderSubtasks(task.subtasks || []);
        renderComments(task.comments || []);
    }
    
    elements.taskModal.classList.add('active');
    elements.taskTitle.focus();
}

function closeTaskModal() {
    elements.taskModal.classList.remove('active');
    elements.taskForm.reset();
    state.editingTaskId = null;
}

function renderSubtasks(subtasks) {
    elements.subtasksList.innerHTML = subtasks.map(s => `
        <div class="subtask-item" data-subtask-id="${s.id}">
            <input type="checkbox" class="subtask-checkbox" ${s.is_completed ? 'checked' : ''} 
                   onchange="toggleSubtask(${s.id}, this.checked)">
            <span class="subtask-title ${s.is_completed ? 'completed' : ''}">${escapeHtml(s.title)}</span>
            <button class="delete-btn-small" onclick="deleteSubtaskAction(${s.id})">×</button>
        </div>
    `).join('');
}

function renderComments(comments) {
    elements.commentsList.innerHTML = comments.map(c => `
        <div class="comment-item" data-comment-id="${c.id}">
            <div class="comment-content">${escapeHtml(c.content)}</div>
            <div class="comment-meta">
                <span class="comment-date">${formatDateTime(c.created_at)}</span>
                <button class="delete-btn-small" onclick="deleteCommentAction(${c.id})">×</button>
            </div>
        </div>
    `).join('') || '<p style="color: var(--text-muted); font-size: 13px;">No comments yet</p>';
}

// ==================== Task Actions ====================
async function loadTasks() {
    state.tasks = await API.getTasks({ ...state.filters, include_archived: state.currentView === 'archive' });
    renderTasks();
    renderFilterChips();
}

async function handleTaskSubmit(e) {
    e.preventDefault();
    
    const selectedLabels = [...$$('.label-option.selected')].map(el => parseInt(el.dataset.labelId));
    
    const taskData = {
        title: elements.taskTitle.value.trim(),
        description: elements.taskDescription.value.trim(),
        priority: elements.taskPriority.value,
        project_id: elements.taskProject.value ? parseInt(elements.taskProject.value) : null,
        due_date: elements.taskDueDate.value || null,
        label_ids: selectedLabels
    };
    
    if (state.editingTaskId) {
        taskData.status = elements.taskStatus.value;
        await API.updateTask(state.editingTaskId, taskData);
        showToast('Task updated successfully', 'success');
    } else {
        await API.createTask(taskData);
        showToast('Task created successfully', 'success');
    }
    
    closeTaskModal();
    await loadTasks();
}

window.editTask = async function(id) {
    const task = await API.getTask(id);
    openTaskModal(task);
};

window.deleteTaskAction = async function(id) {
    const confirmed = await showConfirm('Delete Task', 'Are you sure you want to delete this task?');
    if (confirmed) {
        await API.deleteTask(id);
        showToast('Task deleted', 'success');
        await loadTasks();
    }
};

window.archiveTaskAction = async function(id) {
    await API.archiveTask(id);
    showToast('Task archived', 'success');
    await loadTasks();
};

window.toggleLabelSelection = function(labelId) {
    const el = $(`.label-option[data-label-id="${labelId}"]`);
    el.classList.toggle('selected');
};

// ==================== Subtask Actions ====================
async function addSubtask() {
    const title = elements.newSubtaskInput.value.trim();
    if (!title || !state.editingTaskId) return;
    
    await API.createSubtask({ title, task_id: state.editingTaskId });
    elements.newSubtaskInput.value = '';
    
    const task = await API.getTask(state.editingTaskId);
    renderSubtasks(task.subtasks);
}

window.toggleSubtask = async function(id, completed) {
    await API.updateSubtask(id, { is_completed: completed });
    if (state.editingTaskId) {
        const task = await API.getTask(state.editingTaskId);
        renderSubtasks(task.subtasks);
    }
    await loadTasks();
};

window.deleteSubtaskAction = async function(id) {
    await API.deleteSubtask(id);
    if (state.editingTaskId) {
        const task = await API.getTask(state.editingTaskId);
        renderSubtasks(task.subtasks);
    }
};

// ==================== Comment Actions ====================
async function addComment() {
    const content = elements.newCommentInput.value.trim();
    if (!content || !state.editingTaskId) return;
    
    await API.createComment({ content, task_id: state.editingTaskId });
    elements.newCommentInput.value = '';
    
    const task = await API.getTask(state.editingTaskId);
    renderComments(task.comments);
}

window.deleteCommentAction = async function(id) {
    await API.deleteComment(id);
    if (state.editingTaskId) {
        const task = await API.getTask(state.editingTaskId);
        renderComments(task.comments);
    }
};

// ==================== Project Actions ====================
async function loadProjects() {
    state.projects = await API.getProjects();
    renderProjects();
}

function openProjectModal() {
    elements.projectModal.classList.add('active');
    elements.projectName.focus();
}

function closeProjectModal() {
    elements.projectModal.classList.remove('active');
    elements.projectForm.reset();
}

async function handleProjectSubmit(e) {
    e.preventDefault();
    
    await API.createProject({
        name: elements.projectName.value.trim(),
        color: elements.projectColor.value
    });
    
    showToast('Project created', 'success');
    closeProjectModal();
    await loadProjects();
}

window.deleteProjectAction = async function(id) {
    const confirmed = await showConfirm('Delete Project', 'This will delete all tasks in this project. Continue?');
    if (confirmed) {
        await API.deleteProject(id);
        showToast('Project deleted', 'success');
        await loadProjects();
        await loadTasks();
    }
};

// ==================== Label Actions ====================
async function loadLabels() {
    state.labels = await API.getLabels();
    renderLabels();
}

function openLabelModal() {
    elements.labelModal.classList.add('active');
    elements.labelName.focus();
}

function closeLabelModal() {
    elements.labelModal.classList.remove('active');
    elements.labelForm.reset();
}

async function handleLabelSubmit(e) {
    e.preventDefault();
    
    await API.createLabel({
        name: elements.labelName.value.trim(),
        color: elements.labelColor.value
    });
    
    showToast('Label created', 'success');
    closeLabelModal();
    await loadLabels();
}

window.deleteLabelAction = async function(id) {
    const confirmed = await showConfirm('Delete Label', 'Remove this label from all tasks?');
    if (confirmed) {
        await API.deleteLabel(id);
        showToast('Label deleted', 'success');
        await loadLabels();
        await loadTasks();
    }
};

// ==================== Filter Actions ====================
window.filterByProject = function(projectId) {
    state.filters.project_id = state.filters.project_id === projectId ? null : projectId;
    loadTasks();
};

window.filterByLabel = function(labelId) {
    state.filters.label_id = state.filters.label_id === labelId ? null : labelId;
    loadTasks();
};

window.clearFilter = function(filterKey) {
    state.filters[filterKey] = filterKey === 'search' ? '' : null;
    if (filterKey === 'search') elements.searchInput.value = '';
    loadTasks();
};

const handleSearch = debounce((term) => {
    state.filters.search = term;
    loadTasks();
}, 300);

// ==================== Statistics ====================
async function loadStatistics() {
    state.statistics = await API.getStatistics();
    renderStatistics();
}

// ==================== Archive ====================
async function loadArchive() {
    state.tasks = await API.getTasks({ include_archived: true });
    renderArchive();
}

// ==================== Export ====================
async function exportData() {
    const data = await API.exportJSON();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'taskflow-export.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported successfully', 'success');
}

// ==================== Event Listeners ====================
// Task modal
$('#addTaskBtn').addEventListener('click', () => openTaskModal());
$('#closeTaskModal').addEventListener('click', closeTaskModal);
$('#cancelTask').addEventListener('click', closeTaskModal);
elements.taskForm.addEventListener('submit', handleTaskSubmit);
$('#addSubtaskBtn').addEventListener('click', addSubtask);
$('#addCommentBtn').addEventListener('click', addComment);
elements.newSubtaskInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } });

// Project modal
$('#addProjectBtn').addEventListener('click', openProjectModal);
$('#closeProjectModal').addEventListener('click', closeProjectModal);
$('#cancelProject').addEventListener('click', closeProjectModal);
elements.projectForm.addEventListener('submit', handleProjectSubmit);

// Label modal
$('#addLabelBtn').addEventListener('click', openLabelModal);
$('#closeLabelModal').addEventListener('click', closeLabelModal);
$('#cancelLabel').addEventListener('click', closeLabelModal);
elements.labelForm.addEventListener('submit', handleLabelSubmit);

// Navigation
$$('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => switchView(item.dataset.view));
});

// Search
elements.searchInput.addEventListener('input', (e) => handleSearch(e.target.value));

// Theme
elements.themeToggle.addEventListener('click', toggleTheme);

// Export
$('#exportBtn').addEventListener('click', exportData);

// Mobile menu
elements.mobileMenuBtn.addEventListener('click', () => {
    elements.sidebar.classList.toggle('open');
});

// Close modals on overlay click
[elements.taskModal, elements.projectModal, elements.labelModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeTaskModal();
        closeProjectModal();
        closeLabelModal();
        elements.confirmModal.classList.remove('active');
    }
    if (e.key === 'n' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        openTaskModal();
    }
    if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        elements.searchInput.focus();
    }
});

// ==================== Initialize ====================
async function init() {
    initTheme();
    showLoading();
    
    await Promise.all([
        loadProjects(),
        loadLabels(),
        loadTasks()
    ]);
    
    hideLoading();
}

init();
