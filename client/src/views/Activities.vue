<template>
  <div class="activities-page">
    <div class="page-header">
      <div class="container">
        <div class="header-content">
          <div>
            <h1>🎵 音乐活动招募</h1>
            <p>发起或加入练习会、二重奏、合奏排练，找到志同道合的音乐伙伴</p>
          </div>
          <router-link to="/publish/activity" v-if="userStore.isLoggedIn" class="create-btn">
            <el-icon><Plus /></el-icon>
            发起活动
          </router-link>
        </div>
      </div>
    </div>

    <div class="container">
      <div class="filter-bar card mb-20">
        <div class="filter-row">
          <div class="filter-group">
            <label>活动类型</label>
            <el-select v-model="filters.type" placeholder="全部" clearable style="width: 140px">
              <el-option label="小型练习会" value="practice" />
              <el-option label="二重奏" value="duet" />
              <el-option label="合奏排练" value="ensemble" />
              <el-option label="线下交流" value="offline" />
            </el-select>
          </div>
          <div class="filter-group">
            <label>活动状态</label>
            <el-select v-model="filters.status" placeholder="全部" clearable style="width: 120px">
              <el-option label="招募中" value="recruiting" />
              <el-option label="已满员" value="full" />
              <el-option label="进行中" value="ongoing" />
              <el-option label="已结束" value="completed" />
            </el-select>
          </div>
          <div class="filter-group">
            <label>我的活动</label>
            <el-radio-group v-model="filters.myFilter">
              <el-radio-button value="all">全部</el-radio-button>
              <el-radio-button value="organized">我发起的</el-radio-button>
              <el-radio-button value="joined">我参与的</el-radio-button>
            </el-radio-group>
          </div>
          <el-input
            v-model="filters.keyword"
            placeholder="搜索活动标题、曲目..."
            clearable
            style="width: 240px"
            @keyup.enter="loadActivities"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button type="primary" @click="loadActivities">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </div>

      <div class="stats-bar mb-20" v-if="activities.length">
        <div class="stat-item">
          <span class="stat-num">{{ stats.total }}</span>
          <span class="stat-label">个活动</span>
        </div>
        <div class="stat-item">
          <span class="stat-num highlight">{{ stats.recruiting }}</span>
          <span class="stat-label">个招募中</span>
        </div>
        <div class="stat-item">
          <span class="stat-num">{{ stats.myOrganized }}</span>
          <span class="stat-label">个我发起</span>
        </div>
        <div class="stat-item">
          <span class="stat-num">{{ stats.myJoined }}</span>
          <span class="stat-label">个我参与</span>
        </div>
      </div>

      <div v-if="activities.length" class="grid grid-3 gap-20">
        <ActivityCard
          v-for="activity in activities"
          :key="activity.id"
          :activity="activity"
          @join="handleJoin"
          @leave="handleLeave"
          @edit="handleEdit"
          @delete="handleDelete"
        />
      </div>
      <div v-else class="empty-state">
        <el-icon><Calendar /></el-icon>
        <p v-if="loading">加载中...</p>
        <p v-else-if="!userStore.isLoggedIn">请先登录以查看和参与音乐活动</p>
        <p v-else>暂无符合条件的活动，<router-link to="/publish/activity" class="link">立即发起一个</router-link>吧！</p>
      </div>
    </div>

    <el-dialog v-model="showJoinDialog" title="报名活动" width="450px" v-if="currentActivity">
      <div class="join-info">
        <h3>{{ currentActivity.title }}</h3>
        <p class="time"><el-icon><Clock /></el-icon> {{ currentActivity.meetTime }}</p>
        <p class="location"><el-icon><Location /></el-icon> {{ currentActivity.location }}</p>
      </div>
      <el-form :model="joinForm" label-width="100px">
        <el-form-item label="使用乐器" v-if="currentActivity.neededInstruments && currentActivity.neededInstruments.length">
          <el-select v-model="joinForm.instrument" placeholder="选择您的乐器" style="width: 100%">
            <el-option
              v-for="inst in availableInstruments"
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
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { activityApi } from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh, Clock, Location, Calendar } from '@element-plus/icons-vue'
import ActivityCard from '../components/ActivityCard.vue'

