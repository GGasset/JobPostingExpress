const express = require("express");
const bcrypt = require("bcrypt");

const authentication = require("../../public/server_side/authentication");
const db = require("../../models/db");

const messaging_router = express.Router()

const salt = bcrypt.genSaltSync();

messaging_router.get("/get_contacts", (req, res) => {
    new Promise(async (resolve, reject) => {
        const as_company = req.session.as_company;
        const id = as_company ? 
            req.session.company.id :
            req.session.user.id;

        const contacts = await db.get_contacts(id, as_company);
        resolve(contacts);
    }).then((contacts) => {
        res.status(200).send(JSON.stringify(contacts));
    });
});

messaging_router.get("/get_messages/:is_company/:user_id/:page_n", (req, res) => {
    new Promise(async (resolve, reject) => {
        if (!authentication.require_authentication(req, res)) {
            return;
        }

        const requester_as_company = req.session.as_company;
        const requesting_client_id = requester_as_company ?
            req.session.company.id : req.session.user.id;
        
        const counterpart_as_company = req.params.is_company == true;
        const counterpart_id = req.params.user_id;
    
        const page_n = req.params.page_n;
        const messages = await db.get_last_messages(page_n, requesting_client_id, requester_as_company, counterpart_id, counterpart_as_company);
        
        res.status(200).send(JSON.stringify(messages));
    })
});

messaging_router.get("/get_unread_messages", (req, res) => {
    new Promise(async (resolve, reject) => {
        if (!authentication.require_authentication(req, res))
            throw "Not logged in";

        const as_company = req.session.as_company;
        const user_id = as_company ? req.session.company.id : req.session.user.id;

        const data = {
            "unread_message_count": await db.get_unread_message_count(user_id, as_company)
        }
        res.status(200).send(JSON.stringify(data));
    }).catch((reason) => {
        
    })
});

messaging_router.get("/get_unread_messages/:is_company/:user_id", (req, res) => {
    new Promise(async (resolve, reject) => {
        if (!authentication.require_authentication(req, res))
            throw "Not logged in";
        
        const requester_as_company = req.session.as_company;
        const requester_id = requester_as_company ? req.session.company.id : req.session.user_id;
        const counterpart_as_company = req.params.is_company == true;
        const counterpart_id = req.params.user_id;

        let data = {
            "conversation_unread_message_count" : await db.get_unread_message_count_for_conversation(requester_id, requester_as_company, counterpart_id, counterpart_as_company)
        }
        res.status(200).send(JSON.stringify(data));
    }).catch((reason) => {

    })
});

messaging_router.post("/watch_conversation/:is_company/:counterpart_id", (req, res) => {
    new Promise(async (resolve, reject) => {
        if (authentication.require_authentication(req, res)) {
            let requester_as_company = req.session.as_company;
            let requester_id = requester_as_company ? 
                req.session.company.id : req.session.user.id;
            let counterpart_as_company = req.params.is_company == true;
            let counterpart_id = req.params.counterpart_id;
        
            await db.mark_conversation_as_watched(requester_id, requester_as_company, counterpart_id, counterpart_as_company);
            res.status(204).send();
        }
    });
});

messaging_router.get("/get_private_public_key_pair", (req, res) => {
    new Promise((resolve, reject) => {
        const { privateKey: private_key, publicKey: public_key } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
            },
            privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
            }
        }); 
        let pair = new Object();
        pair.private_key = private_key;
        pair.public_key = public_key;

        res.status(200).send(JSON.stringify(pair));
    });
});

messaging_router.post("/message/:is_company/:user_id", (req, res) => {
    // Add end-to-end encryption and https?
    /*
     * Public Private key pairs using crypto-js
     * Store pair in message, 
     * send the decrypted version of the private key to the receiver
     * send the public key to the sender
    */

    new Promise((resolve, reject) => {
        let message_data = new Object();
        //message_data.message = 
    }).then(message_data => {
        const encrypted_private_key = bcrypt.hashSync(privateKey, sal)
        message_data.public_key = publicKey;
        message_data.private_key = encrypted_private_key
    });
});


module.exports = messaging_router;