const express = require('express');
const router = express.Router();
const {
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
  calculateSLA,
  getStatistics,
  STATUS,
  isValidTransition
} = require('../models/session');
const { exportToJSON, exportToCSV } = require('../services/exportService');
const { sendNotification } = require('../services/timeoutChecker');

router.post('/', (req, res) => {
  try {
    const session = createSession(req.body);
    sendNotification('new_session', { sessionId: session.id, customerName: session.customerName });
    res.status(201).json(session);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/', (req, res) => {
  const { status, assignee, category, tag } = req.query;
  const sessions = getSessions({ status, assignee, category, tag });
  res.json(sessions);
});

router.get('/statistics', (req, res) => {
  const { assignee } = req.query;
  const stats = getStatistics(assignee);
  res.json(stats);
});

router.get('/export', (req, res) => {
  const { startDate, endDate, format = 'json' } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({ error: '需要提供 startDate 和 endDate' });
  }
  
  try {
    if (format === 'csv') {
      const csv = exportToCSV(startDate, endDate);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=sessions.csv');
      res.send('\uFEFF' + csv);
    } else {
      const json = exportToJSON(startDate, endDate);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=sessions.json');
      res.send(json);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  const session = getSessionById(req.params.id);
  if (!session) {
    return res.status(404).json({ error: '会话不存在' });
  }
  res.json({
    ...session,
    sla: calculateSLA(session)
  });
});

router.patch('/:id', (req, res) => {
  const session = getSessionById(req.params.id);
  if (!session) {
    return res.status(404).json({ error: '会话不存在' });
  }
  
  if (req.body.category) session.category = req.body.category;
  if (req.body.customerName) session.customerName = req.body.customerName;
  if (req.body.contact) session.contact = req.body.contact;
  
  res.json(session);
});

router.post('/:id/transition', (req, res) => {
  const { newStatus, changedBy, reason } = req.body;
  const session = getSessionById(req.params.id);
  
  if (!session) {
    return res.status(404).json({ error: '会话不存在' });
  }
  
  if (!isValidTransition(session.status, newStatus)) {
    return res.status(409).json({ 
      error: '无效的状态转换',
      currentStatus: session.status,
      requestedStatus: newStatus
    });
  }
  
  try {
    const updated = updateSessionStatus(req.params.id, newStatus, changedBy, reason);
    sendNotification('status_change', {
      sessionId: session.id,
      oldStatus: session.status,
      newStatus,
      changedBy
    });
    res.json(updated);
  } catch (error) {
    res.status(409).json({ error: error.message });
  }
});

router.post('/:id/assign', (req, res) => {
  const { assignee } = req.body;
  const session = assignSession(req.params.id, assignee);
  
  if (!session) {
    return res.status(404).json({ error: '会话不存在' });
  }
  
  sendNotification('assigned', {
    sessionId: session.id,
    assignee,
    customerName: session.customerName
  });
  
  res.json(session);
});

router.post('/:id/transfer', (req, res) => {
  const { newAssignee, reason } = req.body;
  const session = transferSession(req.params.id, newAssignee, reason);
  
  if (!session) {
    return res.status(404).json({ error: '会话不存在' });
  }
  
  sendNotification('transferred', {
    sessionId: session.id,
    newAssignee,
    customerName: session.customerName
  });
  
  res.json(session);
});

router.post('/:id/finish', (req, res) => {
  const session = getSessionById(req.params.id);
  if (!session) {
    return res.status(404).json({ error: '会话不存在' });
  }
  
  try {
    const updated = updateSessionStatus(req.params.id, STATUS.COMPLETED, req.body.changedBy || 'agent', '客服完结会话');
    res.json(updated);
  } catch (error) {
    res.status(409).json({ error: error.message });
  }
});

router.post('/:id/reopen', (req, res) => {
  const session = getSessionById(req.params.id);
  if (!session) {
    return res.status(404).json({ error: '会话不存在' });
  }
  
  try {
    const updated = updateSessionStatus(req.params.id, STATUS.PROCESSING, req.body.changedBy || 'agent', '重新打开会话');
    session.completedAt = null;
    res.json(updated);
  } catch (error) {
    res.status(409).json({ error: error.message });
  }
});

router.post('/:id/messages', (req, res) => {
  const message = addMessage(req.params.id, req.body);
  if (!message) {
    return res.status(404).json({ error: '会话不存在' });
  }
  res.status(201).json(message);
});

router.post('/:id/tags', (req, res) => {
  const { tags } = req.body;
  const session = addTags(req.params.id, tags);
  if (!session) {
    return res.status(404).json({ error: '会话不存在' });
  }
  res.json(session);
});

router.delete('/:id/tags/:tag', (req, res) => {
  const session = removeTag(req.params.id, req.params.tag);
  if (!session) {
    return res.status(404).json({ error: '会话不存在' });
  }
  res.json(session);
});

router.post('/:id/priority', (req, res) => {
  const { priority } = req.body;
  const session = setPriority(req.params.id, priority);
  if (!session) {
    return res.status(404).json({ error: '会话不存在' });
  }
  res.json(session);
});

router.post('/:id/satisfaction', (req, res) => {
  const { rating, comment } = req.body;
  const session = submitSatisfaction(req.params.id, rating, comment);
  if (!session) {
    return res.status(404).json({ error: '会话不存在' });
  }
  res.json(session);
});

router.post('/batch', (req, res) => {
  const { ids, action, payload } = req.body;
  const results = [];
  
  ids.forEach(id => {
    try {
      let session;
      switch (action) {
        case 'finish':
          session = updateSessionStatus(id, STATUS.COMPLETED, payload.changedBy || 'agent', '批量完结');
          break;
        case 'setCategory':
          session = getSessionById(id);
          if (session) session.category = payload.category;
          break;
        case 'transfer':
          session = transferSession(id, payload.newAssignee, payload.reason || '批量转移');
          break;
        case 'assign':
          session = assignSession(id, payload.assignee);
          break;
      }
      if (session) results.push({ id, success: true, session });
    } catch (error) {
      results.push({ id, success: false, error: error.message });
    }
  });
  
  res.json(results);
});

module.exports = router;
