<template>
  <div class="app-container">
    <header class="header">
      <h1>🎧 客服会话管理系统</h1>
      <nav class="header-nav">
        <router-link to="/">工作台</router-link>
        <router-link to="/sessions">会话列表</router-link>
        <select v-model="currentAgent" class="form-input" style="width: 120px;">
          <option v-for="agent in agents" :key="agent" :value="agent">{{ agent }}</option>
        </select>
      </nav>
    </header>
    <main class="main-content">
      <router-view />
    </main>
    
    <div v-if="notification" :class="['notification', notification.type]">
      {{ notification.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, provide } from 'vue'
import { api } from './utils/api'

const agents = ref([])
const currentAgent = ref('张三')
const notification = ref(null)
let notificationTimeout = null

provide('currentAgent', currentAgent)
provide('showNotification', showNotification)

function showNotification(message, type = 'info') {
  notification.value = { message, type }
  clearTimeout(notificationTimeout)
  notificationTimeout = setTimeout(() => {
    notification.value = null
  }, 5000)
}

let eventSource = null

function connectNotifications() {
  eventSource = new EventSource('/api/notifications')
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'timeout') {
        showNotification(data.data.message, 'warning')
      } else if (data.type === 'new_session') {
        showNotification(`新会话: #${data.data.sessionId} - ${data.data.customerName}`, 'success')
      }
    } catch (e) {
      console.log('Notification:', event.data)
    }
  }
  
  eventSource.onerror = () => {
    console.log('Notification connection error, reconnecting...')
    setTimeout(connectNotifications, 3000)
  }
}

onMounted(async () => {
  const config = await api.getConfig()
  agents.value = config.agents
  connectNotifications()
})

onUnmounted(() => {
  if (eventSource) {
    eventSource.close()
  }
})
</script>
