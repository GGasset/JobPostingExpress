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

async function send_message() {
    let as_company = user_as_company();
    let keys = await fetch("")
}