const express = require("express");
const nunjucks = require("nunjucks");

const app = express();

// Configure view rendering
nunjucks.configure('views', {
	autoescape: true, 
	express: app 
});

// Session configuration (Credentials
app.use(session({secret:"fingerpint",resave: true, saveUninitialized: true}));
