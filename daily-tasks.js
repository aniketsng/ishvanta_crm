window.DailyTasks = {
  render({ container, tasks, getClientName, onChange }) {
    if (!container) return;

    container.innerHTML = tasks.length
      ? tasks.map((task) => `
          <label class="task-item ${task.completed ? 'completed' : ''}">
            <input type="checkbox" data-task-id="${task.id}" ${task.completed ? 'checked' : ''} />
            <span>
              <strong>${task.clientCode || task.title}</strong>
              <small>${getClientName(task.clientId)} · ${task.taskDate}</small>
            </span>
          </label>
        `).join('')
      : '<div class="list-item"><span>No daily calling tasks</span><strong>-</strong></div>';

    container.querySelectorAll('[data-task-id]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => onChange(checkbox.dataset.taskId, checkbox.checked));
    });
  },

  handleSubmit(event, { state, saveState, renderAll, renderClientDetail, closeModal, getTodayDateValue }) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const task = {
      id: `t${crypto.randomUUID().slice(0, 8)}`,
      clientId: formData.get('clientId').toString(),
      taskDate: formData.get('taskDate').toString(),
      clientCode: formData.get('clientCode').toString().trim()
    };

    if (!task.clientId || !task.taskDate || !task.clientCode) return;

    state.tasks.push(task);
    saveState();
    renderAll();
    renderClientDetail(task.clientId);
    form.reset();
    closeModal('taskModal');
  },

  setTodayDate() {
    const input = document.querySelector('#taskForm input[name="taskDate"]');
    if (input) {
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      input.value = `${today.getFullYear()}-${month}-${day}`;
    }
  }
};
