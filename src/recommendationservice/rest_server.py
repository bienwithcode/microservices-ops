#!/usr/bin/python
#
# Copyright 2018 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import os
import random

from flask import Flask, jsonify, request

import demo_pb2
import demo_pb2_grpc

from logger import getJSONLogger
logger = getJSONLogger('recommendationservice-rest-server')

app = Flask(__name__)

# Shared gRPC stub -- set during server startup in recommendation_server.py
product_catalog_stub = None

def get_recommendations(product_ids, user_id=""):
    """Core recommendation logic shared between gRPC and REST handlers.

    Fetches the full product catalog from ProductCatalogService via gRPC,
    excludes the given product_ids, and returns a random sample of up to 5.
    """
    max_responses = 5
    cat_response = product_catalog_stub.ListProducts(demo_pb2.Empty())
    all_product_ids = [x.id for x in cat_response.products]
    filtered_products = list(set(all_product_ids) - set(product_ids))
    num_products = len(filtered_products)
    num_return = min(max_responses, num_products)
    indices = random.sample(range(num_products), num_return)
    prod_list = [filtered_products[i] for i in indices]
    return prod_list


@app.route('/api/recommendations', methods=['GET'])
def list_recommendations():
    product_ids_param = request.args.get('productIds', '')
    user_id = request.args.get('userId', '')

    # Parse comma-separated product IDs into a list
    product_ids = []
    if product_ids_param:
        product_ids = [pid.strip() for pid in product_ids_param.split(',') if pid.strip()]

    logger.info("[REST Recv ListRecommendations] productIds={} userId={}".format(
        product_ids, user_id))

    try:
        prod_list = get_recommendations(product_ids, user_id)
        return jsonify({"productIds": prod_list})
    except Exception as e:
        logger.error("[REST ListRecommendations] error: {}".format(str(e)))
        return jsonify({"error": str(e)}), 500


@app.route('/healthz', methods=['GET'])
def healthz():
    return jsonify({"status": "ok"})


def start_rest_server(stub, port=None):
    """Start the Flask REST server in a background thread.

    Args:
        stub: gRPC ProductCatalogServiceStub instance (shared with gRPC server).
        port: Port number for the REST server (default: 8081, or REST_PORT env var).
    """
    global product_catalog_stub
    product_catalog_stub = stub

    if port is None:
        port = int(os.environ.get('REST_PORT', '8081'))

    logger.info("REST server listening on port: {}".format(port))
    app.run(host='0.0.0.0', port=port, threaded=True)
