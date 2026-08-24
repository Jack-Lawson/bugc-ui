import { request } from '@/utils/request'
import { PageResult } from './system'

// ==================== 操作日志 ====================
export interface SysOperLog {
  id?: number
  title: string
  businessType: number
  method: string
  requestMethod: string
  operName: string
  operUrl: string
  operIp: string
  operParam: string
  jsonResult: string
  status: number
  errorMsg: string
  operTime: string
  costTime: number
}

export const operLogApi = {
  page(params: { page: number; pageSize: number; title?: string; operName?: string; status?: number }): Promise<PageResult<SysOperLog>> {
    return request({ url: '/monitor/operlog/page', method: 'get', params })
  },
  delete(id: number): Promise<void> {
    return request({ url: `/monitor/operlog/${id}`, method: 'delete' })
  },
  clean(): Promise<void> {
    return request({ url: '/monitor/operlog/clean', method: 'delete' })
  }
}

// ==================== 登录日志 ====================
export interface SysLoginLog {
  id?: number
  username: string
  ipaddr: string
  loginLocation: string
  browser: string
  os: string
  status: number
  msg: string
  loginTime: string
}

export const loginLogApi = {
  page(params: { page: number; pageSize: number; username?: string; status?: number }): Promise<PageResult<SysLoginLog>> {
    return request({ url: '/monitor/loginlog/page', method: 'get', params })
  },
  delete(id: number): Promise<void> {
    return request({ url: `/monitor/loginlog/${id}`, method: 'delete' })
  },
  clean(): Promise<void> {
    return request({ url: '/monitor/loginlog/clean', method: 'delete' })
  }
}

// ==================== 在线用户 ====================
export interface OnlineUser {
  tokenId: string
  loginName?: string
  deptName?: string
  ipaddr?: string
  loginLocation?: string
  browser?: string
  os?: string
  status?: number
  loginTime: string
  lastAccessTime: string
  tokenValue?: string
}

export const onlineApi = {
  list(): Promise<OnlineUser[]> {
    return request({ url: '/monitor/online/list', method: 'get' })
  },
  forceLogout(tokenId: string): Promise<void> {
    return request({ url: `/monitor/online/${tokenId}`, method: 'delete' })
  }
}

// ==================== 定时任务 ====================
export interface SysJob {
  id?: number
  jobName: string
  jobGroup: string
  invokeTarget: string
  cronExpression: string
  misfirePolicy: number
  concurrent: number
  status: number
  remark?: string
  createTime?: string
}

export interface SysJobLog {
  id?: number
  jobName: string
  jobGroup: string
  invokeTarget: string
  jobMessage: string
  status: number
  exceptionInfo: string
  startTime: string
  stopTime: string
}

export const jobApi = {
  page(params: { page: number; pageSize: number; jobName?: string; jobGroup?: string; status?: number }): Promise<PageResult<SysJob>> {
    return request({ url: '/monitor/job/page', method: 'get', params })
  },
  detail(id: number): Promise<SysJob> {
    return request({ url: `/monitor/job/${id}`, method: 'get' })
  },
  create(data: SysJob): Promise<void> {
    return request({ url: '/monitor/job', method: 'post', data })
  },
  update(data: SysJob): Promise<void> {
    return request({ url: '/monitor/job', method: 'put', data })
  },
  delete(id: number): Promise<void> {
    return request({ url: `/monitor/job/${id}`, method: 'delete' })
  },
  changeStatus(id: number, status: number): Promise<void> {
    return request({ url: '/monitor/job/changeStatus', method: 'put', data: { id, status } })
  },
  run(id: number): Promise<void> {
    return request({ url: `/monitor/job/run/${id}`, method: 'post' })
  },
  logPage(params: {
    page: number
    pageSize: number
    jobName?: string
    jobGroup?: string
    invokeTarget?: string
    status?: number
    startTime?: string
    endTime?: string
  }): Promise<PageResult<SysJobLog>> {
    return request({ url: '/monitor/job/log/page', method: 'get', params })
  },
  logStatistics(): Promise<{ totalCount: number; successCount: number; failCount: number; dailyStats: Array<{ exec_date: string; success_count: number; fail_count: number }> }> {
    return request({ url: '/monitor/job/log/statistics', method: 'get' })
  },
  cleanLog(): Promise<void> {
    return request({ url: '/monitor/job/log/clean', method: 'delete' })
  }
}

// ==================== 缓存监控 ====================
export interface CacheStats {
  usedMemory: number
  maxMemory: number
  ops: number
  hitRate: number
  connectedClients: number
}

export const cacheApi = {
  info(): Promise<any> {
    return request({ url: '/monitor/cache/info', method: 'get' })
  },
  stats(): Promise<CacheStats> {
    return request({ url: '/monitor/cache/stats', method: 'get' })
  },
  keys(params: { pattern?: string; page: number; pageSize: number }): Promise<PageResult<string>> {
    return request({ url: '/monitor/cache/keys', method: 'get', params })
  },
  delete(key: string): Promise<void> {
    return request({ url: '/monitor/cache', method: 'delete', params: { key } })
  },
  getValue(key: string): Promise<any> {
    return request({ url: '/monitor/cache/value', method: 'get', params: { key } })
  }
}

