// Copyright 2025 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
	"testing"
	"time"

	pb "github.com/GoogleCloudPlatform/microservices-demo/src/productcatalogservice/genproto"
	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func setupGatewayTest(t *testing.T) (gatewayURL string, cleanup func()) {
	t.Helper()

	// Start gRPC server on random port
	grpcLis, err := net.Listen("tcp", "localhost:0")
	if err != nil {
		t.Fatal(err)
	}
	grpcSrv := grpc.NewServer()
	svc := &productCatalog{catalog: pb.ListProductsResponse{Products: []*pb.Product{
		{Id: "test-1", Name: "Test Product Alpha", Description: "A test product"},
		{Id: "test-2", Name: "Test Product Beta", Description: "Another test product"},
	}}}
	pb.RegisterProductCatalogServiceServer(grpcSrv, svc)
	go grpcSrv.Serve(grpcLis)

	// Start REST gateway on random port
	ctx := context.Background()
	mux := runtime.NewServeMux()
	opts := []grpc.DialOption{grpc.WithTransportCredentials(insecure.NewCredentials())}
	err = pb.RegisterProductCatalogServiceHandlerFromEndpoint(ctx, mux, grpcLis.Addr().String(), opts)
	if err != nil {
		grpcSrv.Stop()
		t.Fatal(err)
	}

	gwLis, err := net.Listen("tcp", "localhost:0")
	if err != nil {
		grpcSrv.Stop()
		t.Fatal(err)
	}
	httpSrv := &http.Server{Handler: mux}
	go httpSrv.Serve(gwLis)

	// Wait for servers to be ready
	time.Sleep(100 * time.Millisecond)

	cleanup = func() {
		httpSrv.Close()
		grpcSrv.Stop()
	}

	return "http://" + gwLis.Addr().String(), cleanup
}

func TestRESTGatewayListProducts(t *testing.T) {
	gatewayURL, cleanup := setupGatewayTest(t)
	defer cleanup()

	resp, err := http.Get(gatewayURL + "/api/products")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("failed to decode JSON response: %v", err)
	}

	products, ok := result["products"].([]interface{})
	if !ok {
		t.Fatal("response missing 'products' array")
	}
	if len(products) != 2 {
		t.Fatalf("expected 2 products, got %d", len(products))
	}
}

func TestRESTGatewayGetProduct(t *testing.T) {
	gatewayURL, cleanup := setupGatewayTest(t)
	defer cleanup()

	resp, err := http.Get(gatewayURL + "/api/products/test-1")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	var product map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&product); err != nil {
		t.Fatalf("failed to decode JSON response: %v", err)
	}

	if got, want := product["id"].(string), "test-1"; got != want {
		t.Errorf("expected id %q, got %q", want, got)
	}
	if got, want := product["name"].(string), "Test Product Alpha"; got != want {
		t.Errorf("expected name %q, got %q", want, got)
	}
}

func TestRESTGatewayGetProductNotFound(t *testing.T) {
	gatewayURL, cleanup := setupGatewayTest(t)
	defer cleanup()

	resp, err := http.Get(gatewayURL + "/api/products/nonexistent")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", resp.StatusCode)
	}
}

func TestRESTGatewaySearchProducts(t *testing.T) {
	gatewayURL, cleanup := setupGatewayTest(t)
	defer cleanup()

	resp, err := http.Get(gatewayURL + "/api/products/search?query=alpha")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("failed to decode JSON response: %v", err)
	}

	results, ok := result["results"].([]interface{})
	if !ok {
		t.Fatal("response missing 'results' array")
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 search result, got %d", len(results))
	}
}
