const express = require('express');

const authentication = require('../public/server_side/authentication');

const profile_router = express.Router();

profile_router.use('/me', function(req, res, next) {
    if (!authentication.is_authenticated(req)) {
        res.redirect('/session/login');
        return;
    }
    next();
})

profile_router.get('/me', function(req, res) {
    res.render('user_settings.html');
})

profile_router.use('/me/company', function(req, res, next) {
    if (!authentication.require_company_authentication(req, res))
    {
        return false;
    }
    else if (!req.session.user.is_company_admin)
    {
        res.status(403).send();
        return;
    }
    next();
})

profile_router.get('/me/company', function(req, res) {
    res.render('company_settings.html');
})

module.exports = profile_router;