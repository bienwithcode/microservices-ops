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
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"testing"
	"time"

	pb "github.com/GoogleCloudPlatform/microservices-demo/src/checkoutservice/genproto"
	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"
)

// recoveryInterceptor recovers from panics in gRPC handlers and returns
// an Internal error instead of crashing the server. This is needed in
// tests where downstream service connections are nil.
func recoveryInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (resp interface{}, err error) {
	defer func() {
		if r := recover(); r != nil {
			err = status.Errorf(codes.Internal, "handler panic: %v", r)
		}
	}()
	return handler(ctx, req)
}

func setupCheckoutGatewayTest(t *testing.T) (gatewayURL string, cleanup func()) {
	t.Helper()

	// Start gRPC server on random port with a checkoutService that has nil
	// downstream connections. A recovery interceptor converts panics from
	// nil connections into gRPC Internal errors.
	grpcLis, err := net.Listen("tcp", "localhost:0")
	if err != nil {
		t.Fatal(err)
	}
	grpcSrv := grpc.NewServer(grpc.UnaryInterceptor(recoveryInterceptor))
	svc := &checkoutService{}
	pb.RegisterCheckoutServiceServer(grpcSrv, svc)
	go grpcSrv.Serve(grpcLis)

	// Start REST gateway on random port
	ctx := context.Background()
	mux := runtime.NewServeMux()
	opts := []grpc.DialOption{grpc.WithTransportCredentials(insecure.NewCredentials())}
	err = pb.RegisterCheckoutServiceHandlerFromEndpoint(ctx, mux, grpcLis.Addr().String(), opts)
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

func TestRESTGatewayCheckoutEndpointReachable(t *testing.T) {
	gatewayURL, cleanup := setupCheckoutGatewayTest(t)
	defer cleanup()

	// POST a minimal PlaceOrder request body.
	// The downstream services are not running, so we expect a non-200
	// response -- but the fact that we get a response at all confirms
	// the gateway is routing POST /api/checkout to the gRPC PlaceOrder method.
	body := map[string]interface{}{
		"user_id":       "test-user",
		"user_currency": "USD",
		"address":       nil,
		"email":         "test@example.com",
		"credit_card":   nil,
	}
	jsonBody, err := json.Marshal(body)
	if err != nil {
		t.Fatal(err)
	}

	resp, err := http.Post(gatewayURL+"/api/checkout", "application/json", bytes.NewReader(jsonBody))
	if err != nil {
		t.Fatalf("failed to reach gateway: %v", err)
	}
	defer resp.Body.Close()

	// We expect the gateway to route the request. The service will return
	// an internal error (nil pointer on downstream connections), which the
	// gateway translates to HTTP 500. A 404 or no-response would indicate
	// the gateway routing is misconfigured.
	if resp.StatusCode == http.StatusNotFound {
		t.Fatalf("expected gateway to route POST /api/checkout, got 404 Not Found")
	}

	// Read and log the response body for debugging
	respBody, _ := io.ReadAll(resp.Body)
	t.Logf("gateway response: status=%d body=%s", resp.StatusCode, string(respBody))
}

func TestRESTGatewayCheckoutMethodNotAllowed(t *testing.T) {
	gatewayURL, cleanup := setupCheckoutGatewayTest(t)
	defer cleanup()

	// GET on /api/checkout should not be allowed (only POST is defined).
	resp, err := http.Get(gatewayURL + "/api/checkout")
	if err != nil {
		t.Fatalf("failed to reach gateway: %v", err)
	}
	defer resp.Body.Close()

	// grpc-gateway returns 501 Not Implemented for unsupported HTTP methods
	// on registered endpoints, or 404 if the route isn't matched.
	if resp.StatusCode != http.StatusNotImplemented && resp.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 501 or 404 for GET /api/checkout, got %d", resp.StatusCode)
	}
}
