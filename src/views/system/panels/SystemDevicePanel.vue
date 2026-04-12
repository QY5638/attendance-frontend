<template>
  <section class="panel-card">
    <header class="panel-card__header">
      <div>
        <h2>打卡地点管理</h2>
        <p>维护打卡地点档案信息，用于地点管理和启停控制。</p>
      </div>
      <button type="button" class="panel-card__primary" @click="openCreateDialog">新增地点</button>
    </header>

    <section class="panel-card__hero-strip">
      <article>
        <span>配置目标</span>
          <strong>打卡地点档案</strong>
      </article>
      <article>
        <span>能力范围</span>
          <strong>地点维护 / 启停控制</strong>
      </article>
    </section>

    <form class="panel-card__filters" @submit.prevent="handleSearch">
      <label>
        <span>关键词</span>
        <input v-model="filters.keyword" type="text" placeholder="地点名称、地点地址或地点编号" />
      </label>
      <label>
        <span>状态</span>
        <select v-model="filters.status">
          <option value="">全部状态</option>
          <option :value="1">启用</option>
          <option :value="0">停用</option>
        </select>
      </label>
      <div class="panel-card__filter-actions">
        <button type="submit" class="panel-card__primary">查询</button>
        <button type="button" @click="handleReset">重置</button>
      </div>
    </form>

    <p v-if="error" class="panel-card__feedback panel-card__feedback--error">{{ error }}</p>
    <p v-else-if="notice" class="panel-card__feedback panel-card__feedback--success">{{ notice }}</p>

    <div class="panel-card__table-wrapper">
      <table class="panel-card__table">
        <thead>
          <tr>
            <th>地点编号</th>
            <th>管理名称</th>
            <th>打卡地点</th>
            <th>状态</th>
            <th>说明</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6">加载中...</td>
          </tr>
          <tr v-else-if="!rows.length">
            <td colspan="6">暂无打卡地点档案</td>
          </tr>
          <tr v-for="row in rows" :key="row.deviceId">
            <td>{{ formatDeviceIdentifier(row.deviceId) }}</td>
            <td>{{ row.name || '-' }}</td>
            <td>
              <div class="panel-card__location-cell">
                <span>{{ row.location || '-' }}</span>
                <small>有效半径 {{ row.radiusMeters || 30 }} 米</small>
                <small v-if="hasCoordinatePair(row)">
                  经度 {{ formatCoordinate(row.longitude) }} / 纬度 {{ formatCoordinate(row.latitude) }}
                </small>
                <small v-else>未维护地点坐标</small>
              </div>
            </td>
            <td>
              <span :class="['panel-card__status', row.status === 1 ? 'is-active' : 'is-inactive']">
                {{ row.status === 1 ? '启用' : '停用' }}
              </span>
            </td>
            <td>{{ row.description || '-' }}</td>
            <td>
              <div class="panel-card__actions">
                <button type="button" @click="openEditDialog(row)">编辑</button>
                <button type="button" @click="handleToggleStatus(row)">
                  {{ row.status === 1 ? '停用' : '启用' }}
                </button>
                <button type="button" class="is-danger" @click="handleDelete(row)">删除</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer class="panel-card__footer">
      <span>第 {{ pagination.pageNum }} / {{ totalPages }} 页，共 {{ pagination.total }} 条</span>
      <div class="panel-card__actions">
        <button type="button" :disabled="pagination.pageNum <= 1" @click="changePage(-1)">上一页</button>
        <button type="button" :disabled="pagination.pageNum >= totalPages" @click="changePage(1)">下一页</button>
      </div>
    </footer>

    <div v-if="dialogVisible" class="panel-card__modal">
      <div class="panel-card__dialog">
        <div class="panel-card__dialog-head">
          <div>
            <strong>{{ editingId ? '编辑打卡地点' : '新增打卡地点' }}</strong>
            <p>地点编号用于档案管理，请按单位规则填写并保持唯一。</p>
          </div>
          <button type="button" class="panel-card__icon-btn" @click="dialogVisible = false">关闭</button>
        </div>

        <form class="panel-card__dialog-form" @submit.prevent="handleSubmit">
          <label>
            <span>地点编号</span>
            <input v-if="!editingId" v-model="form.deviceId" type="text" placeholder="例如 LOC-A" />
            <input v-else :value="formatDeviceIdentifier(form.deviceId)" type="text" disabled />
          </label>
          <label>
            <span>管理名称</span>
            <input v-model="form.name" type="text" placeholder="例如 行政办公区主点位" />
          </label>
          <label>
            <span>打卡地点</span>
            <input v-model="form.location" type="text" placeholder="例如 办公区A" />
          </label>
          <div class="panel-card__full-width panel-card__location-tools">
            <label class="panel-card__location-search">
              <span>地图地点名称</span>
              <input v-model="locationSearchKeyword" type="text" placeholder="输入真实地图地点名称，例如 办公区A" />
            </label>
            <div class="panel-card__location-actions">
              <button type="button" :disabled="locationSearchLoading" @click="handleSearchLocationByName">
                {{ locationSearchLoading ? '定位中...' : '按地点名称定位' }}
              </button>
              <button type="button" :disabled="currentLocationLoading" @click="handleUseCurrentLocation">
                {{ currentLocationLoading ? '获取中...' : '使用当前位置' }}
              </button>
            </div>
          </div>
          <label>
            <span>打卡半径（米）</span>
            <input v-model.number="form.radiusMeters" type="number" min="1" max="50" placeholder="最多50米" />
          </label>
          <div class="panel-card__full-width panel-card__map-card">
            <div class="panel-card__map-head">
              <div>
                <strong>地点预览</strong>
                <p>可通过地点名称搜索或当前位置设点完成设置，系统会自动保存对应坐标。</p>
              </div>
              <span>{{ coordinateSummary }} / 半径 {{ form.radiusMeters || 30 }} 米</span>
            </div>
            <p v-if="mapError" class="panel-card__feedback panel-card__feedback--error">{{ mapError }}</p>
            <p v-else-if="mapLoading" class="panel-card__feedback">地图加载中...</p>
            <div ref="mapContainerRef" data-testid="system-device-map" class="panel-card__map"></div>
            <p class="panel-card__map-note">建议优先使用地图选点，确保地点档案与办公区域保持一致。</p>
          </div>
          <label>
            <span>状态</span>
            <select v-model="form.status">
              <option :value="1">启用</option>
              <option :value="0">停用</option>
            </select>
          </label>
          <label class="panel-card__full-width">
            <span>说明</span>
            <textarea v-model="form.description" rows="3" placeholder="请输入地点说明"></textarea>
          </label>
          <div class="panel-card__dialog-actions panel-card__full-width">
            <button type="button" @click="dialogVisible = false">取消</button>
            <button type="submit" class="panel-card__primary" :disabled="submitting">
              {{ submitting ? '保存中...' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

import { addDevice, deleteDevice, fetchDeviceList, updateDevice, updateDeviceStatus } from '../../../api/system'
import { loadAmapPlugins, loadAmapSdk } from '../../../utils/amap'

const DEFAULT_MAP_CENTER = [116.397128, 39.916527]

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const editingId = ref('')
const rows = ref([])
const error = ref('')
const notice = ref('')
const mapContainerRef = ref(null)
const mapError = ref('')
const mapLoading = ref(false)
const locationSearchKeyword = ref('')
const locationSearchLoading = ref(false)
const currentLocationLoading = ref(false)
let dialogMap = null
let dialogMarker = null

const filters = reactive({
  keyword: '',
  status: '',
})

const pagination = reactive({
  pageNum: 1,
  pageSize: 10,
  total: 0,
})

const form = reactive({
  deviceId: '',
  name: '',
  location: '',
  longitude: '',
  latitude: '',
  radiusMeters: 30,
  description: '',
  status: 1,
})

const totalPages = computed(() => Math.max(1, Math.ceil(pagination.total / pagination.pageSize) || 1))
const coordinateSummary = computed(() => {
  if (!hasCoordinatePair(form)) {
    return '未设置位置坐标'
  }

  return `经度 ${formatCoordinate(form.longitude)} / 纬度 ${formatCoordinate(form.latitude)}`
})

function buildListParams() {
  const params = {
    pageNum: pagination.pageNum,
    pageSize: pagination.pageSize,
  }

  if (filters.keyword.trim()) {
    params.keyword = filters.keyword.trim()
  }

  if (filters.status !== '' && filters.status !== null && filters.status !== undefined) {
    params.status = filters.status
  }

  return params
}

function resetForm() {
  editingId.value = ''
  form.deviceId = ''
  form.name = ''
  form.location = ''
  form.longitude = ''
  form.latitude = ''
  form.radiusMeters = 30
  form.description = ''
  form.status = 1
  locationSearchKeyword.value = ''
}

function formatCoordinate(value) {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return String(value)
  }

  return numericValue.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')
}

function formatDeviceIdentifier(deviceId) {
  const normalized = String(deviceId || '').trim()

  if (!normalized) {
    return '-'
  }

  const matched = normalized.match(/^(DEV|LOC)[-_]?(.+)$/i)
  if (matched?.[2]) {
    return `地点-${matched[2]}`
  }

  return normalized
}

function parseCoordinatePair(target = form) {
  if (target.longitude === '' || target.longitude === null || target.longitude === undefined) {
    return null
  }

  if (target.latitude === '' || target.latitude === null || target.latitude === undefined) {
    return null
  }

  const longitude = Number(target.longitude)
  const latitude = Number(target.latitude)

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null
  }

  return [longitude, latitude]
}

