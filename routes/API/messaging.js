const crypto = require('node:crypto');

const express = require("express");
const bcrypt = require("bcrypt");

const authentication = require("../../public/server_side/authentication");
const db = require("../../models/db");
const index = require("../../index");

const messaging_router = express.Router()
// Socket server
const { Server } = require("socket.io");
const io = new Server(index.server);

// Socket middleware
io.engine.use(index.session);

// if not authenticated ignore
//io.engine.use(())

// Socket user handler
io.on('connection', (connection) => {
    try {
        if (!authentication.is_authenticated(connection.request))
            throw "user not logged in";
        const session = connection.request.session;
        const as_company = session.as_company;
        const id = as_company ? session.company.id : session.user.id;
        const client_str_id = `${as_company}_${id}`;
        
        connection.join(client_str_id);

        connection.on('message_sent', async function(data) {
            try {
                const received = JSON.parse(data);
                const to_send = {
                    "message": received.message,
                    "id": client_str_id
                }

                const receiver_data = received.id.split('_');
                const receiver_is_company = receiver_data[0] == 'true';
                const receiver_id = parseInt(receiver_data[1]);

                const pair = get_key_pair();
                const encrypted_message = crypto.publicEncrypt(
                    {
                        key: pair.public_key,
                        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                        oaepHash: 'sha256'
                    },
                    Buffer.from(received.message)
                );
                
                await db.store_message(encrypted_message, id, as_company, receiver_id, receiver_is_company, pair.private_key);

                const receiver_sockets = io.in(received.id);
                receiver_sockets.emit('message_received', JSON.stringify(to_send));
            } catch (error) {
                console.log(error)
            }
        })
    } catch (error) {
        console.log(error)
        connection.disconnect(true);
    }
});


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

messaging_router.get("/get_messages/:is_company/:user_id/:page_n/:sent_messages_during_session", (req, res) => {
    new Promise(async (resolve, reject) => {
        if (!authentication.require_authentication(req, res)) {
            return;
        }

        const requester_as_company = req.session.as_company;
        const requesting_client_id = requester_as_company ?
            req.session.company.id : req.session.user.id;
        
        const counterpart_as_company = req.params.is_company == 'true';
        const counterpart_id = req.params.user_id;
    
        const page_n = req.params.page_n;
        const sent_messages_during_session = req.params.sent_messages_during_session;
        const messages = await db.get_last_messages(page_n, requesting_client_id, requester_as_company, counterpart_id, counterpart_as_company, sent_messages_during_session);
        
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

function get_key_pair() {
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

    return pair;
}

messaging_router.get("/get_private_public_key_pair", (req, res) => {
    new Promise((resolve, reject) => {
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
    });
});


module.exports = messaging_router;