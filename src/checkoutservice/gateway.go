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
	"fmt"
	"net"
	"net/http"

	pb "github.com/GoogleCloudPlatform/microservices-demo/src/checkoutservice/genproto"
	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func runGateway(ctx context.Context, grpcPort string, gatewayPort string) error {
	mux := runtime.NewServeMux()
	opts := []grpc.DialOption{grpc.WithTransportCredentials(insecure.NewCredentials())}
	if err := pb.RegisterCheckoutServiceHandlerFromEndpoint(ctx, mux, "localhost:"+grpcPort, opts); err != nil {
		return fmt.Errorf("failed to register gateway handler: %w", err)
	}

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", gatewayPort))
	if err != nil {
		return fmt.Errorf("failed to listen on gateway port %s: %w", gatewayPort, err)
	}

	log.Infof("starting REST gateway at :%s -> gRPC :%s", gatewayPort, grpcPort)
	go func() {
		if err := http.Serve(lis, mux); err != nil {
			log.Errorf("gateway server error: %v", err)
		}
	}()

	return nil
}
