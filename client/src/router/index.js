import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import SessionList from '../views/SessionList.vue'
import SessionDetail from '../views/SessionDetail.vue'

const routes = [
  { path: '/', component: Dashboard, name: 'dashboard' },
  { path: '/sessions', component: SessionList, name: 'sessions' },
  { path: '/sessions/:id', component: SessionDetail, name: 'session-detail' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
