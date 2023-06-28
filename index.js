const express = require("express");
const session = require('express-session');
const nunjucks = require("nunjucks");
const sanitize = require("sanitize-html");
const authentication_functions = require('./public/authentication');
const db = require('./public/db.js').database;

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
app.use(session({secret:"fingerpint", resave: true, saveUninitialized: true}));

// Middleware
app.use((req, res, next) => {
	res.on('finish', () => {
		console.log(`${res.statusCode} "${req.url}"`)
	})
	next();
});

// Routers
const session_router = require('./routes/session_init');
app.use('/session', session_router)

// Main pages
app.get('/', (req, res) => {
	new Promise((resolve, reject) => {
		let posts = [];
		if (!authentication_functions.is_authenticated(req))
		{
			db.all('SELECT * FROM posts LIMIT 100', (err, rows) => {
				if (err) {
					console.log(err);
					res.status(500).contentType('text/plain').send('Internal server error');
					reject(err);
				}
				posts = rows;
				resolve(posts);
			});
		}
		else
		{
			// Get posts from follows
		}
		return posts
	})
	.then((posts) => {
		if (posts.length == 0)
			return posts, 0

		posts.forEach(post => {
			const poster_id = post.poster_id;
			db.prepare('SELECT username, image_url, has_deactivated_comments FROM users WHERE id = ?')
			.get(poster_id, (err, row) => {
				post.user = row;
			});
		});	

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
	const post_text = req.body.text;
	const sanitized_text = sanitize(post_text);
});

app.get('/post/:post_id', (req, res) => {

});

app.post('/post/:post_id', (req, res) => {

});

const PORT = 3000;
app.listen(PORT, () => {
	console.log(`http://localhost:${PORT}`)
});