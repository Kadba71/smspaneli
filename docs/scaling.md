# SMS Panel Scaling Runbook

## PostgreSQL kurulumu

1. `npm.cmd run db:up`
2. `npm.cmd run db:push`
3. `npm.cmd run db:seed`

## Yük testi kullanıcılarını hazırlama

1. `npm.cmd run loadtest:seed -- --count 300`

Varsayılan şifre: `LoadTestPassword123!`

## Uygulamayı başlatma

1. `npm.cmd run dev`

## 100 kullanıcı testi

1. `npm.cmd run loadtest:100`

## 300 kullanıcı testi

1. `npm.cmd run loadtest:300`

## İsteğe bağlı parametreler

1. `LOAD_TEST_TARGET_URL=http://127.0.0.1:3000`
2. `LOAD_TEST_PASSWORD=LoadTestPassword123!`
3. `npm.cmd run loadtest:300 -- --concurrency 120`

## Beklenen sonuç

1. `/api/sms/send` çağrıları `202` dönmeli
2. Admin panelindeki `/admin/queue` ekranında kuyruk derinliği ve işlenen kayıtlar canlı görünmeli
3. Uzun bekleyen işler `processing` durumunda takılı kalmamalı