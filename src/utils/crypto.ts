import JSEncrypt from 'jsencrypt'
import { fetchCryptoConfig, clearCryptoConfigCache } from './request'

// 加密配置
interface CryptoConfig {
  enabled: boolean
  publicKey: string
}

// 缓存加密配置
let cryptoConfig: CryptoConfig | null = null

/**
 * 获取加密配置
 */
export async function getCryptoConfig(): Promise<CryptoConfig> {
  if (cryptoConfig) {
    return cryptoConfig
  }
  
  cryptoConfig = await fetchCryptoConfig()
  return cryptoConfig
}

/**
 * 清除缓存的配置
 */
export function clearCryptoConfig() {
  cryptoConfig = null
  clearCryptoConfigCache()
}

/**
 * RSA加密
 */
export function rsaEncrypt(data: string, publicKey: string): string {
  const encrypt = new JSEncrypt()
  encrypt.setPublicKey(publicKey)
  const encrypted = encrypt.encrypt(data)
  if (!encrypted) {
    throw new Error('RSA加密失败')
  }
  return encrypted
}

/**
 * 字节数组转Base64
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

/**
 * ArrayBuffer转Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return bytesToBase64(new Uint8Array(buffer))
}

/**
 * 生成随机字节
 */
function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

/**
 * 混合加密字段，支持长文本。
 */
export async function hybridEncrypt(data: string, publicKey: string): Promise<string> {
  const aesKeyBytes = randomBytes(32)
  const iv = randomBytes(12)
  const aesKey = await crypto.subtle.importKey(
    'raw',
    aesKeyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  )
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    new TextEncoder().encode(data)
  )
  const encryptedKey = rsaEncrypt(bytesToBase64(aesKeyBytes), publicKey)
  return `HYB:v1:${encryptedKey}:${bytesToBase64(iv)}:${arrayBufferToBase64(encryptedData)}`
}

/**
 * RSA解密（使用公钥解密私钥加密的数据）
 */
export function rsaDecrypt(data: string, publicKey: string): string {
  const decrypt = new JSEncrypt()
  decrypt.setPublicKey(publicKey)
  const decrypted = decrypt.decrypt(data)
  if (!decrypted) {
    throw new Error('RSA解密失败')
  }
  return decrypted
}

/**
 * 加密密码字段
 */
export async function encryptPassword(password: string): Promise<string> {
  const config = await getCryptoConfig()
  
  if (!config.enabled || !config.publicKey) {
    return password
  }
  
  return hybridEncrypt(password, config.publicKey)
}

/**
 * 加密对象中的密码字段
 */
export async function encryptPasswordFields<T extends Record<string, any>>(
  data: T,
  fields: string[] = ['password', 'oldPassword', 'newPassword']
): Promise<T> {
  return encryptSensitiveFields(data, fields)
}

/**
 * 递归加密对象中的敏感字段。
 */
export async function encryptSensitiveFields<T extends Record<string, any>>(
  data: T,
  fields: string[] = [
    'password',
    'oldPassword',
    'newPassword',
    'privateKey',
    'passphrase',
    'secretKey',
    'accessKeySecret',
    'appSecret',
    'clientSecret',
    'apiV3Key',
    'aesKey',
    'token',
    'minioSecretKey',
    'aliyunSecretKey',
    'tencentSecretKey',
    'rustfsSecretKey',
    'tokenId',
    'signName',
    'encryptPrivateKey'
  ]
): Promise<T> {
  const config = await getCryptoConfig()
  
  if (!config.enabled || !config.publicKey) {
    return data
  }
  
  const result = { ...data }
  await encryptObjectFields(result, new Set(fields), config.publicKey)
  
  return result
}

async function encryptObjectFields(target: Record<string, any>, fields: Set<string>, publicKey: string) {
  for (const key of Object.keys(target)) {
    const value = target[key]
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      await encryptObjectFields(value, fields, publicKey)
      continue
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === 'object') {
          await encryptObjectFields(item, fields, publicKey)
        }
      }
      continue
    }
    if (fields.has(key) && typeof value === 'string' && value) {
      target[key] = await hybridEncrypt(value, publicKey)
    }
  }
}

/**
 * 检查是否启用加密
 */
export async function isEncryptEnabled(): Promise<boolean> {
  const config = await getCryptoConfig()
  return config.enabled
}
