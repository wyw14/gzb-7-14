<template>
  <div class="activity-card card">
    <div class="card-header">
      <div class="type-badge" :class="'type-' + activity.type">
        {{ activity.typeName }}
      </div>
      <div class="status-badge" :class="'status-' + activity.status">
        {{ statusText }}
      </div>
    </div>

    <router-link :to="`/activities/${activity.id}`" class="activity-title">
      {{ activity.title }}
    </router-link>

    <p class="activity-desc">{{ activity.description }}</p>

    <div class="info-row" v-if="activity.pieces && activity.pieces.length">
      <el-icon><Notebook /></el-icon>
      <span class="label">曲目：</span>
      <span class="value">{{ activity.pieces.slice(0, 3).join('、') }}</span>
      <span v-if="activity.pieces.length > 3" class="more">等{{ activity.pieces.length }}首</span>
    </div>

    <div class="info-row">
      <el-icon><Clock /></el-icon>
      <span class="label">时间：</span>
      <span class="value">{{ activity.meetTime }}</span>
      <span v-if="activity.endTime" class="end-time"> ~ {{ activity.endTime }}</span>
    </div>

    <div class="info-row">
      <el-icon><Location /></el-icon>
      <span class="label">地点：</span>
      <span class="value">{{ activity.location }}</span>
    </div>

    <div class="instruments-section" v-if="activity.neededInstruments && activity.neededInstruments.length">
      <div class="section-title"><el-icon><Suitcase /></el-icon> 需要乐器</div>
      <div class="instrument-tags">
        <span v-for="inst in activity.neededInstruments" :key="inst.instrument" class="inst-tag">
          {{ inst.instrument }}
          <span class="count">{{ inst.signedUp || 0 }}/{{ inst.count }}</span>
        </span>
      </div>
    </div>

    <div class="card-footer">
      <div class="organizer">
        <img v-if="activity.organizer" :src="activity.organizer.avatar" class="avatar-xs" />
        <span class="organizer-name">{{ activity.organizer?.username || '未知用户' }}</span>
      </div>
      <div class="participants">
        <el-icon><User /></el-icon>
        {{ activity.signedUpCount || 0 }}/{{ activity.maxParticipants }}人
      </div>
    </div>

    <div class="action-bar" v-if="showActions">
      <template v-if="activity.isOrganizer">
        <el-button type="primary" size="small" @click.stop="$emit('edit', activity)">
          <el-icon><Edit /></el-icon>
          编辑
        </el-button>
        <el-button type="danger" size="small" @click.stop="$emit('delete', activity)">
          <el-icon><Delete /></el-icon>
          删除
        </el-button>
      </template>
      <template v-else-if="activity.isParticipant">
        <el-button type="success" size="small" disabled>
          <el-icon><Check /></el-icon>
          已报名
        </el-button>
        <el-button size="small" @click.stop="$emit('leave', activity)">
          退出
        </el-button>
      </template>
      <template v-else>
        <el-button 
          type="primary" 
          size="small" 
          :disabled="activity.status !== 'recruiting' || (activity.signedUpCount || 0) >= activity.maxParticipants"
          @click.stop="$emit('join', activity)"
        >
          <el-icon><Plus /></el-icon>
          立即报名
        </el-button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Notebook, Clock, Location, Suitcase, User, Edit, Delete, Check, Plus } from '@element-plus/icons-vue'

const props = defineProps({
  activity: { type: Object, required: true },
  showActions: { type: Boolean, default: true }
})

defineEmits(['join', 'leave', 'edit', 'delete'])

const statusText = computed(() => {
  const map = {
    recruiting: '招募中',
    full: '已满员',
    ongoing: '进行中',
    completed: '已结束',
    cancelled: '已取消'
  }
  return map[props.activity.status] || props.activity.status
})
</script>

<style scoped>
.activity-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: all 0.2s;
}

.activity-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.type-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
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
  padding: 3px 10px;
  border-radius: 8px;
  font-size: 11px;
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
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.activity-title:hover {
  color: var(--primary-color);
}

.activity-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  margin-bottom: 8px;
  color: var(--text-secondary);
}

.info-row .label {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.info-row .value {
  color: var(--text-primary);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.end-time {
  color: var(--text-secondary);
}

.more {
  color: var(--primary-color);
  font-size: 12px;
}

.instruments-section {
  margin: 12px 0;
  padding: 12px 0;
  border-top: 1px dashed var(--border-color);
  border-bottom: 1px dashed var(--border-color);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.instrument-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.inst-tag {
  background: #eef2ff;
  color: var(--primary-dark);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
}

.inst-tag .count {
  color: var(--text-secondary);
  margin-left: 4px;
  font-weight: 400;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 12px;
}

.organizer {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.avatar-xs {
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.organizer-name {
  font-weight: 500;
  color: var(--text-primary);
}

.participants {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.action-bar {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.action-bar .el-button {
  flex: 1;
}
</style>
