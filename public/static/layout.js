async function like_post(element) {
    const post_id = element.id;
    let is_liked;
    let status;
    await fetch(`/API/like`, {
        method: "POST",
        credentials: "include",
        headers: {
            content_id: post_id,
            content_name: "post"
        }
    }).then(async function(response) {
        status = response.status;
        is_liked = await response.json();
    });
    if (is_liked.status == 403)
        return false;

    const like_count = document.querySelector(`#like_count_${post_id}`)
    if (is_liked)
    {
        element.classList.add("activated_icon");
        //element.style.background = 'rgb(238, 118, 202)';
        like_count.innerHTML = parseInt(like_count.innerHTML) + 1;
    }
    else
    {
        element.classList.remove("activated_icon");
        //element.style.background = 'unset';
        like_count.innerHTML = parseInt(like_count.innerHTML) - 1;
    }

}