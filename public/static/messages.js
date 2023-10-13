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

async function add_contact_to_frontend(contact) {
    const div = document.createElement("div");
    div.id = `${contact.user.is_company}_${contact.user.id}`;
    div.classList.add("contact");
    div.onclick(open_conversation(contact.user.is_company, contact.user.id));
    div.innerHTML = 
        "<table>\n" +
        "   <tr>" +
        "       <td>" +
        `           <a href="${contact.user.is_company ? '/companies' : '/users'}/${contact.user.id}">` +
        `               <img src="${contact.user.image_url}" alt="Profile picture">` +
        "           </a>"
        "       </td>" +

        "       <td>" +
        `           ${contact.user.is_company ? `${contact.user.company_name} (Company)` : `${contact.user.first_name} ${contact.user.last_name}`}` +
        "       </td>" +
        "   </tr>" +
        "</table>";

    const contacts_td = document.querySelector("#contacts_col");
    contacts_td.innerHTML = div.outerHTML + contacts_td.innerHTML;
}

async function open_conversation(is_company, user_id) {
    const contacts_col = document.querySelector("#contacts_col");
    contacts_col.innerHTML = contacts_col.innerHTML.replace(" selected", "");

    const contact_div = document.querySelector(`${is_company}_${user_id}`);
    contact_div.classList.add("selected");
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

async function add_contact(is_company, user_id) {

}

async function get_unread_conversations() {

}

async function send_message() {
    let as_company = user_as_company();
    
}