<template>
  <div class="activity-detail" v-if="activity">
    <div class="container">
      <el-breadcrumb separator="/" class="breadcrumb">
        <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ path: '/activities' }">音乐活动</el-breadcrumb-item>
        <el-breadcrumb-item>{{ activity.title }}</el-breadcrumb-item>
      </el-breadcrumb>

      <div class="detail-grid">
        <div class="main-section">
          <div class="content-card card mb-20">
            <div class="header-row">
              <div class="type-badge" :class="'type-' + activity.type">
                {{ activity.typeName }}
              </div>
              <div class="status-badge" :class="'status-' + activity.status">
                {{ statusText }}
              </div>
            </div>

            <h1 class="activity-title">{{ activity.title }}</h1>

            <div class="meta-row">
              <span><el-icon><User /></el-icon> 组织者：{{ activity.organizer?.username }}</span>
              <span><el-icon><Calendar /></el-icon> 发布于 {{ formatDate(activity.createdAt) }}</span>
              <span><el-icon><UserFilled /></el-icon> {{ activity.signedUpCount || 0 }}/{{ activity.maxParticipants }}人</span>
            </div>

            <div class="info-blocks">
              <div class="info-block">
                <div class="info-icon"><el-icon><Clock /></el-icon></div>
                <div class="info-content">
                  <div class="info-label">活动时间</div>
                  <div class="info-value">{{ activity.meetTime }}</div>
                  <div v-if="activity.endTime" class="info-sub">至 {{ activity.endTime }}</div>
                </div>
              </div>
              <div class="info-block">
                <div class="info-icon"><el-icon><Location /></el-icon></div>
                <div class="info-content">
                  <div class="info-label">活动地点</div>
                  <div class="info-value">{{ activity.location }}</div>
                </div>
              </div>
            </div>

            <div class="section">
              <h3><el-icon><Document /></el-icon> 活动介绍</h3>
              <p class="description">{{ activity.description }}</p>
            </div>

            <div class="section" v-if="activity.pieces && activity.pieces.length">
              <h3><el-icon><Notebook /></el-icon> 演奏曲目</h3>
              <div class="piece-tags">
                <span v-for="(piece, idx) in activity.pieces" :key="idx" class="piece-tag">
                  {{ idx + 1 }}. {{ piece }}
                </span>
              </div>
            </div>

            <div class="section" v-if="activity.neededInstruments && activity.neededInstruments.length">
              <h3><el-icon><Suitcase /></el-icon> 需要乐器</h3>
              <div class="instrument-list">
                <div v-for="inst in activity.neededInstruments" :key="inst.instrument" class="instrument-item">
                  <span class="inst-name">{{ inst.instrument }}</span>
                  <div class="inst-progress">
                    <el-progress
                      :percentage="Math.round(((inst.signedUp || 0) / inst.count) * 100)"
                      :color="(inst.signedUp || 0) >= inst.count ? '#67c23a' : '#409eff'"
                      :stroke-width="8"
                    />
                  </div>
                  <span class="inst-count">{{ inst.signedUp || 0 }}/{{ inst.count }}</span>
                </div>
              </div>
            </div>

            <div class="section" v-if="activity.notes">
              <h3><el-icon><InfoFilled /></el-icon> 注意事项</h3>
              <p class="notes">{{ activity.notes }}</p>
            </div>
          </div>

          <div class="content-card card" v-if="validParticipants.length">
            <h3><el-icon><UserFilled /></el-icon> 参与人员 ({{ confirmedCount }}人)</h3>
            <div class="participant-list">
              <div v-for="p in validParticipants" :key="p.userId" class="participant-item">
                <img :src="p.user?.avatar" class="avatar" />
                <div class="participant-info">
                  <div class="participant-name">
                    {{ p.user?.username || '未知用户' }}
                    <span v-if="p.userId === activity.organizerId" class="organizer-tag">组织者</span>
                  </div>
                  <div class="participant-meta">
                    <span v-if="p.instrument" class="inst-badge">{{ p.instrument }}</span>
                    <span class="join-time">加入于 {{ formatDate(p.joinedAt) }}</span>
                  </div>
                </div>
                <div class="participant-status" :class="'status-' + p.status">
                  {{ p.status === 'confirmed' ? '已确认' : '待确认' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="side-section">
          <div class="action-card card mb-20">
            <div class="progress-section">
              <div class="progress-label">
                <span>报名进度</span>
                <span class="progress-num">{{ activity.signedUpCount || 0 }}/{{ activity.maxParticipants }}人</span>
              </div>
              <el-progress
                :percentage="Math.round(((activity.signedUpCount || 0) / activity.maxParticipants) * 100)"
                :stroke-width="12"
              />
            </div>

            <div class="action-buttons" v-if="userStore.isLoggedIn">
              <template v-if="activity.isOrganizer">
                <el-button type="primary" size="large" @click="editActivity">
                  <el-icon><Edit /></el-icon>
                  编辑活动
                </el-button>
                <el-button type="danger" size="large" @click="deleteActivity">
                  <el-icon><Delete /></el-icon>
                  删除活动
                </el-button>
              </template>
              <template v-else-if="activity.isParticipant">
                <el-button type="success" size="large" disabled>
                  <el-icon><Check /></el-icon>
                  已报名
                </el-button>
                <el-button size="large" @click="leaveActivity">
                  <el-icon><Close /></el-icon>
                  退出活动
                </el-button>
              </template>
              <template v-else>
                <el-button
                  type="primary"
                  size="large"
                  :disabled="activity.status !== 'recruiting' || (activity.signedUpCount || 0) >= activity.maxParticipants || instrumentsAllFull"
                  @click="showJoinDialog = true"
                >
                  <el-icon><Plus /></el-icon>
                  {{ 
                    activity.status !== 'recruiting' ? '已停止招募' : 
                    (activity.signedUpCount || 0) >= activity.maxParticipants ? '已满员' : 
                    instrumentsAllFull ? '乐器已满' : '立即报名' 
                  }}
                </el-button>
              </template>
            </div>
            <div v-else class="login-tip">
              <p>请先登录后报名活动</p>
              <el-button type="primary" @click="$router.push('/login')">去登录</el-button>
            </div>
          </div>

          <div class="organizer-card card" v-if="activity.organizer">
            <h3><el-icon><User /></el-icon> 组织者</h3>
            <router-link :to="`/buddies/${activity.organizer.id}`" class="organizer-link">
              <img :src="activity.organizer.avatar" class="avatar-lg" />
              <div class="organizer-info">
                <div class="organizer-name">{{ activity.organizer.username }}</div>
                <div class="organizer-level">
                  <span class="badge badge-primary">{{ activity.organizer.skillLevel }}</span>
                </div>
                <div class="organizer-bio">{{ activity.organizer.bio }}</div>
              </div>
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="showJoinDialog" title="报名活动" width="450px">
      <div class="join-info">
        <h3>{{ activity.title }}</h3>
        <p class="info-line"><el-icon><Clock /></el-icon> {{ activity.meetTime }}</p>
        <p class="info-line"><el-icon><Location /></el-icon> {{ activity.location }}</p>
      </div>
      <el-form :model="joinForm" label-width="100px">
        <el-form-item label="使用乐器" v-if="activity.neededInstruments && activity.neededInstruments.length">
          <el-select v-model="joinForm.instrument" placeholder="选择您的乐器" style="width: 100%">
            <el-option
              v-for="inst in activity.neededInstruments"
              :key="inst.instrument"
              :label="`${inst.instrument} (${inst.signedUp || 0}/${inst.count})`"
              :value="inst.instrument"
              :disabled="(inst.signedUp || 0) >= inst.count"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="留言">
          <el-input v-model="joinForm.message" type="textarea" :rows="2" placeholder="想对组织者说的话..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showJoinDialog = false">取消</el-button>
        <el-button type="primary" :loading="joining" @click="confirmJoin">确认报名</el-button>
      </template>
    </el-dialog>
  </div>

  <div v-else class="empty-state">
    <el-icon><Refresh /></el-icon>
    <p>加载中...</p>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { activityApi } from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  User, Calendar, UserFilled, Clock, Location, Document, Notebook, Suitcase, InfoFilled,
  Edit, Delete, Check, Plus, Close, Refresh
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const requireLogin = inject('requireLogin', () => router.push('/login'))

const activityId = route.params.id
const activity = ref(null)
const loading = ref(false)
const joining = ref(false)
const showJoinDialog = ref(false)

const joinForm = reactive({
  instrument: '',
  message: ''
})

const statusText = computed(() => {
  const map = {
    recruiting: '招募中',
    full: '已满员',
    ongoing: '进行中',
    completed: '已结束',
    cancelled: '已取消'
  }
  return map[activity.value?.status] || activity.value?.status
})

const validParticipants = computed(() => {
  if (!activity.value?.participants) return []
  return activity.value.participants.filter(p => p.user)
})

const confirmedCount = computed(() => {
  if (!activity.value?.participants) return 0
  return activity.value.participants.filter(p => p.status === 'confirmed').length
})

const instrumentsAllFull = computed(() => {
  const needed = activity.value?.neededInstruments
  if (!needed || needed.length === 0) return false
  return needed.every(i => (i.signedUp || 0) >= i.count)
})

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const loadActivity = async () => {
  loading.value = true
  try {
    const params = userStore.isLoggedIn ? { currentUserId: userStore.userId } : {}
    activity.value = await activityApi.get(activityId, params)
    if (activity.value.neededInstruments && activity.value.neededInstruments.length > 0) {
      const firstAvailable = activity.value.neededInstruments.find(i => (i.signedUp || 0) < i.count)
      joinForm.instrument = firstAvailable ? firstAvailable.instrument : ''
    } else {
      joinForm.instrument = ''
    }
  } catch (e) {
    ElMessage.error('加载活动详情失败')
    router.push('/activities')
  } finally {
    loading.value = false
  }
}

const confirmJoin = async () => {
  if (!userStore.isLoggedIn) {
    requireLogin()
    return
  }

  if (activity.value.neededInstruments && activity.value.neededInstruments.length > 0) {
    if (!joinForm.instrument) {
      ElMessage.warning('请选择使用的乐器')
      return
    }
    const selected = activity.value.neededInstruments.find(i => i.instrument === joinForm.instrument)
    if (selected && (selected.signedUp || 0) >= selected.count) {
      ElMessage.error(`「${joinForm.instrument}」名额已满，请选择其他乐器`)
      return
    }
  }
  
  joining.value = true
  try {
    await activityApi.join(activityId, {
      instrument: joinForm.instrument
    })
    ElMessage.success('报名成功！')
    showJoinDialog.value = false
    loadActivity()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '报名失败，请重试')
  } finally {
    joining.value = false
  }
}

const leaveActivity = () => {
  ElMessageBox.confirm('确定要退出此活动吗？', '提示', {
    confirmButtonText: '确定退出',
    cancelButtonText: '再想想',
    type: 'warning'
  }).then(async () => {
    try {
      await activityApi.leave(activityId)
      ElMessage.success('已退出活动')
      loadActivity()
    } catch (e) {
      ElMessage.error(e.response?.data?.error || '操作失败')
    }
  }).catch(() => {})
}

const editActivity = () => {
  router.push(`/publish/activity?id=${activityId}`)
}

const deleteActivity = () => {
  ElMessageBox.confirm('确定要删除此活动吗？此操作不可恢复。', '警告', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'error'
  }).then(async () => {
    try {
      await activityApi.remove(activityId)
      ElMessage.success('活动已删除')
      router.push('/activities')
    } catch (e) {
      ElMessage.error(e.response?.data?.error || '删除失败')
    }
  }).catch(() => {})
}

