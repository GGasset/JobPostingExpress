const express = require('express');

const authentication = require('../public/server_side/authentication')

const company_router = express.Router();

// Middleware
company_router.use(function(req, res, next) {
    if (!authentication.require_company_authentication) {
        return false;
    }

    req.session.credentials.user.is_company = true;
    next();
});