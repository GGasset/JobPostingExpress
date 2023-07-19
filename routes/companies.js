const express = require('express');
const jwt = require('jsonwebtoken');

const db = require('../models/db');
const authentication = require('../public/server_side/authentication');

const company_router = express.Router();

// Middleware
company_router.use(function(req, res, next) {
    // Future update - check if user is still on company
    // If user is from company change its user credential to the ones of the company
    new Promise(async function(resolve, reject) {
        if (!authentication.require_company_authentication(req, res)) {
            return false;
        }

        req.session.as_company = true;
    
        next();
    })
});

// Main pages router
const main_pages = require('./main_pages');
company_router.use('/', main_pages)