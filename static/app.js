/**
 * TaskFlow - Professional Task Tracker
 * Main JavaScript Application v3.0
 */

// ==================== State Management ====================
const state = {
    user: null,
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
    theme: localStorage.getItem('theme') || 'light',
    tempSubtasks: [],
    tempComments: []
};

// ==================== API Service ====================
const API = {
    baseUrl: '/api',

    async request(endpoint, options = {}) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            ...options
        });
        
        if (response.status === 401 && !endpoint.includes('/auth/')) {
            // Not authenticated - continue as guest
            return null;
        }
        
        if (!response.ok && response.status !== 204) {
            const error = await response.json().catch(() => ({ detail: 'Request failed' }));
            throw new Error(error.detail || 'Request failed');
        }
        
        if (response.status === 204) return null;
        return response.json();
    },

    // Auth
    getMe: () => API.request('/auth/me'),
    logout: () => API.request('/auth/logout', { method: 'POST' }),

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

// ==================== Theme ====================
function initTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    updateThemeIcon();
}

function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', state.theme);
    document.documentElement.setAttribute('data-theme', state.theme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const btn = $('#themeToggle');
    if (btn) btn.textContent = state.theme === 'light' ? '🌙' : '☀️';
}

// ==================== Loading ====================
function showLoading() {
    const overlay = $('#loadingOverlay');
    if (overlay) overlay.classList.add('active');
}

function hideLoading() {
    const overlay = $('#loadingOverlay');
    if (overlay) overlay.classList.remove('active');
}

