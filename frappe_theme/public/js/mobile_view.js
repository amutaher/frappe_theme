const makeListResponsive = async (theme) => {
    let fields = await cur_list?.columns?.filter(e => {
        return e?.df?.in_list_view === 1;
    }).map(e => {
        return e?.df?.fieldname;
    });
    let mediaQuery = window.matchMedia('(max-width: 767px)');
    const frappeList = document.querySelector('.frappe-list');
    if (mediaQuery.matches && cur_list && frappeList && fields && fields.length > 0) {
        if (cur_list.data && cur_list.data.length > 0) {
            const cardContent = await cur_list?.data?.map(item => {
                let itemHTML = '<div class="custom_mobile_card">';
                itemHTML += '<div class="custom_mobile_card_row">';
                // itemHTML += `<input type="checkbox">`;
                itemHTML += `<p class="card-property"> <span class="custom_mobile_card_value">Name </span>: ${item?.name}</p>`;

                Object.entries(item)?.forEach(([key, val]) => {
                    if (fields?.includes(key)) {
                        let fieldLabel = cur_list?.columns?.find(e => e?.df?.fieldname === key)?.df?.label || key;
                        itemHTML += `<p class="card-property"> <span class="custom_mobile_card_value">${fieldLabel} </span>: ${val}</p>`;
                    }
                });
                itemHTML += '</div></div>';
                return itemHTML;
            });
            if (theme.disable_card_view_on_mobile_view == 0) {
                frappeList.innerHTML = cardContent.join('');
            }
            const cards = document.querySelectorAll('.custom_mobile_card');
            cards.forEach((card, index) => {
                card.addEventListener('click', (event) => {
                    event.stopPropagation();
                    const name = cur_list?.data[index]?.name;
                    if (name) {
                        if (name) {
                            const url = new URL(window.location.href);
                            if (url.pathname.includes('/view/list')) {
                                url.pathname = url.pathname.replace('/view/list', '');
                            } else if (url.pathname.includes('/view')) {
                                url.pathname = url.pathname.replace('/view', '');
                            }
                            let newUrl = `${url.pathname}/${name}`;
                            console.log(newUrl, 'newPathname');
                            window.location.href = newUrl;
                        }

                    }

                })
            });
        }
    }
}

const makeResponsive = async () => {
    const my_theme = await getTheme();
    if(my_theme){
        setTimeout(() => {
            makeListResponsive(my_theme);
        }, 1000);
    }
}
makeResponsive()