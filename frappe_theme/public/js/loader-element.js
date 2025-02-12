function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    return hash.toString(16);
}

function getElementHash(element) {
    // Get element's tag, attributes, and inner HTML
    let tagName = element.tagName.toLowerCase();
    let attributes = Array.from(element.attributes)
        .map(attr => `${attr.name}="${attr.value}"`)
        .join(" ");
    let innerHTML = element.innerHTML.trim();

    // Combine into a string
    let elementString = `${tagName} ${attributes} ${innerHTML}`;

    // Generate hash
    return hashString(elementString);
}
const isLoading = (show, wrapper, id) => {
    if (!wrapper) {
        console.error("Wrapper element not found");
        return;
    }
    let _id = (id? id : wrapper?.id)
    let hash = _id;//hashString(_id);
    console.log("_id",_id);

    if (show) {
        let loader = document.createElement('div');
        loader.id = hash;
        loader.style = `
            display: flex;
            align-items: center;
            justify-content: center;
            height: 200px;
            position: absolute;
            top: 0;
            left: 0;
            min-height:500px;
            width: 100%;
            background:white;
            z-index: 9999;
        `;
        let loaderInner = document.createElement('div');
        loaderInner.style=`
            border: 4px solid #f3f3f3;
            border-top: 4px solid ${frappe.boot?.my_theme?.button_background_color || "black"};
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        loader.appendChild(loaderInner);
        wrapper.appendChild(loader);
    }else {
        let id = `#${hash}`
        const loaderElement = wrapper.querySelector(id);
        // Remove the loader element if it exists
        loaderElement?.remove();
    }
}