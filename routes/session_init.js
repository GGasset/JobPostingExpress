const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const authentication = require('../public/server_side/authentication');
const db = require('../models/db');

const session_router = express.Router()

session_router.get('/login', (req, res) => {
    res.render('login.html', {
        "do_not_show_session_links": true
    });
});

session_router.post('/login', (req, res) => {
    new Promise((resolve, reject) => {
        const email = req.body.email;
        const password = req.body.password;
        if (email === undefined || password === undefined)
        {
            res.status(200).render('login.html', {
                "message": "Provide your credentials to login",
                "message_color": "red"
            });
            throw "Credentials not provided";
        }
        resolve({"email": email, "password": password});
    }).then(async function(email_password) {
        let correct_credentials = true;
        let hashed_password = await db.verify_credentials(email_password.email, email_password.password)
        .catch((reason) => {
            correct_credentials = false;
            return res.status(200).render("login.html", {
                "message": reason,
                "message_color": "red"
            })
        });
        if (!correct_credentials)
            throw "Incorrect credentials";
        let user = await db.get_user_info_by_email(email_password.email);
        return {"user": user, "password_hash": hashed_password};

    }).then(async function(credentials) {
        const accessToken = jwt.sign({user_id: credentials.user.id, password_hash: credentials.password_hash}, process.env.JWTSecret, { expiresIn: 60 * 60 * 24 * 70 });

        req.session.credentials = new Object();
        req.session.credentials.accessToken = accessToken;

        req.session.user = credentials.user;
        if (req.session.user.company_id)
        {
            req.session.company = await db.get_company_info(req.session.user.company_id);
        }
    }).then(function() {
        res.redirect('/');
    }).catch(function(reason) {
        // Do nothing
    })

});

session_router.get('/register', (req, res) => {
    res.render('register.html', {
        "do_not_show_authentication_links": true
    });
});

session_router.post('/register', (req, res) => {
    new Promise(async (resolve, reject) => {
        const email = req.body.email;
        const first_name = req.body.first_name;
        const last_name = req.body.last_name;
    
        if (await db.is_registered_email(email)) {
            res.status(200).render('register.html', {
                'message': "Email already exists",
                "message_color": "red"
            })
            return;
        }
    
        const salt = bcrypt.genSaltSync();
        const hashed_password = bcrypt.hashSync(req.body.password, salt);
        const repeated_hashed_password = bcrypt.hashSync(req.body.repeated_password, salt);
        const password_match = hashed_password == repeated_hashed_password;
        if (!password_match)
        {
            res.status(200).render('register.html', {
                'message': "Passwords don't match",
                "message_color": "red"
            });
            return;
        }
    
        try {
            await db.database.run(
                'INSERT INTO users (email, first_name, last_name, password_hash) VALUES (?, ?, ?, ?);',
                    [email, first_name, last_name, hashed_password]);

            res.redirect('/session/login');
        } catch (err) {
            console.log(`error "${err}" while registering user`)
            res.status(500).contentType('text/plain').send('Try again later');
        }
    })
});

session_router.get('/company/register', (req, res) => {
    new Promise(function(resolve, reject) {
        if (!authentication.require_authentication(req, res))
        {
            reject();
        }
    
        res.render('company_register.html', {
            req: req
        })
    }).catch(function(reason) {

    })
});

session_router.post('/company/register', function(req, res) {
    // https://rapidapi.com/collection/company-information-apis/
    // To check whether a company exists
    // if so you should add a way to file a complaint if someone took your company name
    new Promise(function(resolve, reject) {
        if (!authentication.require_authentication(req, res))
        {
            reject('Sign in as user required')
            return;
        }
        if (authentication.is_authenticated_as_company(req))
        {
            reject('User is already part of a company')
            return;
        }

        const form_data = {
            name: req.body.company_name,
            company_size: req.body.company_size,
            password: req.body.password,
            repeated_password: req.body.repeated_password
        }
        return form_data;
    }).then(function(form_data) {
        const company_info = {
            company_name: form_data.name,
            company_size: form_data.company_size
        }

        const salt = bcrypt.genSaltSync()
        const hashed_password = bcrypt.hashSync(form_data.password, salt);
        const repeated_hashed_password = bcrypt.hashSync(form_data.repeated_password, salt);
        const password_match = hashed_password === repeated_hashed_password;

        if (!password_match)
        {
            throw ("Passwords doesn't match");
        }
        company_info.password_hash = hashed_password;
        return company_info;
    }).then(function(company_info) {
        // Log the user to the company
        req.session.credentials.companyAccessToken = jwt.sign({
            id: company_info.id,
            password_hash: user.company.password_hash
        },  process.env.JWTSecret);

        return company_info.id;
    }).then(async function(company_id) {
        req.session.user = await db.get_user_info_by_id(req.session.user.id);
        req.session.company = await db.get_company_info(company_id);
    }).then(function() {
        // Redirect to company main page
        res.redirect('/company')
    }).catch(function(reason) {
        res.status(200).render('company_register.html', {
            "message": reason,
            "color": "red"
        });
    });
});

module.exports = session_router;