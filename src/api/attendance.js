import request from '../utils/request'

function createCheckinPayload(payload = {}) {
  const { checkType, deviceId, deviceInfo, terminalId, clientLongitude, clientLatitude, imageData, livenessToken } = payload

  const nextPayload = {
    checkType,
    deviceId,
    deviceInfo,
    terminalId,
    clientLongitude,
    clientLatitude,
    imageData,
  }

  if (livenessToken) {
    nextPayload.livenessToken = livenessToken
  }

  return nextPayload
}

function createFaceVerifyPayload(payload = {}) {
  const { imageData, livenessToken, consumeLiveness } = payload

  const nextPayload = {
    imageData,
  }

  if (livenessToken) {
    nextPayload.livenessToken = livenessToken
  }

  if (consumeLiveness !== undefined) {
    nextPayload.consumeLiveness = consumeLiveness
  }

  return nextPayload
}

function createRepairPayload(payload = {}) {
  const { checkType, checkTime, repairReason, recordId } = payload

  return {
    checkType,
    checkTime,
    repairReason,
    recordId,
  }
}

function createAttendanceRecordParams(payload = {}) {
  const { pageNum, pageSize, startDate, endDate } = payload

  const params = {
    pageNum,
    pageSize,
  }

  if (startDate) {
    params.startDate = startDate
  }

  if (endDate) {
    params.endDate = endDate
  }

  return params
}

function createAttendanceListParams(payload = {}) {
  const { pageNum, pageSize, userId, deptId, checkType, status, startDate, endDate } = payload

  const params = {
    pageNum,
    pageSize,
  }

  if (userId !== '' && userId !== null && userId !== undefined) {
    params.userId = userId
  }

  if (deptId !== '' && deptId !== null && deptId !== undefined) {
    params.deptId = deptId
  }

  if (checkType) {
    params.checkType = checkType
  }

  if (status) {
    params.status = status
  }

  if (startDate) {
    params.startDate = startDate
  }

  if (endDate) {
    params.endDate = endDate
  }

  return params
}

function createAttendanceRepairListParams(payload = {}) {
  const { pageNum, pageSize, keyword, userId, deptId, checkType, status, startDate, endDate } = payload

  const params = {
    pageNum,
    pageSize,
  }

  if (keyword) {
    params.keyword = keyword
  }

  if (userId !== '' && userId !== null && userId !== undefined) {
    params.userId = userId
  }

  if (deptId !== '' && deptId !== null && deptId !== undefined) {
    params.deptId = deptId
  }

  if (checkType) {
    params.checkType = checkType
  }

  if (status) {
    params.status = status
  }

  if (startDate) {
    params.startDate = startDate
  }

  if (endDate) {
    params.endDate = endDate
  }

  return params
}

function createAttendanceRepairReviewPayload(payload = {}) {
  const { status, reviewComment } = payload

  return {
    status,
    reviewComment,
  }
}

export function getAttendanceDeviceOptionsRequest() {
  return request.get('/attendance/device-options')
}

export function submitAttendanceCheckinRequest(payload) {
  return request.post('/attendance/checkin', createCheckinPayload(payload))
}

export function getMyAttendanceRecordRequest(payload) {
  return request.get('/attendance/record/me', {
    params: createAttendanceRecordParams(payload),
  })
}

export function getAttendanceListRequest(payload) {
  return request.get('/attendance/list', {
    params: createAttendanceListParams(payload),
  })
}

export function submitAttendanceRepairRequest(payload) {
  return request.post('/attendance/repair', createRepairPayload(payload))
}

export function getAttendanceRepairListRequest(payload) {
  return request.get('/attendance/repair/list', {
    params: createAttendanceRepairListParams(payload),
  })
}

export function reviewAttendanceRepairRequest(repairId, payload) {
  return request.post(`/attendance/repair/${repairId}/review`, createAttendanceRepairReviewPayload(payload))
}

export function verifyFaceRequest(payload) {
  return request.post('/face/verify', createFaceVerifyPayload(payload))
}
