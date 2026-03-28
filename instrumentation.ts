export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./lib/env')
    const { initCron } = await import('./lib/cron')
    initCron()
  }
}
