const express = require("express");

const authentication = require("../../public/server_side/authentication");
const db = require("../../models/db");

const messaging_router = express.Router()

messaging_router.get("/get_messages/:is_company/:user_id/:page_n", (req, res) => {
    new Promise(async (resolve, reject) => {
        if (!authentication.require_authentication(req, res)) {
            return;
        }

        const requester_as_company = req.session.as_company;
        const requesting_client_id = requester_as_company ?
            req.session.company.id : req.session.user.id;
        
        const counterpart_as_company = req.params.is_company;
        const counterpart_id = req.params.user_id;
    
        const page_n = req.params.page_n;
        const messages = await db.get_last_messages(page_n, requesting_client_id, requester_as_company, counterpart_id, counterpart_as_company);
        
        res.status(200).contentType("application/json").send(JSON.stringify(messages));
    })
});

messaging_router.post("/message/:is_company/:user_id", async (req, res) => {
    // Add end-to-end encryption. https?
});


module.exports = messaging_router;