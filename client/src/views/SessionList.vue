<template>
  <div>
    <div class="card-header" style="margin-bottom: 1rem;">
      <h2>📋 会话列表</h2>
      <button class="btn btn-primary" @click="showCreateModal = true">
        ➕ 新建会话
      </button>
    </div>
    
    <div class="card">
      <div class="filters">
        <div class="filter-item">
          <label class="form-label">状态</label>
          <select v-model="filters.status" class="form-select" @change="loadSessions">
            <option value="">全部</option>
            <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div class="filter-item">
          <label class="form-label">负责人</label>
          <select v-model="filters.assignee" class="form-select" @change="loadSessions">
            <option value="">全部</option>
            <option v-for="a in agents" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>
        <div class="filter-item">
          <label class="form-label">分类</label>
          <select v-model="filters.category" class="form-select" @change="loadSessions">
            <option value="">全部</option>
            <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="filter-item">
          <label class="form-label">标签</label>
          <input v-model="filters.tag" class="form-input" placeholder="输入标签筛选" @input="loadSessions">
        </div>
      </div>
      
      <div v-if="selectedIds.length" class="batch-actions">
        <span>已选择 {{ selectedIds.length }} 个会话</span>
        <button class="btn btn-sm btn-success" @click="batchFinish">批量完结</button>
        <select v-model="batchCategory" class="form-input" style="width: 120px;">
          <option value="">选择分类</option>
          <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
        </select>
        <button class="btn btn-sm btn-secondary" @click="batchSetCategory" :disabled="!batchCategory">批量改分类</button>
        <select v-model="batchAssignee" class="form-input" style="width: 120px;">
          <option value="">选择客服</option>
          <option v-for="a in agents" :key="a" :value="a">{{ a }}</option>
        </select>
        <button class="btn btn-sm btn-secondary" @click="batchAssign" :disabled="!batchAssignee">批量指派</button>
        <select v-model="batchTransferTo" class="form-input" style="width: 120px;">
          <option value="">转移给</option>
          <option v-for="a in agents" :key="a" :value="a">{{ a }}</option>
        </select>
        <button class="btn btn-sm btn-secondary" @click="batchTransfer" :disabled="!batchTransferTo">批量转移</button>
        <button class="btn btn-sm" @click="clearSelection">取消选择</button>
      </div>
      
      <div class="filters" style="background: #fff; border: 1px solid #e2e8f0;">
        <div class="filter-item">
          <label class="form-label">开始日期</label>
          <input type="date" v-model="exportStartDate" class="form-input">
        </div>
        <div class="filter-item">
          <label class="form-label">结束日期</label>
          <input type="date" v-model="exportEndDate" class="form-input">
        </div>
        <div class="filter-item" style="display: flex; align-items: flex-end; gap: 0.5rem;">
          <button class="btn btn-secondary" @click="exportData('json')">导出JSON</button>
          <button class="btn btn-secondary" @click="exportData('csv')">导出CSV</button>
        </div>
      </div>
      
      <div v-if="sessions.length" style="overflow-x: auto;">
        <table>
          <thead>
            <tr>
              <th style="width: 50px;">
                <input type="checkbox" class="checkbox" v-model="selectAll" @change="toggleSelectAll">
              </th>
              <th>ID</th>
              <th>客户</th>
              <th>联系方式</th>
              <th>分类</th>
              <th>状态</th>
              <th>优先级</th>
              <th>负责人</th>
              <th>标签</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="session in sessions" :key="session.id" :style="{ background: session.priority === '高' ? '#fff5f5' : '' }">
              <td>
                <input type="checkbox" class="checkbox" :value="session.id" v-model="selectedIds">
              </td>
              <td>#{{ session.id }}</td>
              <td>{{ session.customerName }}</td>
              <td>{{ session.contact }}</td>
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
              <td>{{ session.assignee || '-' }}</td>
              <td>
                <span v-for="tag in session.tags" :key="tag" class="tag">{{ tag }}</span>
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
      
      <div v-else class="empty-state">
        <div class="empty-state-icon">📭</div>
        <p>暂无会话数据</p>
      </div>
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
const showNotification = inject('showNotification')

const sessions = ref([])
const statuses = ref([])
const categories = ref([])
const agents = ref([])
const priorities = ref([])
const showCreateModal = ref(false)
const selectAll = ref(false)
const selectedIds = ref([])
const batchCategory = ref('')
const batchAssignee = ref('')
const batchTransferTo = ref('')
const exportStartDate = ref(new Date().toISOString().split('T')[0])
const exportEndDate = ref(new Date().toISOString().split('T')[0])

const filters = ref({
  status: '',
  assignee: '',
  category: '',
  tag: ''
})

const newSession = ref({
  customerName: '',
  contactType: '手机',
  contact: '',
  category: '产品咨询',
  priority: '中',
  tagsInput: ''
})

async function loadSessions() {
  const params = {}
  if (filters.value.status) params.status = filters.value.status
  if (filters.value.assignee) params.assignee = filters.value.assignee
  if (filters.value.category) params.category = filters.value.category
  if (filters.value.tag) params.tag = filters.value.tag
  
  sessions.value = await api.getSessions(params)
}

function toggleSelectAll() {
  if (selectAll.value) {
    selectedIds.value = sessions.value.map(s => s.id)
  } else {
    selectedIds.value = []
  }
}

function clearSelection() {
  selectedIds.value = []
  selectAll.value = false
}

async function batchFinish() {
  await api.batchAction(selectedIds.value, 'finish', {})
  showNotification('批量操作完成', 'success')
  loadSessions()
  clearSelection()
}

async function batchSetCategory() {
  await api.batchAction(selectedIds.value, 'setCategory', { category: batchCategory.value })
  showNotification('批量修改分类完成', 'success')
  loadSessions()
  clearSelection()
}

async function batchAssign() {
  await api.batchAction(selectedIds.value, 'assign', { assignee: batchAssignee.value })
  showNotification('批量指派完成', 'success')
  loadSessions()
  clearSelection()
}

async function batchTransfer() {
  await api.batchAction(selectedIds.value, 'transfer', { newAssignee: batchTransferTo.value, reason: '批量转移' })
  showNotification('批量转移完成', 'success')
  loadSessions()
  clearSelection()
}

function exportData(format) {
  api.exportSessions(exportStartDate.value, exportEndDate.value, format)
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
  statuses.value = config.statuses
  categories.value = config.categories
  agents.value = config.agents
  priorities.value = config.priorities
  
  loadSessions()
})
</script>