const router = useRouter()
const userStore = useUserStore()
const requireLogin = inject('requireLogin', () => router.push('/login'))

const loading = ref(false)
const joining = ref(false)
const activities = ref([])
const currentActivity = ref(null)
const showJoinDialog = ref(false)

const filters = reactive({
  type: '',
  status: '',
  keyword: '',
  myFilter: 'all'
})

const joinForm = reactive({
  instrument: '',
  message: ''
})

const stats = computed(() => {
  const all = activities.value
  return {
    total: all.length,
    recruiting: all.filter(a => a.status === 'recruiting').length,
    myOrganized: all.filter(a => a.isOrganizer).length,
    myJoined: all.filter(a => a.isParticipant && !a.isOrganizer).length
  }
})

const availableInstruments = computed(() => {
  if (!currentActivity.value?.neededInstruments) return []
  return currentActivity.value.neededInstruments
})

const loadActivities = async () => {
  if (!userStore.isLoggedIn) return
  
  loading.value = true
  try {
    const params = {
      currentUserId: userStore.userId
    }
    if (filters.type) params.type = filters.type
    if (filters.status) params.status = filters.status
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.myFilter === 'organized') params.organizerId = userStore.userId

    let result = await activityApi.list(params)

    if (filters.myFilter === 'joined') {
      result = result.filter(a => a.isParticipant && !a.isOrganizer)
    }

    activities.value = result
  } catch (e) {
    ElMessage.error('加载活动列表失败')
  } finally {
    loading.value = false
  }
}

const handleJoin = (activity) => {
  if (!userStore.isLoggedIn) {
    requireLogin()
    return
  }
  currentActivity.value = activity
  joinForm.instrument = activity.neededInstruments?.[0]?.instrument || ''
  joinForm.message = ''
  showJoinDialog.value = true
}

const confirmJoin = async () => {
  if (!currentActivity.value) return
  
  joining.value = true
  try {
    await activityApi.join(currentActivity.value.id, {
      instrument: joinForm.instrument
    })
    ElMessage.success('报名成功！')
    showJoinDialog.value = false
    loadActivities()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '报名失败，请重试')
  } finally {
    joining.value = false
  }
}

const handleLeave = (activity) => {
  ElMessageBox.confirm('确定要退出此活动吗？', '提示', {
    confirmButtonText: '确定退出',
    cancelButtonText: '再想想',
    type: 'warning'
  }).then(async () => {
    try {
      await activityApi.leave(activity.id)
      ElMessage.success('已退出活动')
      loadActivities()
    } catch (e) {
      ElMessage.error(e.response?.data?.error || '操作失败')
    }
  }).catch(() => {})
}

const handleEdit = (activity) => {
  router.push(`/publish/activity?id=${activity.id}`)
}

const handleDelete = (activity) => {
  ElMessageBox.confirm('确定要删除此活动吗？此操作不可恢复。', '警告', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'error'
  }).then(async () => {
    try {
      await activityApi.remove(activity.id)
      ElMessage.success('活动已删除')
      loadActivities()
    } catch (e) {
      ElMessage.error(e.response?.data?.error || '删除失败')
    }
  }).catch(() => {})
}

onMounted(() => {
  if (userStore.isLoggedIn) {
    loadActivities()
  }
})
</script>

<style scoped>
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.create-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: white;
  color: var(--primary-color);
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.2s;
}

.create-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.filter-row {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-group label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.stats-bar {
  display: flex;
  gap: 30px;
  padding: 16px 24px;
  background: white;
  border-radius: 12px;
  box-shadow: var(--card-shadow);
}

.stat-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.stat-num {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-num.highlight {
  color: var(--primary-color);
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.join-info {
  background: var(--bg-light);
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.join-info h3 {
  font-size: 16px;
  margin: 0 0 10px 0;
  color: var(--text-primary);
}

.join-info p {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  margin: 4px 0;
}

.link {
  color: var(--primary-color);
  font-weight: 500;
}

.link:hover {
  text-decoration: underline;
}
</style>
