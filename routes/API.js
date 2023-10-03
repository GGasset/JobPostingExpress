const express = require('express');
const jwt = require('jsonwebtoken');

const authentication = require('../public/server_side/authentication');
const db = require('../models/db');

const API_router = express.Router();

const likes_router = require('./API/likes');


API_router.use(likes_router);


module.exports = API_router;