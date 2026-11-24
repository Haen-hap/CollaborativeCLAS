FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build && \
    mkdir -p dist/css dist/js dist/icons && \
    cp -r css/* dist/css/ && \
    cp -r js/* dist/js/ && \
    cp -r icons/* dist/icons/

EXPOSE 5173

CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "5173"]
