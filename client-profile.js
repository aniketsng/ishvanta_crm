window.ClientProfile = {
  render({ container, client, recentCalls, clientRelations, getInitials }) {
    if (!client) {
      container.classList.add('hidden');
      container.innerHTML = '';
      return;
    }

    container.classList.remove('hidden');
    container.innerHTML = `
      <div class="detail-panel">
        <div class="detail-header">
          <div class="detail-meta">
            <div class="avatar">${getInitials(client.name)}</div>
            <div>
              <p class="eyebrow">Client profile</p>
              <h3>${client.name}</h3>
              <div class="tag-list">
                <span class="tag">${client.relationType}</span>
                <span class="tag">${client.status}</span>
              </div>
            </div>
          </div>
          <div class="detail-actions">
            <button class="secondary-btn" data-open-modal="editClientModal" data-edit-client="${client.id}">Edit</button>
            <button class="primary-btn" data-open-modal="callModal" data-call-client="${client.id}">+ Add call</button>
            <button class="danger-btn" type="button" data-delete-client="${client.id}">Delete client</button>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-box">
            <span>Company</span>
            <strong>${client.company || 'Not provided'}</strong>
          </div>
          <div class="detail-box">
            <span>Phone</span>
            <strong>${client.phone || 'Not provided'}</strong>
          </div>
        </div>

        <div class="detail-body">
          <div class="detail-section">
            <h4>Contact details</h4>
            <div class="detail-list">
              <div class="list-item"><span>Last call</span><strong>${recentCalls[0]?.callDate || 'No call yet'}</strong></div>
              <div class="list-item"><span>Notes</span><strong>${client.notes || 'No notes'}</strong></div>
            </div>
          </div>

          <div class="detail-section">
            <h4>Relationship</h4>
            <div class="detail-list">
              ${clientRelations.length ? clientRelations.map((relation) => `
                <div class="list-item">
                  <span>${relation.relationType}</span>
                  <strong>${relation.status}</strong>
                </div>
              `).join('') : '<div class="list-item"><span>No relation</span><strong>-</strong></div>'}
            </div>
          </div>
        </div>

        <div class="detail-body">
          <div class="detail-section">
            <h4>Recent calls</h4>
            <div class="detail-list">
              ${recentCalls.length ? recentCalls.map((call) => `
                <div class="list-item">
                  <span>${call.callDate} · ${call.callType}</span>
                  <strong>${call.outcome}</strong>
                </div>
              `).join('') : '<div class="list-item"><span>No calls yet</span><strong>-</strong></div>'}
            </div>
          </div>

          <div class="detail-section">
            <h4>Next follow-up</h4>
            <div class="detail-list">
              ${recentCalls.length ? recentCalls.map((call) => `
                <div class="list-item">
                  <span>${call.callType}</span>
                  <strong>${call.nextFollowUp || 'No follow-up'}</strong>
                </div>
              `).join('') : '<div class="list-item"><span>No follow-up</span><strong>-</strong></div>'}
            </div>
          </div>
        </div>
      </div>
    `;
  }
};
