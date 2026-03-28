import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seed başlatılıyor...')

  const adminEmail = process.env.ADMIN_SEED_EMAIL?.trim() || 'admin@example.com'
  const adminName = process.env.ADMIN_SEED_NAME?.trim() || 'Admin'
  const configuredPassword = process.env.ADMIN_SEED_PASSWORD?.trim()
  const generatedPassword = randomBytes(18).toString('base64url')
  const plainPassword = configuredPassword || generatedPassword

  if (plainPassword.length < 8) {
    throw new Error('ADMIN_SEED_PASSWORD en az 8 karakter olmalıdır.')
  }

  const existingUserWithEmail = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'admin' },
    orderBy: { createdAt: 'asc' },
  })

  if (
    existingAdmin &&
    existingUserWithEmail &&
    existingAdmin.id !== existingUserWithEmail.id
  ) {
    throw new Error(
      `Admin e-postası olarak kullanılacak ${adminEmail} adresi başka bir kullanıcıya ait. Önce çakışmayı temizleyin.`
    )
  }

  const adminPassword = await bcrypt.hash(plainPassword, 12)

  let admin

  if (existingUserWithEmail) {
    admin = await prisma.user.update({
      where: { id: existingUserWithEmail.id },
      data: {
        email: adminEmail,
        name: adminName,
        password: adminPassword,
        role: 'admin',
        tokenVersion: {
          increment: 1,
        },
      },
    })
  } else if (existingAdmin) {
    admin = await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        email: adminEmail,
        name: adminName,
        password: adminPassword,
        role: 'admin',
        tokenVersion: {
          increment: 1,
        },
      },
    })
  } else {
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        password: adminPassword,
        role: 'admin',
      },
    })
  }

  console.log(`✅ Admin kullanıcı hazırlandı: ${admin.email}`)
  console.log('🎉 Seed tamamlandı!')
  console.log('\n📋 Giriş Bilgileri:')
  console.log(`   Email: ${adminEmail}`)
  console.log(`   Şifre: ${plainPassword}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Seed başarısız:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
