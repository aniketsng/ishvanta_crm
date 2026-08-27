window.DailyTasks = {
  render({ container, tasks, getClientName, onChange, onDelete }) {
    if (!container) return;

    container.innerHTML = tasks.length
      ? tasks.map((task) => `
          <div class="task-item ${task.completed ? 'completed' : ''}">
            <input type="checkbox" data-task-id="${task.id}" ${task.completed ? 'checked' : ''} />
            <span>
              <strong class="task-code">${task.clientCode || task.clientName || task.title}</strong>
              <small class="task-meta">${task.clientName || getClientName(task.clientId)}${task.note ? ` · ${task.note}` : ''}</small>
            </span>
            <button class="task-delete-btn" type="button" data-delete-task="${task.id}">Delete</button>
          </div>
        `).join('')
      : '<div class="list-item"><span>No daily calling tasks</span><strong>-</strong></div>';

    container.querySelectorAll('[data-task-id]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => onChange(checkbox.dataset.taskId, checkbox.checked));
    });

    container.querySelectorAll('[data-delete-task]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        onDelete(button.dataset.deleteTask);
      });
    });
  },

  handleSubmit(event, { state, saveState, renderAll, renderClientDetail, closeModal, getTodayDateValue }) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const clientName = formData.get('clientName').toString().trim();
    const matchedClient = state.clients.find((client) => client.name.toLowerCase() === clientName.toLowerCase());
    const task = {
      id: `t${crypto.randomUUID().slice(0, 8)}`,
      clientId: matchedClient?.id || null,
      clientName,
      taskDate: getTodayDateValue(),
      clientCode: formData.get('clientCode').toString().trim(),
      note: formData.get('note').toString().trim()
    };

    if (!task.clientName || !task.clientCode) return;

    state.tasks.push(task);
    saveState();
    renderAll();
    if (task.clientId) renderClientDetail(task.clientId);
    form.reset();
    closeModal('taskModal');
  },

  setTodayDate() {
  }
};
