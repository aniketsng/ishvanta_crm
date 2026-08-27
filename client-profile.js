window.ClientProfile = {
  render({ container, client, recentCalls, clientRelations, getInitials }) {
    if (!client) {
      container.classList.remove('hidden');
      container.innerHTML = `
        <div class="detail-panel profile-skeleton" aria-label="Select a client to view profile">
          <div class="skeleton-header">
            <span class="skeleton-avatar"></span>
            <div class="skeleton-copy">
              <span class="skeleton-line skeleton-line--short"></span>
              <span class="skeleton-line"></span>
              <span class="skeleton-line skeleton-line--tiny"></span>
            </div>
          </div>
          <div class="skeleton-grid">
            <span class="skeleton-box"></span>
            <span class="skeleton-box"></span>
          </div>
          <span class="skeleton-section"></span>
        </div>
      `;
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
              ${client.clientCode ? `<span class="client-code">Code: ${client.clientCode}</span>` : ''}
              <div class="tag-list">
                <span class="tag">${client.relationType}</span>
                <span class="tag">${client.status}</span>
              </div>
            </div>
          </div>
          <div class="detail-actions">
            <button class="primary-btn" data-open-modal="callModal" data-call-client="${client.id}">+ Add call</button>
            <button class="secondary-btn" data-open-modal="editClientModal" data-edit-client="${client.id}">Edit</button>
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

        <div class="detail-body detail-body--full">
          <div class="detail-section">
            <h4>Call activity</h4>
            <div class="detail-list">
              ${recentCalls.length ? recentCalls.map((call) => `
                <div class="call-activity-item">
                  <div class="call-activity-summary">
                    <span>${call.callDate} · ${call.callType}</span>
                    <strong>${call.outcome}</strong>
                  </div>
                  <div class="call-activity-follow-up">
                    <span>Next follow-up</span>
                    <strong>${call.nextFollowUp || 'Not scheduled'}</strong>
                  </div>
                </div>
              `).join('') : '<div class="list-item"><span>No calls yet</span><strong>-</strong></div>'}
            </div>
          </div>
        </div>
      </div>
    `;
  }
};
