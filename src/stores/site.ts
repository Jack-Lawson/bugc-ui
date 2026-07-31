import { defineStore } from 'pinia'
import { ref } from 'vue'
import { configGroupApi } from '@/api/org'
import { siteDefaults } from '@/config/app'

/**
 * 站点配置 Store
 */
export const useSiteStore = defineStore('site', () => {
  // 站点名称
  const siteName = ref(siteDefaults.name)
  // 站点描述
  const siteDescription = ref(siteDefaults.description)
  // 站点 Logo
  const siteLogo = ref(siteDefaults.logo)
  // 版权信息
  const copyright = ref(siteDefaults.copyright)
  // ICP 备案号
  const icp = ref(siteDefaults.icp)
  // 水印配置
  const watermarkEnabled = ref(siteDefaults.watermarkEnabled)
  const watermarkType = ref(siteDefaults.watermarkType)
  const watermarkCustomText = ref(siteDefaults.watermarkCustomText)
  const watermarkOpacity = ref(siteDefaults.watermarkOpacity)
  // 安全配置
  const disableDevtool = ref(siteDefaults.disableDevtool)
  // 是否已加载
  const loaded = ref(false)

  /**
   * 加载站点配置
   */
  async function loadConfig() {
    try {
      const config = await configGroupApi.getPublicConfig()
      if (config.system) {
        siteName.value = config.system.siteName || siteDefaults.name
        siteDescription.value = config.system.siteDescription || siteDefaults.description
        siteLogo.value = config.system.siteLogo || siteDefaults.logo
        copyright.value = config.system.copyright || siteDefaults.copyright
        icp.value = config.system.icp || siteDefaults.icp
        // 水印配置，默认开启
        watermarkEnabled.value = config.system.watermarkEnabled !== false
        watermarkType.value = config.system.watermarkType || siteDefaults.watermarkType
        watermarkCustomText.value = config.system.watermarkCustomText || siteDefaults.watermarkCustomText
        watermarkOpacity.value = config.system.watermarkOpacity || siteDefaults.watermarkOpacity
      }
      // 安全配置
      if (config.security) {
        disableDevtool.value = config.security.disableDevtool || siteDefaults.disableDevtool
      }
      loaded.value = true
    } catch (error) {
      console.error('加载站点配置失败', error)
    }
  }

  return {
    siteName,
    siteDescription,
    siteLogo,
    copyright,
    icp,
    watermarkEnabled,
    watermarkType,
    watermarkCustomText,
    watermarkOpacity,
    disableDevtool,
    loaded,
    loadConfig
  }
})
