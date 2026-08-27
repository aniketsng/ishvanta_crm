const STORAGE_KEY = 'client-contact-crm-v1';
const THEME_STORAGE_KEY = 'client-contact-crm-theme';
const BACKUP_PASSWORD_KEY = 'client-contact-crm-backup-password-v1';
const BACKUP_SESSION_KEY = 'client-contact-crm-backup-session-v1';
const AUTO_BACKUP_KEY = 'client-contact-crm-auto-backup-v1';
const BACKUP_FORMAT = 'client-contact-crm-encrypted-backup-v1';
const PBKDF2_ITERATIONS = 150000;

const defaultState = {
  clients: [
    {
      id: 'c1',
      name: 'Nadia Wilson',
      company: 'Peak Advisory',
      phone: '+1 (415) 310-1101',
      email: 'nadia@peakadvisory.com',
      address: '125 Market St, San Francisco, CA 94103',
      relationType: 'Customer',
      status: 'Active',
      notes: 'Prefers calls in the morning and likes clear summaries.'
    },
    {
      id: 'c2',
      name: 'Marcus Lee',
      company: 'Harbor Partners',
      phone: '+1 (212) 540-2210',
      email: 'marcus@harborpartners.com',
      address: '88 Hudson Ave, New York, NY 10013',
      relationType: 'Partner',
      status: 'Warm',
      notes: 'Strong relationship and recurring collaboration.'
    }
  ],
  calls: [
    {
      id: 'l1',
      clientId: 'c1',
      callType: 'Outgoing',
      callDate: '2026-08-03',
      outcome: 'Interested in service renewal',
      nextFollowUp: '2026-08-10',
      notes: 'Requested a written update before final decision.'
    },
    {
      id: 'l2',
      clientId: 'c2',
      callType: 'Follow-up',
      callDate: '2026-08-05',
      outcome: 'Meeting scheduled',
      nextFollowUp: '2026-08-12',
      notes: 'Discussed future collaboration and onboarding steps.'
    }
  ],
  relations: [
    {
      id: 'r1',
      clientId: 'c1',
      relationType: 'Customer',
      status: 'Strong',
      notes: 'Looks for quick responses and personalized updates.'
    },
    {
      id: 'r2',
      clientId: 'c2',
      relationType: 'Partner',
      status: 'Developing',
      notes: 'Potential for expanded business relationship.'
    }
  ],
  tasks: [],
  backups: [
    {
      id: 'b1',
      exportedAt: new Date().toISOString(),
      label: 'Initial client CRM baseline'
    }
  ]
};

const state = loadState();
let selectedClientId = state.clients[0]?.id || null;

const elements = {
  clientCount: document.querySelector('#clientCount'),
  callCount: document.querySelector('#callCount'),
  followupCount: document.querySelector('#followupCount'),
  relationCount: document.querySelector('#relationCount'),
  clientsList: document.querySelector('#clientsList'),
  callsList: document.querySelector('#callsList'),
  relationsList: document.querySelector('#relationsList'),
  clientDetailsContainer: document.querySelector('#clientDetailsContainer'),
  dailyTasksList: document.querySelector('#dailyTasksList'),
  backupList: document.querySelector('#backupList'),
  clientsSummary: document.querySelector('#clientsSummary'),
  globalSearch: document.querySelector('#globalSearch'),
  actionBtn: document.querySelector('#actionBtn'),
  actionMenu: document.querySelector('#actionMenu'),
  themeToggleBtn: document.querySelector('#themeToggleBtn'),
  backupBtn: document.querySelector('#backupBtn'),
  restoreInput: document.querySelector('#restoreInput')
};

const modals = {
  clientModal: document.querySelector('#clientModal'),
  editClientModal: document.querySelector('#editClientModal'),
  callModal: document.querySelector('#callModal'),
  taskModal: document.querySelector('#taskModal'),
  relationModal: document.querySelector('#relationModal'),
  passwordModal: document.querySelector('#passwordModal')
};

let backupPassword = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getTodayDateValue() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

function resetDailyTasks(tasks) {
  const today = getTodayDateValue();
  return tasks.map((task) => {
    if (task.completedOn !== today) {
      return { ...task, taskDate: today, completed: false };
    }

    return task;
  });
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return clone(defaultState);
    }

    const parsed = JSON.parse(raw);
    return {
      clients: Array.isArray(parsed.clients) ? parsed.clients : [],
      calls: Array.isArray(parsed.calls) ? parsed.calls : [],
      relations: Array.isArray(parsed.relations) ? parsed.relations : [],
      tasks: resetDailyTasks(Array.isArray(parsed.tasks) ? parsed.tasks : []),
      backups: Array.isArray(parsed.backups) ? parsed.backups : []
    };
  } catch (error) {
    console.error('Unable to read local storage:', error);
    return clone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  saveAutomaticBackup();
}

function getBackupPayload(exportedAt = new Date().toISOString()) {
  return {
    exportedAt,
    clients: state.clients,
    calls: state.calls,
    relations: state.relations,
    tasks: state.tasks
  };
}

async function saveAutomaticBackup() {
  if (!backupPassword) return;

  try {
    const encryptedPayload = await encryptBackup(getBackupPayload(), backupPassword);
    localStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify(encryptedPayload));
  } catch (error) {
    console.error('Unable to create automatic backup:', error);
  }
}

function bytesToBase64(bytes) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function derivePasswordBytes(password, salt) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  return new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    material,
    256
  ));
}

async function createPasswordRecord(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const verifier = await derivePasswordBytes(password, salt);
  return { salt: bytesToBase64(salt), verifier: bytesToBase64(verifier) };
}

async function passwordMatches(password, record) {
  const verifier = await derivePasswordBytes(password, base64ToBytes(record.salt));
  const expected = base64ToBytes(record.verifier);
  return verifier.length === expected.length && verifier.every((byte, index) => byte === expected[index]);
}

async function encryptBackup(payload, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const passwordBytes = await derivePasswordBytes(password, salt);
  const key = await crypto.subtle.importKey('raw', passwordBytes, 'AES-GCM', false, ['encrypt']);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(payload))
  );

  return {
    format: BACKUP_FORMAT,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(encrypted))
  };
}

async function decryptBackup(encryptedBackup, password) {
  if (encryptedBackup?.format !== BACKUP_FORMAT) {
    throw new Error('Unsupported backup format');
  }

  const passwordBytes = await derivePasswordBytes(password, base64ToBytes(encryptedBackup.salt));
  const key = await crypto.subtle.importKey('raw', passwordBytes, 'AES-GCM', false, ['decrypt']);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(encryptedBackup.iv) },
    key,
    base64ToBytes(encryptedBackup.data)
  );
  return JSON.parse(new TextDecoder().decode(decrypted));
}

function showPasswordModal(mode) {
  const isSetup = mode === 'setup';
  document.querySelector('#passwordModalTitle').textContent = isSetup ? 'Protect your backups' : 'Unlock your backups';
  document.querySelector('#passwordModalMessage').textContent = isSetup
    ? 'Create a password for backup files downloaded to this device.'
    : 'Enter your backup password to enable encrypted backup downloads.';
  document.querySelector('#passwordConfirmField').classList.toggle('hidden', !isSetup);
  document.querySelector('#passwordForm input[name="confirmPassword"]').disabled = !isSetup;
  document.querySelector('#passwordForm input[name="password"]').setAttribute('autocomplete', isSetup ? 'new-password' : 'current-password');
  document.querySelector('#passwordSubmitBtn').textContent = isSetup ? 'Set password' : 'Unlock backups';
  document.querySelector('#passwordError').classList.add('hidden');
  document.querySelector('#passwordForm').dataset.mode = mode;
  openModal('passwordModal');
}

