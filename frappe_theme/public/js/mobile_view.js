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
            let cardContent = [];
            cardContent = await cur_list?.data?.map(item => {
                itemHTML = '<div class="custom_mobile_card">';
                itemHTML += '<div class="custom_mobile_card_row card rounded  shadow" >';
                // itemHTML += `<input type="checkbox">`;
                itemHTML += `<p class="card-property text-success "style="color:#CB2929;"> <span class="custom_mobile_card_value p-2"style="color: #264796;">Name </span>: ${item?.name}</p>`;

                Object.entries(item)?.forEach(([key, val]) => {
                    if (fields?.includes(key)) {
                        let foundObj = cur_list?.columns?.find(e => e?.df?.fieldname === key);
                        let fieldLabel = foundObj.df?.label || key;
                        let fieldname = key || foundObj.df?.fieldname;
                        let foundLinkKeys = Object.entries(item)?.filter(([key, val]) => key.startsWith(fieldname + "_")).map(([key, val]) => key);
                        itemHTML += `<p class="card-property text-success"> <span class="custom_mobile_card_value p-2" style="color: #264796;">${fieldLabel} </span>: ${item[foundLinkKeys] || item[fieldname] || val}</p>`;
                    }
                });
                itemHTML += '</div></div>';
                return itemHTML;
            });
            // console.log(frappeList.children);

            if (!theme.disable_card_view_on_mobile_view) {
                const newElement = document.createElement('div');
                newElement.innerHTML = cardContent.join('');
                if (frappeList.children[0]) {
                    frappeList.replaceChild(newElement, frappeList.children[0]);
                } else {
                    frappeList.appendChild(newElement);
                }
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
    if (my_theme) {
        setTimeout(() => {
            makeListResponsive(my_theme);
        }, 1000);
    }
    frappe.router.on('change', async () => {
        try {
            let cur_router = await frappe.get_route()
            if (cur_router.includes('List')) {
                if (my_theme) {
                    setTimeout(() => {
                        makeListResponsive(my_theme);
                    }, 1000);
                }
            }
        } catch (error) {
            console.log('error', error);

        }
    });
    window.addEventListener('click', async (event) => {
        if (event.target.type == 'button') {
            // console.log('event', event.target.type);
            if (my_theme) {
                setTimeout(() => {
                    makeListResponsive(my_theme);
                }, 1000);
            }
        }
    });
}
makeResponsive()