function hasCoordinatePair(target = form) {
  return Boolean(parseCoordinatePair(target))
}

function setFormCoordinates(longitude, latitude) {
  form.longitude = formatCoordinate(longitude)
  form.latitude = formatCoordinate(latitude)
}

function setFormLocation(locationText, longitude, latitude) {
  form.location = locationText || form.location
  setFormCoordinates(longitude, latitude)
}

function readMapClickCoordinates(event) {
  const lnglat = event?.lnglat
  if (!lnglat) {
    return null
  }

  const longitude = typeof lnglat.getLng === 'function' ? lnglat.getLng() : lnglat.lng
  const latitude = typeof lnglat.getLat === 'function' ? lnglat.getLat() : lnglat.lat
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null
  }

  return [longitude, latitude]
}

function destroyDialogMap() {
  if (dialogMap && typeof dialogMap.destroy === 'function') {
    dialogMap.destroy()
  }

  dialogMap = null
  dialogMarker = null
}

function syncDialogMapFromForm() {
  const coordinates = parseCoordinatePair()
  if (!dialogMap || !dialogMarker || !coordinates) {
    return
  }

  dialogMap.setCenter?.(coordinates)
  dialogMarker.setPosition?.(coordinates)
}

async function ensureDialogMap() {
  if (!dialogVisible.value) {
    return
  }

  await nextTick()
  if (!mapContainerRef.value) {
    return
  }

  try {
    mapLoading.value = true
    mapError.value = ''
    const AMap = await loadAmapSdk()
    if (!mapContainerRef.value) {
      return
    }

    const coordinates = parseCoordinatePair() || DEFAULT_MAP_CENTER
    if (!dialogMap) {
      dialogMap = new AMap.Map(mapContainerRef.value, {
        resizeEnable: true,
        zoom: 15,
        center: coordinates,
      })
      dialogMarker = new AMap.Marker({
        map: dialogMap,
        position: coordinates,
      })
    }

    syncDialogMapFromForm()
  } catch (requestError) {
    destroyDialogMap()
    mapError.value = requestError?.message || '地图加载失败，请稍后重试'
  } finally {
    mapLoading.value = false
  }
}

