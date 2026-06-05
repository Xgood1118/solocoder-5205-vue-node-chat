const { sessions, STATUS, updateSessionStatus, addMessage } = require('../models/session');

const ASSIGNED_TIMEOUT = 2 * 60 * 60 * 1000;
const WAITING_CUSTOMER_TIMEOUT = 48 * 60 * 60 * 1000;

let notificationClients = [];

function addNotificationClient(res) {
  notificationClients.push(res);
  return res;
}

function removeNotificationClient(res) {
  notificationClients = notificationClients.filter(c => c !== res);
}

function sendNotification(type, data) {
  const notification = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  notificationClients.forEach(res => {
    res.write(`data: ${notification}\n\n`);
  });
}

function checkTimeouts() {
  const now = new Date();
  
  sessions.forEach(session => {
    if (session.status === STATUS.ASSIGNED && session.assignedAt) {
      const assignedTime = new Date(session.assignedAt);
      const hasMessages = session.messages.some(m => m.sender === 'agent');
      
      if (!hasMessages && (now - assignedTime) > ASSIGNED_TIMEOUT) {
        updateSessionStatus(session.id, STATUS.PENDING, 'system', '超时自动转单');
        addMessage(session.id, {
          sender: 'system',
          senderName: '系统',
          content: '会话已超时自动转单（已分配超过2小时未处理）',
          isInternal: true
        });
        session.assignee = null;
        session.assignedAt = null;
        sendNotification('timeout', {
          sessionId: session.id,
          type: 'assigned_timeout',
          message: `会话 #${session.id} 已超时自动转单`
        });
      }
    }
    
    if (session.status === STATUS.WAITING_CUSTOMER) {
      const lastMessage = session.messages
        .filter(m => m.sender === 'customer')
        .pop();
      const lastActivity = lastMessage 
        ? new Date(lastMessage.createdAt) 
        : new Date(session.createdAt);
      
      if ((now - lastActivity) > WAITING_CUSTOMER_TIMEOUT) {
        updateSessionStatus(session.id, STATUS.COMPLETED, 'system', '客户超时未回复自动完结');
        addMessage(session.id, {
          sender: 'system',
          senderName: '系统',
          content: '会话已自动完结（客户超过48小时未回复）',
          isInternal: true
        });
        sendNotification('timeout', {
          sessionId: session.id,
          type: 'waiting_timeout',
          message: `会话 #${session.id} 因客户超时未回复已自动完结`
        });
      }
    }
  });
}

function startTimeoutChecker() {
  setInterval(checkTimeouts, 60 * 1000);
  console.log('超时检测已启动，每分钟检查一次');
}

module.exports = {
  startTimeoutChecker,
  addNotificationClient,
  removeNotificationClient,
  sendNotification
};
