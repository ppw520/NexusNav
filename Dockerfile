FROM node:20-alpine AS frontend-build
WORKDIR /workspace/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM maven:3.9-eclipse-temurin-17 AS backend-build
WORKDIR /workspace/backend
COPY backend/pom.xml ./pom.xml
COPY backend/.mvn ./.mvn
COPY backend/mvnw ./mvnw
COPY backend/src ./src
RUN mkdir -p ./src/main/resources/static
COPY --from=frontend-build /workspace/frontend/dist/. ./src/main/resources/static/
RUN chmod +x ./mvnw && ./mvnw -q -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app
RUN mkdir -p /app/data /app/config
COPY --from=backend-build /workspace/backend/target/*.jar /app/app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
