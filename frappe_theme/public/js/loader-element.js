const isLoading = (show, wrapper) => {
    const style = document.createElement('style');
    style.innerHTML = `
        .table-loader {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            min-height:500px;
            width: 100%;
            background:white; /* Optional: adds a background overlay */
            z-index: 9999;
        }

        .loader {
            border: 4px solid #f3f3f3;
            border-top: 4px solid ${frappe.boot?.my_theme?.button_background_color || "black"};
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);

    if (!wrapper) {
        console.error("Wrapper element not found");
        return;
    }
    if (show) {
            const loaderMarkup = `
                <div class="table-loader">
                    <div class="loader"></div>
                </div>`;
                wrapper.innerHTML = loaderMarkup; // Append loader to parent element
    }
    else {
        const loaderElement = wrapper.querySelector('.table-loader');
        if (loaderElement) {
            loaderElement.remove();
        }
    }
}