# Railway Deployment

Bu proje Railway uzerinde calisacak sekilde hazirlandi.

## Beklenen Railway Akisi

1. GitHub reposunu Railway'e baglayin.
2. Railway icinde bir PostgreSQL servisi ekleyin.
3. Asagidaki environment variable'lari Railway proje ayarlarina girin.
4. Railway build asamasinda `prisma db push` calistirarak veritabani semasini olusturur/gunceller.
5. Uygulama `npm run start` ile ayaga kalkar.

## Zorunlu Environment Variable'lar

- `DATABASE_URL`
- `JWT_SECRET`
- `NEXT_PUBLIC_APP_URL`

## SMS Icin Gerekli Variable'lar

- `SMS_API_URL`
- `SMS_API_KEY`
- `SMS_DEV_MODE=false`
- `SMS_REQUEST_TIMEOUT_MS=10000`
- `ALLOW_PRODUCTION_SMS_DEV_MODE=false`

## Proxy Kullanilacaksa

- `PROXY_ENABLED=true`
- `DECODO_PROXY_HOST`
- `DECODO_PROXY_PORT_START`
- `DECODO_PROXY_ENDPOINT_COUNT`
- `DECODO_PROXY_USERNAME`
- `DECODO_PROXY_PASSWORD`
- `DECODO_PROXY_PROTOCOL`

## Onerilen Variable'lar

- `NODE_ENV=production`
- `TRUST_PROXY_HEADERS=true`
- `SMS_LOG_RETENTION_DAYS=30`
- `SMS_QUEUE_BATCH_SIZE=50`
- `SMS_QUEUE_CONCURRENCY=12`
- `SMS_QUEUE_STALE_MINUTES=2`

## Ilk Admin Kullanici

Ilk deploy sonrasi manuel seed calistirmak isterseniz su variable'lari ekleyin:

- `ADMIN_SEED_EMAIL`
- `ADMIN_SEED_NAME`
- `ADMIN_SEED_PASSWORD`

Ardindan Railway shell veya job icinde:

```bash
npm run db:seed
```

## Notlar

- `.env`, `cookies.txt`, `.vscode/` ve benzeri lokal dosyalar repo'ya dahil edilmez.
- `JWT_SECRET` en az 32 karakter ve guclu bir deger olmali.
- `NEXT_PUBLIC_APP_URL` Railway domain'iniz ile ayni olmali. Ornek: `https://smspaneli.up.railway.app`