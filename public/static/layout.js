async function user_as_company() {
    return window.location.href.includes('company');
}

async function like_post(element, content_name) {
    const post_id = element.id;
    let is_liked;
    let status;
    const as_company = await user_as_company();
    const url = `${as_company ? '/company' : ''}/API/like`;
    console.log(url)
    await fetch(url, {
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