const express = require('express');
const jwt = require('jsonwebtoken');


const API_router = express.Router();

const likes_router = require('./API/likes');
const messaging_router = require("./API/messaging");
const job_posting_router = require("./API/job_posting");


API_router.use(likes_router);
API_router.use(messaging_router);
API_router.use(job_posting_router);


module.exports = API_router;