// ==================== Toast Notifications ====================
function showToast(message, type = 'info') {
    const container = $('#toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(toast);
    
    setTimeout(() => toast.remove(), 4000);
}

// ==================== Sidebar ====================
function toggleSidebar() {
    const sidebar = $('#sidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

// ==================== View Switching ====================
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
    $('#viewTitle').textContent = titles[view] || 'Board';
    
    // Load view data
    if (view === 'statistics') loadStatistics();
    if (view === 'archive') loadArchive();
    
    // Close sidebar on mobile
    $('#sidebar').classList.remove('open');
}

// ==================== Data Loading ====================
async function loadTasks() {
    const tasks = await API.getTasks(state.filters);
    state.tasks = tasks || [];
    renderTasks();
}

async function loadProjects() {
    const projects = await API.getProjects();
    state.projects = projects || [];
    renderProjects();
    updateProjectSelect();
}

async function loadLabels() {
    const labels = await API.getLabels();
    state.labels = labels || [];
    renderLabels();
}

async function loadStatistics() {
    const stats = await API.getStatistics();
    if (stats) renderStatistics(stats);
}

async function loadArchive() {
    const tasks = await API.getTasks({ is_archived: true });
    renderArchive(tasks || []);
}

async function loadUser() {
    const user = await API.getMe();
    state.user = user;
    renderUserInfo();
}

// ==================== Rendering ====================
function renderTasks() {
    const activeTasks = state.tasks.filter(t => !t.is_archived);
    
    const todoTasks = activeTasks.filter(t => t.status === 'todo');
    const inProgressTasks = activeTasks.filter(t => t.status === 'in_progress');
    const doneTasks = activeTasks.filter(t => t.status === 'done');
    
    const todoContainer = $('#todoTasks');
    const inProgressContainer = $('#inProgressTasks');
    const doneContainer = $('#doneTasks');
    
    if (todoContainer) {
        todoContainer.innerHTML = todoTasks.length 
            ? todoTasks.map(renderTaskCard).join('')
            : renderEmptyState('📝', 'No tasks to do');
    }
    
    if (inProgressContainer) {
        inProgressContainer.innerHTML = inProgressTasks.length 
            ? inProgressTasks.map(renderTaskCard).join('')
            : renderEmptyState('⚡', 'Nothing in progress');
    }
    
    if (doneContainer) {
        doneContainer.innerHTML = doneTasks.length 
            ? doneTasks.map(renderTaskCard).join('')
            : renderEmptyState('✨', 'Complete some tasks!');
    }
    
    // Update counts
    const todoCount = $('#todoCount');
    const inProgressCount = $('#inProgressCount');
    const doneCount = $('#doneCount');
    
    if (todoCount) todoCount.textContent = todoTasks.length;
    if (inProgressCount) inProgressCount.textContent = inProgressTasks.length;
    if (doneCount) doneCount.textContent = doneTasks.length;
    
    attachDragListeners();
}

function renderTaskCard(task) {
    const priorityClasses = {
        low: 'priority-low',
        medium: 'priority-medium',
        high: 'priority-high',
        urgent: 'priority-urgent'
    };
    
    const priorityLabels = {
        low: '🟢 Low',
        medium: '🟡 Medium',
        high: '🔴 High',
        urgent: '🚨 Urgent'
    };
    
    const dueClass = task.due_date ? getDueDateClass(task.due_date) : '';
    const subtaskProgress = task.subtasks?.length ? 
        `${task.subtasks.filter(s => s.is_completed).length}/${task.subtasks.length}` : '';
    
    return `
        <div class="task-card" draggable="true" data-task-id="${task.id}">
            <div class="task-card-header">
                <span class="task-card-title">${escapeHtml(task.title)}</span>
                <div class="task-card-actions">
                    <button class="task-card-action" onclick="editTask(${task.id})" title="Edit">✏️</button>
                    <button class="task-card-action delete" onclick="confirmDelete('task', ${task.id})" title="Delete">🗑️</button>
                </div>
            </div>
            ${task.description ? `<p class="task-card-description">${escapeHtml(task.description)}</p>` : ''}
            <div class="task-card-meta">
                <span class="task-badge ${priorityClasses[task.priority]}">${priorityLabels[task.priority]}</span>
                ${task.labels?.map(l => `<span class="task-label" style="background:${l.color}20;color:${l.color}">${escapeHtml(l.name)}</span>`).join('') || ''}
                ${task.due_date ? `<span class="task-due ${dueClass}">📅 ${formatDate(task.due_date)}</span>` : ''}
                ${subtaskProgress ? `<span class="task-progress"><div class="task-progress-bar"><div class="task-progress-fill" style="width:${(task.subtasks.filter(s=>s.is_completed).length/task.subtasks.length)*100}%"></div></div>${subtaskProgress}</span>` : ''}
                ${task.project ? `<span class="task-project">${escapeHtml(task.project.name)}</span>` : ''}
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
    const container = $('#projectsList');
    if (!container) return;
    
    container.innerHTML = state.projects.map(p => `
        <div class="sidebar-item ${state.filters.project_id === p.id ? 'active' : ''}" onclick="filterByProject(${p.id})">
            <span class="sidebar-item-dot" style="background:${p.color}"></span>
            <span>${escapeHtml(p.name)}</span>
            <button class="sidebar-item-delete" onclick="event.stopPropagation();confirmDelete('project',${p.id})">×</button>
        </div>
    `).join('');
}

function renderLabels() {
    const container = $('#labelsList');
    if (!container) return;
    
    container.innerHTML = state.labels.map(l => `
        <div class="sidebar-item ${state.filters.label_id === l.id ? 'active' : ''}" onclick="filterByLabel(${l.id})">
            <span class="sidebar-item-dot" style="background:${l.color}"></span>
            <span>${escapeHtml(l.name)}</span>
            <button class="sidebar-item-delete" onclick="event.stopPropagation();confirmDelete('label',${l.id})">×</button>
        </div>
    `).join('');
}

function renderLabelsPicker(selectedIds = []) {
    const container = $('#labelsPicker');
    if (!container) return;
    
    container.innerHTML = state.labels.map(l => `
        <div class="label-option ${selectedIds.includes(l.id) ? 'selected' : ''}" 
             style="background:${l.color}20;color:${l.color}"
             data-label-id="${l.id}"
             onclick="toggleLabelSelection(this, ${l.id})">
            ${escapeHtml(l.name)}
        </div>
    `).join('');
}

function renderStatistics(stats) {
    const container = $('#statsGrid');
    if (!container) return;
    
    container.innerHTML = `
        <div class="stat-card">
            <div class="stat-card-header">
                <div class="stat-card-icon blue">📋</div>
            </div>
            <div class="stat-card-value">${stats.total_tasks || 0}</div>
            <div class="stat-card-label">Total Tasks</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-header">
                <div class="stat-card-icon green">✅</div>
            </div>
            <div class="stat-card-value">${stats.completed_tasks || 0}</div>
            <div class="stat-card-label">Completed</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-header">
                <div class="stat-card-icon purple">⏳</div>
            </div>
            <div class="stat-card-value">${stats.in_progress_tasks || 0}</div>
            <div class="stat-card-label">In Progress</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-header">
                <div class="stat-card-icon orange">📁</div>
            </div>
            <div class="stat-card-value">${stats.total_projects || 0}</div>
            <div class="stat-card-label">Projects</div>
        </div>
    `;
}

function renderArchive(tasks) {
    const container = $('#archiveList');
    if (!container) return;
    
    container.innerHTML = tasks.length ? tasks.map(t => `
        <div class="archive-item">
            <div class="archive-item-info">
                <span class="archive-item-title">${escapeHtml(t.title)}</span>
                <span class="archive-item-date">Completed ${formatDate(t.completed_at || t.updated_at)}</span>
            </div>
            <div class="archive-item-actions">
                <button class="btn btn-secondary btn-sm" onclick="restoreTask(${t.id})">Restore</button>
                <button class="btn btn-ghost btn-sm" onclick="confirmDelete('task',${t.id})">Delete</button>
            </div>
        </div>
    `).join('') : renderEmptyState('📦', 'No archived tasks');
}

function renderUserInfo() {
    const avatar = $('#userAvatar');
    const name = $('#userName');
    const email = $('#userEmail');
    
    if (state.user) {
        if (avatar) {
            avatar.style.background = state.user.avatar_color;
            avatar.textContent = (state.user.full_name || state.user.username || 'U')[0].toUpperCase();
        }
        if (name) name.textContent = state.user.full_name || state.user.username;
        if (email) email.textContent = state.user.email;
    } else {
        if (avatar) avatar.textContent = 'G';
        if (name) name.textContent = 'Guest';
        if (email) email.innerHTML = '<a href="/login" style="color:inherit">Sign in to sync</a>';
    }
}

function updateProjectSelect() {
    const select = $('#taskProject');
    if (!select) return;
    
    select.innerHTML = '<option value="">No Project</option>' + 
        state.projects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
}

function renderFilterChips() {
    const container = $('#filterChips');
    if (!container) return;
    
    let chips = '';
    
    if (state.filters.project_id) {
        const project = state.projects.find(p => p.id === state.filters.project_id);
        if (project) {
            chips += `<div class="filter-chip">
                <span style="width:8px;height:8px;background:${project.color};border-radius:50%"></span>
                ${escapeHtml(project.name)}
                <button class="filter-chip-remove" onclick="clearFilter('project_id')">×</button>
            </div>`;
        }
    }
    
    if (state.filters.label_id) {
        const label = state.labels.find(l => l.id === state.filters.label_id);
        if (label) {
            chips += `<div class="filter-chip">
                ${escapeHtml(label.name)}
                <button class="filter-chip-remove" onclick="clearFilter('label_id')">×</button>
            </div>`;
        }
    }
    
    if (state.filters.search) {
        chips += `<div class="filter-chip">
            Search: ${escapeHtml(state.filters.search)}
            <button class="filter-chip-remove" onclick="clearFilter('search')">×</button>
        </div>`;
    }
    
    container.innerHTML = chips;
}

// ==================== Drag and Drop ====================
function attachDragListeners() {
    $$('.task-card').forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });
    
    $$('.column-tasks').forEach(col => {
        col.addEventListener('dragover', handleDragOver);
        col.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    e.target.classList.add('dragging');
    e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
}

async function handleDrop(e) {
    e.preventDefault();
    const taskId = parseInt(e.dataTransfer.getData('text/plain'));
    const newStatus = e.currentTarget.closest('.column').dataset.status;
    
    await API.updateTask(taskId, { status: newStatus });
    await loadTasks();
    showToast('Task moved', 'success');
}

// ==================== Filters ====================
function filterByProject(projectId) {
    state.filters.project_id = state.filters.project_id === projectId ? null : projectId;
    loadTasks();
    renderProjects();
    renderFilterChips();
}

function filterByLabel(labelId) {
    state.filters.label_id = state.filters.label_id === labelId ? null : labelId;
    loadTasks();
    renderLabels();
    renderFilterChips();
}

function clearFilter(key) {
    state.filters[key] = key === 'search' ? '' : null;
    if (key === 'search') $('#searchInput').value = '';
    loadTasks();
    renderProjects();
    renderLabels();
    renderFilterChips();
}

// ==================== Task Modal ====================
function openTaskModal(task = null) {
    state.editingTaskId = task?.id || null;
    state.tempSubtasks = task?.subtasks ? [...task.subtasks] : [];
    state.tempComments = task?.comments ? [...task.comments] : [];
    
    $('#taskModalTitle').textContent = task ? 'Edit Task' : 'New Task';
    $('#taskId').value = task?.id || '';
    $('#taskTitle').value = task?.title || '';
    $('#taskDescription').value = task?.description || '';
    $('#taskPriority').value = task?.priority || 'medium';
    $('#taskProject').value = task?.project_id || '';
    $('#taskDueDate').value = task?.due_date ? task.due_date.split('T')[0] : '';
    $('#taskStatus').value = task?.status || 'todo';
    
    $('#taskStatusGroup').style.display = task ? 'block' : 'none';
    
    renderLabelsPicker(task?.labels?.map(l => l.id) || []);
    renderSubtasks();
    renderComments();
    
    $('#taskModal').classList.add('active');
    $('#taskTitle').focus();
}

function closeTaskModal() {
    $('#taskModal').classList.remove('active');
    $('#taskForm').reset();
    state.editingTaskId = null;
    state.tempSubtasks = [];
    state.tempComments = [];
}

async function editTask(id) {
    const task = await API.getTask(id);
    openTaskModal(task);
}

async function handleTaskSubmit(e) {
    e.preventDefault();
    
    const selectedLabels = [...$$('#labelsPicker .label-option.selected')]
        .map(el => parseInt(el.dataset.labelId));
    
    const taskData = {
        title: $('#taskTitle').value.trim(),
        description: $('#taskDescription').value.trim(),
        priority: $('#taskPriority').value,
        project_id: $('#taskProject').value ? parseInt($('#taskProject').value) : null,
        due_date: $('#taskDueDate').value || null,
        status: $('#taskStatus').value,
        label_ids: selectedLabels
    };
    
    if (state.editingTaskId) {
        await API.updateTask(state.editingTaskId, taskData);
        showToast('Task updated', 'success');
    } else {
        const newTask = await API.createTask(taskData);
        
        // Create subtasks and comments for new task
        for (const st of state.tempSubtasks) {
            await API.createSubtask({ task_id: newTask.id, title: st.title });
        }
        for (const c of state.tempComments) {
            await API.createComment({ task_id: newTask.id, content: c.content });
        }
        
        showToast('Task created', 'success');
    }
    
    closeTaskModal();
    await loadTasks();
}

function toggleLabelSelection(el, labelId) {
    el.classList.toggle('selected');
}

// ==================== Subtasks ====================
function renderSubtasks() {
    const container = $('#subtasksList');
    if (!container) return;
    
    container.innerHTML = state.tempSubtasks.map((st, i) => `
        <div class="subtask-item ${st.is_completed ? 'completed' : ''}">
            <input type="checkbox" class="subtask-checkbox" 
                   ${st.is_completed ? 'checked' : ''} 
                   onchange="toggleSubtask(${i}, ${st.id || 'null'})">
            <span class="subtask-title">${escapeHtml(st.title)}</span>
            <button type="button" class="subtask-delete" onclick="deleteSubtask(${i}, ${st.id || 'null'})">×</button>
        </div>
    `).join('');
}

function addSubtask() {
    const input = $('#newSubtaskInput');
    const title = input.value.trim();
    if (!title) return;
    
    state.tempSubtasks.push({ title, is_completed: false });
    input.value = '';
    renderSubtasks();
}

async function toggleSubtask(index, dbId) {
    state.tempSubtasks[index].is_completed = !state.tempSubtasks[index].is_completed;
    
    if (dbId && state.editingTaskId) {
        await API.updateSubtask(dbId, { is_completed: state.tempSubtasks[index].is_completed });
    }
    
    renderSubtasks();
}

async function deleteSubtask(index, dbId) {
    if (dbId && state.editingTaskId) {
        await API.deleteSubtask(dbId);
    }
    state.tempSubtasks.splice(index, 1);
    renderSubtasks();
}

// ==================== Comments ====================
function renderComments() {
    const container = $('#commentsList');
    if (!container) return;
    
    container.innerHTML = state.tempComments.map((c, i) => `
        <div class="comment-item">
            <div class="comment-header">
                <span class="comment-author">${state.user?.username || 'Guest'}</span>
                <span class="comment-time">${c.created_at ? formatDate(c.created_at) : 'Now'}</span>
                <button type="button" class="comment-delete" onclick="deleteComment(${i}, ${c.id || 'null'})">×</button>
            </div>
            <p class="comment-content">${escapeHtml(c.content)}</p>
        </div>
    `).join('');
}

function addComment() {
    const input = $('#newCommentInput');
    const content = input.value.trim();
    if (!content) return;
    
    state.tempComments.push({ content, created_at: new Date().toISOString() });
    input.value = '';
    renderComments();
    
    if (state.editingTaskId) {
        API.createComment({ task_id: state.editingTaskId, content });
    }
}

async function deleteComment(index, dbId) {
    if (dbId && state.editingTaskId) {
        await API.deleteComment(dbId);
    }
    state.tempComments.splice(index, 1);
    renderComments();
}

// ==================== Projects ====================
function openProjectModal() {
    $('#projectModal').classList.add('active');
    $('#projectName').focus();
}

function closeProjectModal() {
    $('#projectModal').classList.remove('active');
    $('#projectForm').reset();
}

async function createProject(e) {
    e.preventDefault();
    
    await API.createProject({
        name: $('#projectName').value.trim(),
        color: $('#projectColor').value
    });
    
    closeProjectModal();
    await loadProjects();
    showToast('Project created', 'success');
}

// ==================== Labels ====================
function openLabelModal() {
    $('#labelModal').classList.add('active');
    $('#labelName').focus();
}

function closeLabelModal() {
    $('#labelModal').classList.remove('active');
    $('#labelForm').reset();
}

async function createLabel(e) {
    e.preventDefault();
    
    await API.createLabel({
        name: $('#labelName').value.trim(),
        color: $('#labelColor').value
    });
    
    closeLabelModal();
    await loadLabels();
    showToast('Label created', 'success');
}

// ==================== Delete Confirmation ====================
let deleteAction = null;

function confirmDelete(type, id) {
    const messages = {
        task: 'Are you sure you want to delete this task?',
        project: 'Delete this project? Tasks will be kept.',
        label: 'Delete this label? Tasks will be kept.'
    };
    
    $('#confirmMessage').textContent = messages[type];
    $('#confirmModal').classList.add('active');
    
    deleteAction = async () => {
        if (type === 'task') await API.deleteTask(id);
        if (type === 'project') await API.deleteProject(id);
        if (type === 'label') await API.deleteLabel(id);
        
        closeConfirmModal();
        await Promise.all([loadTasks(), loadProjects(), loadLabels()]);
        showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted`, 'success');
    };
}