// ==================== 服务监控 ====================
export const serverApi = {
  info(): Promise<any> {
    return request({ url: '/monitor/server/info', method: 'get' })
  }
}

export interface ServerMonitorTarget {
  targetKey: string
  targetType: 'local' | 'ssh'
  serverId?: number
  serverStatus?: number
  name: string
  status: 'pending' | 'normal' | 'error' | string
  lastCollectTime?: string
  primaryNetwork?: string
  primaryAddress?: string
  entryIp?: string
  username?: string
  lastConnectTime?: string
  summary?: ServerMonitorSummary
}

export interface ServerMonitorAvailableServer {
  id: number
  name: string
  host?: string
  port?: number
  username?: string
  lastConnectTime?: string
}

export interface ServerMonitorProfile {
  targetKey?: string
  targetType?: 'local' | 'ssh'
  displayName?: string
  hostName?: string
  entryIp?: string
  osName?: string
  osVersion?: string
  kernelVersion?: string
  kernelName?: string
  arch?: string
  timezone?: string
  bootTime?: string
  uptime?: string
  cpuCores?: number
  cpuThreads?: number
  cpuVendor?: string
  cpuModel?: string
  memoryTotal?: string
  swapTotal?: string
  rootDiskTotal?: string
  diskTotal?: string
  diskCount?: number
  virtualization?: string
  packageManager?: string
  primaryNetwork?: string
  primaryAddress?: string
  profileStatus?: string
  lastCollectTime?: string
  lastError?: string
}

export interface ServerMonitorSummary {
  status?: string
  collectedAt?: string
  cpuPercent?: number
  memoryPercent?: number
  diskPercent?: number
  rxRate?: number
  txRate?: number
  primaryNetwork?: string
}

export interface ServerMonitorSeriesPoint {
  time: string
  collectedAt?: string
  cpuPercent?: number
  memoryPercent?: number
  diskPercent?: number
  rxRate?: number
  txRate?: number
}

export interface ServerMonitorDashboard {
  target: ServerMonitorTarget & {
    monitorEnabled?: number
    collectIntervalSeconds?: number
  }
  profile: ServerMonitorProfile
  summary: ServerMonitorSummary
  latest: {
    cpu?: Record<string, any>
    memory?: Record<string, any>
    jvm?: Record<string, any>
    sys?: Record<string, any>
    networks?: Array<Record<string, any>>
    disks?: Array<Record<string, any>>
    status?: string
    errorMessage?: string
    collectedAt?: string
  }
  series: ServerMonitorSeriesPoint[]
  stale: boolean
}

export const serverMonitorApi = {
  targets(): Promise<ServerMonitorTarget[]> {
    return request({ url: '/monitor/server-monitor/targets', method: 'get' })
  },
  availableServers(): Promise<ServerMonitorAvailableServer[]> {
    return request({ url: '/monitor/server-monitor/available-servers', method: 'get' })
  },
  dashboard(targetKey: string): Promise<ServerMonitorDashboard> {
    return request({
      url: `/monitor/server-monitor/targets/${encodeURIComponent(targetKey)}/dashboard`,
      method: 'get'
    })
  },
  refreshProfile(targetKey: string): Promise<ServerMonitorDashboard> {
    return request({
      url: `/monitor/server-monitor/targets/${encodeURIComponent(targetKey)}/refresh-profile`,
      method: 'post'
    })
  },
  enableServer(serverId: number): Promise<ServerMonitorDashboard> {
    return request({
      url: `/monitor/server-monitor/servers/${serverId}/enable`,
      method: 'post'
    })
  },
  removeTarget(targetKey: string) {
    return request({
      url: `/monitor/server-monitor/targets/${encodeURIComponent(targetKey)}`,
      method: 'delete'
    })
  }
}

// ==================== API 访问统计 ====================
export interface ApiAccessLog {
  id?: number
  startTime?: string
  endTime?: string
  apiPath?: string
  method?: string
  statusCode?: number
  success?: number
  costTime?: number
  ip?: string
  userId?: number
}

export interface ApiAccessStatistics {
  totalCount: number
  successCount: number
  failCount: number
  dailyStats: Record<string, { total: number; success: number; fail: number }>
  topPaths: Array<{ apiPath: string; count: number }>
  methodCount: Record<string, number>
}

export const apiAccessApi = {
  page(params: {
    page: number
    pageSize: number
    apiPath?: string
    method?: string
    success?: number
    startTime?: string
    endTime?: string
  }): Promise<PageResult<ApiAccessLog>> {
    return request({ url: '/monitor/api-access/page', method: 'get', params })
  },
  statistics(params?: { startDate?: string; endDate?: string }): Promise<ApiAccessStatistics> {
    return request({ url: '/monitor/api-access/statistics', method: 'get', params })
  }
}
