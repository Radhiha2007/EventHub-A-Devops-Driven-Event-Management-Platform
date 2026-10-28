# EventHub – Event Management Platform

EventHub is a full-stack event management application built to manage the complete event workflow, from creating events and registering participants to tracking attendance and issuing certificates.

The project also explores how DevOps practices can be applied to a full-stack application using Docker, automated backend tests, and monitoring tools.

**Live Demo:** [EventHub](https://eventhub-a-devops-driven-event-4sxy.onrender.com)  
**Backend API:** [FastAPI](https://eventhub-a-devops-driven-event.onrender.com)  
**API Documentation:** [Swagger UI](https://eventhub-a-devops-driven-event.onrender.com/docs)

## Features

- **Event management:** Create and manage events with schedules and registration deadlines.
- **Student registration:** Register for events, view registration history, and enforce registration rules.
- **QR-based attendance:** Generate QR credentials and verify attendance during check-in, with a manual credential fallback.
- **Notifications:** Handle event-related notifications and background tasks using Celery and Redis.
- **Certificates:** Issue and download certificates for eligible participants, with checks for event completion and attendance.
- **Feedback:** Collect event ratings and comments while preventing duplicate submissions.
- **Access control:** Protect user-specific resources and restrict operations based on user permissions.
- **Monitoring:** Use Prometheus and Grafana to inspect metrics from the local application environment.

## Tech Stack

| Area | Technologies |
|---|---|
| Frontend | React, JavaScript, Vite |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| Background tasks | Celery, Redis |
| Containers | Docker, Docker Compose |
| Monitoring | Prometheus, Grafana |
| Supporting tools | PostgreSQL Exporter, Redis Exporter, Blackbox Exporter, Flower |
| Hosting | Render |

## Architecture

The React frontend communicates with the FastAPI backend through REST APIs. PostgreSQL stores application data, while Redis and Celery handle background processing. Prometheus collects configured metrics, which can be viewed through Grafana.

```text
React Frontend
      |
      v
FastAPI Backend
      |
      +------ PostgreSQL
      |
      +------ Redis ------ Celery Worker
      |
      +------ Event, Registration,
              Attendance and Certificate Services

Prometheus ------ Configured Metrics Sources
      |
      v
Grafana
```

## Running Locally

### Prerequisites

- Git
- Docker
- Docker Compose

### 1. Clone the repository

```bash
git clone https://github.com/Radhiha2007/EventHub-A-Devops-Driven-Event-Management-Platform.git
cd EventHub-A-Devops-Driven-Event-Management-Platform
```

### 2. Configure the environment

Check the project's environment configuration and provide the required database, authentication, API, and Redis settings. Use example configuration files if available.

Do not commit real credentials or production environment files to GitHub.

### 3. Start the services

From the project root, run:

```bash
docker compose up --build -d
```

Check the running containers:

```bash
docker compose ps
```

To view logs:

```bash
docker compose logs -f
```

### 4. Open the application

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:8000 |
| API documentation | http://localhost:8000/docs |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3000 |

These addresses assume the corresponding services are enabled and their ports are configured in Docker Compose.

### 5. Stop the services

```bash
docker compose down
```

This stops and removes the Compose-managed containers and network. It normally preserves named volumes, including database data.

## Testing

The backend includes tests for important application workflows and validation rules.

Run the tests in the configured backend environment:

```bash
pytest
```

If running through Docker Compose, use the backend service:

```bash
docker compose exec backend pytest
```

The service name may need to be adjusted to match `docker-compose.yml`.

## Monitoring

The local monitoring setup includes:

- **Prometheus** to collect metrics from configured targets.
- **Grafana** to visualize collected metrics.
- **PostgreSQL Exporter** and **Redis Exporter** to expose service metrics.
- **Blackbox Exporter** for configured endpoint probes.
- **Flower** to inspect Celery workers and background tasks.

The monitoring tools are part of the local environment; their public availability depends on the deployment configuration.

## Deployment

The frontend and backend are hosted on Render. Their deployment configuration and environment variables must be maintained separately.

- [Frontend](https://eventhub-a-devops-driven-event-4sxy.onrender.com)
- [Backend](https://eventhub-a-devops-driven-event.onrender.com)

After making backend changes, run the relevant tests and verify the affected API endpoints before deploying.

## Repository

Source code: [Radhiha2007/EventHub-A-Devops-Driven-Event-Management-Platform](https://github.com/Radhiha2007/EventHub-A-Devops-Driven-Event-Management-Platform)

