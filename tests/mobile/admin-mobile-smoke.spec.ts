import { expect, test } from '@playwright/test'

const username = process.env.PLAYWRIGHT_USERNAME
const password = process.env.PLAYWRIGHT_PASSWORD

const pages = [
  '/dashboard',
  '/system/user',
  '/system/role',
  '/system/menu',
  '/system/dict',
  '/system/config',
  '/system/file',
  '/system/image',
  '/system/video',
  '/monitor/job',
  '/monitor/cache',
  '/monitor/api-access',
  '/monitor/server',
  '/monitor/server-manager',
  '/message/notice',
  '/message/chat',
  '/personal-service/manage'
]

const mockMenus = pages
  .filter((path) => path !== '/dashboard')
  .map((path, index) => ({
    id: index + 100,
    parentId: 0,
    name: path.split('/').filter(Boolean).join('-'),
    type: 2,
    path,
    component: '',
    permission: '',
    icon: 'MenuOutline',
    sort: index + 1,
    visible: 1,
    status: 1,
    isFrame: 0
  }))

async function mockAuthenticatedApi(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('bugc-user-token', 'mock-token')
  })

  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    if (!url.pathname.startsWith('/api/')) {
      return route.fallback()
    }

    const mockUser = {
      id: 1,
      username: 'mock-admin',
      nickname: '测试管理员',
      avatar: '',
      email: '',
      phone: '',
      gender: 0,
      status: 1
    }

    if (url.pathname === '/api/auth/info') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          message: 'ok',
          data: {
            user: mockUser,
            roles: ['admin'],
            permissions: ['*:*:*'],
            menus: mockMenus
          }
        })
      })
    }

    if (url.pathname === '/api/auth/login') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          message: 'ok',
          data: {
            token: 'mock-token',
            user: mockUser
          }
        })
      })
    }

    if (url.pathname === '/api/monitor/job/page') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          message: 'ok',
          data: {
            list: [
              {
                id: 1,
                jobName: '长文本定时任务',
                jobGroup: 'DEFAULT',
                invokeTarget: 'sampleTask.runWithVeryLongTargetNameAndParams',
                cronExpression: '0/10 * * * * ?',
                misfirePolicy: 3,
                concurrent: 1,
                status: 1,
                remark: ''
              }
            ],
            total: 1
          }
        })
      })
    }

    if (url.pathname === '/api/monitor/job/log/page') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          message: 'ok',
          data: {
            list: [
              {
                id: 1,
                jobName: '长文本定时任务',
                jobGroup: 'DEFAULT',
                invokeTarget: 'sampleTask.runWithVeryLongTargetNameAndParams',
                jobMessage: '执行成功',
                status: 0,
                startTime: '2026-08-24 20:00:00',
                stopTime: '2026-08-24 20:00:01'
              }
            ],
            total: 1
          }
        })
      })
    }

    if (url.pathname === '/api/monitor/cache/stats') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          message: 'ok',
          data: {
            usedMemory: 64,
            maxMemory: 256,
            ops: 12,
            hitRate: 0.96,
            connectedClients: 3
          }
        })
      })
    }

    if (url.pathname === '/api/monitor/cache/keys') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          message: 'ok',
          data: {
            list: [
              'sys:config:group:storage',
              'monitor:lock:collect:server:very-long-key-for-mobile-layout'
            ],
            total: 2
          }
        })
      })
    }

    if (url.pathname === '/api/monitor/cache/value') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          message: 'ok',
          data: {
            type: 'string',
            value: '{"enabled":true,"name":"mobile-cache-detail"}',
            ttl: 3600
          }
        })
      })
    }

    if (url.pathname === '/api/sys/file/page-by-group') {
      const fileScope = url.searchParams.get('fileScope')
      const data = fileScope === 'image'
        ? {
            list: [
              {
                id: 9001,
                originalName: 'mobile-preview-demo.jpg',
                fileName: 'mobile-preview-demo.jpg',
                filePath: 'images/demo/mobile-preview-demo.jpg',
                url: '/api/sys/file/preview/9001',
                fileSize: 1048576,
                fileType: 'image/jpeg',
                fileScope: 'image',
                fileSuffix: '.jpg',
                storageType: 'local',
                createTime: '2026-08-25 10:00:00'
              }
            ],
            total: 1
          }
        : {
            list: [],
            total: 0
          }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 200, message: 'ok', data })
      })
    }

    if (url.pathname === '/api/sys/file/upload/batch' && route.request().method() === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          message: 'ok',
          data: {
            successCount: 1,
            failCount: 0,
            successFiles: [
              {
                id: 9100,
                originalName: 'upload-demo.txt',
                fileName: 'upload-demo.txt',
                filePath: 'files/demo/upload-demo.txt',
                url: '/api/files/files/demo/upload-demo.txt',
                fileSize: 12,
                fileType: 'text/plain',
                fileScope: 'file',
                fileSuffix: '.txt',
                storageType: 'local',
                createTime: '2026-08-25 10:00:00'
              }
            ],
            failFiles: []
          }
        })
      })
    }

    const request = route.request()
    if (request.method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          message: 'ok',
          data: {
            list: [],
            records: [],
            total: 0,
            groups: [],
            ungroupedCount: 0,
            allCount: 0
          }
        })
      })
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 200, message: 'ok', data: null })
    })
  })
}

