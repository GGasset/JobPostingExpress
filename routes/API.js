const express = require('express');
const jwt = require('jsonwebtoken');

const authentication = require('../public/server_side/authentication');
const db = require('../models/db');

const API_router = express.Router();

const likes_router = require('./API/likes');
const job_posting_router = require("./API/job_posting");


API_router.use(likes_router);
API_router.use(job_posting_router);


module.exports = API_router;