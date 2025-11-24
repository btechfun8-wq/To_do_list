const todolist = document.getElementById("todo-list");
const todoinput = document.getElementById("todo-input");
const addtaskbtn = document.getElementById("add-task-btn");
const emptyState = document.getElementById("empty-state");
const totalTasksEl = document.getElementById("total-tasks");
const completedTasksEl = document.getElementById("completed-tasks");
const pendingTasksEl = document.getElementById("pending-tasks");
const searchInput = document.getElementById("search-input");
const prioritySelect = document.getElementById("priority-select");
const filterButtons = document.querySelectorAll(".filter-btn");
const clearCompletedBtn = document.getElementById("clear-completed");
const clearAllBtn = document.getElementById("clear-all");

let task = []
let saveTimeout = null;
let currentFilter = 'all';
let searchQuery = '';
let draggedElement = null;
let draggedIndex = null;

// Load tasks from localStorage on page load
function loadtasks() {
    try {
        const savedtasks = localStorage.getItem('tasks');
        if (savedtasks) {
            task = JSON.parse(savedtasks);
            rendertask();
            updateStats();
        } else {
            updateStats();
        }
    } catch (e) {
        console.error('Error loading tasks:', e);
        task = [];
    }
}

// Throttled save function to reduce localStorage writes
function savedtask() {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(() => {
        try {
            localStorage.setItem('tasks', JSON.stringify(task));
        } catch (e) {
            console.error('Error saving tasks:', e);
        }
    }, 100);
}

function addTask() {
    const tasktext = todoinput.value.trim();
    if (tasktext === "") return;

    const priority = prioritySelect.value || 'medium';
    const newtask = {
        id: Date.now(),
        text: tasktext,
        completed: false,
        priority: priority,
        createdAt: new Date().toISOString()
    };
    task.push(newtask);
    savedtask();
    rendertask();
    updateStats();
    todoinput.value = "";
    todoinput.focus();
}

addtaskbtn.addEventListener('click', addTask);

// Allow Enter key to add task
todoinput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        addTask();
    }
});

// Search functionality
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    rendertask();
});

// Filter functionality
filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        rendertask();
    });
});

// Clear completed tasks
clearCompletedBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all completed tasks?')) {
        task = task.filter(t => !t.completed);
        savedtask();
        rendertask();
        updateStats();
    }
});

// Clear all tasks
clearAllBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete ALL tasks? This cannot be undone.')) {
        task = [];
        savedtask();
        rendertask();
        updateStats();
    }
});

// Update task statistics
function updateStats() {
    const filtered = getFilteredTasks();
    const total = task.length;
    const completed = task.filter(t => t.completed).length;
    const pending = total - completed;
    
    totalTasksEl.textContent = total;
    completedTasksEl.textContent = completed;
    pendingTasksEl.textContent = pending;
    
    // Show/hide empty state
    const hasTasks = filtered.length > 0;
    if (!hasTasks && total === 0) {
        emptyState.classList.add('show');
    } else {
        emptyState.classList.remove('show');
    }
    
    // Disable/enable clear buttons
    clearCompletedBtn.disabled = completed === 0;
    clearAllBtn.disabled = total === 0;
}

// Get filtered tasks based on current filter and search
function getFilteredTasks() {
    let filtered = [...task];
    
    // Apply search filter
    if (searchQuery) {
        filtered = filtered.filter(t => 
            t.text.toLowerCase().includes(searchQuery)
        );
    }
    
    // Apply status filter
    if (currentFilter === 'active') {
        filtered = filtered.filter(t => !t.completed);
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(t => t.completed);
    }
    
    return filtered;
}

// Inline editing
function enableEdit(taskId) {
    const taskIndex = task.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;
    
    const li = todolist.querySelector(`[data-task-id="${taskId}"]`);
    if (!li) return;
    
    const span = li.querySelector('span');
    if (!span || span.querySelector('.task-edit-input')) return;
    
    const currentText = task[taskIndex].text;
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'task-edit-input';
    editInput.value = currentText;
    
    const saveEdit = () => {
        const newText = editInput.value.trim();
        if (newText && newText !== currentText) {
            task[taskIndex].text = newText;
            savedtask();
            rendertask();
        } else {
            span.textContent = currentText;
        }
        updateStats();
    };
    
    editInput.addEventListener('blur', saveEdit);
    editInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            editInput.blur();
        }
        if (e.key === 'Escape') {
            span.textContent = currentText;
            editInput.remove();
        }
    });
    
    span.textContent = '';
    span.appendChild(editInput);
    editInput.focus();
    editInput.select();
}

// Drag and Drop functionality
let dragStartIndex = null;