async function initializeBackupSecurity() {
  const passwordRecord = localStorage.getItem(BACKUP_PASSWORD_KEY);
  const sessionPassword = sessionStorage.getItem(BACKUP_SESSION_KEY);

  if (passwordRecord && sessionPassword && await passwordMatches(sessionPassword, JSON.parse(passwordRecord))) {
    backupPassword = sessionPassword;
    return;
  }

  sessionStorage.removeItem(BACKUP_SESSION_KEY);
  showPasswordModal(passwordRecord ? 'unlock' : 'setup');
}

function applyTheme(themeName) {
  const theme = themeName === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);

  if (elements.themeToggleBtn) {
    elements.themeToggleBtn.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
  }
}

function getClientName(clientId) {
  const client = state.clients.find((item) => item.id === clientId);
  return client ? client.name : 'Unknown client';
}

function getInitials(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'C';
}

function updateCounts() {
  if (elements.clientCount) elements.clientCount.textContent = state.clients.length;
  if (elements.callCount) elements.callCount.textContent = state.calls.length;
  if (elements.followupCount) elements.followupCount.textContent = state.calls.filter((call) => call.nextFollowUp).length;
  if (elements.relationCount) elements.relationCount.textContent = state.relations.length;
  if (elements.clientsSummary) elements.clientsSummary.textContent = `${state.clients.length} active contacts`;
}

function renderClientDetail(clientId) {
  const client = state.clients.find((item) => item.id === clientId);
  if (!client) {
    elements.clientDetailsContainer.classList.add('hidden');
    elements.clientDetailsContainer.innerHTML = '';
    return;
  }

  selectedClientId = clientId;
  const recentCalls = state.calls.filter((call) => call.clientId === client.id).slice(0, 4);
  const clientRelations = state.relations.filter((relation) => relation.clientId === client.id);

  ClientProfile.render({
    container: elements.clientDetailsContainer,
    client,
    recentCalls,
    clientRelations,
    getInitials
  });
}

function renderClients() {
  const query = elements.globalSearch.value.trim().toLowerCase();
  const layout = document.querySelector('.layout');
  ClientProfile.render({
    container: elements.clientDetailsContainer,
    client: null
  });

  if (!query) {
    layout.classList.add('client-results-collapsed');
    elements.clientsList.classList.add('hidden');
    elements.clientsList.innerHTML = '';
    return;
  }

  layout.classList.remove('client-results-collapsed');
  elements.clientsList.classList.remove('hidden');

  const filtered = state.clients.filter((client) => {
    const haystack = [
      client.name,
      client.company,
      client.address,
      client.phone,
      client.email,
      client.clientCode,
      client.relationType,
      client.notes
    ].join(' ').toLowerCase();
    return haystack.includes(query);
  });

  if (!filtered.length) {
    elements.clientsList.innerHTML = '<div class="empty-state">No client records match your current search.</div>';
    return;
  }

  elements.clientsList.innerHTML = filtered
    .map(
      (client) => `
        <article class="client-card ${selectedClientId === client.id ? 'active' : ''}" data-client-detail="${client.id}">
          <div class="client-top">
            <div class="avatar">${getInitials(client.name)}</div>
            <div>
              <h3>${client.name}</h3>
              <p class="client-role">${client.company || 'Individual client'}</p>
            </div>
          </div>
          <div class="tag-list">
            <span class="tag">${client.status}</span>
            <span class="tag">${client.relationType}</span>
          </div>
          <ul class="meta-list">
            <li>Phone: ${client.phone || 'Phone not listed'}</li>
          </ul>
        </article>
      `
    )
    .join('');
}

function renderDailyTasks() {
  const today = getTodayDateValue();
  const dateParts = today.split('-');
  const dailyTasksDate = document.querySelector('#dailyTasksDate');
  if (dailyTasksDate) {
    dailyTasksDate.textContent = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
  }

  DailyTasks.render({
    container: elements.dailyTasksList,
    tasks: state.tasks,
    getClientName,
    onChange(taskId, completed) {
      const task = state.tasks.find((item) => item.id === taskId);
      if (!task) return;

      task.completed = completed;
      task.completedOn = completed ? getTodayDateValue() : null;
      saveState();
      renderDailyTasks();
    },
    onDelete(taskId) {
      state.tasks = state.tasks.filter((item) => item.id !== taskId);
      saveState();
      renderDailyTasks();
    }
  });
}

