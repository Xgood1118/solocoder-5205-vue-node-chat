<template>
  <div v-if="session">
    <button class="btn btn-secondary" style="margin-bottom: 1rem;" @click="goBack">
      ← 返回列表
    </button>
    
    <div class="card">
      <div class="session-detail-header">
        <div class="session-info">
          <h2 style="margin-bottom: 0.5rem;">
            会话 #{{ session.id }} - {{ session.customerName }}
            <span :class="['badge', getPriorityBadgeClass(session.priority)]" style="margin-left: 0.5rem;">
              {{ session.priority }}
            </span>
          </h2>
          <p style="color: #718096; margin-bottom: 0.5rem;">
            联系方式: {{ session.contactType }} - {{ session.contact }} | 
            分类: {{ session.category }} | 
            负责人: {{ session.assignee || '未分配' }}
          </p>
          <div>
            <span :class="['badge', getStatusBadgeClass(session.status)]">
              {{ session.status }}
            </span>
            <span v-for="tag in session.tags" :key="tag" class="tag" style="margin-left: 0.5rem;">
              {{ tag }}
            </span>
          </div>
        </div>
        <div class="session-actions">
          <button v-if="session.status === '待分配'" class="btn btn-primary" @click="showAssignModal = true">
            📤 指派
          </button>
          <button v-if="session.status === '已分配'" class="btn btn-secondary" @click="unassignSession">
            ↩️ 撤销指派
          </button>
          <button v-if="session.status !== '已完结'" class="btn btn-success" @click="showWaitingCustomer">
            ⏳ 等待客户回复
          </button>
          <button v-if="session.status !== '已完结'" class="btn btn-danger" @click="finishSession">
            ✅ 完结
          </button>
          <button v-if="session.status === '已完结'" class="btn btn-secondary" @click="reopenSession">
            🔄 重新打开
          </button>
          <button class="btn btn-secondary" @click="showTransferModal = true">
            🔀 转移
          </button>
        </div>
      </div>
      
      <div class="sla-info">
        <div class="sla-item">
          <div class="sla-value">{{ session.sla?.responseTime || '-' }}{{ session.sla?.responseTime ? '分钟' : '' }}</div>
          <div class="sla-label">首次响应时间</div>
        </div>
        <div class="sla-item">
          <div class="sla-value">{{ session.sla?.totalHandleTime || '-' }}{{ session.sla?.totalHandleTime ? '分钟' : '' }}</div>
          <div class="sla-label">处理总时长</div>
        </div>
        <div class="sla-item">
          <div class="sla-value">{{ formatTime(session.createdAt) }}</div>
          <div class="sla-label">创建时间</div>
        </div>
        <div class="sla-item" v-if="session.firstResponseAt">
          <div class="sla-value">{{ formatTime(session.firstResponseAt) }}</div>
          <div class="sla-label">首次响应</div>
        </div>
      </div>
      
      <div class="tabs">
        <div :class="['tab', { active: activeTab === 'messages' }]" @click="activeTab = 'messages'">
          💬 消息记录
        </div>
        <div :class="['tab', { active: activeTab === 'status' }]" @click="activeTab = 'status'">
          📊 状态变更
        </div>
        <div :class="['tab', { active: activeTab === 'settings' }]" @click="activeTab = 'settings'">
          ⚙️ 设置
        </div>
      </div>
      
      <div v-if="activeTab === 'messages'">
        <div class="timeline" ref="timelineRef">
          <div v-for="item in timelineItems" :key="item.id" class="timeline-item">
            <div :class="['timeline-message', item.type]">
              <div class="message-header">
                <span class="message-sender">
                  {{ item.sender }}
                  <span v-if="item.isInternal" class="internal-badge">内部备注</span>
                  <span v-if="item.isVoice" class="voice-badge">🎤 语音</span>
                </span>
                <span>{{ formatTime(item.time) }}</span>
              </div>
              <div class="message-content" v-html="renderContent(item.content)"></div>
            </div>
          </div>
        </div>
        
        <div class="message-input-area">
          <input 
            v-model="newMessage" 
            class="form-input" 
            placeholder="输入消息内容..."
            @keyup.enter="sendMessage"
          >
          <button class="btn btn-primary" @click="sendMessage" :disabled="!newMessage.trim()">
            发送
          </button>
          <button class="btn btn-secondary" @click="sendVoiceMessage" title="语音消息">
            🎤
          </button>
          <button class="btn btn-secondary" @click="showInternalNote = true">
            📝 备注
          </button>
          <button class="btn btn-success" @click="simulateCustomerReply">
            🤖 模拟客户回复
          </button>
        </div>
      </div>
      
      <div v-if="activeTab === 'status'">
        <table>
          <thead>
            <tr>
              <th>状态</th>
              <th>变更时间</th>
              <th>操作人</th>
              <th>原因</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(status, index) in session.statusHistory" :key="index">
              <td>
                <span :class="['badge', getStatusBadgeClass(status.status)]">
                  {{ status.status }}
                </span>
              </td>
              <td>{{ formatTime(status.changedAt) }}</td>
              <td>{{ status.changedBy }}</td>
              <td>{{ status.reason || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div v-if="activeTab === 'settings'">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">优先级</label>
            <select v-model="newPriority" class="form-select">
              <option v-for="p in priorities" :key="p" :value="p">{{ p }}</option>
            </select>
            <button class="btn btn-primary btn-sm" style="margin-top: 0.5rem;" @click="changePriority">
              更新优先级
            </button>
          </div>
          <div class="form-group">
            <label class="form-label">添加标签</label>
            <input v-model="newTag" class="form-input" placeholder="输入标签" @keyup.enter="addTag">
            <button class="btn btn-primary btn-sm" style="margin-top: 0.5rem;" @click="addTag">
              添加
            </button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">当前标签</label>
          <div>
            <span v-for="tag in session.tags" :key="tag" class="tag" style="padding: 0.5rem 1rem;">
              {{ tag }}
              <button style="margin-left: 0.5rem; background: none; border: none; cursor: pointer;" @click="removeTag(tag)">
                ×
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="showAssignModal" class="modal-overlay" @click.self="showAssignModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">指派会话</h3>
          <button class="modal-close" @click="showAssignModal = false">&times;</button>
        </div>
        <div class="form-group">
          <label class="form-label">选择客服</label>
          <select v-model="assignTo" class="form-select">
            <option v-for="a in agents" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>
        <button class="btn btn-primary" @click="assignSession" style="width: 100%;">
          确认指派
        </button>
      </div>
    </div>
    
    <div v-if="showTransferModal" class="modal-overlay" @click.self="showTransferModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">转移会话</h3>
          <button class="modal-close" @click="showTransferModal = false">&times;</button>
        </div>
        <div class="form-group">
          <label class="form-label">转移给</label>
          <select v-model="transferTo" class="form-select">
            <option v-for="a in agents" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">转移原因</label>
          <textarea v-model="transferReason" class="form-textarea" rows="3"></textarea>
        </div>
        <button class="btn btn-primary" @click="transferSession" style="width: 100%;">
          确认转移
        </button>
      </div>
    </div>
    
    <div v-if="showInternalNote" class="modal-overlay" @click.self="showInternalNote = false">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">添加内部备注</h3>
          <button class="modal-close" @click="showInternalNote = false">&times;</button>
        </div>
        <div class="form-group">
          <label class="form-label">备注内容</label>
          <textarea v-model="internalNote" class="form-textarea" rows="4"></textarea>
        </div>
        <button class="btn btn-primary" @click="addInternalNote" style="width: 100%;">
          添加备注
        </button>
      </div>
    </div>
    
    <div v-if="showSatisfactionModal" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">满意度调查</h3>
        </div>
        <p style="margin-bottom: 1rem;">请为本次服务打分</p>
        <div class="star-rating" style="justify-content: center; margin-bottom: 1rem;">
          <span 
            v-for="i in 5" 
            :key="i" 
            :class="['star', { active: i <= satisfactionRating }]"
            @click="satisfactionRating = i"
          >
            ★
          </span>
        </div>
        <div class="form-group">
          <label class="form-label">评价内容（可选）</label>
          <textarea v-model="satisfactionComment" class="form-textarea" rows="3"></textarea>
        </div>
        <button class="btn btn-primary" @click="submitSatisfaction" style="width: 100%;">
          提交评价
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../utils/api'

const route = useRoute()
const router = useRouter()
const currentAgent = inject('currentAgent')
const showNotification = inject('showNotification')

const session = ref(null)
const agents = ref([])
const priorities = ref([])
const activeTab = ref('messages')
const newMessage = ref('')
const newTag = ref('')
const newPriority = ref('中')
const showAssignModal = ref(false)
const showTransferModal = ref(false)
const showInternalNote = ref(false)
const showSatisfactionModal = ref(false)
const assignTo = ref('')
const transferTo = ref('')
const transferReason = ref('')
const internalNote = ref('')
const satisfactionRating = ref(0)
const satisfactionComment = ref('')
const timelineRef = ref(null)

const customerReplies = [
  '好的，我明白了，谢谢！',
  '这个问题我需要再考虑一下。',
  '你们的服务态度真好！',
  '还有其他问题想咨询一下。',
  '好的，我会按照步骤操作的。',
  '这个解决方案不错，我试试。',
  '能不能再详细解释一下？',
  '非常感谢你的帮助！'
]

const timelineItems = computed(() => {
  if (!session.value) return []
  
  const items = []
  
  session.value.messages.forEach(msg => {
    let type = 'system'
    if (msg.sender === 'customer') type = 'customer'
    else if (msg.sender === 'agent') type = 'agent'
    else if (msg.isInternal) type = 'internal'
    
    items.push({
      id: `msg-${msg.id}`,
      type,
      sender: msg.senderName,
      content: msg.content,
      time: msg.createdAt,
      isInternal: msg.isInternal,
      isVoice: msg.isVoice
    })
  })
  
  return items.sort((a, b) => new Date(a.time) - new Date(b.time))
})

async function loadSession() {
  session.value = await api.getSession(route.params.id)
  newPriority.value = session.value.priority
  
  await nextTick()
  scrollToBottom()
}

function scrollToBottom() {
  if (timelineRef.value) {
    timelineRef.value.scrollTop = timelineRef.value.scrollHeight
  }
}

function goBack() {
  router.push('/sessions')
}

async function assignSession() {
  await api.assignSession(session.value.id, assignTo.value)
  showAssignModal.value = false
  showNotification('指派成功', 'success')
  loadSession()
}

async function unassignSession() {
  await api.transitionStatus(session.value.id, '待分配', currentAgent.value, '撤销指派')
  session.value.assignee = null
  session.value.assignedAt = null
  showNotification('已撤销指派', 'success')
  loadSession()
}

async function showWaitingCustomer() {
  await api.transitionStatus(session.value.id, '待客户回复', currentAgent.value, '等待客户回复')
  showNotification('状态已更新', 'success')
  loadSession()
}

async function finishSession() {
  await api.finishSession(session.value.id, currentAgent.value)
  showSatisfactionModal.value = true
  loadSession()
}

async function reopenSession() {
  await api.reopenSession(session.value.id, currentAgent.value)
  showNotification('会话已重新打开', 'success')
  loadSession()
}

async function transferSession() {
  await api.transferSession(session.value.id, transferTo.value, transferReason.value)
  showTransferModal.value = false
  transferReason.value = ''
  showNotification('转移成功', 'success')
  loadSession()
}

async function sendMessage() {
  if (!newMessage.value.trim()) return
  
  await api.addMessage(session.value.id, {
    sender: 'agent',
    senderName: currentAgent.value,
    content: newMessage.value
  })
  
  newMessage.value = ''
  loadSession()
}

async function sendVoiceMessage() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showNotification('您的浏览器不支持语音识别', 'warning')
    return
  }
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const recognition = new SpeechRecognition()
  recognition.lang = 'zh-CN'
  
  recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript
    await api.addMessage(session.value.id, {
      sender: 'agent',
      senderName: currentAgent.value,
      content: transcript,
      isVoice: true
    })
    loadSession()
  }
  
  recognition.onerror = () => {
    showNotification('语音识别失败', 'warning')
  }
  
  recognition.start()
  showNotification('请开始说话...', 'info')
}