async function loadList() {
  loading.value = true
  error.value = ''

  try {
    const { total, items } = await fetchDeviceList(buildListParams())
    rows.value = items
    pagination.total = total
  } catch (requestError) {
    rows.value = []
    pagination.total = 0
    error.value = requestError?.message || '打卡地点列表加载失败'
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.pageNum = 1
  notice.value = ''
  void loadList()
}

function handleReset() {
  filters.keyword = ''
  filters.status = ''
  pagination.pageNum = 1
  notice.value = ''
  void loadList()
}

function openCreateDialog() {
  resetForm()
  dialogVisible.value = true
}

function openEditDialog(row) {
  editingId.value = row.deviceId || ''
  form.deviceId = row.deviceId || ''
  form.name = row.name || ''
  form.location = row.location || ''
  form.longitude = formatCoordinate(row.longitude)
  form.latitude = formatCoordinate(row.latitude)
  form.radiusMeters = row.radiusMeters ?? 30
  form.description = row.description || ''
  form.status = row.status ?? 1
  locationSearchKeyword.value = row.location || row.name || ''
  dialogVisible.value = true
}

async function handleSubmit() {
  if (submitting.value) {
    return
  }

  if (!form.deviceId.trim() || !form.name.trim()) {
    error.value = '请完整填写地点编号和管理名称'
    return
  }

  if (!form.location.trim() || !hasCoordinatePair(form)) {
    error.value = '请先通过地点名称定位或当前位置设点完成地点设置'
    return
  }

  submitting.value = true
  error.value = ''

  try {
    if (editingId.value) {
      await updateDevice(form)
      notice.value = '打卡地点更新成功'
    } else {
      await addDevice(form)
      notice.value = '打卡地点新增成功'
    }

    ElMessage.success(notice.value)
    dialogVisible.value = false
    await loadList()
  } catch (requestError) {
    error.value = requestError?.message || '打卡地点保存失败'
  } finally {
    submitting.value = false
  }
}

async function handleToggleStatus(row) {
  error.value = ''
  notice.value = ''

  try {
    await updateDeviceStatus({
      deviceId: row.deviceId,
      status: row.status === 1 ? 0 : 1,
    })
    notice.value = `打卡地点“${formatDeviceIdentifier(row.deviceId)}”状态已更新`
    ElMessage.success(notice.value)
    await loadList()
  } catch (requestError) {
    error.value = requestError?.message || '打卡地点状态更新失败'
  }
}

async function resolveAddressFromCoordinates(longitude, latitude) {
  const AMap = await loadAmapPlugins(['AMap.Geocoder'])
  const geocoder = new AMap.Geocoder()

  return new Promise((resolve, reject) => {
    geocoder.getAddress([longitude, latitude], (status, result) => {
      if (status !== 'complete' || !result?.regeocode) {
        reject(new Error('当前坐标未找到可用地点，请重试'))
        return
      }

      const address = result.regeocode.formattedAddress || ''
      const poiName = result.regeocode.pois?.[0]?.name || ''
      resolve({
        location: poiName || address,
        description: address,
      })
    })
  })
}

async function handleSearchLocationByName() {
  const keyword = locationSearchKeyword.value.trim()
  if (!keyword) {
    error.value = '请输入真实地图地点名称后再定位'
    return
  }

  locationSearchLoading.value = true
  mapError.value = ''
  error.value = ''

  try {
    const AMap = await loadAmapPlugins(['AMap.Geocoder'])
    const geocoder = new AMap.Geocoder()
    const geocodeResult = await new Promise((resolve, reject) => {
      geocoder.getLocation(keyword, (status, result) => {
        if (status !== 'complete' || !result?.geocodes?.length) {
          reject(new Error('未找到对应地点，请换一个更准确的地点名称'))
          return
        }
        resolve(result.geocodes[0])
      })
    })

    const longitude = Number(geocodeResult.location?.lng)
    const latitude = Number(geocodeResult.location?.lat)
    setFormLocation(geocodeResult.formattedAddress || keyword, longitude, latitude)
    if (!form.name.trim()) {
      form.name = `${keyword}点位`
    }
    if (!form.description.trim()) {
      form.description = geocodeResult.formattedAddress || keyword
    }
    await ensureDialogMap()
    syncDialogMapFromForm()
  } catch (requestError) {
    error.value = requestError?.message || '地点名称定位失败'
  } finally {
    locationSearchLoading.value = false
  }
}

async function handleUseCurrentLocation() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    error.value = '当前浏览器不支持定位，请改用地点名称定位'
    return
  }

  currentLocationLoading.value = true
  mapError.value = ''
  error.value = ''

  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      })
    })

    const longitude = Number(position.coords.longitude)
    const latitude = Number(position.coords.latitude)
    const addressInfo = await resolveAddressFromCoordinates(longitude, latitude)
    setFormLocation(addressInfo.location, longitude, latitude)
    locationSearchKeyword.value = addressInfo.location
    if (!form.name.trim()) {
      form.name = `${addressInfo.location}点位`
    }
    if (!form.description.trim()) {
      form.description = addressInfo.description
    }
    await ensureDialogMap()
    syncDialogMapFromForm()
  } catch (requestError) {
    error.value = requestError?.message || '当前位置获取失败，请检查定位权限'
  } finally {
    currentLocationLoading.value = false
  }
}

