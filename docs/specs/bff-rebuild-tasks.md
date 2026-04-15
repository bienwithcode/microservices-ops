# Implementation Plan: REST API + React Rebuild

## Execution Strategy

Build **bottom-up**: proto annotations first, then backend REST layers (parallel), then nginx + frontend (parallel with backend). Finally integrate.

```
Phase 1: Foundation (proto + shared)
    │
Phase 2: Backend REST layers (7 services in parallel)
    │
Phase 3: Frontend SPA (parallel with Phase 2)
    │
Phase 4: Kubernetes + Skaffold integration
    │
Phase 5: End-to-end verification
```

---

## Phase 1: Foundation

### Task 1.1: Add `google.api.http` annotations to `demo.proto`
- **What**: Add HTTP annotations to all gRPC methods that need REST exposure (ProductCatalog, Cart, Currency, Recommendation, Shipping, Checkout, Ad). Skip Payment and Email.
- **Acceptance**: Proto compiles without errors. Annotations define REST paths matching the spec API design.
- **Verify**: `protoc` compiles `demo.proto` successfully.
- **Files**: `protos/demo.proto`

### Task 1.2: Update `genproto.sh` in Go services for grpc-gateway
- **What**: Update `genproto.sh` scripts in Go services to also generate grpc-gateway reverse-proxy stubs from the annotated proto.
- **Acceptance**: Running `./genproto.sh` in each Go service produces `*.pb.gw.go` files alongside existing `.pb.go` files.
- **Verify**: `./genproto.sh && ls genproto/` shows gateway files.
- **Files**: `src/productcatalogservice/genproto.sh`, `src/shippingservice/genproto.sh`, `src/checkoutservice/genproto.sh`

### Task 1.3: Add grpc-gateway dependency to Go services
- **What**: Add `github.com/grpc-ecosystem/grpc-gateway/v2` and related deps to `go.mod` in each Go service.
- **Acceptance**: `go mod tidy && go build ./...` succeeds.
- **Verify**: `go build ./...` passes in all 3 Go services.
- **Files**: `go.mod` in each Go service

---

## Phase 2: Backend REST Layers

*All 7 tasks can be done in parallel — each service is independent.*

### Task 2.1: ProductCatalogService — REST via grpc-gateway (Go, :3551)
- **What**: Add REST gateway server on port 3551 alongside gRPC on 3550. Gateway translates REST JSON → gRPC.
- **Acceptance**: `GET /api/products` returns JSON. `GET /api/products/{id}` returns single product. Existing gRPC tests pass.
- **Verify**: `go test ./... -v` passes. `curl localhost:3551/api/products` returns JSON.
- **Files**: `src/productcatalogservice/main.go`, new gateway registration file
- **Depends on**: 1.1, 1.2, 1.3

### Task 2.2: ShippingService — REST via grpc-gateway (Go, :50052)
- **What**: Add REST gateway on port 50052 alongside gRPC on 50051.
- **Acceptance**: `POST /api/shipping/quote` returns quote. Existing tests pass.
- **Verify**: `go test ./... -v` passes. Manual curl test.
- **Files**: `src/shippingservice/main.go`, gateway registration
- **Depends on**: 1.1, 1.2, 1.3

### Task 2.3: CheckoutService — REST via grpc-gateway (Go, :5051)
- **What**: Add REST gateway on port 5051 alongside gRPC on 5050. Inter-service gRPC calls unchanged.
- **Acceptance**: `POST /api/checkout` places order. Inter-service gRPC still works.
- **Verify**: `go test ./... -v` passes. Manual curl test.
- **Files**: `src/checkoutservice/main.go`, gateway registration
- **Depends on**: 1.1, 1.2, 1.3

### Task 2.4: CartService — REST via ASP.NET Core minimal APIs (C#, :7071)
- **What**: Add REST endpoints on port 7071 alongside gRPC on 7070. Extract `X-Session-Id` header as userId. Call same business logic.
- **Acceptance**: `GET /api/cart/{userId}`, `POST /api/cart/{userId}/items`, `DELETE /api/cart/{userId}` work. Existing tests pass.
- **Verify**: `dotnet test` passes. Manual curl tests.
- **Files**: `src/cartservice/src/Program.cs` or new REST controller
- **Depends on**: None

### Task 2.5: CurrencyService — REST via Express.js (Node.js, :7001)
- **What**: Add Express REST server on port 7001 alongside gRPC on 7000. REST handlers call same conversion logic.
- **Acceptance**: `GET /api/currencies` returns list. `POST /api/currencies/convert` converts prices.
- **Verify**: `docker build` succeeds. Manual curl tests.
- **Files**: `src/currencyservice/server.js` or new `rest-server.js`
- **Depends on**: None

### Task 2.6: RecommendationService — REST via Flask (Python, :8081)
- **What**: Add Flask REST server on port 8081 alongside gRPC on 8080. Calls ProductCatalogService via gRPC (unchanged).
- **Acceptance**: `GET /api/recommendations?productIds=...&userId=...` returns recommendations.
- **Verify**: `docker build` succeeds. Manual curl test.
- **Files**: `src/recommendationservice/recommendation_server.py` or new `rest_server.py`
- **Depends on**: None

### Task 2.7: AdService — REST via JAX-RS (Java, :9556)
- **What**: Add REST endpoint on port 9556 alongside gRPC on 9555.
- **Acceptance**: `GET /api/ads?contextKeys=...` returns ads.
- **Verify**: `./gradlew installDist` succeeds. Manual curl test.
- **Files**: `src/adservice/src/main/java/...` — new REST handler
- **Depends on**: None

---

## Phase 3: Frontend SPA

*Can start in parallel with Phase 2.*

### Task 3.1: Create React SPA scaffold
- **What**: Initialize React 18 + Vite project in `src/frontend-react/`. Set up React Router, directory structure (api/, pages/, components/, context/). Copy static assets from current `src/frontend/static/`.
- **Acceptance**: `npm run dev` starts. React Router renders placeholder pages for Home, Product, Cart, Checkout.
- **Verify**: `npm run build && npm run lint` pass.
- **Files**: `src/frontend-react/` — new project
- **Depends on**: None

### Task 3.2: Build API client layer + Axios setup
- **What**: Create Axios instance with `X-Session-Id` interceptor (UUID from localStorage). Create API modules for each service.
- **Acceptance**: Each module exports functions matching REST API spec. Session ID sent on every request.
- **Verify**: Unit tests with mocked axios.
- **Files**: `src/frontend-react/src/api/` — client.js + per-service modules
- **Depends on**: 3.1

### Task 3.3: Build context providers (session, cart, currency)
- **What**: React Context for session (UUID in localStorage), cart state, currency selection.
- **Acceptance**: Session persists across refresh. Cart updates on add/remove. Currency stores selected code.
- **Verify**: Unit tests for each provider.
- **Files**: `src/frontend-react/src/context/` — SessionContext, CartContext, CurrencyContext
- **Depends on**: 3.2

### Task 3.4: Build shared UI components
- **What**: Header (cart badge, currency selector), ProductCard, CartItem, CheckoutForm, Footer. Bootstrap 5 matching current UI.
- **Acceptance**: Components render identically to current frontend HTML templates.
- **Verify**: Visual comparison with current frontend.
- **Files**: `src/frontend-react/src/components/`
- **Depends on**: 3.3

### Task 3.5: Build page components
- **What**: Home (product grid), ProductDetail, Cart, Checkout pages. Fetch via REST APIs. Same layout as current templates.
- **Acceptance**: Full user flow works: browse → product → cart → checkout. Currency conversion displays.
- **Verify**: Visual comparison + full flow walkthrough.
- **Files**: `src/frontend-react/src/pages/`
- **Depends on**: 3.2, 3.3, 3.4

### Task 3.6: Create nginx config + Dockerfile
- **What**: `nginx.conf` serves React SPA and reverse-proxies `/api/*` to backend services. CORS headers at nginx level. Dockerfile: multi-stage Vite build → nginx.
- **Acceptance**: nginx routes correctly. SPA client-side routing works (fallback to index.html). CORS headers present.
- **Verify**: `docker build` succeeds. Container serves frontend + proxies APIs.
- **Files**: `src/frontend-react/nginx.conf`, `src/frontend-react/Dockerfile`
- **Depends on**: 3.5

---

## Phase 4: Kubernetes + Skaffold

### Task 4.1: Create K8s manifest for frontend-react
- **What**: Deployment + Service + ServiceAccount for `frontend-react` in `kubernetes-manifests/`.
- **Acceptance**: `kubectl apply` succeeds. Pod healthy.
- **Verify**: `kubectl get pods` shows running pod.
- **Files**: `kubernetes-manifests/frontend-react.yaml`
- **Depends on**: 3.6

### Task 4.2: Update K8s manifests for REST ports
- **What**: Add new container ports for REST endpoints in each service manifest. Keep existing gRPC ports/probes intact.
- **Acceptance**: Each manifest has both gRPC and REST ports.
- **Verify**: `kubectl apply` succeeds for all.
- **Files**: 7 service manifests in `kubernetes-manifests/`
- **Depends on**: Phase 2 complete

### Task 4.3: Update Skaffold config
- **What**: Add `frontend-react` artifact to `skaffold.yaml`.
- **Acceptance**: `skaffold build` builds all images.
- **Verify**: `skaffold build` succeeds.
- **Files**: `skaffold.yaml`
- **Depends on**: 4.1, 4.2

---

## Phase 5: Integration & Verification

### Task 5.1: End-to-end smoke test
- **What**: Deploy via `skaffold dev`. Walk full flow: browse → product → cart → currency → checkout.
- **Acceptance**: All pages load. Cart persists. Checkout completes. Ads + recommendations display.
- **Verify**: Manual walkthrough.
- **Depends on**: Phase 4 complete

### Task 5.2: Update load generator
- **What**: Update Locust scripts to target new frontend-react endpoints.
- **Acceptance**: Load generator runs without errors.
- **Verify**: `locust --host=http://frontend-react:8080` generates traffic.
- **Files**: `src/loadgenerator/`
- **Depends on**: 5.1

### Task 5.3: Run full test suite
- **What**: Run all tests across all services.
- **Acceptance**: All Go tests, C# tests pass. All Docker builds succeed.
- **Verify**: Green test run.
- **Depends on**: 5.1

---

## Dependency Graph

```
Phase 1:  1.1 ──→ 1.2 ──→ 1.3 ──┐
                                 ├─→ 2.1 ProductCatalog
                                 ├─→ 2.2 Shipping
                                 └─→ 2.3 Checkout

Phase 2 (parallel):              2.4 Cart (C#)
                                  2.5 Currency (Node)
                                  2.6 Recommend (Python)
                                  2.7 Ad (Java)
                                      │
                                      ├──→ 4.2 Update K8s manifests
                                      │
Phase 3 (parallel with 2):  3.1 ──→ 3.2 ──→ 3.3 ──→ 3.4 ──→ 3.5 ──→ 3.6 ──→ 4.1 K8s manifest
                                                                              │
                                                              4.3 Skaffold ←── 4.1 + 4.2
                                                                      │
Phase 5:                                              5.1 Smoke test ──→ 5.2 Load gen + 5.3 Full tests
```