onMounted(() => {
  loadActivity()
})
</script>

<style scoped>
.breadcrumb {
  margin: 20px 0;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 20px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.type-badge {
  padding: 6px 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  color: white;
}

.type-practice {
  background: linear-gradient(135deg, #60a5fa, #3b82f6);
}

.type-duet {
  background: linear-gradient(135deg, #f472b6, #ec4899);
}

.type-ensemble {
  background: linear-gradient(135deg, #a78bfa, #8b5cf6);
}

.type-offline {
  background: linear-gradient(135deg, #34d399, #10b981);
}

.status-badge {
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
}

.status-recruiting {
  background: #d1fae5;
  color: #059669;
}

.status-full {
  background: #fef3c7;
  color: #d97706;
}

.status-ongoing {
  background: #dbeafe;
  color: #2563eb;
}

.status-completed {
  background: #f3f4f6;
  color: #6b7280;
}

.status-cancelled {
  background: #fee2e2;
  color: #dc2626;
}

.activity-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.meta-row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px dashed var(--border-color);
}

.meta-row span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.info-blocks {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}

.info-block {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: var(--bg-light);
  border-radius: 10px;
}

.info-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--primary-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.info-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.info-value {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.info-sub {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.section {
  margin-bottom: 24px;
}

.section h3 {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.description {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.8;
  margin: 0;
}

.piece-tags {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.piece-tag {
  padding: 10px 16px;
  background: var(--bg-light);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-primary);
}

.instrument-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.instrument-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.inst-name {
  width: 100px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.inst-progress {
  flex: 1;
}

.inst-count {
  width: 60px;
  text-align: right;
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.notes {
  font-size: 14px;
  color: #d97706;
  line-height: 1.8;
  margin: 0;
  padding: 12px 16px;
  background: #fef3c7;
  border-radius: 8px;
}

.participant-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.participant-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-light);
  border-radius: 8px;
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
}

.participant-info {
  flex: 1;
  min-width: 0;
}

.participant-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.organizer-tag {
  display: inline-block;
  padding: 1px 8px;
  background: #fef3c7;
  color: #d97706;
  border-radius: 4px;
  font-size: 11px;
  margin-left: 8px;
}

.participant-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.inst-badge {
  padding: 2px 8px;
  background: #eef2ff;
  color: var(--primary-dark);
  border-radius: 4px;
  font-size: 11px;
}

.join-time {
  font-size: 12px;
  color: var(--text-secondary);
}

.participant-status {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.participant-status.status-confirmed {
  background: #d1fae5;
  color: #059669;
}

.participant-status.status-pending {
  background: #fef3c7;
  color: #d97706;
}

.progress-section {
  margin-bottom: 20px;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-size: 13px;
  color: var(--text-secondary);
}

.progress-num {
  font-weight: 600;
  color: var(--text-primary);
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-buttons .el-button {
  width: 100%;
}

.login-tip {
  text-align: center;
  padding: 20px 0;
}

.login-tip p {
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.organizer-card h3 {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.organizer-link {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  transition: background 0.2s;
}

.organizer-link:hover {
  background: var(--bg-light);
}

.organizer-info {
  flex: 1;
  min-width: 0;
}

.organizer-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.organizer-level {
  margin-bottom: 6px;
}

.organizer-bio {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.join-info {
  background: var(--bg-light);
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.join-info h3 {
  font-size: 16px;
  margin: 0 0 12px 0;
  color: var(--text-primary);
}

.info-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  margin: 4px 0;
}

@media (max-width: 900px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
  
  .info-blocks {
    grid-template-columns: 1fr;
  }
}
</style>
