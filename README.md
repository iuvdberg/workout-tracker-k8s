# Workout Tracker — Kubernetes Edition

A family workout tracking app (Angular + Node.js/Express + PostgreSQL), fully containerized and deployed with Kubernetes.

> This is a Kubernetes-focused fork of [workout-tracker](https://github.com/iuvdberg/workout-tracker).
> The original repo uses Docker Compose for local development only; this one runs everything in K8s.

## Architecture

```
Ingress (nginx)
  ├── /api  → backend Service (port 3000) → Express + Prisma
  └── /     → frontend Service (port 80)  → Nginx serving Angular SPA
                                            └── postgres Service (port 5432)
```

All services run in the `workout-tracker` namespace.

## Project Structure

```
workout-tracker-k8s/
├── backend/
│   ├── Dockerfile          # Multi-stage: build TS → runtime Node
│   └── ...
├── frontend/
│   ├── Dockerfile          # Multi-stage: build Angular → Nginx
│   ├── nginx.conf          # SPA routing config
│   └── ...
└── k8s/
    ├── namespace.yaml
    ├── ingress.yaml
    ├── postgres/
    │   ├── secret.yaml     # DB credentials
    │   ├── pvc.yaml        # Persistent volume (1Gi)
    │   ├── deployment.yaml
    │   └── service.yaml
    ├── backend/
    │   ├── secret.yaml     # JWT, Google OAuth, DATABASE_URL
    │   ├── configmap.yaml  # PORT, NODE_ENV, callback URLs
    │   ├── deployment.yaml # includes init container for migrations
    │   └── service.yaml
    └── frontend/
        ├── deployment.yaml
        └── service.yaml
```

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) with Kubernetes enabled, **or** [minikube](https://minikube.sigs.k8s.io/)
- `kubectl` configured to point at your cluster
- An nginx Ingress controller:
  - **Docker Desktop:** `kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.0/deploy/static/provider/cloud/deploy.yaml`
  - **minikube:** `minikube addons enable ingress`

## Setup

### 1. Fill in secrets

Edit `k8s/backend/secret.yaml` with real values:

```yaml
stringData:
  DATABASE_URL: "postgresql://postgres:<your-db-password>@postgres:5432/workout_tracker"
  JWT_SECRET: "<long-random-string>"
  GOOGLE_CLIENT_ID: "<from Google Cloud Console>"
  GOOGLE_CLIENT_SECRET: "<from Google Cloud Console>"
```

Also update `k8s/postgres/secret.yaml` if you want a non-default DB password (make sure `DATABASE_URL` above matches).

Update `k8s/backend/configmap.yaml` to set the correct `FRONTEND_URL` and `GOOGLE_CALLBACK_URL` for your domain.

> **Never commit real secrets.** The `secret.yaml` files contain placeholder values only.

### 2. Build Docker images

From the repo root:

```bash
docker build -t workout-tracker-backend:latest ./backend
docker build -t workout-tracker-frontend:latest ./frontend
```

If using **minikube**, load the images into its registry:

```bash
minikube image load workout-tracker-backend:latest
minikube image load workout-tracker-frontend:latest
```

If using **Docker Desktop K8s**, the images are already available — no extra step needed.

### 3. Apply manifests

```bash
kubectl apply -f k8s/namespace.yaml

kubectl apply -f k8s/postgres/secret.yaml
kubectl apply -f k8s/postgres/pvc.yaml
kubectl apply -f k8s/postgres/deployment.yaml
kubectl apply -f k8s/postgres/service.yaml

kubectl apply -f k8s/backend/secret.yaml
kubectl apply -f k8s/backend/configmap.yaml
kubectl apply -f k8s/backend/deployment.yaml
kubectl apply -f k8s/backend/service.yaml

kubectl apply -f k8s/frontend/deployment.yaml
kubectl apply -f k8s/frontend/service.yaml

kubectl apply -f k8s/ingress.yaml
```

Or apply everything at once (namespace first):

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/
kubectl apply -f k8s/postgres/
kubectl apply -f k8s/backend/
kubectl apply -f k8s/frontend/
```

### 4. Verify

```bash
kubectl get pods -n workout-tracker
kubectl get svc -n workout-tracker
kubectl get ingress -n workout-tracker
```

All pods should reach `Running` / `1/1 Ready` state. The backend pod has an init container that runs `prisma migrate deploy` before the server starts — check its logs if the pod is slow to start:

```bash
kubectl logs -n workout-tracker deploy/backend -c migrate
```

### 5. Access the app

Open [http://localhost](http://localhost) in your browser.

For **minikube**, get the IP first:

```bash
minikube ip   # e.g. 192.168.49.2
# Then visit http://192.168.49.2
```

## Updating

After changing source code:

```bash
# Rebuild the affected image
docker build -t workout-tracker-backend:latest ./backend

# Restart the deployment to pick up the new image
kubectl rollout restart deployment/backend -n workout-tracker
```

## Tech Stack

| Layer    | Technology                            |
|----------|---------------------------------------|
| Frontend | Angular 21, TypeScript, SCSS → Nginx  |
| Backend  | Node.js, Express, TypeScript          |
| Database | PostgreSQL 16                         |
| ORM      | Prisma 7 (driver adapter)             |
| Auth     | Google OAuth 2.0 + JWT                |
| Infra    | Kubernetes, Docker                    |