async function handleDelete(row) {
  const confirmed = typeof window === 'undefined' || typeof window.confirm !== 'function'
    ? true
    : window.confirm(`确定删除打卡地点档案“${formatDeviceIdentifier(row.deviceId)}”吗？`)

  if (!confirmed) {
    return
  }

  error.value = ''
  notice.value = ''

  try {
    await deleteDevice(row.deviceId)
    if (rows.value.length === 1 && pagination.pageNum > 1) {
      pagination.pageNum -= 1
    }
    notice.value = '打卡地点档案删除成功'
    ElMessage.success(notice.value)
    await loadList()
  } catch (requestError) {
    error.value = requestError?.message || '打卡地点档案删除失败'
  }
}

function changePage(step) {
  const nextPage = Math.min(Math.max(1, pagination.pageNum + step), totalPages.value)

  if (nextPage === pagination.pageNum) {
    return
  }

  pagination.pageNum = nextPage
  void loadList()
}

onMounted(() => {
  void loadList()
})

watch(dialogVisible, (visible) => {
  if (!visible) {
    mapError.value = ''
    mapLoading.value = false
    destroyDialogMap()
    return
  }

  void ensureDialogMap()
})

watch(() => [form.longitude, form.latitude], () => {
  syncDialogMapFromForm()
})

