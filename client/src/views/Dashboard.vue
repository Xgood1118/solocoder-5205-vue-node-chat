<template>
  <div>
    <h2 style="margin-bottom: 1.5rem;">📊 客服工作台</h2>
    
    <div class="card">
      <h3 class="card-title" style="margin-bottom: 1rem;">我的会话统计</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ stats.myProcessing || 0 }}</div>
          <div class="stat-label">处理中</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.myAssigned || 0 }}</div>
          <div class="stat-label">已分配待处理</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.myWaiting || 0 }}</div>
          <div class="stat-label">待客户回复</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.myCompleted || 0 }}</div>
          <div class="stat-label">已完结</div>
        </div>
      </div>
    </div>
    
    <div class="card">
      <h3 class="card-title" style="margin-bottom: 1rem;">整体数据概览</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ stats.todayNew || 0 }}</div>
          <div class="stat-label">今日新增</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.processing || 0 }}</div>
          <div class="stat-label">处理中总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.waitingCustomer || 0 }}</div>
          <div class="stat-label">待客户回复总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.todayProcessed || 0 }}</div>
          <div class="stat-label">今日处理量</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.avgHandleTime || 0 }}分钟</div>
          <div class="stat-label">平均处理时长</div>
        </div>
      </div>
    </div>
    
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">快速操作</h3>
      </div>
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <button class="btn btn-primary" @click="showCreateModal = true">
          ➕ 新建会话
        </button>
        <router-link to="/sessions" class="btn btn-secondary">
          📋 查看所有会话
        </router-link>
      </div>
    </div>
    
    <div class="card" v-if="recentSessions.length">
      <h3 class="card-title" style="margin-bottom: 1rem;">最近会话</h3>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>客户</th>
            <th>分类</th>
            <th>状态</th>
            <th>优先级</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="session in recentSessions" :key="session.id">
            <td>#{{ session.id }}</td>
            <td>{{ session.customerName }}</td>
            <td>{{ session.category }}</td>
            <td>
              <span :class="['badge', getStatusBadgeClass(session.status)]">
                {{ session.status }}
              </span>
            </td>
            <td>
              <span :class="['badge', getPriorityBadgeClass(session.priority)]">
                {{ session.priority }}
              </span>
            </td>
            <td>{{ formatTime(session.createdAt) }}</td>
            <td>
              <router-link :to="`/sessions/${session.id}`" class="btn btn-sm btn-primary">
                查看
              </router-link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">新建会话</h3>
          <button class="modal-close" @click="showCreateModal = false">&times;</button>
        </div>
        <div class="form-group">
          <label class="form-label">客户姓名</label>
          <input v-model="newSession.customerName" class="form-input" placeholder="请输入客户姓名">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">联系方式类型</label>
            <select v-model="newSession.contactType" class="form-select">
              <option value="手机">手机</option>
              <option value="邮箱">邮箱</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">联系方式</label>
            <input v-model="newSession.contact" class="form-input" placeholder="请输入联系方式">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">问题分类</label>
            <select v-model="newSession.category" class="form-select">
              <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">优先级</label>
            <select v-model="newSession.priority" class="form-select">
              <option v-for="p in priorities" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">标签（逗号分隔）</label>
          <input v-model="newSession.tagsInput" class="form-input" placeholder="如: 投诉,加急,老客户">
        </div>
        <button class="btn btn-primary" @click="createSession" style="width: 100%;">
          创建会话
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../utils/api'

const router = useRouter()
const currentAgent = inject('currentAgent')
const showNotification = inject('showNotification')

const stats = ref({})
const recentSessions = ref([])
const categories = ref([])
const priorities = ref([])
const showCreateModal = ref(false)
const newSession = ref({
  customerName: '',
  contactType: '手机',
  contact: '',
  category: '产品咨询',
  priority: '中',
  tagsInput: ''
})

async function loadStats() {
  stats.value = await api.getStatistics(currentAgent.value)
}

async function loadRecentSessions() {
  const sessions = await api.getSessions()
  recentSessions.value = sessions.slice(0, 5)
}

async function createSession() {
  const tags = newSession.value.tagsInput
    .split(',')
    .map(t => t.trim())
    .filter(t => t)
  
  const session = await api.createSession({
    ...newSession.value,
    tags
  })
  
  showCreateModal.value = false
  showNotification('会话创建成功', 'success')
  router.push(`/sessions/${session.id}`)
}

function getStatusBadgeClass(status) {
  const map = {
    '待分配': 'badge-pending',
    '已分配': 'badge-assigned',
    '处理中': 'badge-processing',
    '待客户回复': 'badge-waiting',
    '已完结': 'badge-completed'
  }
  return map[status] || ''
}

function getPriorityBadgeClass(priority) {
  const map = {
    '高': 'badge-high',
    '中': 'badge-medium',
    '低': 'badge-low'
  }
  return map[priority] || ''
}

function formatTime(date) {
  return new Date(date).toLocaleString('zh-CN')
}

onMounted(async () => {
  const config = await api.getConfig()
  categories.value = config.categories
  priorities.value = config.priorities
  
  loadStats()
  loadRecentSessions()
})
</script>
