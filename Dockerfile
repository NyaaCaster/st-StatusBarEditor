# 第一阶段：构建应用
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package.json
COPY package.json ./

# 安装依赖（忽略版本错误）
RUN npm install --legacy-peer-deps || npm install --force

# 复制项目文件
COPY . .

# 构建应用
RUN npm run build

# 第二阶段：生产环境
FROM nginx:alpine

# 设置时区
RUN apk add --no-cache tzdata

# 从构建阶段复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]