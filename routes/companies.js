const express = require('express');

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

// Routers
const main_pages_router = require('./main_pages');
const API_router = require('./API');

company_router.use('/', main_pages_router);
company_router.use('/API', API_router)

module.exports = company_router;