function setupDragAndDrop() {
    const items = todolist.querySelectorAll('li');
    
    items.forEach((item, index) => {
        const dragHandle = item.querySelector('.drag-handle');
        
        // Make the whole item draggable when dragging from handle
        if (dragHandle) {
            dragHandle.addEventListener('mousedown', () => {
                item.draggable = true;
            });
            
            // Stop propagation to prevent other clicks
            dragHandle.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        
        item.addEventListener('dragstart', (e) => {
            dragStartIndex = index;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            item.draggable = false;
            document.querySelectorAll('#todo-list li').forEach(li => {
                li.classList.remove('drag-over');
            });
        });
        
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            const dragging = document.querySelector('.dragging');
            if (!dragging || dragging === item) return;
            
            const afterElement = getDragAfterElement(todolist, e.clientY);
            const draggingElement = document.querySelector('.dragging');
            
            if (afterElement == null) {
                todolist.appendChild(draggingElement);
            } else {
                todolist.insertBefore(draggingElement, afterElement);
            }
        });
        
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            if (dragStartIndex === null) return;
            
            const draggingElement = document.querySelector('.dragging');
            if (!draggingElement) return;
            
            const dragEndIndex = Array.from(todolist.children).indexOf(draggingElement);
            const filtered = getFilteredTasks();
            
            if (dragEndIndex !== dragStartIndex && dragStartIndex < filtered.length && dragEndIndex < filtered.length) {
                const [movedTask] = filtered.splice(dragStartIndex, 1);
                filtered.splice(dragEndIndex, 0, movedTask);
                
                // Update main task array order
                const filteredIds = filtered.map(t => t.id);
                const otherTasks = task.filter(t => !filteredIds.includes(t.id));
                task = [...otherTasks, ...filtered];
                
                savedtask();
                rendertask();
            }
            
            dragStartIndex = null;
        });
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Use event delegation for better performance
todolist.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    
    const taskId = parseInt(li.dataset.taskId);
    const taskIndex = task.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) return;
    
    // Delete button clicked
    if (e.target.classList.contains('delete-btn')) {
        task.splice(taskIndex, 1);
        savedtask();
        rendertask();
        updateStats();
    } 
    // Edit button clicked
    else if (e.target.classList.contains('edit-btn')) {
        enableEdit(taskId);
    }
    // Checkbox clicked
    else if (e.target.classList.contains('task-checkbox')) {
        task[taskIndex].completed = !task[taskIndex].completed;
        savedtask();
        rendertask();
        updateStats();
    }
    // Task text clicked - toggle completion
    else if (e.target.tagName === 'SPAN' && !e.target.querySelector('.task-edit-input')) {
        task[taskIndex].completed = !task[taskIndex].completed;
        savedtask();
        rendertask();
        updateStats();
    }
});

function rendertask() {
    const filtered = getFilteredTasks();
    const fragment = document.createDocumentFragment();
    
    filtered.forEach(t => {
        const li = document.createElement('li');
        li.dataset.taskId = t.id;
        li.draggable = false; // Will be enabled by drag handle
        li.classList.add(`priority-${t.priority || 'medium'}`);
        
        if (t.completed) {
            li.classList.add('completed');
        }
        
        // Drag handle
        const dragHandle = document.createElement('div');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '⋮⋮';
        dragHandle.title = 'Drag to reorder';
        
        // Checkbox
        const checkbox = document.createElement('div');
        checkbox.className = 'task-checkbox';
        if (t.completed) {
            checkbox.classList.add('checked');
        }
        
        // Priority badge
        const priorityBadge = document.createElement('span');
        priorityBadge.className = `priority-badge ${t.priority || 'medium'}`;
        priorityBadge.textContent = (t.priority || 'medium').charAt(0).toUpperCase();
        
        // Task text span
        const span = document.createElement('span');
        span.textContent = t.text;
        
        // Task actions
        const taskActions = document.createElement('div');
        taskActions.className = 'task-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'task-btn edit-btn';
        editBtn.textContent = 'Edit';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'task-btn delete-btn';
        deleteBtn.textContent = 'Delete';
        
        taskActions.appendChild(editBtn);
        taskActions.appendChild(deleteBtn);
        
        // Append elements
        li.appendChild(dragHandle);
        li.appendChild(checkbox);
        li.appendChild(priorityBadge);
        li.appendChild(span);
        li.appendChild(taskActions);
        fragment.appendChild(li);
    });
    
    todolist.innerHTML = "";
    todolist.appendChild(fragment);
    updateStats();
    setupDragAndDrop();
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Focus search on Ctrl/Cmd + F
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
    }
    
    // Focus input on Ctrl/Cmd + K
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        todoinput.focus();
    }
});

// Theme Toggle Functionality
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = themeToggle.querySelector('.theme-icon');

// Load theme preference
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeIcon.textContent = '☀️';
    } else {
        document.body.classList.remove('dark-mode');
        themeIcon.textContent = '🌙';
    }
}

// Toggle theme
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
        themeIcon.textContent = '☀️';
    } else {
        localStorage.setItem('theme', 'light');
        themeIcon.textContent = '🌙';
    }
});

// Load tasks and theme when page loads
loadtasks();
loadTheme();
