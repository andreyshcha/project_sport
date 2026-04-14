FROM node:18-bullseye

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json из backend
COPY backend/package*.json ./backend/

# Устанавливаем зависимости
WORKDIR /app/backend
RUN npm install

# Возвращаемся в корень и копируем остальной код
WORKDIR /app
COPY backend ./backend
COPY frontend ./frontend

# Генерируем Prisma Client
WORKDIR /app/backend
RUN npx prisma generate

# Открываем порт
EXPOSE 3000

# Запускаем сервер
CMD ["npm", "run", "dev"]