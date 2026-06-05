const STATUS = {
  PENDING: '待分配',
  ASSIGNED: '已分配',
  PROCESSING: '处理中',
  WAITING_CUSTOMER: '待客户回复',
  COMPLETED: '已完结'
};

const CATEGORIES = ['产品咨询', '技术支持', '投诉', '退换货', '其他'];
const PRIORITIES = ['高', '中', '低'];

const VALID_TRANSITIONS = {
  [STATUS.PENDING]: [STATUS.ASSIGNED],
  [STATUS.ASSIGNED]: [STATUS.PENDING, STATUS.PROCESSING],
  [STATUS.PROCESSING]: [STATUS.WAITING_CUSTOMER, STATUS.COMPLETED],
  [STATUS.WAITING_CUSTOMER]: [STATUS.PROCESSING, STATUS.COMPLETED],
  [STATUS.COMPLETED]: [STATUS.PROCESSING]
};

function isValidTransition(currentStatus, newStatus) {
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) || false;
}

let sessions = [];
let sessionIdCounter = 1;
let messageIdCounter = 1;

function generateId() {
  return sessionIdCounter++;
}

function generateMessageId() {
  return messageIdCounter++;
}

function validateCreateSession(data) {
  const errors = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('请求体格式错误');
    return errors;
  }
  
  if (!data.customerName || typeof data.customerName !== 'string' || !data.customerName.trim()) {
    errors.push('客户姓名不能为空');
  } else if (data.customerName.length > 50) {
    errors.push('客户姓名不能超过50个字符');
  }
  
  if (!data.contact || typeof data.contact !== 'string' || !data.contact.trim()) {
    errors.push('联系方式不能为空');
  } else if (data.contact.length > 100) {
    errors.push('联系方式不能超过100个字符');
  }
  
  if (data.contactType && !['手机', '邮箱'].includes(data.contactType)) {
    errors.push('联系方式类型只能是 手机 或 邮箱');
  }
  
  if (data.contactType === '手机' && data.contact) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(data.contact.trim())) {
      errors.push('手机号码格式不正确');
    }
  }
  
  if (data.contactType === '邮箱' && data.contact) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.contact.trim())) {
      errors.push('邮箱格式不正确');
    }
  }
  
  if (data.category && !CATEGORIES.includes(data.category)) {
    errors.push(`分类只能是: ${CATEGORIES.join('、')}`);
  }
  
  if (data.priority && !PRIORITIES.includes(data.priority)) {
    errors.push(`优先级只能是: ${PRIORITIES.join('、')}`);
  }
  
  if (data.tags && !Array.isArray(data.tags)) {
    errors.push('标签必须是数组格式');
  }
  
  if (data.tags && Array.isArray(data.tags)) {
    if (data.tags.length > 10) {
      errors.push('标签数量不能超过10个');
    }
    data.tags.forEach(tag => {
      if (typeof tag !== 'string' || !tag.trim()) {
        errors.push('标签内容不能为空');
      } else if (tag.length > 20) {
        errors.push('单个标签不能超过20个字符');
      }
    });
  }
  
  return errors;
}

function createSession(data) {
  const errors = validateCreateSession(data);
  if (errors.length > 0) {
    const err = new Error(errors.join('; '));
    err.name = 'ValidationError';
    err.errors = errors;
    throw err;
  }
  
  const now = new Date();
  const session = {
    id: generateId(),
    customerName: data.customerName.trim(),
    contact: data.contact.trim(),
    contactType: data.contactType || '手机',
    category: data.category || '其他',
    createdAt: now,
    status: STATUS.PENDING,
    assignee: null,
    assignedAt: null,
    firstResponseAt: null,
    completedAt: null,
    priority: data.priority || '中',
    tags: data.tags ? data.tags.map(t => t.trim()).filter(t => t) : [],
    messages: [],
    statusHistory: [{
      status: STATUS.PENDING,
      changedAt: now,
      changedBy: 'system'
    }],
    satisfaction: null,
    satisfactionSubmitted: false,
    transferredFrom: null,
    transferReason: null
  };
  sessions.push(session);
  return session;
}

