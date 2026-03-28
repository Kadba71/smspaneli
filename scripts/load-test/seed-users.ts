import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma'

function getArg(name: string) {
  const index = process.argv.indexOf(name)
  if (index === -1) {
    return null
  }

  return process.argv[index + 1] ?? null
}

async function main() {
  const count = Number(getArg('--count') ?? process.env.LOAD_TEST_USER_COUNT ?? '300')
  const password = process.env.LOAD_TEST_PASSWORD ?? 'LoadTestPassword123!'

  if (count < 1) {
    throw new Error('Kullanıcı sayısı 1 veya daha büyük olmalıdır.')
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const users = Array.from({ length: count }, (_, index) => {
    const sequence = String(index + 1).padStart(3, '0')
    return {
      email: `loadtest.user.${sequence}@panel.local`,
      name: `Load Test ${sequence}`,
      password: passwordHash,
      role: 'user',
    }
  })

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        password: user.password,
      },
      create: user,
    })
  }

  const existingTemplate = await prisma.smsTemplate.findFirst({
    where: { title: 'Load Test Template' },
  })

  if (!existingTemplate) {
    await prisma.smsTemplate.create({
      data: {
        title: 'Load Test Template',
        message: 'Bu mesaj yük testi için otomatik oluşturuldu.',
        isActive: true,
      },
    })
  }

  console.log(`Hazır kullanıcı sayısı: ${count}`)
  console.log('Email formatı: loadtest.user.001@panel.local')
  console.log(`Şifre: ${password}`)
}

main()
  .catch((error) => {
    console.error('[LOADTEST SEED]', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })