# Spec: Online Boutique — REST API + React Rebuild

## Objective

Rebuild the Online Boutique frontend layer from a server-rendered Go app to a **React SPA** that calls **REST APIs** exposed by each backend service. Backend services keep their existing gRPC interfaces for inter-service communication but gain a new REST layer for frontend-facing calls. Business logic does not change.

**Why:** Decouple frontend from gRPC, enable independent frontend iteration, and expose well-defined REST APIs per service.

## Architecture

### Before (current)

```
Browser → Frontend (Go, server-rendered HTML)
             ├── gRPC → ProductCatalogService
             ├── gRPC → CurrencyService
             ├── gRPC → CartService → Redis
             ├── gRPC → RecommendationService → ProductCatalogService
             ├── gRPC → ShippingService
             ├── gRPC → CheckoutService → Cart, ProductCatalog, Currency,
             │                                  Shipping, Payment, Email
             └── gRPC → AdService
```

### After (target)

```
Browser → React SPA (static)
             ├── REST → ProductCatalogService (Go, REST+gRPC)
             ├── REST → CurrencyService (Node.js, REST+gRPC)
             ├── REST → CartService (C#, REST+gRPC) → Redis
             ├── REST → RecommendationService (Python, REST+gRPC)
             │              └── gRPC → ProductCatalogService
             ├── REST → ShippingService (Go, REST+gRPC)
             ├── REST → CheckoutService (Go, REST+gRPC)
             │              └── gRPC → CartService, ProductCatalogService,
             │                         CurrencyService, ShippingService,
             │                         PaymentService, EmailService
             └── REST → AdService (Java, REST+gRPC)

Internal-only (gRPC, no REST):
  - PaymentService (Node.js)
  - EmailService (Python)
```

### Key Principle

- **Frontend → Service**: REST (JSON over HTTP)
- **Service → Service**: gRPC (unchanged)
- **Business logic**: Untouched — only add transport layer

## Tech Stack

| Component | Technology | Notes |
|-----------|-----------|-------|
| Frontend | React 18 + Vite | SPA, static files served by nginx or CDN |
| Routing | React Router v6 | Client-side routing |
| HTTP client | Axios or fetch | REST API calls |
| State | React Context + hooks | Cart, currency, session |
| Styling | Bootstrap 5 | Match current UI design |
| Go REST | grpc-gateway v2 | Auto-generate REST from proto definitions |
| C# REST | ASP.NET Core minimal APIs | Add alongside gRPC server |
| Node.js REST | Express.js | Add alongside gRPC server |
| Python REST | Flask | Add alongside gRPC server |
| Java REST | grpc-servlet / JAX-RS | Add alongside gRPC server |

## Commands

```bash
# --- Frontend ---
cd src/frontend-react
npm install
npm run dev          # Vite dev server with proxy
npm run build        # Production build → dist/
npm run lint         # ESLint
npm test             # Vitest

# --- Go services (add grpc-gateway) ---
cd src/productcatalogservice
./genproto.sh        # Generate gRPC + gateway stubs
go test ./... -v

cd src/shippingservice
./genproto.sh
go test ./... -v

cd src/checkoutservice
./genproto.sh
go test ./... -v

# --- C# CartService ---
cd src/cartservice
dotnet restore src/cartservice.csproj
dotnet build src/cartservice.csproj
dotnet test src/cartservice/

# --- Node.js CurrencyService ---
cd src/currencyservice
npm install
docker build -t currencyservice .

# --- Python RecommendationService ---
cd src/recommendationservice
pip install -r requirements.txt
docker build -t recommendationservice .

# --- Java AdService ---
cd src/adservice
./gradlew installDist
docker build -t adservice .

# --- Deploy everything ---
skaffold dev

# --- Access ---
kubectl port-forward deployment/frontend-react 8080:8080
```

## Project Structure

```
src/
├── frontend-react/              # NEW — React SPA
│   ├── public/
│   │   ├── icons/               # Static icons (from current frontend)
│   │   └── img/                 # Product images (from current frontend)
│   ├── src/
│   │   ├── api/                 # REST API client modules
│   │   │   ├── productCatalog.js
│   │   │   ├── cart.js
│   │   │   ├── currency.js
│   │   │   ├── recommendation.js
│   │   │   ├── shipping.js
│   │   │   ├── checkout.js
│   │   │   └── ad.js
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Page components (Home, Product, Cart, etc.)
│   │   ├── context/             # React Context providers (cart, currency, session)
│   │   ├── hooks/               # Custom hooks
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── Dockerfile               # Multi-stage: build + nginx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── productcatalogservice/       # MODIFIED — add REST via grpc-gateway
├── cartservice/                  # MODIFIED — add REST via ASP.NET minimal APIs
├── currencyservice/              # MODIFIED — add REST via Express
├── recommendationservice/        # MODIFIED — add REST via Flask
├── shippingservice/              # MODIFIED — add REST via grpc-gateway
├── checkoutservice/              # MODIFIED — add REST via grpc-gateway
├── adservice/                    # MODIFIED — add REST via JAX-RS
│
├── paymentservice/               # UNCHANGED — gRPC only
├── emailservice/                 # UNCHANGED — gRPC only
└── loadgenerator/                # MODIFIED — target new REST endpoints
```

## REST API Design

### ProductCatalogService (Go, :3550 → REST on :3551)

```
GET    /api/products              → List products
GET    /api/products/{id}         → Get product by ID
GET    /api/products/search?q=    → Search products
```

### CartService (C#, :7070 → REST on :7071)

```
GET    /api/cart/{userId}         → Get cart items
POST   /api/cart/{userId}/items   → Add item to cart (body: { productId, quantity })
DELETE /api/cart/{userId}         → Empty cart
```

### CurrencyService (Node.js, :7000 → REST on :7001)

```
GET    /api/currencies            → Get supported currencies
POST   /api/currencies/convert    → Convert price (body: { from, to, units, nanos })
```

### RecommendationService (Python, :8080 → REST on :8081)

```
GET    /api/recommendations?productIds=&userId=   → Get recommendations
```

### ShippingService (Go, :50051 → REST on :50052)

```
POST   /api/shipping/quote        → Get shipping quote (body: { items, address })
```

### CheckoutService (Go, :5050 → REST on :5051)

```
POST   /api/checkout              → Place order (body: { userId, items, address, payment })
```

### AdService (Java, :9555 → REST on :9556)

```
GET    /api/ads?contextKeys=      → Get ads
```

### Session Management (Auth)

- **No real authentication** — this is a demo app with no user accounts
- Frontend generates a UUID v4 session ID on first visit (stored in `localStorage`)
- Passed as `X-Session-Id` header on every REST request
- Backends use the session ID as `userId` (cart ownership, recommendations)
- Nginx does **not** validate sessions — just forwards the header
- Each backend extracts `X-Session-Id` from incoming requests

## Code Style

### React (Frontend)

```jsx
// API client — src/api/productCatalog.js
import api from './client';

export async function getProducts() {
  const { data } = await api.get('/api/products');
  return data;
}

export async function getProduct(id) {
  const { data } = await api.get(`/api/products/${id}`);
  return data;
}

// Page component — src/pages/Home.jsx
import { useEffect, useState } from 'react';
import { getProducts } from '../api/productCatalog';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    getProducts().then(setProducts);
  }, []);

  return (
    <div className="container">
      <div className="row">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
```

### Go (grpc-gateway addition)

```go
// Register REST gateway alongside gRPC server
import (
    "github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
    "google.golang.org/grpc"
)

func registerRESTGateway(mux *runtime.ServeMux, grpcAddr string) error {
    opts := []grpc.DialOption{grpc.WithInsecure()}
    if err := pb.RegisterProductCatalogHandlerFromEndpoint(ctx, mux, grpcAddr, opts); err != nil {
        return err
    }
    return nil
}
```

## Testing Strategy

| Layer | Tool | What to test |
|-------|------|-------------|
| Frontend unit | Vitest + React Testing Library | Components, hooks, API clients (mocked) |
| Frontend E2E | Playwright | Full user flows (browse → cart → checkout) |
| Go REST | Go standard `testing` | grpc-gateway handler tests |
| C# REST | xUnit | Minimal API endpoint tests |
| Node.js REST | Jest or manual | Express route handler tests |
| Python REST | pytest | Flask endpoint tests |
| Java REST | JUnit | JAX-RS endpoint tests |
| Integration | Skaffold dev + smoke tests | Full stack in Kubernetes |

**Coverage expectations:** REST handlers tested for happy path + error cases. No need to re-test existing business logic.

## Boundaries

### Always do
- Run existing tests before and after changes to each service
- Keep gRPC ports unchanged — only add new REST ports
- Preserve existing Kubernetes manifests for gRPC communication
- Use same session/user ID logic (UUID stored in frontend)
- Match current UI pixel-for-pixel (same Bootstrap styling)

### Ask first
- Changing proto definitions in `protos/demo.proto`
- Adding new dependencies to any service
- Changing Kubernetes resource limits or probes
- Modifying Docker base images
- Changing the port assignments

### Never do
- Modify business logic in any backend service
- Remove existing gRPC endpoints
- Change the database schema (Redis cart structure)
- Commit secrets or credentials
- Modify `release/kubernetes-manifests.yaml` (autogenerated)

## Success Criteria

- [ ] React SPA renders all current pages: Home, Product Detail, Cart, Checkout
- [ ] Each page fetches data via REST APIs (no gRPC from browser)
- [ ] Full user flow works: browse → add to cart → change currency → checkout
- [ ] All existing backend gRPC tests pass unchanged
- [ ] Inter-service gRPC communication works unchanged
- [ ] Load generator still produces valid traffic
- [ ] All services build and deploy via Skaffold
- [ ] Session/cart persistence works across page refreshes

## Decisions

| Question | Decision |
|----------|----------|
| CORS | Single nginx reverse proxy handles CORS for all services |
| Port strategy | Separate REST port per service (simpler, isolated) |
| Proto annotations | Add `google.api.http` annotations to `demo.proto` — grpc-gateway auto-generates REST for Go services |
| Frontend hosting | Own nginx container serving React SPA + reverse proxy to backend REST APIs |

### Nginx Proxy Architecture

```
Browser → nginx (frontend-react:8080)
            ├── /              → React SPA (static files)
            ├── /api/products* → productcatalogservice:3551
            ├── /api/cart*     → cartservice:7071
            ├── /api/currencies* → currencyservice:7001
            ├── /api/recommendations* → recommendationservice:8081
            ├── /api/shipping* → shippingservice:50052
            ├── /api/checkout* → checkoutservice:5051
            └── /api/ads*      → adservice:9556
```

Frontend calls all APIs as relative paths (e.g., `/api/products`) — nginx routes to the correct service. CORS handled at nginx level only.

## Implementation Order

See task breakdown document (to be created after spec approval).
