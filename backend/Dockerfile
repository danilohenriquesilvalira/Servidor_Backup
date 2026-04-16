FROM node:20-alpine

WORKDIR /app

# Instalar dependências
COPY package.json ./
RUN npm install --omit=dev

# Copiar código
COPY src/ ./src/

# Criar diretório de uploads
RUN mkdir -p /app/uploads

EXPOSE 3001

CMD ["node", "src/server.js"]
