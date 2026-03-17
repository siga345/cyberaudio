# Cyberaudio

Cyberaudio это standalone web MVP для записи треков, хранения их версий и отслеживания релизного состояния в одном локальном workspace.

Проект собран как сфокусированный music-core инструмент:
- workspace с папками и проектами
- создание и организация треков
- загрузка аудио и browser recording
- лестница версий от идеи до релиза
- локальное воспроизведение и архив релизов

## Что уже есть

Репозиторий содержит первую самостоятельную web-версию.

Включено:
- приложение на Next.js App Router
- local-first конфигурация на SQLite
- один локальный owner без auth-flow
- локальное хранение аудио в `data/audio/`
- cyberpunk UI для workspace, записи, трека, проекта и архива

Пока не включено:
- нативный iOS-клиент
- cloud sync
- multi-user collaboration
- auth и remote storage

## Стек

- Next.js
- React
- TypeScript
- Prisma Client
- SQLite
- Tailwind CSS
- TanStack Query

## Быстрый старт

```bash
npm install
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

После запуска приложение будет доступно на [http://localhost:3000](http://localhost:3000).

## Основные команды

```bash
npm run dev
npm run build
npm run start
npm run prisma:migrate
npm run prisma:seed
```

## Локальные данные

- база: `prisma/dev.db`
- загруженное аудио: `data/audio/`
- локальный owner по умолчанию: `owner@cyberaudio.local`

Сгенерированные локальные данные исключены из git, поэтому репозиторий можно клонировать и запускать с чистого состояния.

## Структура

```text
src/app                 Next.js routes and pages
src/components          UI, workspace, player, recorder components
src/lib                 domain logic, API helpers, serializers
prisma/                 Prisma schema and seed
scripts/                local bootstrap scripts
```

## Направление проекта

Cyberaudio развивается как:
- самостоятельный workspace для музыкальной версионности
- local-first MVP перед mobile-фазой
- база для будущего iOS-клиента с переиспользуемыми доменными контрактами

Следующие этапы:
- mobile-native phase
- более явная API-граница для клиентов
- optional sync/export workflows

## Лицензия

Проект распространяется по лицензии MIT. См. [LICENSE](./LICENSE).
