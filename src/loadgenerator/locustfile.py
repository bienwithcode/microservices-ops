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

import random
import uuid
from locust import FastHttpUser, TaskSet, between
from faker import Faker
import datetime

fake = Faker()

products = [
    '0PUK6V6EV0',
    '1YMWWN1N4O',
    '2ZYFJ3GM2N',
    '66VCHSJNUP',
    '6E92ZMYYFZ',
    '9SIQT8TOJO',
    'L9ECAV7KIM',
    'LS4PSXUNUM',
    'OLJCESPC7Z']

def index(l):
    l.client.get("/")

def setCurrency(l):
    currencies = ['EUR', 'USD', 'JPY', 'CAD', 'GBP', 'TRY']
    # Frontend updates localStorage, and might call convert API
    # Here we simulate the convert API call if needed, or just simulate the state change
    # The actual microservices use the currency_code if passed in some APIs or session
    # For this rebuild, most APIs are stateless and expect currency in the request or use default.
    l.client.post("/api/currencies/convert", json={
        "from": "USD",
        "to": random.choice(currencies)
    }, headers=l.headers)

def browseProduct(l):
    product_id = random.choice(products)
    l.client.get("/api/products/" + product_id, headers=l.headers)
    l.client.get("/api/recommendations", params={"productIds": [product_id], "userId": l.session_id}, headers=l.headers)
    l.client.get("/api/ads", params={"contextKeys": ["food"]}, headers=l.headers)

def viewCart(l):
    l.client.get("/api/cart/" + l.session_id, headers=l.headers)

def addToCart(l):
    product_id = random.choice(products)
    l.client.post(f"/api/cart/{l.session_id}/items", json={
        "productId": product_id,
        "quantity": random.randint(1, 10)
    }, headers=l.headers)

def empty_cart(l):
    l.client.delete(f"/api/cart/{l.session_id}", headers=l.headers)

def checkout(l):
    # Place an item in cart first to ensure checkout has something to do
    product_id = random.choice(products)
    l.client.post(f"/api/cart/{l.session_id}/items", json={
        "productId": product_id,
        "quantity": 1
    }, headers=l.headers)
    
    current_year = datetime.datetime.now().year + 1
    
    l.client.post("/api/checkout", json={
        "userId": l.session_id,
        "email": fake.email(),
        "address": {
            "streetAddress": fake.street_address(),
            "zipCode": fake.zipcode()[:5],
            "city": fake.city(),
            "state": fake.state_abbr(),
            "country": fake.country(),
        },
        "payment": {
            "creditCard": {
                "creditCardNumber": fake.credit_card_number(card_type="visa"),
                "creditCardExpirationMonth": random.randint(1, 12),
                "creditCardExpirationYear": random.randint(current_year, current_year + 10),
                "creditCardCvv": f"{random.randint(100, 999)}",
            }
        },
        "cart": [
            {
                "productId": product_id,
                "quantity": 1
            }
        ]
    }, headers=l.headers)

class UserBehavior(TaskSet):
    def on_start(self):
        self.user.session_id = str(uuid.uuid4())
        self.user.headers = {"X-Session-Id": self.user.session_id}
        index(self)

    tasks = {
        index: 1,
        setCurrency: 2,
        browseProduct: 10,
        addToCart: 2,
        viewCart: 3,
        checkout: 1
    }

class WebsiteUser(FastHttpUser):
    tasks = [UserBehavior]
    wait_time = between(1, 10)
