const express = require("express");
const session = require('express-session');
const nunjucks = require("nunjucks");

const authentication = require('./public/server_side/authentication');

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
const app_session = session({
	secret: process.env.session_secret, 
	resave: true, 
	saveUninitialized: true
});
app.use(app_session);

// Middleware
app.use((req, res, next) => {
	res.on('finish', () => {
		console.log(`${res.statusCode} company? ${req.session.as_company} "${req.url}" ${req.method}`)
	})
	next();
});

app.use(function(req, res, next) {
	// If as_company get user data
	new Promise(async function(resolve, reject) {
		if (authentication.is_authenticated(req) && !req.url.includes('/public'))
		{
			req.session.as_company = false;
		}
		next();
	});
})

// Open server
const server = require("http").createServer(app);

module.exports.server = server;
module.exports.session = app_session;



// Add Routers
const main_router = require('./routes/main_pages');
const companies_router = require('./routes/companies');
const session_router = require('./routes/session_init');
const resources_router = require('./routes/resources');
const API_router = require('./routes/API');
const profiles_router = require('./routes/profiles');
const jobs_router = require('./routes/jobs');

app.use('/', main_router);
app.use('/company', companies_router);
app.use('/session', session_router);
app.use('/public', resources_router);
app.use('/API', API_router);
app.use('/profiles', profiles_router);
app.use('/jobs', jobs_router);

const PORT = 3000;
server.listen(PORT, () => {
	console.log(`http://localhost:${PORT}`)
});