async function simulateCustomerReply() {
  const reply = customerReplies[Math.floor(Math.random() * customerReplies.length)]
  
  await api.addMessage(session.value.id, {
    sender: 'customer',
    senderName: session.value.customerName,
    content: reply
  })
  
  loadSession()
}

async function addInternalNote() {
  if (!internalNote.value.trim()) return
  
  await api.addMessage(session.value.id, {
    sender: 'agent',
    senderName: currentAgent.value,
    content: internalNote.value,
    isInternal: true
  })
  
  internalNote.value = ''
  showInternalNote.value = false
  showNotification('备注已添加', 'success')
  loadSession()
}

async function addTag() {
  if (!newTag.value.trim()) return
  
  await api.addTags(session.value.id, [newTag.value.trim()])
  newTag.value = ''
  showNotification('标签已添加', 'success')
  loadSession()
}

async function removeTag(tag) {
  await api.removeTag(session.value.id, tag)
  showNotification('标签已移除', 'success')
  loadSession()
}

async function changePriority() {
  await api.setPriority(session.value.id, newPriority.value)
  showNotification('优先级已更新', 'success')
  loadSession()
}

async function submitSatisfaction() {
  if (satisfactionRating.value === 0) {
    showNotification('请选择评分', 'warning')
    return
  }
  
  await api.submitSatisfaction(session.value.id, satisfactionRating.value, satisfactionComment.value)
  showSatisfactionModal.value = false
  satisfactionRating.value = 0
  satisfactionComment.value = ''
  showNotification('感谢您的评价！', 'success')
  loadSession()
}

function renderContent(content) {
  let html = content
    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="link-preview">$1</a>')
    .replace(/\.(jpg|jpeg|png|gif|webp)(\s|$)/gi, (match) => {
      return `<br><img src="${match.trim()}" class="image-preview" onerror="this.style.display='none'">`
    })
  return html
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
  agents.value = config.agents
  priorities.value = config.priorities
  
  loadSession()
})
</script>
