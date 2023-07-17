const express = require('express');
const jwt = require('jsonwebtoken');

const db = require('../models/db');
const authentication = require('../public/server_side/authentication');

const company_router = express.Router();

// Middleware
company_router.use(function(req, res, next) {
    // If user is from company change its user credential to the ones of the company
    new Promise(async function(resolve, reject) {
        if (!authentication.require_company_authentication(req, res)) {
            return false;
        }

        req.session.as_company = true;
    
        next();
    })
});

// Routes
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