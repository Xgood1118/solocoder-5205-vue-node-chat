require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sessionsRouter = require('./routes/sessions');
const notificationsRouter = require('./routes/notifications');
const { startTimeoutChecker } = require('./services/timeoutChecker');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/sessions', sessionsRouter);
app.use('/api/notifications', notificationsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '客服会话管理系统运行正常' });
});

app.get('/api/config', (req, res) => {
  res.json({
    statuses: ['待分配', '已分配', '处理中', '待客户回复', '已完结'],
    categories: ['产品咨询', '技术支持', '投诉', '退换货', '其他'],
    priorities: ['高', '中', '低'],
    agents: ['张三', '李四', '王五', '赵六']
  });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  startTimeoutChecker();
});
