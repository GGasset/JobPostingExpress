async function set_unread_messages_label() {
    let as_company = user_as_company();
    let url = "/API/get_unread_messages";
    if (as_company)
        url = "/company" + url;
    fetch(url, {
        "credentials": "include",
        method: "GET"
    }).then(async (raw_response) => {
        return await raw_response.json();
    }).then((response) => {
        let unread_message_count = response.unread_message_count;
        return unread_message_count;
    }).then(unread_message_count => {
        if (unread_message_count > 99)
            unread_message_count = "99+";

        return unread_message_count;
    }).then(unread_message_count => {
        let message_counter = document.querySelector("#unread_message_count");
        message_counter.innerHTML = unread_message_count;
        message_counter.hidden = false;
    });
}

function open_messages() {
    let dms_div = document.querySelector("#DMs_div");
    let is_hidden = dms_div.hidden;
    dms_div.hidden = !is_hidden;
}

async function get_contacts() {
    let as_company = user_as_company();
    let url = "/API/get_contacts"
    if (as_company)
        url = "/company" + url;
    let contacts = await fetch(url, {
        credentials: "include",
        method: "GET"
    }).then(async raw => {
        return await raw.json();
    });

    return contacts;
}

async function add_contact() {

}

async function get_unread_conversations() {

}

async function send_message() {
    let as_company = user_as_company();
    
}