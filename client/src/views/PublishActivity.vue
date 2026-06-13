<template>
  <div class="publish-activity-page">
    <div class="page-header">
      <div class="container">
        <h1>🎵 发起音乐活动</h1>
        <p>邀请志同道合的伙伴一起练习、演奏、交流</p>
      </div>
    </div>

    <div class="container">
      <div class="form-wrap card">
        <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" @submit.prevent>
          <el-divider content-position="left">活动类型</el-divider>

          <el-form-item label="活动类型" prop="type">
            <el-radio-group v-model="form.type" class="type-radio-group">
              <el-radio-button value="practice">
                <div class="radio-content">
                  <div class="radio-icon">🎸</div>
                  <div class="radio-title">小型练习会</div>
                  <div class="radio-desc">3-6人的小型练习聚会</div>
                </div>
              </el-radio-button>
              <el-radio-button value="duet">
                <div class="radio-content">
                  <div class="radio-icon">🎹</div>
                  <div class="radio-title">二重奏</div>
                  <div class="radio-desc">两人组合合作演奏</div>
                </div>
              </el-radio-button>
              <el-radio-button value="ensemble">
                <div class="radio-content">
                  <div class="radio-icon">🎻</div>
                  <div class="radio-title">合奏排练</div>
                  <div class="radio-desc">多人合奏曲目排练</div>
                </div>
              </el-radio-button>
              <el-radio-button value="offline">
                <div class="radio-content">
                  <div class="radio-icon">☕</div>
                  <div class="radio-title">线下交流</div>
                  <div class="radio-desc">音乐爱好者聚会交流</div>
                </div>
              </el-radio-button>
            </el-radio-group>
          </el-form-item>

          <el-divider content-position="left">基本信息</el-divider>

          <el-form-item label="活动标题" prop="title">
            <el-input v-model="form.title" placeholder="如：周末古典吉他合奏练习" style="max-width: 500px" maxlength="50" show-word-limit />
          </el-form-item>

          <el-form-item label="活动描述" prop="description">
            <el-input v-model="form.description" type="textarea" :rows="4" placeholder="介绍一下活动内容、适合人群、需要准备的东西等" style="max-width: 600px" maxlength="500" show-word-limit />
          </el-form-item>

          <el-form-item label="演奏曲目">
            <div class="pieces-input">
              <el-input
                v-for="(piece, idx) in form.pieces"
                :key="idx"
                v-model="form.pieces[idx]"
                :placeholder="`曲目 ${idx + 1}`"
                style="max-width: 400px; margin-bottom: 8px"
              />
            </div>
            <el-button size="small" type="primary" plain @click="addPiece" :disabled="form.pieces.length >= 10">
              <el-icon><Plus /></el-icon>
              添加曲目
            </el-button>
          </el-form-item>

          <el-divider content-position="left">时间地点</el-divider>

          <el-form-item label="开始时间" prop="meetTime">
            <el-date-picker
              v-model="form.meetTime"
              type="datetime"
              placeholder="选择开始时间"
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm"
              style="width: 300px"
            />
          </el-form-item>

          <el-form-item label="结束时间" prop="endTime">
            <el-date-picker
              v-model="form.endTime"
              type="datetime"
              placeholder="选择结束时间（可选）"
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm"
              style="width: 300px"
            />
          </el-form-item>

          <el-form-item label="活动地点" prop="location">
            <el-input v-model="form.location" placeholder="建议选择公共空间，如咖啡馆、音乐教室等" style="max-width: 500px" />
          </el-form-item>

          <el-divider content-position="left">招募信息</el-divider>

          <el-form-item label="最大人数" prop="maxParticipants">
            <el-input-number v-model="form.maxParticipants" :min="2" :max="50" />
            <span class="form-tip">人（包括您自己）</span>
          </el-form-item>

          <el-form-item label="需要乐器" v-if="form.type !== 'offline'">
            <div class="instruments-input">
              <div v-for="(inst, idx) in form.neededInstruments" :key="idx" class="instrument-row">
                <el-select v-model="inst.instrument" placeholder="选择乐器" style="width: 180px">
                  <el-option v-for="cat in instrumentCategories" :key="cat" :label="cat" :value="cat" />
                </el-select>
                <span class="inst-label">需要</span>
                <el-input-number v-model="inst.count" :min="1" :max="20" size="small" />
                <span class="inst-label">人</span>
                <el-button type="danger" text @click="removeInstrument(idx)" :disabled="form.neededInstruments.length <= 1">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
            <el-button size="small" type="primary" plain @click="addInstrument" :disabled="form.neededInstruments.length >= 8">
              <el-icon><Plus /></el-icon>
              添加乐器
            </el-button>
          </el-form-item>

          <el-form-item label="注意事项">
            <el-input v-model="form.notes" type="textarea" :rows="3" placeholder="如：请自带乐器、场地低消等注意事项" style="max-width: 600px" />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" size="large" :loading="submitting" @click="submit">
              <el-icon><Upload /></el-icon>
              {{ isEdit ? '保存修改' : '发起活动' }}
            </el-button>
            <el-button size="large" @click="$router.back()">取消</el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../stores/user'