function closeConfirmModal() {
    $('#confirmModal').classList.remove('active');
    deleteAction = null;
}

// ==================== Export ====================
async function exportData() {
    const data = await API.exportJSON();
    if (!data) return;
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taskflow-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Data exported', 'success');
}

// ==================== Utilities ====================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDueDateClass(dateStr) {
    const due = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    
    const diff = (due - today) / (1000 * 60 * 60 * 24);
    if (diff < 0) return 'overdue';
    if (diff <= 2) return 'soon';
    return '';
}

// ==================== Event Listeners ====================
document.addEventListener('DOMContentLoaded', () => {
    // Theme toggle
    const themeToggle = $('#themeToggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    
    // Task modal
    const addTaskBtn = $('#addTaskBtn');
    if (addTaskBtn) addTaskBtn.addEventListener('click', () => openTaskModal());
    
    const closeTaskModalBtn = $('#closeTaskModal');
    if (closeTaskModalBtn) closeTaskModalBtn.addEventListener('click', closeTaskModal);
    
    const cancelTaskBtn = $('#cancelTask');
    if (cancelTaskBtn) cancelTaskBtn.addEventListener('click', closeTaskModal);
    
    const taskForm = $('#taskForm');
    if (taskForm) taskForm.addEventListener('submit', handleTaskSubmit);
    
    // Confirm modal
    const confirmActionBtn = $('#confirmAction');
    if (confirmActionBtn) confirmActionBtn.addEventListener('click', () => deleteAction && deleteAction());
    
    // Search
    const searchInput = $('#searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                state.filters.search = e.target.value;
                loadTasks();
                renderFilterChips();
            }, 300);
        });
    }
    
    // Subtask input enter
    const subtaskInput = $('#newSubtaskInput');
    if (subtaskInput) {
        subtaskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addSubtask();
            }
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeTaskModal();
            closeProjectModal();
            closeLabelModal();
            closeConfirmModal();
        }
        if (e.key === 'n' && e.ctrlKey) {
            e.preventDefault();
            openTaskModal();
        }
    });
    
    // Close modals on overlay click
    $$('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });
});

// ==================== Initialize ====================
async function init() {
    initTheme();
    showLoading();
    
    try {
        await Promise.all([
            loadUser(),
            loadProjects(),
            loadLabels(),
            loadTasks()
        ]);
    } catch (error) {
        console.error('Init error:', error);
        showToast('Failed to load data', 'error');
    } finally {
        hideLoading();
    }
}

init();
