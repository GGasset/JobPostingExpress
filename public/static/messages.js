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

    contacts.forEach(contact => {
        add_contact_to_frontend(contact);
    });
}

async function add_contact_from_icon(element) {
    const element_id = element.id;
    const splitted_id = element_id.split('_');
    const is_company = splitted_id[0];
    const user_id = splitted_id[1];

    await add_contact(is_company, user_id);
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
    div.onclick = `open_conversation(${contact.user.is_company}, ${contact.user.id})`;
    
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
    const contacts_col = document.querySelector("#contacts_col");
    contacts_col.innerHTML = contacts_col.innerHTML.replace(" selected", "");

    const contact_div = document.querySelector(`#contact_${is_company}_${user_id}`);
    contact_div.classList.add("selected");

    open_messages(false);
}

async function mark_conversation_as_watched(is_company, user_id) {
    let mark_conversation_as_watched_url = `/API/watch_conversation/${is_company}/${user_id}`;
    if (is_company)
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

async function send_message() {
    let as_company = user_as_company();
    
}