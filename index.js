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
app.use(express.json());

// Session configuration (Credentials
app.use(session({secret: process.env.session_secret, resave: true, saveUninitialized: true}));

// Middleware
app.use((req, res, next) => {
	//console.log(`Requested "${req.url}" ${req.method}`)
	res.on('finish', () => {
		console.log(`${res.statusCode} "${req.url}" ${req.method}`)
	})
	next();
});

app.use(function(req, res, next) {
	if (!authentication_functions.is_authenticated(req))
	{
		next();
		return;
	}

	req.session.credentials.user.is_company = false;
	next();
})

// Routers
const session_router = require('./routes/session_init');
const resources_router = require('./routes/resources');
const API_router = require('./routes/API');

app.use('/session', session_router);
app.use('/public', resources_router);
app.use('/API', API_router);

// Main pages
const rendered_posts = 100;
app.get('/', (req, res) => {
	new Promise(async (resolve, reject) => {
		let posts = [];
		if (!authentication_functions.is_authenticated(req))
		{
			posts = await db.get_latest_posts(rendered_posts);
		}
		else
		{
			posts = await db.get_relevant_posts(req, res, rendered_posts);
		}
		resolve(posts);
	})
	.then((posts) => {
		res.status(200).render('index.html', {
			"posts": posts,
			"req": req,
		});
	});
});

app.post('/post', (req, res) => {
	// Create post
	new Promise(async (resolve, reject) => {
		if (!authentication_functions.require_authentication(req, res)) {
			reject();
			return;
		}

		const text = req.body.text;
		db.insert_post(req.session.credentials.user.id, false, text)
		.catch((reason) => {
			if (reason === "Error while inserting post")
				res.status(500).send();
		}).then(function(value) {
			res.redirect('/');
		});
	}).catch(function (reason) {

	});
});

app.get('/post/:post_id', (req, res) => {
	new Promise((resolve, reject) => {
		const post_id = req.params.post_id;
		resolve(post_id);
	}).then(async function(post_id) {
		let user_info = undefined;
		if (authentication_functions.is_authenticated(req))
			user_info = req.session.credentials.user;
		let post = await db.get_post(post_id, user_info);
		return post;
	}).then(function(post) {
		res.status(200).render('post.html', {
			'req': req,
			'post': post
		});
	});
});

app.post('/post/:post_id', async (req, res) => {
	const post_id = req.params.post_id;
	const text = req.body.text;

	if (!authentication_functions.require_authentication(req, res))
		return;

	await db.comment_on_post(req.session.credentials.user.id,
		false, post_id, text);
	

	res.redirect(`/post/${post_id}`);
});

const PORT = 3000;
app.listen(PORT, () => {
	console.log(`http://localhost:${PORT}`)
});