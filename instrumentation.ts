export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    queueMicrotask(async () => {
      try {
        const { initCron } = await import('./lib/cron')
        initCron()
      } catch (error) {
        console.error('[BOOT] Cron baslatilamadi:', error)
      }
    })
  }
}
