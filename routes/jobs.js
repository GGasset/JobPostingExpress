const express = require('express');
const db = require('../models/db');

const job_router = express.Router();

job_router.get('jobs/:category', (req, res) => {
    new Promise((resolve, reject) => {
        
    })
});

module.exports = job_router;