function getSessions(filters = {}) {
  let result = [...sessions];
  
  if (filters.status) {
    result = result.filter(s => s.status === filters.status);
  }
  if (filters.assignee) {
    result = result.filter(s => s.assignee === filters.assignee);
  }
  if (filters.category) {
    result = result.filter(s => s.category === filters.category);
  }
  if (filters.tag) {
    result = result.filter(s => s.tags.includes(filters.tag));
  }
  
  result.sort((a, b) => {
    const priorityOrder = { '高': 0, '中': 1, '低': 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  
  return result;
}

function getSessionById(id) {
  return sessions.find(s => s.id === parseInt(id));
}

function updateSessionStatus(sessionId, newStatus, changedBy = 'system', reason = null) {
  const session = getSessionById(sessionId);
  if (!session) return null;
  
  if (!isValidTransition(session.status, newStatus)) {
    throw new Error('INVALID_TRANSITION');
  }
  
  const now = new Date();
  session.status = newStatus;
  session.statusHistory.push({
    status: newStatus,
    changedAt: now,
    changedBy,
    reason
  });
  
  if (newStatus === STATUS.COMPLETED) {
    session.completedAt = now;
  }
  
  return session;
}

function assignSession(sessionId, assignee) {
  const session = getSessionById(sessionId);
  if (!session) return null;
  
  if (!assignee || typeof assignee !== 'string' || !assignee.trim()) {
    const err = new Error('负责人不能为空');
    err.name = 'ValidationError';
    err.errors = ['负责人不能为空'];
    throw err;
  }
  
  const now = new Date();
  session.assignee = assignee.trim();
  session.assignedAt = now;
  
  if (session.status === STATUS.PENDING) {
    return updateSessionStatus(sessionId, STATUS.ASSIGNED, assignee.trim(), '指派会话');
  }
  
  return session;
}

function transferSession(sessionId, newAssignee, reason) {
  const session = getSessionById(sessionId);
  if (!session) return null;
  
  const oldAssignee = session.assignee;
  session.assignee = newAssignee;
  session.transferredFrom = oldAssignee;
  session.transferReason = reason;
  
  const now = new Date();
  addMessage(sessionId, {
    sender: 'system',
    content: `会话已从 ${oldAssignee || '未分配'} 转移给 ${newAssignee}，原因：${reason}`,
    isInternal: true
  });
  
  return session;
}

function addMessage(sessionId, messageData) {
  const session = getSessionById(sessionId);
  if (!session) return null;
  
  if (!messageData || typeof messageData !== 'object') {
    const err = new Error('消息数据格式错误');
    err.name = 'ValidationError';
    err.errors = ['消息数据格式错误'];
    throw err;
  }
  
  const validSenders = ['customer', 'agent', 'system'];
  if (!messageData.sender || !validSenders.includes(messageData.sender)) {
    const err = new Error('消息发送方必须是 customer、agent 或 system');
    err.name = 'ValidationError';
    err.errors = ['消息发送方必须是 customer、agent 或 system'];
    throw err;
  }
  
  if (!messageData.content || typeof messageData.content !== 'string' || !messageData.content.trim()) {
    const err = new Error('消息内容不能为空');
    err.name = 'ValidationError';
    err.errors = ['消息内容不能为空'];
    throw err;
  }
  
  if (messageData.content.length > 2000) {
    const err = new Error('消息内容不能超过2000个字符');
    err.name = 'ValidationError';
    err.errors = ['消息内容不能超过2000个字符'];
    throw err;
  }
  
  const now = new Date();
  const message = {
    id: generateMessageId(),
    sender: messageData.sender,
    senderName: (messageData.senderName || messageData.sender).trim(),
    content: messageData.content.trim(),
    createdAt: now,
    isInternal: messageData.isInternal || false,
    isVoice: messageData.isVoice || false,
    type: messageData.type || 'text'
  };
  
  session.messages.push(message);
  
  if (messageData.sender === 'agent' && !session.firstResponseAt) {
    session.firstResponseAt = now;
  }
  
  if (messageData.sender === 'agent' && session.status === STATUS.ASSIGNED) {
    updateSessionStatus(sessionId, STATUS.PROCESSING, message.senderName, '客服首次回复');
  }
  
  if (messageData.sender === 'customer' && session.status === STATUS.WAITING_CUSTOMER) {
    updateSessionStatus(sessionId, STATUS.PROCESSING, 'customer', '客户回复');
  }
  
  return message;
}

function addTags(sessionId, tags) {
  const session = getSessionById(sessionId);
  if (!session) return null;
  
  tags.forEach(tag => {
    if (!session.tags.includes(tag)) {
      session.tags.push(tag);
    }
  });
  
  return session;
}

function removeTag(sessionId, tag) {
  const session = getSessionById(sessionId);
  if (!session) return null;
  
  session.tags = session.tags.filter(t => t !== tag);
  return session;
}

function setPriority(sessionId, priority) {
  const session = getSessionById(sessionId);
  if (!session) return null;
  
  if (PRIORITIES.includes(priority)) {
    session.priority = priority;
  }
  
  return session;
}

function submitSatisfaction(sessionId, rating, comment = '') {
  const session = getSessionById(sessionId);
  if (!session) return null;
  
  session.satisfaction = { rating, comment, submittedAt: new Date() };
  session.satisfactionSubmitted = true;
  return session;
}

function getCompletedSessions(startDate, endDate) {
  return sessions.filter(s => {
    if (s.status !== STATUS.COMPLETED) return false;
    const completedAt = new Date(s.completedAt);
    return completedAt >= new Date(startDate) && completedAt <= new Date(endDate);
  });
}

function calculateSLA(session) {
  const createdAt = new Date(session.createdAt);
  const firstResponseAt = session.firstResponseAt ? new Date(session.firstResponseAt) : null;
  const completedAt = session.completedAt ? new Date(session.completedAt) : null;
  
  return {
    responseTime: firstResponseAt 
      ? Math.round((firstResponseAt - createdAt) / 1000 / 60) 
      : null,
    totalHandleTime: completedAt
      ? Math.round((completedAt - createdAt) / 1000 / 60)
      : null
  };
}

function getStatistics(assignee = null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todaySessions = sessions.filter(s => new Date(s.createdAt) >= today);
  const agentSessions = assignee 
    ? sessions.filter(s => s.assignee === assignee)
    : sessions;
  
  const completedToday = agentSessions.filter(s => 
    s.status === STATUS.COMPLETED && 
    s.completedAt && 
    new Date(s.completedAt) >= today
  );
  
  const handleTimes = completedToday
    .map(s => calculateSLA(s).totalHandleTime)
    .filter(t => t !== null);
  
  return {
    todayNew: todaySessions.length,
    processing: sessions.filter(s => s.status === STATUS.PROCESSING).length,
    waitingCustomer: sessions.filter(s => s.status === STATUS.WAITING_CUSTOMER).length,
    todayProcessed: completedToday.length,
    avgHandleTime: handleTimes.length 
      ? Math.round(handleTimes.reduce((a, b) => a + b, 0) / handleTimes.length)
      : 0,
    myProcessing: agentSessions.filter(s => s.status === STATUS.PROCESSING).length,
    myAssigned: agentSessions.filter(s => s.status === STATUS.ASSIGNED).length,
    myWaiting: agentSessions.filter(s => s.status === STATUS.WAITING_CUSTOMER).length,
    myCompleted: agentSessions.filter(s => s.status === STATUS.COMPLETED).length
  };
}

module.exports = {
  STATUS,
  CATEGORIES,
  PRIORITIES,
  VALID_TRANSITIONS,
  isValidTransition,
  createSession,
  getSessions,
  getSessionById,
  updateSessionStatus,
  assignSession,
  transferSession,
  addMessage,
  addTags,
  removeTag,
  setPriority,
  submitSatisfaction,
  getCompletedSessions,
  calculateSLA,
  getStatistics,
  sessions
};