onBeforeUnmount(() => {
  destroyDialogMap()
})
</script>

<style scoped>
.panel-card {
  padding: 24px;
  border-radius: 24px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 18px 60px rgba(15, 23, 42, 0.08);
}

.panel-card__hero-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.panel-card__hero-strip article {
  padding: 16px 18px;
  border-radius: 18px;
  background: rgba(47, 105, 178, 0.08);
}

.panel-card__hero-strip span,
.panel-card__hero-strip strong {
  display: block;
}

.panel-card__hero-strip span {
  font-size: 12px;
  color: #2f69b2;
}

.panel-card__hero-strip strong {
  margin-top: 8px;
  color: #0f172a;
}

.panel-card__header,
.panel-card__footer,
.panel-card__filters,
.panel-card__actions,
.panel-card__dialog-head,
.panel-card__dialog-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-card__header {
  margin-bottom: 20px;
}

.panel-card__header h2 {
  margin: 0;
  font-size: 22px;
  color: #0f172a;
}

.panel-card__header p,
.panel-card__dialog-head p {
  margin: 8px 0 0;
  color: #64748b;
  line-height: 1.6;
}

.panel-card__filters {
  align-items: end;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.panel-card__filters label,
.panel-card__dialog-form label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 180px;
  color: #334155;
  font-size: 14px;
}

