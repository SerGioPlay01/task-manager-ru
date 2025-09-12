    let currentTaskToDelete = null;
    let searchTimeout = null;
    let shortcuts = {
        'ctrl+n': () => openModal('todo'),
        'ctrl+f': () => document.getElementById('searchInput').focus(),
        'escape': () => {
            closeModal();
            closeHelpModal();
            document.getElementById('searchInput').value = '';
            filterTasks('');
        }
    };

    function showConfirmation(message) {
        const modal = document.getElementById('confirmationModal');
        const messageElement = document.getElementById('confirmationMessage');
        if (message.includes('supprimée')) {
            message = 'Task successfully deleted! 🗑️';
        } else if (message.includes('mise à jour')) {
            message = 'Task successfully updated! 🎉';
        } else if (message.includes('créée')) {
            message = 'Task successfully created! 🎉';
        }
        messageElement.textContent = message;
        modal.classList.add('show');
        setTimeout(() => {
            modal.classList.remove('show');
        }, 3000);
    }

    function closeModal() {
        document.getElementById('taskModal').classList.remove('show');
    }

    function confirmDelete() {
        const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        const filteredTasks = tasks.filter(t => t.id !== currentTaskToDelete);
        localStorage.setItem('tasks', JSON.stringify(filteredTasks));
        const taskElement = document.querySelector(`[data-task-id="${currentTaskToDelete}"]`);
        if (taskElement) {
            taskElement.remove();
        }
        document.getElementById('deleteConfirmationModal').classList.remove('show');

        updateAllCounts();
        showConfirmation('Задача успешно удалена! 🗑️');
        currentTaskToDelete = null;
    }

    function updateAllCounts() {
        const columns = ['todo', 'progress', 'done'];
        columns.forEach(columnType => {
            const column = document.getElementById(columnType);
            const tasksInColumn = column.querySelectorAll('.task-list > .task');
            column.querySelector('.column__count').textContent = tasksInColumn.length;
        });
        const totalTasks = document.querySelectorAll('.task').length;
        const completedTasks = document.querySelector('#done').querySelectorAll('.task').length;
        const inProgressTasks = document.querySelector('#progress').querySelectorAll('.task').length;
        document.getElementById('totalTasks').textContent = totalTasks;
        document.getElementById('completedTasks').textContent = completedTasks;
        document.getElementById('inProgressTasks').textContent = inProgressTasks;
    }

    function cancelDelete() {
        currentTaskToDelete = null;
        document.getElementById('deleteConfirmationModal').classList.remove('show');
    }

    function deleteTask(taskId) {
        currentTaskToDelete = taskId;
        document.getElementById('deleteConfirmationModal').classList.add('show');
    }
    document.addEventListener('DOMContentLoaded', function() {

        document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
        document.getElementById('cancelDeleteBtn').addEventListener('click', cancelDelete);

        const themeToggle = document.getElementById('themeToggle');
        const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

        function initTheme() {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme) {
                document.documentElement.setAttribute('data-theme', savedTheme);
                updateThemeIcon(savedTheme);
            } else if (prefersDarkScheme.matches) {
                document.documentElement.setAttribute('data-theme', 'dark');
                updateThemeIcon('dark');
            }
        }

        function updateThemeIcon(theme) {
            themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
        }

        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        });

        initTheme();
        const modal = document.getElementById('taskModal');
        const taskForm = document.getElementById('taskForm');
        const columns = document.querySelectorAll('.column');

        let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');

        columns.forEach(column => {
            column.addEventListener('dragover', e => {
                e.preventDefault();
                const draggingTask = document.querySelector('.dragging');
                const taskList = column.querySelector('.task-list');
                const afterElement = getDragAfterElement(taskList, e.clientY);
                if (afterElement) {
                    taskList.insertBefore(draggingTask, afterElement);
                } else {
                    taskList.appendChild(draggingTask);
                }
            });
            column.addEventListener('drop', e => {
                e.preventDefault();
                const taskId = e.dataTransfer.getData('text/plain');
                const task = tasks.find(t => t.id === taskId);
                const prevColumn = task.column;
                task.column = column.id;
                saveTasks();
                updateAllCounts();
                updateColumnCount(prevColumn);
                const draggingTask = document.querySelector(`[data-task-id="${taskId}"]`);
                draggingTask.classList.remove('dragging');
                draggingTask.style.transform = 'scale(1.02)';
                setTimeout(() => {
                    draggingTask.style.transform = 'scale(1)';
                }, 200);
            });
        });

        function getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll('.task:not(.dragging)')];
            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return {
                        offset: offset,
                        element: child
                    };
                } else {
                    return closest;
                }
            }, {
                offset: Number.NEGATIVE_INFINITY
            }).element;
        }

        taskForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const taskId = this.dataset.editId;
            if (taskId) {

                const existingTaskElement = document.querySelector(`[data-task-id="${taskId}"]`);

                let parentColumn = null;
                if (existingTaskElement) {
                    parentColumn = existingTaskElement.closest('.column').id;
                }

                const taskIndex = tasks.findIndex(t => t.id === taskId);
                if (taskIndex !== -1) {
                    tasks[taskIndex] = {
                        ...tasks[taskIndex],
                        title: document.getElementById('taskTitle').value,
                        description: document.getElementById('taskDescription').value,
                        deadline: document.getElementById('taskDeadline').value,
                        color: document.getElementById('taskColor').value,
                        column: document.getElementById('columnType').value
                    };

                    if (existingTaskElement && parentColumn !== tasks[taskIndex].column) {
                        existingTaskElement.remove();
                        updateColumnCount(parentColumn);
                    }

                    if (existingTaskElement && parentColumn === tasks[taskIndex].column) {
                        renderTask(tasks[taskIndex], true);
                    } else {

                        renderTask(tasks[taskIndex]);
                    }
                }
                delete this.dataset.editId;
            } else {

                await createTask({
                    columnType: document.getElementById('columnType').value,
                    title: document.getElementById('taskTitle').value,
                    description: document.getElementById('taskDescription').value,
                    deadline: document.getElementById('taskDeadline').value,
                    color: document.getElementById('taskColor').value,
                    imageFile: document.getElementById('taskImage').files[0]
                });
            }
            saveTasks();
            closeModal();
            showConfirmation(taskId ? 'Задача успешно обновлена! 🎉' : 'Задача успешно выполнена! 🎉');
        });
        async function createTask(taskData) {
            const imageBase64 = taskData.imageFile ?
                await convertImageToBase64(taskData.imageFile) :
                null;
            const newTask = {
                id: Date.now().toString(),
                ...taskData,
                column: taskData.columnType,
                image: imageBase64
            };
            tasks.push(newTask);
            saveTasks();
            renderTask(newTask);
        }

        function convertImageToBase64(file) {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
        }

        function saveTasks() {
            localStorage.setItem('tasks', JSON.stringify(tasks));
            updateAllCounts();
        }

        function renderTask(task, isUpdate = false) {
            if (isUpdate) {

                const existingTask = document.querySelector(`[data-task-id="${task.id}"]`);
                if (existingTask) {
                    const imageHtml = task.image ?
                        `<img src="${task.image}" alt="Task image" class="task__image">` : '';
                    existingTask.innerHTML = `
          <div class="task__header">
            <h3 class="task__title">${task.title}</h3>
            <div class="task__actions">
              <button class="action-btn edit-btn">✏️</button>
              <button class="action-btn delete-btn">🗑️</button>
</div>
          </div>
          <div class="task__content">
            <p>${task.description}</p>
            ${imageHtml}
          </div>
          <div class="task__footer">
            <span class="task__date">📅 ${task.deadline ? new Date(task.deadline).toLocaleDateString() !== 'Invalid Date' ? new Date(task.deadline).toLocaleDateString() : 'No date' : 'No date'}</span>
          </div>
        `;
                    existingTask.style.borderLeft = `4px solid ${task.color}`;

                    existingTask.querySelector('.edit-btn').addEventListener('click', () => openEditModal(task.id));
                    existingTask.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));
                    return;
                }
            }
            const column = document.getElementById(task.column);
            const taskList = column.querySelector('.task-list');
            const taskElement = document.createElement('div');
            taskElement.className = 'task';
            taskElement.draggable = true;
            taskElement.dataset.taskId = task.id;
            taskElement.style.borderLeft = `4px solid ${task.color}`;
            const imageHtml = task.image ?
                `<img src="${task.image}" alt="Task image" class="task__image">` : '';
            taskElement.innerHTML = `
      <div class="task__header">
        <h3 class="task__title">${task.title}</h3>
        <div class="task__actions">
          <button class="action-btn edit-btn">✏️</button>
          <button class="action-btn delete-btn">🗑️</button>
</div>
      </div>
      <div class="task__content">
        <p>${task.description}</p>
        ${imageHtml}
      </div>
      <div class="task__footer">
        <span class="task__date">📅 ${task.deadline ? new Date(task.deadline).toLocaleDateString() !== 'Invalid Date' ? new Date(task.deadline).toLocaleDateString() : 'No date' : 'No date'}</span>
      </div>
    `;
            taskElement.addEventListener('dragstart', handleDragStart);
            taskElement.addEventListener('dragend', handleDragEnd);

            const addTaskButton = taskList.querySelector('.add-task');
            if (addTaskButton.nextSibling) {
                taskList.insertBefore(taskElement, addTaskButton.nextSibling);
            } else {
                taskList.appendChild(taskElement);
            }

            saveTasks();
            taskElement.querySelector('.edit-btn').addEventListener('click', () => openEditModal(task.id));
            taskElement.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));
        }

        function updateColumnCount(columnType) {
            const column = document.getElementById(columnType);
            const tasksInColumn = column.querySelectorAll('.task-list > .task');
            column.querySelector('.column__count').textContent = tasksInColumn.length;
        }

        function updateHeaderStats() {
            const totalTasks = document.querySelectorAll('.task').length;
            const completedTasks = document.querySelector('#done').querySelectorAll('.task').length;
            const inProgressTasks = document.querySelector('#progress').querySelectorAll('.task').length;
            document.getElementById('totalTasks').textContent = totalTasks;
            document.getElementById('completedTasks').textContent = completedTasks;
            document.getElementById('inProgressTasks').textContent = inProgressTasks;
        }

        function openEditModal(taskId) {
            const task = tasks.find(t => t.id === taskId);
            if (!task) return;
            const form = document.getElementById('taskForm');
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskDescription').value = task.description;
            document.getElementById('taskDeadline').value = task.deadline;
            document.getElementById('taskColor').value = task.color;
            document.getElementById('columnType').value = task.column;
            document.getElementById('editTaskId').value = taskId;
            form.dataset.editId = taskId;

            document.querySelector('#taskForm button[type="submit"]').textContent = 'Обновление задачи';

            document.querySelector('#taskModal h2').textContent = 'Редактирование задачи';
            document.getElementById('taskModal').classList.add('show');
        }

        function openModal(columnType) {
            document.getElementById('columnType').value = columnType;
            document.getElementById('taskForm').reset();
            document.getElementById('editTaskId').value = '';

            document.querySelector('#taskForm button[type="submit"]').textContent = 'Добавить задачу';

            document.querySelector('#taskModal h2').textContent = 'Новая задача';
            document.getElementById('taskModal').classList.add('show');

            setTimeout(() => {
                document.getElementById('taskTitle').focus();
            }, 100);
        }

        function loadTasks() {

            document.querySelectorAll('.task-list').forEach(taskList => {

                const addTaskButton = taskList.querySelector('.add-task');
                taskList.innerHTML = '';
                taskList.appendChild(addTaskButton);
            });

            tasks.forEach(task => {
                renderTask(task);
            });
            updateAllCounts();
        }
        initTheme();
        loadTasks();
        document.querySelectorAll('.add-task').forEach(button => {
            button.addEventListener('click', function() {
                const columnType = this.closest('.column').id;
                openModal(columnType);
            });
        });
        document.querySelector('.modal__close').addEventListener('click', closeModal);

        function handleDragStart(e) {
            this.classList.add('dragging');
            this.style.opacity = '0.5';
            e.dataTransfer.setData('text/plain', this.dataset.taskId);
        }

        function handleDragEnd() {
            this.classList.remove('dragging');
            this.style.opacity = '1';
        }

        window.deleteTask = deleteTask;

        function closeHelpModal() {
            document.getElementById('helpModal').classList.remove('show');
        }
        document.getElementById('helpToggle').addEventListener('click', function() {
            document.getElementById('helpModal').classList.add('show');
        });
        window.closeHelpModal = closeHelpModal;

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        const clearSearchBtn = document.getElementById('clearSearch');

        searchInput.addEventListener('input', function(e) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                filterTasks(e.target.value.toLowerCase());
            }, 300);
        });

        clearSearchBtn.addEventListener('click', function() {
            searchInput.value = '';
            filterTasks('');
        });

        function filterTasks(searchTerm) {
            const allTasks = document.querySelectorAll('.task');
            let visibleCount = 0;
            
            allTasks.forEach(task => {
                const title = task.querySelector('.task__title').textContent.toLowerCase();
                const description = task.querySelector('.task__content p').textContent.toLowerCase();
                
                if (searchTerm === '' || title.includes(searchTerm) || description.includes(searchTerm)) {
                    task.classList.remove('hidden');
                    task.classList.remove('highlighted');
                    if (searchTerm !== '') {
                        task.classList.add('highlighted');
                    }
                    visibleCount++;
                } else {
                    task.classList.add('hidden');
                    task.classList.remove('highlighted');
                }
            });
            
            // Update search results indicator
            updateSearchResults(visibleCount, searchTerm);
        }
        
        function updateSearchResults(count, searchTerm) {
            const searchInput = document.getElementById('searchInput');
            if (searchTerm) {
                searchInput.style.borderColor = count > 0 ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)';
            } else {
                searchInput.style.borderColor = '';
            }
        }

        // Touch and mobile improvements
        function addTouchSupport() {
            const tasks = document.querySelectorAll('.task');
            tasks.forEach(task => {
                let touchStartTime = 0;
                let touchStartX = 0;
                let touchStartY = 0;
                
                task.addEventListener('touchstart', function(e) {
                    touchStartTime = Date.now();
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                });
                
                task.addEventListener('touchend', function(e) {
                    const touchEndTime = Date.now();
                    const touchDuration = touchEndTime - touchStartTime;
                    const touchEndX = e.changedTouches[0].clientX;
                    const touchEndY = e.changedTouches[0].clientY;
                    const deltaX = Math.abs(touchEndX - touchStartX);
                    const deltaY = Math.abs(touchEndY - touchStartY);
                    
                    // Long press detection (500ms+)
                    if (touchDuration > 500 && deltaX < 10 && deltaY < 10) {
                        e.preventDefault();
                        const taskId = this.dataset.taskId;
                        openEditModal(taskId);
                    }
                });
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            const key = e.key.toLowerCase();
            const ctrl = e.ctrlKey || e.metaKey;
            
            if (ctrl && key === 'n') {
                e.preventDefault();
                openModal('todo');
            } else if (ctrl && key === 'f') {
                e.preventDefault();
                document.getElementById('searchInput').focus();
            } else if (key === 'escape') {
                closeModal();
                closeHelpModal();
                closeBulkModal();
                closeQuickAddModal();
                closeImportModal();
                document.getElementById('searchInput').value = '';
                filterTasks('');
            }
        });
        
        // Improved drag and drop for mobile
        function addMobileDragSupport() {
            let draggedElement = null;
            let placeholder = null;
            
            document.addEventListener('touchstart', function(e) {
                const task = e.target.closest('.task');
                if (task && !e.target.closest('.task__actions')) {
                    draggedElement = task;
                    task.style.opacity = '0.7';
                    task.style.transform = 'scale(1.05)';
                }
            });
            
            document.addEventListener('touchmove', function(e) {
                if (!draggedElement) return;
                e.preventDefault();
                
                const touch = e.touches[0];
                const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
                const column = elementBelow?.closest('.column');
                
                if (column && column !== draggedElement.closest('.column')) {
                    column.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
                }
            });
            
            document.addEventListener('touchend', function(e) {
                if (!draggedElement) return;
                
                const touch = e.changedTouches[0];
                const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
                const targetColumn = elementBelow?.closest('.column');
                
                if (targetColumn && targetColumn !== draggedElement.closest('.column')) {
                    const taskId = draggedElement.dataset.taskId;
                    const task = tasks.find(t => t.id === taskId);
                    const prevColumn = task.column;
                    
                    task.column = targetColumn.id;
                    targetColumn.querySelector('.task-list').appendChild(draggedElement);
                    
                    saveTasks();
                    updateAllCounts();
                    updateColumnCount(prevColumn);
                }
                
                // Reset styles
                draggedElement.style.opacity = '';
                draggedElement.style.transform = '';
                document.querySelectorAll('.column').forEach(col => {
                    col.style.backgroundColor = '';
                });
                
                draggedElement = null;
            });
        }
        
        // Initialize mobile features
        addTouchSupport();
        addMobileDragSupport();
                 
      // Bulk actions functionality
        function closeBulkModal() {
            document.getElementById('bulkActionsModal').classList.remove('show');
        }
        
        function closeQuickAddModal() {
            document.getElementById('quickAddModal').classList.remove('show');
        }
        
        function closeImportModal() {
            document.getElementById('importModal').classList.remove('show');
        }
        
        // Quick actions event listeners
        document.getElementById('quickAddBtn').addEventListener('click', function() {
            document.getElementById('quickAddModal').classList.add('show');
        });
        
        document.getElementById('bulkActionsBtn').addEventListener('click', function() {
            document.getElementById('bulkActionsModal').classList.add('show');
        });
        
        document.getElementById('exportBtn').addEventListener('click', function() {
            const dataStr = JSON.stringify(tasks, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'tasks-backup.json';
            link.click();
            URL.revokeObjectURL(url);
            showConfirmation('Данные успешно экспортированы! 💾');
        });
        
        document.getElementById('importBtn').addEventListener('click', function() {
            document.getElementById('importModal').classList.add('show');
        });
        
        // Quick add functionality
        document.getElementById('addBulkTasksBtn').addEventListener('click', function() {
            const input = document.getElementById('bulkTaskInput').value.trim();
            const column = document.getElementById('bulkTaskColumn').value;
            const color = document.getElementById('bulkTaskColor').value;
            
            if (!input) return;
            
            const lines = input.split('\n').filter(line => line.trim());
            let addedCount = 0;
            
            lines.forEach(line => {
                const title = line.replace(/^[-*•]\s*/, '').trim();
                if (title) {
                    const newTask = {
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        title: title,
                        description: '',
                        deadline: '',
                        color: color,
                        column: column,
                        image: null
                    };
                    tasks.push(newTask);
                    renderTask(newTask);
                    addedCount++;
                }
            });
            
            if (addedCount > 0) {
                saveTasks();
                document.getElementById('bulkTaskInput').value = '';
                closeQuickAddModal();
                showConfirmation(`Добавлено ${addedCount} задач! 🎉`);
            }
        });
        
        // Import functionality
        document.getElementById('importDataBtn').addEventListener('click', function() {
            const textData = document.getElementById('importData').value.trim();
            
            if (!textData) return;
            
            try {
                const importedTasks = JSON.parse(textData);
                if (Array.isArray(importedTasks)) {
                    let importedCount = 0;
                    importedTasks.forEach(taskData => {
                        if (taskData.title) {
                            const newTask = {
                                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                                title: taskData.title,
                                description: taskData.description || '',
                                deadline: taskData.deadline || '',
                                color: taskData.color || '#3a86ff',
                                column: taskData.column || 'todo',
                                image: taskData.image || null
                            };
                            tasks.push(newTask);
                            renderTask(newTask);
                            importedCount++;
                        }
                    });
                    
                    if (importedCount > 0) {
                        saveTasks();
                        document.getElementById('importData').value = '';
                        closeImportModal();
                        showConfirmation(`Импортировано ${importedCount} задач! 📂`);
                    }
                }
            } catch (error) {
                alert('Ошибка при импорте данных. Проверьте формат JSON.');
            }
        });
        
        // File import
        document.getElementById('importFile').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file && file.type === 'application/json') {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('importData').value = e.target.result;
                };
                reader.readAsText(file);
            }
        });
        
        // Update overdue tasks
        function updateOverdueTasks() {
            const now = new Date();
            let overdueCount = 0;
            
            document.querySelectorAll('.task').forEach(taskElement => {
                const taskId = taskElement.dataset.taskId;
                const task = tasks.find(t => t.id === taskId);
                
                if (task && task.deadline && task.column !== 'done') {
                    const deadline = new Date(task.deadline);
                    if (deadline < now) {
                        taskElement.classList.add('overdue');
                        overdueCount++;
                    } else {
                        taskElement.classList.remove('overdue');
                    }
                }
            });
            
            document.getElementById('overdueTasksCount').textContent = overdueCount;
        }
        
        // Auto-save and periodic updates
        setInterval(() => {
            updateOverdueTasks();
        }, 60000); // Check every minute
        
        // Initial overdue check
        setTimeout(updateOverdueTasks, 1000);
        
        // Make functions globally available
        window.closeBulkModal = closeBulkModal;
        window.closeQuickAddModal = closeQuickAddModal;
        window.closeImportModal = closeImportModal;
        
        // Improved responsive behavior
        function handleResize() {
            const isMobile = window.innerWidth <= 768;
            const tasks = document.querySelectorAll('.task');
            
            tasks.forEach(task => {
                if (isMobile) {
                    // Show actions on mobile by default
                    const actions = task.querySelector('.task__actions');
                    if (actions) {
                        actions.style.display = 'flex';
                    }
                } else {
                    // Hide actions on desktop (show on hover)
                    const actions = task.querySelector('.task__actions');
                    if (actions) {
                        actions.style.display = '';
                    }
                }
            });
        }
        
        window.addEventListener('resize', handleResize);
        handleResize(); // Initial call
    });