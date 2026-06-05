const { getCompletedSessions, calculateSLA } = require('../models/session');

function exportToJSON(startDate, endDate) {
  const sessions = getCompletedSessions(startDate, endDate);
  return JSON.stringify(sessions.map(s => ({
    ...s,
    sla: calculateSLA(s)
  })), null, 2);
}

function exportToCSV(startDate, endDate) {
  const sessions = getCompletedSessions(startDate, endDate);
  
  const headers = [
    '会话ID',
    '客户姓名',
    '联系方式',
    '问题分类',
    '优先级',
    '标签',
    '负责人',
    '创建时间',
    '首次响应时间',
    '完结时间',
    '响应时长(分钟)',
    '处理总时长(分钟)',
    '满意度评分',
    '满意度评论',
    '状态变更历史'
  ];
  
  const rows = sessions.map(s => {
    const sla = calculateSLA(s);
    const statusHistory = s.statusHistory
      .map(h => `${h.status}@${new Date(h.changedAt).toISOString()}`)
      .join('; ');
    
    return [
      s.id,
      s.customerName,
      s.contact,
      s.category,
      s.priority,
      s.tags.join('; '),
      s.assignee || '',
      new Date(s.createdAt).toISOString(),
      s.firstResponseAt ? new Date(s.firstResponseAt).toISOString() : '',
      s.completedAt ? new Date(s.completedAt).toISOString() : '',
      sla.responseTime || '',
      sla.totalHandleTime || '',
      s.satisfaction?.rating || '',
      s.satisfaction?.comment || '',
      statusHistory
    ];
  });
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return csvContent;
}

module.exports = {
  exportToJSON,
  exportToCSV
};
