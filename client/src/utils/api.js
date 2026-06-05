const API_BASE = '/api';

async function request(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

export const api = {
  getConfig: () => request('/config'),
  
  getSessions: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return request(`/sessions${params ? `?${params}` : ''}`);
  },
  
  getSession: (id) => request(`/sessions/${id}`),
  
  createSession: (data) => request('/sessions', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  updateSession: (id, data) => request(`/sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  
  transitionStatus: (id, newStatus, changedBy, reason) => request(`/sessions/${id}/transition`, {
    method: 'POST',
    body: JSON.stringify({ newStatus, changedBy, reason })
  }),
  
  assignSession: (id, assignee) => request(`/sessions/${id}/assign`, {
    method: 'POST',
    body: JSON.stringify({ assignee })
  }),
  
  transferSession: (id, newAssignee, reason) => request(`/sessions/${id}/transfer`, {
    method: 'POST',
    body: JSON.stringify({ newAssignee, reason })
  }),
  
  finishSession: (id, changedBy) => request(`/sessions/${id}/finish`, {
    method: 'POST',
    body: JSON.stringify({ changedBy })
  }),
  
  reopenSession: (id, changedBy) => request(`/sessions/${id}/reopen`, {
    method: 'POST',
    body: JSON.stringify({ changedBy })
  }),
  
  addMessage: (id, messageData) => request(`/sessions/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify(messageData)
  }),
  
  addTags: (id, tags) => request(`/sessions/${id}/tags`, {
    method: 'POST',
    body: JSON.stringify({ tags })
  }),
  
  removeTag: (id, tag) => request(`/sessions/${id}/tags/${tag}`, {
    method: 'DELETE'
  }),
  
  setPriority: (id, priority) => request(`/sessions/${id}/priority`, {
    method: 'POST',
    body: JSON.stringify({ priority })
  }),
  
  submitSatisfaction: (id, rating, comment) => request(`/sessions/${id}/satisfaction`, {
    method: 'POST',
    body: JSON.stringify({ rating, comment })
  }),
  
  batchAction: (ids, action, payload) => request('/sessions/batch', {
    method: 'POST',
    body: JSON.stringify({ ids, action, payload })
  }),
  
  getStatistics: (assignee) => {
    const params = assignee ? `?assignee=${assignee}` : '';
    return request(`/sessions/statistics${params}`);
  },
  
  exportSessions: (startDate, endDate, format = 'json') => {
    window.open(`${API_BASE}/sessions/export?startDate=${startDate}&endDate=${endDate}&format=${format}`, '_blank');
  }
};
