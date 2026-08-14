import request from '@/utils/request'
import { encryptSensitiveFields } from '@/utils/crypto'

export interface Server {
  id?: number
  name: string
  host: string
  port: number
  username: string
  authType: number // 1-密码 2-密钥
  password?: string
  privateKey?: string
  passphrase?: string
  description?: string
  status: number
  sort: number
  lastConnectTime?: string
  createTime?: string
}

export interface ServerPageParams {
  page: number
  pageSize: number
  name?: string
  status?: number
}

export interface ServerRuntimeStatus {
  serverId?: number
  name?: string
  host?: string
  port?: number
  status?: 'online' | 'offline' | 'unknown'
  collectedAt?: string
  errorMessage?: string
  cpu?: Record<string, any>
  memory?: Record<string, any>
  jvm?: Record<string, any>
  sys?: Record<string, any>
  networks?: Array<Record<string, any>>
  disks?: Array<Record<string, any>>
}

export const serverApi = {
  // 分页查询
  list(params: ServerPageParams) {
    return request({
      url: '/monitor/server-manager/list',
      method: 'get',
      params
    })
  },

  // 获取所有启用的服务器
  all() {
    return request<Server[]>({
      url: '/monitor/server-manager/all',
      method: 'get'
    })
  },

  // 获取详情
  getById(id: number) {
    return request<Server>({
      url: `/monitor/server-manager/${id}`,
      method: 'get'
    })
  },

  // 新增
  async add(data: Server) {
    const encryptedData = await encryptSensitiveFields(data, ['password', 'privateKey', 'passphrase'])
    return request({
      url: '/monitor/server-manager',
      method: 'post',
      data: encryptedData
    })
  },

  // 修改
  async update(data: Server) {
    const encryptedData = await encryptSensitiveFields(data, ['password', 'privateKey', 'passphrase'])
    return request({
      url: '/monitor/server-manager',
      method: 'put',
      data: encryptedData
    })
  },

  // 删除
  remove(id: number) {
    return request({
      url: `/monitor/server-manager/${id}`,
      method: 'delete'
    })
  },

  // 批量删除
  batchRemove(ids: number[]) {
    return request({
      url: '/monitor/server-manager/batch',
      method: 'delete',
      data: ids
    })
  },

  // 测试连接
  testConnection(id: number) {
    return request<boolean>({
      url: `/monitor/server-manager/test/${id}`,
      method: 'post'
    })
  },

  // 测试连接（通过参数）
  async testConnectionByParams(data: {
    host: string
    port: number
    username: string
    authType: number
    password?: string
    privateKey?: string
    passphrase?: string
  }) {
    const encryptedData = await encryptSensitiveFields(data, ['password', 'privateKey', 'passphrase'])
    return request<boolean>({
      url: '/monitor/server-manager/test',
      method: 'post',
      data: encryptedData
    })
  },

  // 获取远程服务器运行状态
  getStatus(id: number) {
    return request<ServerRuntimeStatus>({
      url: `/monitor/server-manager/${id}/status`,
      method: 'get'
    })
  }
}
