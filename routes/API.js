const express = require('express');
const db = require("../models/db");

const API_router = express.Router();

const likes_router = require('./API/likes');
const messaging_router = require("./API/messaging");
const job_posting_router = require("./API/job_posting");


API_router.use(likes_router);
API_router.use(messaging_router);
API_router.use(job_posting_router);


API_router.get("/user_info/:is_company/:id", (req, res) => {
    new Promise(async (resolve, reject) => {
        const is_company = req.params.is_company == "true";
        const user_id = req.params.id;
        let user_info = is_company ? await db.get_company_info(user_id) : await db.get_user_info_by_id(user_id);
        
        if (user_info.id === undefined)
            throw "Not found";
        user_info.email = undefined;
        resolve(user_info);
    }).then(user_info => {
        res.status(200).send(JSON.stringify({user: user_info}));
    }).catch(reason => {
        console.log(reason)
        res.status(404).send();
    });
});


module.exports = API_router;