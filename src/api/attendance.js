import request from '../utils/request'

function createCheckinPayload(payload = {}) {
  const { checkType, deviceId, imageData } = payload

  return {
    checkType,
    deviceId,
    imageData,
  }
}

function createFaceVerifyPayload(payload = {}) {
  const { imageData } = payload

  return {
    imageData,
  }
}

function createRepairPayload(payload = {}) {
  const { checkType, checkTime, repairReason } = payload

  return {
    checkType,
    checkTime,
    repairReason,
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

export function submitAttendanceRepairRequest(payload) {
  return request.post('/attendance/repair', createRepairPayload(payload))
}

export function verifyFaceRequest(payload) {
  return request.post('/face/verify', createFaceVerifyPayload(payload))
}
