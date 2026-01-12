/**
 * TaskFlow - Beautiful Task Tracker
 * Main JavaScript Application
 */

// ==================== State Management ====================
const state = {
    tasks: [],
    projects: [],
    filters: {
        project_id: null,
        priority: null
    },
    editingTaskId: null
};

// ==================== API Service ====================
const API = {
    baseUrl: '/api',

    async getTasks(filters = {}) {
        const params = new URLSearchParams();
        if (filters.project_id) params.append('project_id', filters.project_id);
        if (filters.priority) params.append('priority', filters.priority);
        
        const response = await fetch(`${this.baseUrl}/tasks?${params}`);
        return response.json();
    },

    async createTask(task) {
        const response = await fetch(`${this.baseUrl}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task)
        });
        return response.json();
    },

    async updateTask(id, updates) {
        const response = await fetch(`${this.baseUrl}/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        return response.json();
    },

    async deleteTask(id) {
        await fetch(`${this.baseUrl}/tasks/${id}`, { method: 'DELETE' });
    },

    async getProjects() {
        const response = await fetch(`${this.baseUrl}/projects`);
        return response.json();
    },

    async createProject(project) {
        const response = await fetch(`${this.baseUrl}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(project)
        });
        return response.json();
    },

    async deleteProject(id) {
        await fetch(`${this.baseUrl}/projects/${id}`, { method: 'DELETE' });
    }
};

// ==================== DOM Elements ====================
const elements = {
    // Containers
    todoTasks: document.getElementById('todoTasks'),
    inProgressTasks: document.getElementById('inProgressTasks'),
    doneTasks: document.getElementById('doneTasks'),
    
    // Counts
    todoCount: document.getElementById('todoCount'),
    inProgressCount: document.getElementById('inProgressCount'),
    doneCount: document.getElementById('doneCount'),
    
    // Task Modal
    taskModal: document.getElementById('taskModal'),
    taskForm: document.getElementById('taskForm'),
    taskId: document.getElementById('taskId'),
    taskTitle: document.getElementById('taskTitle'),
    taskDescription: document.getElementById('taskDescription'),
    taskPriority: document.getElementById('taskPriority'),
    taskProject: document.getElementById('taskProject'),
    taskStatus: document.getElementById('taskStatus'),
    statusGroup: document.getElementById('statusGroup'),
    modalTitle: document.getElementById('modalTitle'),
    
    // Projects Modal
    projectsModal: document.getElementById('projectsModal'),
    projectsList: document.getElementById('projectsList'),
    projectForm: document.getElementById('projectForm'),
    projectName: document.getElementById('projectName'),
    projectColor: document.getElementById('projectColor'),
    
    // Filters
    filtersPanel: document.getElementById('filtersPanel'),
    projectFilter: document.getElementById('projectFilter'),
    priorityFilter: document.getElementById('priorityFilter'),
    
    // Buttons
    addTaskBtn: document.getElementById('addTaskBtn'),
    filterBtn: document.getElementById('filterBtn'),
    closeTaskModal: document.getElementById('closeTaskModal'),
    cancelTask: document.getElementById('cancelTask'),
    manageProjectsBtn: document.getElementById('manageProjectsBtn'),
    closeProjectsModal: document.getElementById('closeProjectsModal')
};

// ==================== Rendering ====================
function renderTasks() {
    const todoTasks = state.tasks.filter(t => t.status === 'todo');
    const inProgressTasks = state.tasks.filter(t => t.status === 'in_progress');
    const doneTasks = state.tasks.filter(t => t.status === 'done');

    elements.todoTasks.innerHTML = todoTasks.length 
        ? todoTasks.map(renderTaskCard).join('') 
        : renderEmptyState('📝', 'No tasks yet');
    
    elements.inProgressTasks.innerHTML = inProgressTasks.length 
        ? inProgressTasks.map(renderTaskCard).join('') 
        : renderEmptyState('⚡', 'Nothing in progress');
    
    elements.doneTasks.innerHTML = doneTasks.length 
        ? doneTasks.map(renderTaskCard).join('') 
        : renderEmptyState('✨', 'Complete some tasks!');

    elements.todoCount.textContent = todoTasks.length;
    elements.inProgressCount.textContent = inProgressTasks.length;
    elements.doneCount.textContent = doneTasks.length;

    // Re-attach drag listeners
    attachDragListeners();
}

function renderTaskCard(task) {
    const project = task.project_id 
        ? state.projects.find(p => p.id === task.project_id) 
        : null;
    
    const priorityEmoji = {
        high: '🔴',
        medium: '🟡',
        low: '🟢'
    };

    return `
        <div class="task-card" draggable="true" data-task-id="${task.id}">
            <div class="task-header">
                <span class="task-title">${escapeHtml(task.title)}</span>
                <div class="task-actions">
                    <button class="task-action-btn edit" onclick="editTask(${task.id})" title="Edit">✏️</button>
                    <button class="task-action-btn delete" onclick="deleteTask(${task.id})" title="Delete">🗑️</button>
                </div>
            </div>
            ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
            <div class="task-meta">
                <span class="task-priority ${task.priority}">
                    ${priorityEmoji[task.priority]} ${capitalize(task.priority)}
                </span>
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
    elements.projectsList.innerHTML = state.projects.length
        ? state.projects.map(p => `
            <div class="project-item">
                <div class="project-info">
                    <div class="project-color" style="background: ${p.color}"></div>
                    <span class="project-name">${escapeHtml(p.name)}</span>
                </div>
                <button class="task-action-btn delete" onclick="deleteProject(${p.id})" title="Delete">🗑️</button>
            </div>
        `).join('')
        : '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No projects yet</p>';

    // Update project selects
    const projectOptions = `<option value="">No Project</option>` + 
        state.projects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    
    elements.taskProject.innerHTML = projectOptions;
    elements.projectFilter.innerHTML = `<option value="">All Projects</option>` + 
        state.projects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
}

// ==================== Drag and Drop ====================
function attachDragListeners() {
    document.querySelectorAll('.task-card').forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });

    document.querySelectorAll('.tasks-container').forEach(container => {
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
    document.querySelectorAll('.tasks-container').forEach(c => c.classList.remove('drag-over'));
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
    await loadTasks();
}

// ==================== Modal Handlers ====================
function openTaskModal(task = null) {
    state.editingTaskId = task?.id || null;
    
    elements.modalTitle.textContent = task ? 'Edit Task' : 'New Task';
    elements.taskId.value = task?.id || '';
    elements.taskTitle.value = task?.title || '';
    elements.taskDescription.value = task?.description || '';
    elements.taskPriority.value = task?.priority || 'medium';
    elements.taskProject.value = task?.project_id || '';
    elements.taskStatus.value = task?.status || 'todo';
    elements.statusGroup.style.display = task ? 'block' : 'none';
    
    elements.taskModal.classList.add('active');
    elements.taskTitle.focus();
}

function closeTaskModal() {
    elements.taskModal.classList.remove('active');
    elements.taskForm.reset();
    state.editingTaskId = null;
}

function openProjectsModal() {
    elements.projectsModal.classList.add('active');
}

function closeProjectsModal() {
    elements.projectsModal.classList.remove('active');
    elements.projectForm.reset();
}

// ==================== Task Actions ====================
async function loadTasks() {
    state.tasks = await API.getTasks(state.filters);
    renderTasks();
}

async function handleTaskSubmit(e) {
    e.preventDefault();
    
    const taskData = {
        title: elements.taskTitle.value.trim(),
        description: elements.taskDescription.value.trim(),
        priority: elements.taskPriority.value,
        project_id: elements.taskProject.value ? parseInt(elements.taskProject.value) : null
    };
    
    if (state.editingTaskId) {
        taskData.status = elements.taskStatus.value;
        await API.updateTask(state.editingTaskId, taskData);
    } else {
        await API.createTask(taskData);
    }
    
    closeTaskModal();
    await loadTasks();
}

window.editTask = async function(id) {
    const task = state.tasks.find(t => t.id === id);
    if (task) openTaskModal(task);
};

window.deleteTask = async function(id) {
    if (confirm('Are you sure you want to delete this task?')) {
        await API.deleteTask(id);
        await loadTasks();
    }
};

// ==================== Project Actions ====================
async function loadProjects() {
    state.projects = await API.getProjects();
    renderProjects();
}

async function handleProjectSubmit(e) {
    e.preventDefault();
    
    await API.createProject({
        name: elements.projectName.value.trim(),
        color: elements.projectColor.value
    });
    
    elements.projectForm.reset();
    await loadProjects();
}

window.deleteProject = async function(id) {
    if (confirm('Delete this project? All tasks in this project will also be deleted.')) {
        await API.deleteProject(id);
        await loadProjects();
        await loadTasks();
    }
};

// ==================== Filter Actions ====================
function toggleFilters() {
    elements.filtersPanel.classList.toggle('active');
}

function handleFilterChange() {
    state.filters.project_id = elements.projectFilter.value || null;
    state.filters.priority = elements.priorityFilter.value || null;
    loadTasks();
}

// ==================== Utilities ====================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ==================== Event Listeners ====================
elements.addTaskBtn.addEventListener('click', () => openTaskModal());
elements.filterBtn.addEventListener('click', toggleFilters);
elements.closeTaskModal.addEventListener('click', closeTaskModal);
elements.cancelTask.addEventListener('click', closeTaskModal);
elements.taskForm.addEventListener('submit', handleTaskSubmit);

elements.manageProjectsBtn.addEventListener('click', openProjectsModal);
elements.closeProjectsModal.addEventListener('click', closeProjectsModal);
elements.projectForm.addEventListener('submit', handleProjectSubmit);

elements.projectFilter.addEventListener('change', handleFilterChange);
elements.priorityFilter.addEventListener('change', handleFilterChange);

// Close modals on overlay click
elements.taskModal.addEventListener('click', (e) => {
    if (e.target === elements.taskModal) closeTaskModal();
});
elements.projectsModal.addEventListener('click', (e) => {
    if (e.target === elements.projectsModal) closeProjectsModal();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeTaskModal();
        closeProjectsModal();
    }
    if (e.key === 'n' && e.ctrlKey) {
        e.preventDefault();
        openTaskModal();
    }
});

// ==================== Initialize ====================
async function init() {
    await loadProjects();
    await loadTasks();
}

init();

