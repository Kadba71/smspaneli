import cron from 'node-cron'
import { env } from './env'
import {
  runDailyLogCleanupIfDue,
  runDailyProxyRefreshIfDue,
  runDueMaintenance,
  runSmsQueueIfDue,
} from './maintenance'

const TURKEY_TZ = 'Europe/Istanbul'
const globalForCron = globalThis as typeof globalThis & {
  smsPanelCronInitialized?: boolean
}

export function initCron() {
  if (globalForCron.smsPanelCronInitialized) {
    return
  }

  globalForCron.smsPanelCronInitialized = true

  runDueMaintenance().catch((error) => {
    console.error('[CRON] ❌ Açılış temizleme hatası:', error)
  })

  cron.schedule(
    '*/5 * * * * *',
    async () => {
      try {
        await runSmsQueueIfDue()
      } catch (error) {
        console.error('[CRON] ❌ SMS kuyruğu işlenemedi:', error)
      }
    },
    {
      timezone: TURKEY_TZ,
    }
  )

  cron.schedule(
    '0 0 0 * * *',
    async () => {
      try {
        console.log('[CRON] Günlük temizlik başlatılıyor...')
        await runDailyLogCleanupIfDue()
        console.log('[CRON] ✅ Günlük temizlik tamamlandı.')
      } catch (error) {
        console.error('[CRON] ❌ Temizleme hatası:', error)
      }
    },
    {
      timezone: TURKEY_TZ,
    }
  )

  console.log('[CRON] ✅ SMS kuyruğu 5 saniyede bir, günlük bakım işleri gece yarısında zamanlandı')

  if (env.PROXY_ENABLED) {
    cron.schedule(
      '0 0 0 * * *',
      async () => {
        try {
          console.log('[CRON] 🔄 Gece yarısı proxy yenilemesi başlatılıyor...')
          await runDailyProxyRefreshIfDue()
        } catch (error) {
          console.error('[CRON] ❌ Proxy yenileme hatası:', error)
        }
      },
      {
        timezone: TURKEY_TZ,
      }
    )

    console.log('[CRON] ✅ Proxy yenileme her gece 00:00 (Türkiye saati) olarak zamanlandı')
  }
}
