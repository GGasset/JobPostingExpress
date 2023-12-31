let socket = undefined;
let conversations = new Object();
let can_change_conversation = true;


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
        add_message(true, message, counterpart_id, true);

        let contact_div = document.querySelector(`#contact_${counterpart_id}`);
        if (contact_div === null) {
            const splitted_id = counterpart_id.split('_');
            add_contact(splitted_id[0] == true, splitted_id[1], false);
        }
        contact_div = document.querySelector(`#contact_${counterpart_id}`);
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

async function setup_messages() {
    await load_contacts();
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
}

function add_contact_from_icon(element) {
    const element_id = element.id;
    const splitted_id = element_id.split('_');
    const is_company = splitted_id[0] == "true";
    const user_id = splitted_id[1];

    delete_empty_conversations();

    add_contact(is_company, user_id);

}

async function add_contact(is_company, user_id, open_DMs_div = true) {
    const contact = document.querySelector(`#contact_${is_company}_${user_id}`);
    if (contact !== null) {
        if (open_DMs_div) {
            open_conversation(is_company, user_id);
        }
        return;
    }

    let url = `/API/user_info/${is_company}/${user_id}`;
    if (user_as_company()) {
        url = '/company' + url;
    }
    let user_info = await fetch(url, {
        method: "GET"
    }).then(async raw => {
        return await raw.json();
    });

    user_info.unread_message_count = 0;
    add_contact_to_frontend(user_info);
    if (open_DMs_div) {
        open_conversation(is_company, user_id);
    }
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
        `       <td class="counter contact_counter" id="${contact.user.is_company}_${contact.user.id}_unread_count">` +
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
    if (!can_change_conversation) {
        return;
    }

    const contact_div = document.querySelector(`#contact_${is_company}_${user_id}`);
    if (contact_div.classList.contains('selected'))
    {
        open_messages(true);
        return;
    }

    const contacts_col = document.querySelector("#contacts_col");
    contacts_col.innerHTML = contacts_col.innerHTML.replace(" selected", "");

    contact_div.classList.add("selected");
    await mark_conversation_as_watched(is_company, user_id);

    let key = `${is_company}_${user_id}`;
    let conversation = conversations[key];
    if (conversation === undefined) {
        // Leave conversation variable as if it existed before
        // Save conversation in object

        conversation = create_conversation(key);
        load_more(key);
    }

    document.querySelector("#messages_col").hidden = false;
    document.querySelector("#conversation_key").value = key;

    const messages_table = document.querySelector("#messages_table");
    messages_table.innerHTML = "";
    for (let i = conversation.length - 1; i >= 1; i--) {
        const conversation_element = conversation[i];
        
        const is_counterpart = conversation_element.is_counterpart;
        const message = conversation_element.message;

        add_message(is_counterpart, message, key, true, false);
    }



    open_messages(true);
}

function add_message(is_counterpart, message, conversation_key, is_new_message = true, add_to_conversation = true) {
    const message_data = {
            "is_counterpart": is_counterpart,
            "message": message
    };

    if (add_to_conversation) {
        if (is_new_message)
        {
            conversations[conversation_key].push(message_data);
            conversations[conversation_key][0].session_message_traffic += 1;
        }
        else 
        {
            conversations[conversation_key].unshift(message_data);
            conversations[conversation_key][0] = conversations[conversation_key][1];
            conversations[conversation_key][1] = message_data;
        }
    }

    const row = 
        "<tr>" +
            `<td class="messages_col text_on_left">${is_counterpart? `<div class='message'>${message}</div>` : "" }</td>` + 
            `<td class="col_between_messages"></td>` + 
            `<td class="messages_col text_on_right">${is_counterpart? "" : `<div style='float: right;' class="message">${message}</div>`}</td>` +
        "</tr>";

    const messages_table = document.querySelector("#messages_table");
    messages_table.innerHTML = is_new_message ? messages_table.innerHTML + row : row + messages_table.innerHTML;
}

function add_load_more_button(str_id) {
    let previous_load_more_button = document.querySelector('#load_more_button');
    if (previous_load_more_button !== null) {
        previous_load_more_button.remove();
    }

    let load_button = document.createElement('button');
    load_button.innerHTML = 'load_more';
    load_button.id = 'load_more_button';

    load_button.addEventListener('click', async function() {
        load_more(str_id);
    })

    let messages_table = 
    messages_table.innerHTML = load_button.outerHTML + messages_ta;
}

async function load_more(str_id) {
    can_change_conversation = false;
    let returned_message_count = await get_messages(str_id, conversations[str_id][0].loaded_up_to_page);
    conversations[str_id][0].loaded_up_to_page += 1;
    if (returned_message_count > 0) {
        add_load_more_button(str_id);
    }
    can_change_conversation = true;
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
    socket.emit('message_sent', JSON.stringify(data));
}

async function get_messages(counterpart_str_id, page_n) {
    
    let conversation = conversations[counterpart_str_id];
    const messages_during_session = conversation[0].session_message_traffic;
    
    const counterpart_data = counterpart_str_id.split('_');
    
    const counterpart_is_company = counterpart_data[0] == 'true';
    const counterpart_id = parseInt(counterpart_data[1]);

    let url = `/API/get_messages/${counterpart_is_company}/${counterpart_id}/${page_n}/${messages_during_session}`;
    if (user_as_company()) {
        url = '/company' + url;
    }
    const raw_messages = await fetch(
        url, 
        {
            credentials: 'include',
            method: 'get'
        }
    )

    const messages = await raw_messages.json();

    for (const message of messages) {
        const compared_counterpart_is_company = counterpart_is_company == 'true'?
            1 : 0;
        let is_counterpart = message.sender_is_company == compared_counterpart_is_company;
        is_counterpart = is_counterpart && message.sender_id == counterpart_id;

        add_message(is_counterpart, message.message, counterpart_str_id, false);
    }

    return messages.length;
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

    const conversation_unread_count = parseInt(document.querySelector(`#${is_company}_${user_id}_unread_count`).innerHTML);
    const total_unread_count_element = document.querySelector('#unread_message_count');
    const total_unread_message_count = parseInt(total_unread_count_element.innerHTML);
    total_unread_count_element.innerHTML = total_unread_message_count - conversation_unread_count;

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
        session_message_traffic: 0,
        loaded_up_to_page: 0
    }];
    return conversations[conversation_key] = new_conversation;
}