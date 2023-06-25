const express = require("express");
const nunjucks = require("nunjucks");
const html_sanitizer = require('sanitize-html');

const app = express();

// Configure view rendering
nunjucks.configure('views', {
	autoescape: true, 
	express: app 
});

// Session configuration (Credentials
app.use(session({secret:"fingerpint", resave: true, saveUninitialized: true}));

app.get('/', (req, res) => {
	res.render('index.html', {
		"req": req,
	});
})