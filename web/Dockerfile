FROM node:20-alpine

WORKDIR /app/web

COPY package.json ./
RUN npm install

COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "localhost", "--port", "5173"]