function renderCalls() {
  const query = elements.globalSearch.value.trim().toLowerCase();
  const filtered = state.calls.filter((call) => {
    if (!query) return true;
    const haystack = [
      getClientName(call.clientId),
      call.callType,
      call.outcome,
      call.notes,
      call.nextFollowUp
    ].join(' ').toLowerCase();
    return haystack.includes(query);
  });

  if (!filtered.length) {
    elements.callsList.innerHTML = '<div class="empty-state">No call history recorded yet.</div>';
    return;
  }

  elements.callsList.innerHTML = filtered
    .map(
      (call) => `
        <div class="call-row">
          <div><strong>${getClientName(call.clientId)}</strong></div>
          <div>${call.callType}</div>
          <div>${call.callDate}</div>
          <div>${call.outcome}</div>
          <div>${call.nextFollowUp || '—'}</div>
        </div>
      `
    )
    .join('');
}

function renderRelations() {
  if (!elements.relationsList) return;

  const query = elements.globalSearch.value.trim().toLowerCase();
  const filtered = state.relations.filter((relation) => {
    if (!query) return true;
    const haystack = [
      getClientName(relation.clientId),
      relation.relationType,
      relation.status,
      relation.notes
    ].join(' ').toLowerCase();
    return haystack.includes(query);
  });

  if (!filtered.length) {
    elements.relationsList.innerHTML = '<div class="empty-state">No relationship records found.</div>';
    return;
  }

  elements.relationsList.innerHTML = filtered
    .map(
      (relation) => `
        <article class="relation-card">
          <div class="relation-header">
            <div>
              <strong>${getClientName(relation.clientId)}</strong><br />
              <small>${relation.relationType}</small>
            </div>
            <span class="badge ${relation.status.toLowerCase().replace(/\s+/g, '-')}">${relation.status}</span>
          </div>
          <p>${relation.notes || 'No notes'}</p>
        </article>
      `
    )
    .join('');
}

