import { describe, expect, it } from 'vitest'

import { formatReadableText } from '../../src/utils/readable-text'

describe('readable text', () => {
  it('converts technical mixed english fields into readable Chinese', () => {
    const result = formatReadableText('faceScore≥95表明生物识别质量良好，但actualHistoryAbnormalCount=1提示该用户过去存在至少一次异常行为（如代打卡、环境异常等）；longitude和latitude为null，削弱了地理围栏验证效力；clientFaceScore为空导致无法交叉验证客户端侧识别结果；其余字段无明显高危信号。')

    expect(result).toContain('人脸分数达到95分以上')
    expect(result).toContain('数据库历史异常次数为1，提示')
    expect(result).toContain('位置信息缺失')
    expect(result).toContain('客户端人脸分数缺失')
    expect(result).toContain('其余信息未发现明显高风险信号')
    expect(result).not.toContain('faceScore')
    expect(result).not.toContain('actualHistoryAbnormalCount')
    expect(result).not.toContain('longitude')
    expect(result).not.toContain('clientFaceScore')
  })
})
