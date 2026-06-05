const express = require('express');
const router = express.Router();
const { addNotificationClient, removeNotificationClient } = require('../services/timeoutChecker');

router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  res.write('data: {"type":"connected","message":"通知连接已建立"}\n\n');
  
  addNotificationClient(res);
  
  req.on('close', () => {
    removeNotificationClient(res);
  });
});

module.exports = router;
