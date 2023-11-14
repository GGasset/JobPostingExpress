let socket = undefined;
let conversations = new Object();



function connect_to_server() {
    socket = io();
    socket.on("message_received", raw_message_json => {
        console.log(raw_message_json)
        const data = JSON.parse(raw_message_json);
        const counterpart_id = data.id;
        const message = data.message;

        // add message to conversations
        let conversation = conversations[counterpart_id];
        if (conversation === undefined)
            conversation = create_conversation(counterpart_id);
        add_message(true, message, true, counterpart_id);

        const contact_div = document.querySelector(`#contact_${counterpart_id}`);
        if (!contact_div.classList.contains("selected")) {
            // This means that chat isn't open
            /*
            * unread_count does need to be modified
            * there's no need to add messages immediately to conversation frontend
            */
           const unread_count_label = document.querySelector(`#${counterpart_id}_unread_count`);
           unread_count_label.innerHTML = unread_count_label.innerHTML + 1;
        }
    })
}

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

function open_messages(visible=undefined) {
    let dms_div = document.querySelector("#DMs_div");
    if (visible !== undefined) {
        dms_div.hidden = !visible;
        return;
    }
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

async function load_contacts() {
    const contacts = await get_contacts();

    for (let i = contacts.length - 1; i >= 0; i--) {
        const contact = contacts[i];
        add_contact_to_frontend(contact);
    }

    contacts.forEach(contact => {
        add_contact_to_frontend(contact);
    });
}

function add_contact_from_icon(element) {
    const element_id = element.id;
    const splitted_id = element_id.split('_');
    const is_company = splitted_id[0] == "true";
    const user_id = splitted_id[1];

    delete_empty_conversations();

    add_contact(is_company, user_id);

}

async function add_contact(is_company, user_id) {
    const contact = document.querySelector(`#contact_${is_company}_${user_id}`);
    if (contact !== null) {
        open_conversation(is_company, user_id);
        return;
    }

    let user_info = await fetch(`/API/user_info/${is_company}/${user_id}`, {
        method: "GET"
    }).then(async raw => {
        return await raw.json();
    });

    user_info.unread_message_count = 0;
    add_contact_to_frontend(user_info);
    open_conversation(is_company, user_id);
}

function add_contact_to_frontend(contact) {
    const div = document.createElement("div");
    div.id = `contact_${contact.user.is_company}_${contact.user.id}`;
    div.classList.add("contact");
    div.setAttribute("onclick", `open_conversation(${contact.user.is_company}, ${contact.user.id})`);
    
    if (contact.unread_message_count > 99)
        contact.unread_message_count = "99+";

    div.innerHTML = 
        "<table>" +
        "   <tr>" +
        "       <td>" +
        `           <a href="${contact.user.is_company ? '/companies' : '/users'}/${contact.user.id}">` +
        `               <img class="contact_img" src="${contact.user.image_url}" alt="Profile picture">` +
        "           </a>" +
        "       </td>" +
        "       <td style='width: 100%;'>" +
        `           ${contact.user.is_company ? `${contact.user.company_name} (Company)` : `${contact.user.first_name} ${contact.user.last_name}`}` +
        "       </td>" +
        `       <td class="counter" id="${contact.user.is_company}_${contact.user.id}_unread_count">` +
        `           ${contact.unread_message_count}` +
        `       </td>` +
        "   </tr>" +
        "</table>";
    const contacts_td = document.querySelector("#contacts_col");
    contacts_td.innerHTML = div.outerHTML + contacts_td.innerHTML;

    let unread_message_count_label = document.querySelector(`#${contact.user.is_company}_${contact.user.id}_unread_count`);
    unread_message_count_label.hidden = contact.unread_message_count === 0;
}

async function open_conversation(is_company, user_id) {
    const contact_div = document.querySelector(`#contact_${is_company}_${user_id}`);
    if (contact_div.classList.contains('selected'))
    {
        open_messages(true);
        return;
    }

    const contacts_col = document.querySelector("#contacts_col");
    contacts_col.innerHTML = contacts_col.innerHTML.replace(" selected", "");

    contact_div.classList.add("selected");
    mark_conversation_as_watched(is_company, user_id);

    let key = `${is_company}_${user_id}`;
    let conversation = conversations[key];
    if (conversation === undefined) {
        // Leave conversation variable as if it existed before
        // Save conversation in object

        conversation = create_conversation(key);
    }

    document.querySelector("#messages_col").hidden = false;
    document.querySelector("#conversation_key").value = key;

    const messages_table = document.querySelector("#messages_table");
    messages_table.innerHTML = "";
    for (let i = conversation.length - 1; i >= 1; i--) {
        const conversation_element = conversation[i];
        
        const is_counterpart = conversation_element.is_counterpart;
        const message = conversation_element.message;

        add_message(is_counterpart, message, key, false);
    }

    open_messages(true);
}

function add_message(is_counterpart, message, conversation_key, is_new_message = true, add_to_conversation = true) {
    if (is_new_message)
    {
        conversations[conversation_key][0].session_message_traffic += 1;
    }

    if (add_to_conversation)
    {
        if (is_new_message)
        {
            
        }
        else 
        {
            conversations[conversation_key].push({
                "is_counterpart": is_counterpart,
                "message": message
            });    
        }
    }

    const row = 
        "<tr>" +
            `<td class="messages_col text_on_left">${is_counterpart? `<div class='message'>${message}</div>` : "" }</td>` + 
            `<td class="col_between_messages"></td>` + 
            `<td class="messages_col text_on_right">${is_counterpart? "" : `<div style='float: right;' class="message">${message}</div>`}</td>` +
        "</tr>";

    const messages_table = document.querySelector("#messages_table");
    messages_table.innerHTML = messages_table.innerHTML + row;
}

function send_message() {
    let conversation_key = document.querySelector("#conversation_key").value;
    let message_box = document.querySelector("#written_message");
    let message = message_box.value;

    add_message(false, message, conversation_key, true);
    message_box.value = "";

    const data = {
        "message": message,
        "id": conversation_key
    }
    console.log(data)
    socket.emit('message_sent', JSON.stringify(data));
}

async function get_messages(counter_part_id, page_n) {
    // TODO: add metadata to each message
    
    let conversation = conversations[counter_part_id];
    const messages_during_session = conversation[0].session_message_traffic;
    
}

function delete_empty_conversations() {
    const empty_conversations_keys = get_empty_conversations();
    empty_conversations_keys.forEach(key => {
        const splitted = key.split('_');
        const is_company = splitted[0];
        const user_id = splitted[1];

        delete_conversation(is_company, user_id);
    });
}

function get_empty_conversations() {
    let output = [];
    
    Object.keys(conversations).forEach(key => {
        if (conversations[key] !== undefined)
            if (conversations[key].length === 1)
                output.push(key);
    });
    
    return output;
}

function delete_conversation(is_company, user_id) {
    const conversation_key = `${is_company}_${user_id}`
    conversations[conversation_key] = undefined;
    document.querySelector(`#contact_${is_company}_${user_id}`).remove();
}

async function mark_conversation_as_watched(is_company, user_id) {
    let mark_conversation_as_watched_url = `/API/watch_conversation/${is_company}/${user_id}`;
    if (user_as_company())
        mark_conversation_as_watched_url = "/company" + mark_conversation_as_watched_url;
    
    await fetch(mark_conversation_as_watched_url, {
        credentials: "include",
        method: "POST"
    });

    update_unread_conversation_message_count_label(is_company, user_id, 0);
}

// Get value from API if modifying count in a relative manner
function update_unread_conversation_message_count_label(is_company, user_id, value) {
    if (value > 99)
        value = "99+";
    
    const counter = document.querySelector(`#${is_company}_${user_id}_unread_count`);
    counter.hidden = value == 0;
    counter.innerHTML = value;
}

function create_conversation(conversation_key) {
    let new_conversation = [{
        // Text that the viewer started writing
        written_text: "",
        session_message_traffic: 0
    }];
    return conversations[conversation_key] = new_conversation;
}