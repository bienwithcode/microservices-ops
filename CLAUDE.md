# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Google's "Online Boutique" — a polyglot microservices e-commerce demo deployed on Kubernetes. Users browse products, add to cart, and checkout. Originally from GoogleCloudPlatform/microservices-demo.

## Architecture

All backend services communicate via **gRPC**. The frontend (Go) acts as an HTTP gateway, calling backend gRPC services. Each backend service also exposes a **REST API** on a separate port via grpc-gateway (Go), Express (Node), Flask (Python), minimal APIs (C#), or JAX-RS (Java). Service discovery is Kubernetes DNS-based.

### Service Dependency Graph

```
Frontend (Go, :8080, HTTP)
  ├── ProductCatalogService (Go, gRPC :3550, REST :3551)
  ├── CurrencyService (Node.js, gRPC :7000, REST :7001)
  ├── CartService (C#, gRPC :7070, REST :7071) → Redis (:6379)
  ├── RecommendationService (Python, gRPC :8080, REST :8081) → ProductCatalogService
  ├── ShippingService (Go, gRPC :50051, REST :50052)
  ├── CheckoutService (Go, gRPC :5050, REST :5051)
  │     ├── CartService
  │     ├── ProductCatalogService
  │     ├── CurrencyService
  │     ├── ShippingService
  │     ├── PaymentService (Node.js, :50051)
  │     └── EmailService (Python, :5000)
  ├── AdService (Java/Gradle, gRPC :9555, REST :9556)
  └── ShoppingAssistantService (Python, :80) [optional, Gemini AI]

LoadGenerator (Python/Locust) → Frontend
```

### Proto Definitions

All gRPC service definitions live in `protos/demo.proto`. Each service has a `genproto.sh` script that generates language-specific bindings from this proto file. The proto file includes `google.api.http` annotations for REST endpoint definitions.

### REST Gateway Pattern (Go services)

Go services expose REST APIs via grpc-gateway v2. Each service has a `gateway.go` file that:
1. Creates a `runtime.NewServeMux()`
2. Registers handlers via `pb.Register<Service>HandlerFromEndpoint()` against the local gRPC server
3. Starts an HTTP server on a separate port (controlled by `REST_PORT` env var)

Canonical example: `src/productcatalogservice/gateway.go`

### REST Ports

REST ports are controlled by the `REST_PORT` env var in each service. Defaults:
- ProductCatalogService: 3551
- ShippingService: 50052
- CheckoutService: 5051
- CartService: 7071
- CurrencyService: 7001
- RecommendationService: 8081
- AdService: 9556

## Build & Deploy Commands

**Primary tool: Skaffold** (builds Docker images and deploys to Kubernetes).

```bash
# Build and deploy everything (local cluster)
skaffold run

# Dev mode with auto-rebuild on file changes
skaffold dev

# Build for GKE with Artifact Registry
skaffold run --default-repo=us-docker.pkg.dev/PROJECT_ID/microservices-demo

# Cleanup
skaffold delete
```

**Quick deploy with pre-built images (no build needed):**
```bash
kubectl apply -f ./release/kubernetes-manifests.yaml
```

**Access the app:**
```bash
kubectl port-forward deployment/frontend 8080:8080
# Then open localhost:8080
```

## Per-Service Build & Test

**IMPORTANT: Use Docker for ALL service builds and tests. Do NOT install language runtimes (Go, .NET, Java, Node, Python) locally. Each service has a Dockerfile that provides the correct build environment.**

### Docker-first verification

```bash
# Verify any service builds correctly
docker build -t <service> src/<service>/        # most services
docker build -t cartservice src/cartservice/src/ # cartservice Dockerfile is in src/

# Verify all services at once
docker build -t productcatalogservice src/productcatalogservice/
docker build -t shippingservice src/shippingservice/
docker build -t checkoutservice src/checkoutservice/
docker build -t cartservice src/cartservice/src/
docker build -t currencyservice src/currencyservice/
docker build -t recommendationservice src/recommendationservice/
docker build -t adservice src/adservice/
```

### Go services — local tests (only if Go is already installed)

Only use local `go test` if Go is already on the machine. Otherwise rely on Docker build or CI.

```bash
cd src/<service>
go test ./... -v
```

### Proto generation

```bash
cd src/<service>
./genproto.sh    # requires protoc + language-specific plugins
```

### Load generator (Python/Locust)

```bash
cd src/loadgenerator
docker build -t loadgenerator .
```

## Code Style (.editorconfig)

- Default: 2 spaces
- Go: **tabs**
- C#, Java, Dockerfiles, Python: **4 spaces**
- Trim trailing whitespace, final newline always

## CI (GitHub Actions)

- **PR workflow** (`.github/workflows/ci-pr.yaml`): Runs Go unit tests (shippingservice, productcatalogservice, frontend/validator), C# tests (cartservice), then deploys to a PR-specific GKE namespace with smoke tests
- **Main workflow** (`.github/workflows/ci-main.yaml`): Same pipeline on push to main/release branches

## Key Directories

- `protos/` — gRPC service definitions (demo.proto)
- `kubernetes-manifests/` — per-service K8s manifests
- `release/` — autogenerated single-file manifest with pre-built GCR images
- `kustomize/` — deployment variants (memorystore, spanner, istio, network-policies, etc.)
- `terraform/` — GKE cluster provisioning
- `src/<service>/` — each service is self-contained with its own Dockerfile and genproto.sh

## Conventions

- All containers run as non-root (UID 1000), read-only filesystem, dropped capabilities
- Go services use distroless base images; C# uses chiseled images
- Kubernetes manifests define readiness/liveness probes (HTTP for frontend, gRPC for others)
- `release/kubernetes-manifests.yaml` is autogenerated — do not hand-edit
