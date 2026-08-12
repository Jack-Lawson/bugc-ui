import { request } from '@/utils/request'

export interface PersonalService {
  id?: number
  code: string
  name: string
  targetBaseUrl: string
  originBaseUrl?: string
  entryPath?: string
  pathStrategy?: string
  icon?: string
  accessMode: string
  rewriteCookie: number
  rewriteLocation: number
  removeFrameHeaders: number
  rewriteBody?: number
  rewriteProfile?: string
  websocketEnabled?: number
  timeoutSeconds: number
  sort: number
  status: number
  remark?: string
  createTime?: string
}

export interface PersonalServicePageParams {
  page: number
  pageSize: number
  name?: string
  code?: string
  status?: number
}

export interface MybatisPage<T> {
  records: T[]
  total: number
  current: number
  size: number
}

export const personalServiceApi = {
  list(params: PersonalServicePageParams): Promise<MybatisPage<PersonalService>> {
    return request({ url: '/personal/services/list', method: 'get', params })
  },

  detail(id: number): Promise<PersonalService> {
    return request({ url: `/personal/services/detail/${id}`, method: 'get' })
  },

  create(data: PersonalService): Promise<void> {
    return request({ url: '/personal/services', method: 'post', data })
  },

  update(data: PersonalService): Promise<void> {
    return request({ url: '/personal/services', method: 'put', data })
  },

  delete(id: number): Promise<void> {
    return request({ url: `/personal/services/remove/${id}`, method: 'delete' })
  },

  test(id: number): Promise<boolean> {
    return request({ url: `/personal/services/test/${id}`, method: 'post' })
  }
}