import { activityApi } from '../api'
import { ElMessage } from 'element-plus'
import { Plus, Upload, Delete } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const formRef = ref(null)
const submitting = ref(false)

const instrumentCategories = ['古典吉他', '尤克里里', '小提琴', '钢琴', '电子琴', '架子鼓', '竹笛', '洞箫', '陶埙', '卡洪鼓', '萨克斯', '长笛', '口琴', '古筝', '二胡', '琵琶', '手风琴', '小号', '大提琴', '其他']

const editId = computed(() => route.query.id)
const isEdit = computed(() => !!editId.value)

const form = reactive({
  type: 'practice',
  title: '',
  description: '',
  pieces: [''],
  meetTime: '',
  endTime: '',
  location: '',
  latitude: 39.9042,
  longitude: 116.4074,
  neededInstruments: [
    { instrument: '古典吉他', count: 2, signedUp: 0 }
  ],
  maxParticipants: 6,
  notes: ''
})

const rules = {
  type: [{ required: true, message: '请选择活动类型', trigger: 'change' }],
  title: [{ required: true, message: '请输入活动标题', trigger: 'blur' }],
  description: [{ required: true, message: '请填写活动描述', trigger: 'blur' }],
  meetTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  location: [{ required: true, message: '请填写活动地点', trigger: 'blur' }],
  maxParticipants: [{ required: true, message: '请设置最大人数', trigger: 'blur' }]
}

const addPiece = () => {
  if (form.pieces.length < 10) {
    form.pieces.push('')
  }
}

const addInstrument = () => {
  if (form.neededInstruments.length < 8) {
    form.neededInstruments.push({ instrument: '', count: 1, signedUp: 0 })
  }
}

const removeInstrument = (idx) => {
  if (form.neededInstruments.length > 1) {
    form.neededInstruments.splice(idx, 1)
  }
}

const loadActivity = async () => {
  try {
    const activity = await activityApi.get(editId.value)
    form.type = activity.type
    form.title = activity.title
    form.description = activity.description
    form.pieces = activity.pieces.length ? activity.pieces : ['']
    form.meetTime = activity.meetTime
    form.endTime = activity.endTime || ''
    form.location = activity.location
    form.latitude = activity.latitude
    form.longitude = activity.longitude
    form.neededInstruments = activity.neededInstruments.length ? activity.neededInstruments : [{ instrument: '', count: 1, signedUp: 0 }]
    form.maxParticipants = activity.maxParticipants
    form.notes = activity.notes || ''
  } catch (e) {
    ElMessage.error('加载活动信息失败')
    router.push('/activities')
  }
}

const submit = async () => {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  if (form.endTime && form.endTime <= form.meetTime) {
    ElMessage.warning('结束时间必须晚于开始时间')
    return
  }

  const validPieces = form.pieces.filter(p => p.trim())
  const validInstruments = form.type === 'offline' ? [] : form.neededInstruments.filter(i => i.instrument && i.count > 0)

  if (form.type !== 'offline' && validInstruments.length === 0) {
    ElMessage.warning('请至少添加一种需要的乐器')
    return
  }

  submitting.value = true
  try {
    const submitData = {
      ...form,
      pieces: validPieces,
      neededInstruments: validInstruments
    }

    let result
    if (isEdit.value) {
      result = await activityApi.update(editId.value, submitData)
    } else {
      result = await activityApi.create(submitData)
    }

    if (result.success) {
      ElMessage.success(isEdit.value ? '修改成功！' : '发起成功！')
      router.push(`/activities/${result.activity.id}`)
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.error || (isEdit.value ? '修改失败，请重试' : '发起失败，请重试'))
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  if (isEdit.value) {
    loadActivity()
  }
})
</script>

<style scoped>
.type-radio-group {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  width: 100%;
}

.type-radio-group :deep(.el-radio-button) {
  width: 100%;
  margin: 0;
}

.type-radio-group :deep(.el-radio-button__inner) {
  width: 100%;
  padding: 20px 16px;
  border-radius: 12px !important;
  border: 2px solid var(--border-color);
  background: white;
  transition: all 0.2s;
}

.type-radio-group :deep(.el-radio-button__inner:hover) {
  border-color: var(--primary-color);
}

.type-radio-group :deep(.el-radio-button.is-active .el-radio-button__inner) {
  background: linear-gradient(135deg, #eef2ff, #e0e7ff);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.radio-content {
  text-align: center;
}

.radio-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.radio-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
}

.radio-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.form-wrap {
  max-width: 900px;
  margin: 0 auto;
  padding: 30px 40px;
}

.instrument-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.inst-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.form-tip {
  margin-left: 12px;
  font-size: 13px;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .type-radio-group {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