.panel-card__location-tools {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
}

.panel-card__location-search {
  min-width: 0 !important;
}

.panel-card__location-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.panel-card input,
.panel-card select,
.panel-card textarea,
.panel-card button {
  font: inherit;
}

.panel-card input,
.panel-card select,
.panel-card textarea {
  padding: 10px 12px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 12px;
  background: #ffffff;
}

.panel-card textarea {
  resize: vertical;
}

.panel-card button {
  padding: 10px 14px;
  border: 0;
  border-radius: 12px;
  background: rgba(148, 163, 184, 0.18);
  color: #0f172a;
  cursor: pointer;
}

.panel-card button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.panel-card__primary {
  background: linear-gradient(135deg, #245391 0%, #2f69b2 100%) !important;
  color: #ffffff !important;
}

.panel-card__feedback {
  margin: 0 0 16px;
  padding: 12px 14px;
  border-radius: 14px;
}

.panel-card__feedback--error {
  background: rgba(248, 113, 113, 0.12);
  color: #b91c1c;
}

.panel-card__feedback--success {
  background: rgba(34, 197, 94, 0.12);
  color: #166534;
}

.panel-card__table-wrapper {
  overflow-x: auto;
}

.panel-card__table {
  width: 100%;
  border-collapse: collapse;
}

.panel-card__table th,
.panel-card__table td {
  padding: 14px 12px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  text-align: left;
  vertical-align: top;
}

.panel-card__location-cell {
  display: grid;
  gap: 6px;
}

.panel-card__location-cell small {
  width: fit-content;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.14);
  color: #64748b;
}

.panel-card__status {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.panel-card__status.is-active {
  background: rgba(34, 197, 94, 0.12);
  color: #166534;
}

.panel-card__status.is-inactive {
  background: rgba(148, 163, 184, 0.18);
  color: #475569;
}

.panel-card__actions {
  flex-wrap: wrap;
}

.panel-card__actions .is-danger {
  background: rgba(248, 113, 113, 0.12);
  color: #b91c1c;
}

.panel-card__footer {
  margin-top: 16px;
}

.panel-card__map-card {
  display: grid;
  gap: 12px;
}

.panel-card__map-note {
  margin: 0;
  color: #64748b;
  line-height: 1.7;
}

.panel-card__map-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.panel-card__map-head span {
  color: #245391;
  font-size: 13px;
  font-weight: 600;
}

.panel-card__map {
  min-height: 260px;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: linear-gradient(135deg, rgba(47, 105, 178, 0.08), rgba(15, 95, 148, 0.12));
}

.panel-card__modal {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px;
  overflow-y: auto;
  background: rgba(15, 23, 42, 0.42);
  z-index: 80;
}

.panel-card__dialog {
  width: min(720px, 100%);
  max-height: calc(100vh - 48px);
  margin: auto 0;
  padding: 24px;
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-card__dialog-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 20px;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.panel-card__map-card {
  display: grid;
  gap: 12px;
}

.panel-card__map-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.panel-card__map-head span {
  color: #245391;
  font-size: 13px;
  font-weight: 600;
}

.panel-card__map {
  min-height: 260px;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: linear-gradient(135deg, rgba(47, 105, 178, 0.08), rgba(15, 95, 148, 0.12));
}

.panel-card__full-width {
  grid-column: 1 / -1;
}

.panel-card__icon-btn {
  background: rgba(148, 163, 184, 0.16) !important;
}

.panel-card__dialog-actions {
  position: sticky;
  bottom: 0;
  padding-top: 8px;
  padding-bottom: 4px;
  background: #ffffff;
}

@media (max-width: 960px) {
  .panel-card__header,
  .panel-card__footer,
  .panel-card__dialog-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .panel-card__dialog-form {
    grid-template-columns: 1fr;
  }

  .panel-card__map-head {
    flex-direction: column;
  }

  .panel-card__location-tools {
    grid-template-columns: 1fr;
  }
}
</style>