function renderBackups() {
  if (!elements.backupList) return;

  if (!state.backups.length) {
    elements.backupList.innerHTML = '<div class="empty-state">No backup snapshots saved yet.</div>';
    return;
  }

  elements.backupList.innerHTML = state.backups
    .slice()
    .reverse()
    .map(
      (backup) => `
        <div class="backup-entry">
          <div>
            <strong>${backup.label || 'Backup export'}</strong><br />
            <small>${new Date(backup.exportedAt).toLocaleString()}</small>
          </div>
          <button class="secondary-btn" data-download="${backup.id}">Download</button>
        </div>
      `
    )
    .join('');

  elements.backupList.querySelectorAll('[data-download]').forEach((button) => {
    button.addEventListener('click', async () => {
      const backup = state.backups.find((item) => item.id === button.dataset.download);
      if (!backup || !backupPassword) return;

      const payload = getBackupPayload(backup.exportedAt);

      const encryptedPayload = await encryptBackup(payload, backupPassword);
      const blob = new Blob([JSON.stringify(encryptedPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `client-crm-backup-${new Date(backup.exportedAt).toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    });
  });
}

function renderSelectOptions() {
  const clientOptions = state.clients
    .map((client) => `<option value="${client.id}">${client.name}</option>`)
    .join('');

  document.querySelector('#callClientSelect').innerHTML = clientOptions || '<option value="">No clients available</option>';
  document.querySelector('#relationClientSelect').innerHTML = clientOptions || '<option value="">No clients available</option>';
}

function renderAll() {
  updateCounts();
  renderClients();
  renderDailyTasks();
  renderCalls();
  if (elements.relationsList) renderRelations();
  if (elements.backupList) renderBackups();
  renderSelectOptions();
}

function openModal(modalId) {
  const modal = modals[modalId];
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal(modalId) {
  const modal = modals[modalId];
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

function handleClientSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const client = {
    id: `c${crypto.randomUUID().slice(0, 8)}`,
    name: formData.get('name').toString().trim(),
    company: formData.get('company').toString().trim(),
    phone: formData.get('phone').toString().trim(),
    email: formData.get('email').toString().trim(),
    clientCode: formData.get('clientCode').toString().trim(),
    address: formData.get('address').toString().trim(),
    relationType: formData.get('relationType').toString(),
    status: formData.get('status').toString(),
    notes: formData.get('notes').toString().trim()
  };

  if (!client.name) return;

  state.clients.push(client);
  state.relations.push({
    id: `r${crypto.randomUUID().slice(0, 8)}`,
    clientId: client.id,
    relationType: client.relationType,
    status: 'Developing',
    notes: client.notes || 'New relationship added.'
  });

  saveState();
  renderAll();
  form.reset();
  closeModal('clientModal');
}

function handleEditClientSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const clientId = formData.get('id').toString();
  const client = state.clients.find((c) => c.id === clientId);

  if (!client) return;

  client.name = formData.get('name').toString().trim();
  client.company = formData.get('company').toString().trim();
  client.phone = formData.get('phone').toString().trim();
  client.email = formData.get('email').toString().trim();
  client.clientCode = formData.get('clientCode').toString().trim();
  client.address = formData.get('address').toString().trim();
  client.relationType = formData.get('relationType').toString();
  client.status = formData.get('status').toString();
  client.notes = formData.get('notes').toString().trim();

  saveState();
  renderAll();
  renderClientDetail(clientId);
  form.reset();
  closeModal('editClientModal');
}

function handleDeleteClient(clientId) {
  const client = state.clients.find((item) => item.id === clientId);
  if (!client) return;

  const confirmed = window.confirm(`Delete ${client.name} and all of their calling data?`);
  if (!confirmed) return;

  state.clients = state.clients.filter((item) => item.id !== clientId);
  state.calls = state.calls.filter((call) => call.clientId !== clientId);
  state.tasks = state.tasks.filter((task) => task.clientId !== clientId);
  state.relations = state.relations.filter((relation) => relation.clientId !== clientId);
  selectedClientId = state.clients[0]?.id || null;

  saveState();
  renderAll();
  renderClientDetail(selectedClientId);
}

function handleCallSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const call = {
    id: `l${crypto.randomUUID().slice(0, 8)}`,
    clientId: formData.get('clientId').toString(),
    callType: formData.get('callType').toString(),
    callDate: formData.get('callDate').toString(),
    outcome: formData.get('outcome').toString().trim(),
    nextFollowUp: formData.get('nextFollowUp').toString(),
    notes: formData.get('notes').toString().trim()
  };

  if (!call.clientId || !call.outcome || !call.callDate) return;

  state.calls.push(call);
  saveState();
  renderAll();
  if (selectedClientId) {
    renderClientDetail(selectedClientId);
  }
  form.reset();
  closeModal('callModal');
}

function handleRelationSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const relation = {
    id: `r${crypto.randomUUID().slice(0, 8)}`,
    clientId: formData.get('clientId').toString(),
    relationType: formData.get('relationType').toString(),
    status: formData.get('status').toString(),
    notes: formData.get('notes').toString().trim()
  };

  if (!relation.clientId) return;

  state.relations.push(relation);
  saveState();
  renderAll();
  form.reset();
  closeModal('relationModal');
}

async function createBackup() {
  if (!backupPassword) return;

  const label = `Manual backup ${new Date().toLocaleString()}`;
  const backupRecord = {
    id: `b${crypto.randomUUID().slice(0, 8)}`,
    exportedAt: new Date().toISOString(),
    label
  };

  state.backups.push(backupRecord);
  saveState();
  renderAll();

  const payload = getBackupPayload(backupRecord.exportedAt);

  const encryptedPayload = await encryptBackup(payload, backupPassword);
  const blob = new Blob([JSON.stringify(encryptedPayload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `client-crm-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function restoreBackup(file) {
  const reader = new FileReader();
  reader.onload = async function () {
    try {
      const encryptedBackup = JSON.parse(String(reader.result));
      const password = window.prompt('Enter the backup password to restore this file:');
      if (!password) return;

      const parsed = await decryptBackup(encryptedBackup, password);
      if (!parsed || !Array.isArray(parsed.clients)) {
        throw new Error('Invalid backup structure');
      }

      state.clients = parsed.clients || [];
      state.calls = parsed.calls || [];
      state.relations = parsed.relations || [];
      state.tasks = resetDailyTasks(Array.isArray(parsed.tasks) ? parsed.tasks : []);
      state.backups.push({
        id: `b${crypto.randomUUID().slice(0, 8)}`,
        exportedAt: new Date().toISOString(),
        label: `Restore ${file.name}`
      });

      saveState();
      renderAll();
      alert('Backup restored successfully.');
    } catch (error) {
      console.error(error);
      alert('Could not restore the selected file. Check the backup password and choose a valid encrypted CRM backup.');
    }
  };
  reader.readAsText(file);
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((tab) => tab.classList.remove('active'));
      document.querySelectorAll('.view').forEach((view) => view.classList.remove('active'));
      button.classList.add('active');
      document.getElementById(button.dataset.view).classList.add('active');
    });
  });
}

function setupModalControls() {
  document.querySelectorAll('[data-open-modal]').forEach((button) => {
    button.addEventListener('click', () => {
      const targetModal = button.dataset.openModal;
      const callClientId = button.dataset.callClient;
      const editClientId = button.dataset.editClient;
      const taskClientId = button.dataset.taskClient;



      if (targetModal === 'editClientModal' && editClientId) {
        const client = state.clients.find((c) => c.id === editClientId);
        if (client) {
          document.querySelector('#editClientId').value = client.id;
          document.querySelector('#editClientForm input[name="name"]').value = client.name;
          document.querySelector('#editClientForm input[name="company"]').value = client.company || '';
          document.querySelector('#editClientForm input[name="phone"]').value = client.phone || '';
          document.querySelector('#editClientForm input[name="email"]').value = client.email || '';
          document.querySelector('#editClientForm input[name="clientCode"]').value = client.clientCode || '';
          document.querySelector('#editClientForm input[name="address"]').value = client.address || '';
          document.querySelector('#editClientForm select[name="relationType"]').value = client.relationType;
          document.querySelector('#editClientForm select[name="status"]').value = client.status;
          document.querySelector('#editClientForm textarea[name="notes"]').value = client.notes || '';
        }
      }

      if (targetModal === 'callModal') {
        const clientIdToSelect = callClientId || selectedClientId;
        const callSelect = document.querySelector('#callClientSelect');
        if (callSelect && clientIdToSelect) {
          callSelect.value = clientIdToSelect;
        }

        const callDateInput = document.querySelector('#callForm input[name="callDate"]');
        if (callDateInput) {
          callDateInput.value = getTodayDateValue();
        }
      }

      if (targetModal === 'taskModal' && (taskClientId || button.dataset.addTaskSelected)) {
        const taskClientInput = document.querySelector('#taskForm input[name="clientName"]');
        if (taskClientInput) {
          taskClientInput.value = '';
        }
      }

      openModal(targetModal);
    });
  });

  document.querySelectorAll('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', () => closeModal(button.dataset.closeModal));
  });

  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        modal.classList.add('hidden');
      }
    });
  });
}

