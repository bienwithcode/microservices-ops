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
	"net"
	"net/http"
	"testing"
	"time"

	pb "github.com/GoogleCloudPlatform/microservices-demo/src/shippingservice/genproto"
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
	svc := &server{}
	pb.RegisterShippingServiceServer(grpcSrv, svc)
	go grpcSrv.Serve(grpcLis)

	// Start REST gateway on random port
	ctx := context.Background()
	mux := runtime.NewServeMux()
	opts := []grpc.DialOption{grpc.WithTransportCredentials(insecure.NewCredentials())}
	err = pb.RegisterShippingServiceHandlerFromEndpoint(ctx, mux, grpcLis.Addr().String(), opts)
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

func TestRESTGatewayGetQuote(t *testing.T) {
	gatewayURL, cleanup := setupGatewayTest(t)
	defer cleanup()

	body := map[string]interface{}{
		"address": map[string]string{
			"streetAddress": "Muffin Man",
			"city":          "London",
			"state":         "",
			"country":       "England",
		},
		"items": []map[string]interface{}{
			{"productId": "23", "quantity": 1},
			{"productId": "46", "quantity": 3},
		},
	}
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		t.Fatal(err)
	}

	resp, err := http.Post(gatewayURL+"/api/shipping/quote", "application/json", bytes.NewReader(bodyBytes))
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

	costUsd, ok := result["costUsd"].(map[string]interface{})
	if !ok {
		t.Fatal("response missing 'costUsd' object")
	}
	if _, ok := costUsd["currencyCode"]; !ok {
		t.Error("costUsd missing 'currencyCode'")
	}
	if _, ok := costUsd["units"]; !ok {
		t.Error("costUsd missing 'units'")
	}
	if _, ok := costUsd["nanos"]; !ok {
		t.Error("costUsd missing 'nanos'")
	}
}

func TestRESTGatewayGetQuoteEmptyCart(t *testing.T) {
	gatewayURL, cleanup := setupGatewayTest(t)
	defer cleanup()

	body := map[string]interface{}{
		"address": map[string]string{
			"streetAddress": "221B Baker Street",
			"city":          "London",
			"state":         "",
			"country":       "England",
		},
		"items": []map[string]interface{}{},
	}
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		t.Fatal(err)
	}

	resp, err := http.Post(gatewayURL+"/api/shipping/quote", "application/json", bytes.NewReader(bodyBytes))
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

	costUsd, ok := result["costUsd"].(map[string]interface{})
	if !ok {
		t.Fatal("response missing 'costUsd' object")
	}
	units, _ := costUsd["units"].(float64)
	nanos, _ := costUsd["nanos"].(float64)
	if units != 0 || nanos != 0 {
		t.Errorf("expected zero quote for empty cart, got units=%v nanos=%v", units, nanos)
	}
}

func TestRESTGatewayShipOrder(t *testing.T) {
	gatewayURL, cleanup := setupGatewayTest(t)
	defer cleanup()

	body := map[string]interface{}{
		"address": map[string]string{
			"streetAddress": "Muffin Man",
			"city":          "London",
			"state":         "",
			"country":       "England",
		},
		"items": []map[string]interface{}{
			{"productId": "23", "quantity": 1},
			{"productId": "46", "quantity": 3},
		},
	}
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		t.Fatal(err)
	}

	resp, err := http.Post(gatewayURL+"/api/shipping/ship", "application/json", bytes.NewReader(bodyBytes))
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

	trackingId, ok := result["trackingId"].(string)
	if !ok {
		t.Fatal("response missing 'trackingId' string")
	}
	if len(trackingId) == 0 {
		t.Error("expected non-empty tracking ID")
	}
}
