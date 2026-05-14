# Build
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -q clean package -DskipTests

# Runtime
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

RUN useradd --create-home --shell /bin/bash appuser \
    && mkdir -p /var/data \
    && chown -R appuser:appuser /var/data /app
USER appuser

COPY --from=build /app/target/sgi-1.0.0.jar app.jar

ENV SPRING_PROFILES_ACTIVE=prod
ENV SPRING_DATASOURCE_URL=jdbc:sqlite:/var/data/sgi.db

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
