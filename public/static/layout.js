async function user_as_company() {
    let as_company;
    await fetch(`/API/user_as_company`, {
        method: "GET",
        credentials: "include"
    }).then(function(response) {
        as_company = response.json();
    });
    return as_company;
}

async function like_post(element, content_name) {
    const post_id = element.id;
    let is_liked;
    let status;
    await fetch(`${await user_as_company() ? '/company' : ''}/API/like`, {
        method: "POST",
        credentials: "include",
        headers: {
            content_id: post_id,
            content_name: content_name
        }
    }).then(async function(response) {
        status = response.status;
        is_liked = await response.json();
    });
    if (status != 200)
        return false;

    const id_prefix = `${content_name}_like_count_`
    const element_id = `#${id_prefix}${post_id}`;
    const like_count = document.querySelector(element_id);

    if (is_liked)
    {
        element.classList.add("activated_icon");
        like_count.innerHTML = parseInt(like_count.innerHTML) + 1;
    }
    else
    {
        element.classList.remove("activated_icon");
        like_count.innerHTML = parseInt(like_count.innerHTML) - 1;
    }

}