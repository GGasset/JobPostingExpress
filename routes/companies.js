const express = require('express');
const jwt = require('jsonwebtoken');

const db = require('../public/server_side/db');
const authentication = require('../public/server_side/authentication');

const company_router = express.Router();

// Middleware
company_router.use(function(req, res, next) {
    new Promise(async function(resolve, reject) {
        if (!authentication.require_company_authentication) {
            return false;
        }
    
        let company_id;
        jwt.verify(req.session.credentials.companyAccessToken, process.env.JWTSecret, function(err, company_info) {
            company_id = company_info.company_id;
        })
        req.session.credentials.user = await db.get_company_info(company_id);
        next();
    })
});

company_router.get('/', function(req, res) {
    new Promise(async function(resolve, reject) {
        const posts = await db.get_relevant_posts(req);
        resolve(posts);
    }).then(function(posts) {
        res.status(200).render('index.html', {
			"posts": posts,
			"req": req,
		});
    })
})