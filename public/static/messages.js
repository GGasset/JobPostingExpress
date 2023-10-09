async function set_unread_messages_label() {
    await user_as_company().then(async (as_company) => {
        let url = "/API/get_unread_messages";
        if (as_company)
            url = "/company" + url;
        return await fetch(url, {
            "credentials": "include",
            method: "GET"
        });
    }).then((raw_response) => {
        return JSON.parse(raw_response).unread_message_count;
    }).then((unread_message_count) => {
        if (unread_message_count > 99)
            unread_message_count = "99+";

        return unread_message_count;
    }).then(unread_message_count => {
        let message_counter = document.querySelector("#unread_message_count");
        message_counter.innerHTML = unread_message_count;
    });
}