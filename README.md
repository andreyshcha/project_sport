# sport_app

# Спорт приложение – тренировки с AI

## Запуск через Docker (рекомендуется)

1. Установите [Docker Desktop](https://www.docker.com/products/docker-desktop/).
2. Склонируйте репозиторий и перейдите в папку проекта.
3. Выполните:
   
  docker-compose up -d

  docker exec -it gym_app npx prisma db push
  
  docker exec -it gym_app node backend/seedExercises.js
  
5. Откройте http://localhost:3000

## Локальный запуск

- Node.js 18+, PostgreSQL
- Создайте `.env` в папке `backend` (см. пример)
- Выполните `npm install`, затем `npx prisma db push`, затем `node seedExercises.js`
- Запустите `npm run dev`

## Учётные данные

- Админ: admin@example.com / admin (создаётся автоматически)
- Обычный пользователь: зарегистрируйтесь через форму
