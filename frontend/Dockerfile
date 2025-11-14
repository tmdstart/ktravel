FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# npm 설정 및 캐시 클리어
RUN npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm cache clean --force

# 기본 패키지 설치
RUN npm install --loglevel verbose
RUN npm install @hello-pangea/dnd --save

# react-icons, react-calendar, MUI 관련 패키지 명시적 설치
RUN npm install react-icons@^4.12.0 \
    @hello-pangea/dnd\
    react-calendar@^4.6.1 \
    @mui/material@^5.15.13 \
    @mui/icons-material@^5.15.13 \
    @emotion/react@^11.11.4 \
    @emotion/styled@^11.11.0 \
    lucide-react@^0.548.0

# 설치 확인
RUN echo "=== Checking react-icons ===" && \
    ls -la node_modules/react-icons && \
    echo "=== Checking react-calendar ===" && \
    ls -la node_modules/react-calendar && \
    echo "=== Checking @mui/icons-material ===" && \
    ls -la node_modules/@mui && \
    ls -la node_modules/@mui/icons-material && \
    echo "=== Checking @emotion ===" && \
    ls -la node_modules/@emotion

COPY . .

EXPOSE 3000

CMD ["npm", "start"]