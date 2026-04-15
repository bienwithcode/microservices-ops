/*
 * Copyright 2018 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const express = require('express');
const pino = require('pino');
const logger = pino({
    name: 'currencyservice-rest',
    messageKey: 'message',
    formatters: {
        level (logLevelString, logLevelNum) {
            return { severity: logLevelString }
        }
    }
});

const { _getCurrencyDataSync, _carry } = require('./server');

const REST_PORT = process.env.REST_PORT || 7001;

const app = express();
app.use(express.json());

/**
 * GET /api/currencies
 * Returns the list of supported currency codes
 */
app.get('/api/currencies', (req, res) => {
    logger.info('REST: Getting supported currencies...');
    try {
        const data = _getCurrencyDataSync();
        res.json({ currency_codes: Object.keys(data) });
    } catch (err) {
        logger.error(`REST: failed to get currencies: ${err}`);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/currencies/convert
 * Converts a money amount from one currency to another.
 *
 * Request body:
 *   {
 *     "from": { "currencyCode": "USD", "units": 100, "nanos": 0 },
 *     "to":   { "currencyCode": "EUR" }
 *   }
 *
 * Response:
 *   { "currencyCode": "EUR", "units": 88, "nanos": 45555697 }
 */
app.post('/api/currencies/convert', (req, res) => {
    try {
        const data = _getCurrencyDataSync();
        const { from, to } = req.body;

        if (!from || !from.currencyCode || !to || !to.currencyCode) {
            return res.status(400).json({
                error: 'Missing required fields: from.currencyCode, to.currencyCode'
            });
        }

        if (!data[from.currencyCode]) {
            return res.status(400).json({
                error: `Unsupported source currency: ${from.currencyCode}`
            });
        }

        if (!data[to.currencyCode]) {
            return res.status(400).json({
                error: `Unsupported target currency: ${to.currencyCode}`
            });
        }

        const units = from.units || 0;
        const nanos = from.nanos || 0;

        // Convert: from_currency --> EUR
        const euros = _carry({
            units: units / data[from.currencyCode],
            nanos: nanos / data[from.currencyCode]
        });
        euros.nanos = Math.round(euros.nanos);

        // Convert: EUR --> to_currency
        const result = _carry({
            units: euros.units * data[to.currencyCode],
            nanos: euros.nanos * data[to.currencyCode]
        });
        result.units = Math.floor(result.units);
        result.nanos = Math.floor(result.nanos);
        result.currencyCode = to.currencyCode;

        logger.info('REST: conversion request successful');
        res.json(result);
    } catch (err) {
        logger.error(`REST: conversion request failed: ${err}`);
        res.status(500).json({ error: err.message });
    }
});

app.listen(REST_PORT, () => {
    logger.info(`CurrencyService REST server started on port ${REST_PORT}`);
});
