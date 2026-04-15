// Copyright 2020 Google LLC
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

using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using cartservice.cartstore;

namespace cartservice.services
{
    public class AddItemRequestDto
    {
        [JsonPropertyName("productId")]
        public string ProductId { get; set; } = "";

        [JsonPropertyName("quantity")]
        public int Quantity { get; set; }
    }

    public class CartItemDto
    {
        [JsonPropertyName("productId")]
        public string ProductId { get; set; } = "";

        [JsonPropertyName("quantity")]
        public int Quantity { get; set; }
    }

    public class CartDto
    {
        [JsonPropertyName("userId")]
        public string UserId { get; set; } = "";

        [JsonPropertyName("items")]
        public List<CartItemDto> Items { get; set; } = new();
    }

    public class MessageResponse
    {
        [JsonPropertyName("message")]
        public string Message { get; set; } = "";
    }

    [JsonSerializable(typeof(AddItemRequestDto))]
    [JsonSerializable(typeof(CartItemDto))]
    [JsonSerializable(typeof(CartDto))]
    [JsonSerializable(typeof(MessageResponse))]
    internal partial class CartJsonContext : JsonSerializerContext
    {
    }

    public static class RestCartService
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        private static string ResolveUserId(string userId, HttpRequest request)
        {
            var sessionId = request.Headers["X-Session-Id"].FirstOrDefault();
            return !string.IsNullOrEmpty(sessionId) ? sessionId : userId;
        }

        public static void MapRestEndpoints(IEndpointRouteBuilder endpoints, ICartStore cartStore)
        {
            // GET /api/cart/{userId} - Get cart items
            endpoints.MapGet("/api/cart/{userId}", async (string userId, HttpContext context) =>
            {
                var effectiveUserId = ResolveUserId(userId, context.Request);
                var cart = await cartStore.GetCartAsync(effectiveUserId);
                var cartDto = new CartDto
                {
                    UserId = cart.UserId,
                    Items = cart.Items.Select(i => new CartItemDto
                    {
                        ProductId = i.ProductId,
                        Quantity = i.Quantity
                    }).ToList()
                };
                return Results.Json(cartDto, JsonOptions);
            });

            // POST /api/cart/{userId}/items - Add item to cart
            endpoints.MapPost("/api/cart/{userId}/items", async (string userId, AddItemRequestDto request, HttpContext context) =>
            {
                var effectiveUserId = ResolveUserId(userId, context.Request);
                await cartStore.AddItemAsync(effectiveUserId, request.ProductId, request.Quantity);
                return Results.Ok(new MessageResponse { Message = "Item added to cart" });
            });

            // DELETE /api/cart/{userId} - Empty cart
            endpoints.MapDelete("/api/cart/{userId}", async (string userId, HttpContext context) =>
            {
                var effectiveUserId = ResolveUserId(userId, context.Request);
                await cartStore.EmptyCartAsync(effectiveUserId);
                return Results.Ok(new MessageResponse { Message = "Cart emptied" });
            });
        }
    }
}
