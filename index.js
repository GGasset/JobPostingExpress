const express = require("express");
const session = require('express-session');
const nunjucks = require("nunjucks");
const sanitize = require("sanitize-html");
const authentication_functions = require('./public/server_side/authentication');
const db = require('./public/server_side/db');

// Configure .env
require('dotenv').config({path: "./config/.env"});

const app = express();

// Configure view rendering
nunjucks.configure('views', {
	autoescape: true, 
	express: app 
});

// Form configuration
app.use(express.urlencoded({ extended: true }))

// Session configuration (Credentials
app.use(session({secret: process.env.session_secret, resave: true, saveUninitialized: true}));

// Middleware
app.use((req, res, next) => {
	res.on('finish', () => {
		console.log(`${res.statusCode} "${req.url}"`)
	})
	next();
});

// Routers
const session_router = require('./routes/session_init');
const resources_router = require('./routes/resources');

app.use('/session', session_router);
app.use('/public', resources_router);

// Main pages
const rendered_posts = 100;
app.get('/', (req, res) => {
	new Promise((resolve, reject) => {
		let posts = [];
		if (!authentication_functions.is_authenticated(req))
		{
			posts = db.get_latest_posts(rendered_posts);
		}
		else
		{
			posts = db.get_relevant_posts(req, res, rendered_posts);
		}
	})
	.then((posts, user) => {
		res.status(200).render('index.html', {
			"posts": posts,
			"req": req,
		});
	});
});

app.post('/post', (req, res) => {
	// Create post
	new Promise((resolve, reject) => {
		if (!authentication_functions.require_authentication(req, res)) {
			res.status(403).send();
			reject();
		}	
		db.post(db.get_user_id(req.session.authentication.email))
		.catch((reason) => {
			if (reason === "Error while inserting post")
				res.status(500).send();
		});
	});
});

app.get('/post/:post_id', (req, res) => {
	new Promise((resolve, reject) => {
		const post_id = req.params.post_id;
		resolve(post_id);
	}).then(function(post_id) {
		
	})
});

app.post('/post/:post_id', (req, res) => {

});

const PORT = 3000;
app.listen(PORT, () => {
	console.log(`http://localhost:${PORT}`)
});