function setupEventHandlers() {
  setupTabs();
  setupModalControls();

  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'light';
  applyTheme(savedTheme);

  if (elements.actionBtn && elements.actionMenu) {
    elements.actionBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      elements.actionMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.action-menu-wrap')) {
        elements.actionMenu.classList.add('hidden');
      }
    });
  }

  if (elements.themeToggleBtn) {
    elements.themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
      if (elements.actionMenu) elements.actionMenu.classList.add('hidden');
    });
  }

  elements.clientsList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-client-detail]');
    if (!button) return;

    selectedClientId = button.dataset.clientDetail;
    renderClients();
    elements.clientsList.querySelectorAll('[data-client-detail]').forEach((card) => {
      if (card.dataset.clientDetail !== selectedClientId) {
        card.classList.add('hidden');
      }
    });
    renderDailyTasks();
    renderClientDetail(selectedClientId);
    renderCalls();
    elements.globalSearch.value = '';
    elements.clientsList.innerHTML = '';
    elements.clientsList.classList.add('hidden');
    document.querySelector('.layout').classList.add('client-results-collapsed');
  });

  elements.clientDetailsContainer.addEventListener('click', (event) => {
    const deleteButton = event.target.closest('[data-delete-client]');
    if (deleteButton) {
      handleDeleteClient(deleteButton.dataset.deleteClient);
      return;
    }

    const button = event.target.closest('[data-open-modal]');
    if (!button) return;

    const targetModal = button.dataset.openModal;
    if (targetModal === 'taskModal') {
      const taskClientInput = document.querySelector('#taskForm input[name="clientName"]');
      if (taskClientInput) taskClientInput.value = '';
    }

    openModal(targetModal);
  });

  document.querySelector('#clientForm').addEventListener('submit', handleClientSubmit);
  document.querySelector('#editClientForm').addEventListener('submit', handleEditClientSubmit);
  document.querySelector('#editClientForm').addEventListener('click', (event) => {
    const deleteButton = event.target.closest('[data-delete-client]');
    if (!deleteButton) return;

    event.preventDefault();
    const clientId = document.querySelector('#editClientId').value;
    closeModal('editClientModal');
    handleDeleteClient(clientId);
  });
  document.querySelector('#callForm').addEventListener('submit', handleCallSubmit);
  document.querySelector('#taskForm').addEventListener('submit', (event) => {
    DailyTasks.handleSubmit(event, {
      state,
      saveState,
      renderAll,
      renderClientDetail,
      closeModal,
      getTodayDateValue
    });
  });
  document.querySelector('#relationForm').addEventListener('submit', handleRelationSubmit);
  document.querySelector('#passwordForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const password = new FormData(form).get('password').toString();
    const error = document.querySelector('#passwordError');

    if (form.dataset.mode === 'setup') {
      const confirmation = new FormData(form).get('confirmPassword').toString();
      if (password !== confirmation) {
        error.textContent = 'Passwords do not match.';
        error.classList.remove('hidden');
        return;
      }

      localStorage.setItem(BACKUP_PASSWORD_KEY, JSON.stringify(await createPasswordRecord(password)));
      backupPassword = password;
      sessionStorage.setItem(BACKUP_SESSION_KEY, password);
      await saveAutomaticBackup();
      form.reset();
      closeModal('passwordModal');
      return;
    }

    const passwordRecord = JSON.parse(localStorage.getItem(BACKUP_PASSWORD_KEY));
    if (!(await passwordMatches(password, passwordRecord))) {
      error.textContent = 'Incorrect backup password.';
      error.classList.remove('hidden');
      return;
    }

    backupPassword = password;
    sessionStorage.setItem(BACKUP_SESSION_KEY, password);
    await saveAutomaticBackup();
    form.reset();
    closeModal('passwordModal');
  });
  elements.globalSearch.addEventListener('input', renderAll);

  if (elements.backupBtn) {
    elements.backupBtn.addEventListener('click', () => {
      createBackup();
      if (elements.actionMenu) elements.actionMenu.classList.add('hidden');
    });
  }

  if (elements.restoreInput) {
    elements.restoreInput.addEventListener('change', (event) => {
      const [file] = event.target.files;
      if (file) {
        restoreBackup(file);
        event.target.value = '';
        if (elements.actionMenu) elements.actionMenu.classList.add('hidden');
      }
    });
  }
}

renderAll();
setupEventHandlers();
initializeBackupSecurity();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}