async function login(page: import('@playwright/test').Page) {
  if (!username || !password) {
    await mockAuthenticatedApi(page)
    return
  }

  await page.goto('/login')
  await page.getByPlaceholder(/用户名|账号/).fill(username!)
  await page.getByPlaceholder(/密码/).fill(password!)
  await page.getByRole('button', { name: /登录/ }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

test.describe('后台移动端通用适配', () => {
  test('登录后核心页面无页面级横向滚动', async ({ page }) => {
    await login(page)

    for (const target of pages) {
      await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 20_000 })
      await expect(page.locator('.page-container').first()).toBeVisible({ timeout: 10_000 })

      const hasPageOverflow = await page.evaluate(() => {
        const root = document.documentElement
        return root.scrollWidth > root.clientWidth + 1
      })

      expect(hasPageOverflow, `${target} 不应出现页面级横向滚动`).toBe(false)
    }
  })

  test('用户菜单后台管理在手机端向下展开，桌面端保持级联', async ({ page }, testInfo) => {
    await login(page)

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 20_000 })
    await expect(page.locator('.user-info')).toBeVisible()
    await page.locator('.user-info').click()
    await page.getByText('后台管理', { exact: true }).click()

    if (testInfo.project.name === 'desktop') {
      await expect(page.locator('.user-menu-panel--submenu').first()).toBeVisible()
      await expect(page.locator('.user-menu-mobile-subtree')).toHaveCount(0)
    } else {
      await expect(page.locator('.user-menu-panel--submenu')).toHaveCount(0)
      await expect(page.locator('.user-menu-mobile-subtree')).toBeVisible()

      const box = await page.locator('.user-menu-cascade').boundingBox()
      expect(box?.width || 0).toBeLessThanOrEqual(170)

      const clippedTexts = await page.locator('.user-menu-cascade .user-menu-item span').evaluateAll(nodes =>
        nodes.filter(node => {
          const el = node as HTMLElement
          return el.scrollWidth > el.clientWidth + 1
        }).length
      )
      expect(clippedTexts).toBe(0)
    }
  })

  test('手机端搜索区状态筛选控件保持可见宽度', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'desktop', '该用例只验证移动端搜索模板')
    await login(page)

    await page.goto('/personal-service/manage', { waitUntil: 'domcontentloaded', timeout: 20_000 })
    const statusSelect = page.locator('.search-form .n-base-selection').first()
    await expect(statusSelect).toBeVisible()

    const box = await statusSelect.boundingBox()
    expect(box?.width || 0).toBeGreaterThan(100)
  })

  test('定时任务列表手机端使用卡片展示，桌面端保持表格', async ({ page }, testInfo) => {
    await login(page)

    await page.goto('/monitor/job', { waitUntil: 'domcontentloaded', timeout: 20_000 })
    await expect(page.getByText('长文本定时任务')).toBeVisible()

    if (testInfo.project.name === 'desktop') {
      await expect(page.locator('.job-mobile-card')).toHaveCount(0)
      await expect(page.locator('.n-data-table').first()).toBeVisible()
      return
    }

    await expect(page.locator('.job-mobile-card').first()).toBeVisible()
    await expect(page.locator('.page-layout > .n-data-table')).toHaveCount(0)

    const hasPageOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    )
    expect(hasPageOverflow).toBe(false)
  })

  test('定时任务 PC 端状态下拉框可展开并显示选项', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', '该用例只验证 PC 端状态下拉')
    await login(page)

    await page.goto('/monitor/job', { waitUntil: 'domcontentloaded', timeout: 20_000 })
    const statusSelect = page.locator('.search-form .n-base-selection').first()
    await expect(statusSelect).toBeVisible()

    const box = await statusSelect.boundingBox()
    expect(box?.width || 0).toBeGreaterThanOrEqual(120)

    await statusSelect.click()
    await expect(page.locator('.n-base-select-option').filter({ hasText: '正常' }).last()).toBeVisible()
    await expect(page.locator('.n-base-select-option').filter({ hasText: '暂停' }).last()).toBeVisible()
  })

  test('图片管理列表使用缩略图，点击查看后加载预览图', async ({ page }) => {
    await login(page)

    await page.goto('/system/image', { waitUntil: 'domcontentloaded', timeout: 20_000 })
    const listImage = page.locator('.file-preview img').first()
    await expect(listImage).toBeVisible()

    const listSrc = await listImage.getAttribute('src')
    expect(listSrc || '').toContain('/api/sys/file/thumbnail/9001')

    await listImage.click()
    const originalImage = page.locator('.preview-image').first()
    await expect(originalImage).toBeVisible()
    const originalSrc = await originalImage.getAttribute('src')
    expect(originalSrc || '').toContain('/api/sys/file/preview/9001')

    await expect(page.locator('.image-preview-scale')).toHaveText('100%')
    await page.getByRole('button', { name: '放大' }).click()
    await expect(page.locator('.image-preview-scale')).toHaveText('120%')
    await page.locator('.image-preview-viewport').hover()
    await page.mouse.wheel(0, -120)
    await expect(page.locator('.image-preview-scale')).toHaveText('130%')
    const viewport = page.locator('.image-preview-viewport')
    const viewportBox = await viewport.boundingBox()
    expect(viewportBox).not.toBeNull()
    if (viewportBox) {
      const beforeDragTransform = await originalImage.evaluate(node => getComputedStyle(node as HTMLElement).transform)
      await page.mouse.move(viewportBox.x + viewportBox.width / 2, viewportBox.y + viewportBox.height / 2)
      await page.mouse.down()
      await page.mouse.move(viewportBox.x + viewportBox.width / 2 - 80, viewportBox.y + viewportBox.height / 2)
      await page.mouse.up()
      const afterDragTransform = await originalImage.evaluate(node => getComputedStyle(node as HTMLElement).transform)
      expect(afterDragTransform).not.toBe(beforeDragTransform)
    }
    await page.getByRole('button', { name: '缩小' }).click()
    await expect(page.locator('.image-preview-scale')).toHaveText('110%')
    await page.getByRole('button', { name: '重置' }).click()
    await expect(page.locator('.image-preview-scale')).toHaveText('100%')
  })

  test('图片、视频、文件上传入口统一走批量接口并传递资源库类型', async ({ page }) => {
    await login(page)

    const cases = [
      { path: '/system/image', scope: 'image', name: 'demo.jpg', mimeType: 'image/jpeg' },
      { path: '/system/video', scope: 'video', name: 'demo.mp4', mimeType: 'video/mp4' },
      { path: '/system/file', scope: 'file', name: 'demo.txt', mimeType: 'text/plain' }
    ]

    for (const item of cases) {
      await page.goto(item.path, { waitUntil: 'domcontentloaded', timeout: 20_000 })
      await expect(page.locator('.page-container').first()).toBeVisible()

      const uploadRequest = page.waitForRequest(request => {
        if (!request.url().includes('/api/sys/file/upload/batch')) {
          return false
        }
        const postData = request.postData() || ''
        return postData.includes(`name="fileScope"\r\n\r\n${item.scope}`)
      })

      await page.locator('.hidden-upload-input').first().setInputFiles({
        name: item.name,
        mimeType: item.mimeType,
        buffer: Buffer.from('upload-demo')
      })

      await uploadRequest
      await expect(page.getByText('已上传 1 个文件').last()).toBeVisible()
    }
  })

  test('缓存监控键列表手机端使用卡片展示，桌面端保持表格', async ({ page }, testInfo) => {
    await login(page)

    await page.goto('/monitor/cache', { waitUntil: 'domcontentloaded', timeout: 20_000 })

    if (testInfo.project.name === 'desktop') {
      await expect(page.locator('.n-data-table').first()).toBeVisible()
      await expect(page.locator('.cache-key-mobile-card').first()).toBeHidden()
      await expect(page.locator('.n-data-table').getByText('sys:config:group:storage')).toBeVisible()
      return
    }

    await expect(page.locator('.cache-key-mobile-card').first()).toBeVisible()
    await expect(page.locator('.cache-key-card .n-data-table')).toBeHidden()
    await expect(page.locator('.cache-key-mobile-card code').filter({ hasText: 'sys:config:group:storage' })).toBeVisible()

    const hasPageOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    )
    expect(hasPageOverflow).toBe(false)
  })
})
