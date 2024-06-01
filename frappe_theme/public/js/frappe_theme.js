const getTheme = async () => {
    return new Promise((resolve, reject) => {
        frappe.call({
            method: "frappe_theme.api.get_my_theme",
            freeze: true,
            callback: async function (response) {
                resolve(response?.message || response)
            },
            freeze_message: __("Getting theme...")
        });
    })
}

const applyTheme = async () => {
    let theme = await getTheme()
    console.log(theme, "theme");
    const style = document.createElement('style');
    style.innerHTML = `
        /* Login page */
        #page-login {
            background: ${theme.page_background_type && theme.page_background_type == 'Color' ? `${theme.login_page_background_color}` : theme.page_background_type == 'Image' ? theme.login_page_background_image && `url("${theme.login_page_background_image}")` : 'transparent'} !important;
            background-size: cover !important;
            height: 100vh !important;
        }
        .btn-primary.btn-login {
            background-color: ${theme.login_button_background_color && theme.login_button_background_color} !important;
            color: ${theme.login_button_text_color && theme.login_button_text_color} !important;
        }
        .btn-primary.btn-login:hover {
            background-color: ${theme.login_page_button_hover_background_color && theme.login_page_button_hover_background_color} !important;
            color: ${theme.login_page_button_hover_text_color && theme.login_page_button_hover_text_color} !important;
        }
        .for-login {
            position: ${theme.login_box_position !== 'Default' ? 'absolute' : 'static'};
            right: ${theme.login_box_position === 'Right' ? '10%' : ''};
            left: ${theme.login_box_position === 'Left' ? '10%' : ''};
            top:18%;
        }
        .login-content.page-card{
            padding: ${theme.login_box_position !== 'Default' ? '40px' : ''} !important;
            width:${theme.login_box_position !== 'Default' ? '450px' : ''} !important;
            background-color: ${theme.login_box_background_color && theme.login_box_background_color} !important;
            border: 2px solid ${theme.login_box_background_color && theme.login_box_background_color} !important;
        }
        
        .page-card-head h4 {
            color: ${theme.page_heading_text_color && theme.page_heading_text_color} !important;
        }
    
        @media (max-width: 768px) {
            .for-login {
                position: static;
                right: 0%;
                left: 0%;
            }
            .login-content.page-card{
                padding: auto auto;
            }
        }


        /* Navbar */
        .navbar {
            background-color: ${theme.navbar_color && theme.navbar_color} !important;
        }
        .navbar.container ,.navbar-brand{
            color: ${theme.navbar_text_color && theme.navbar_text_color} !important;
        }
        .navbar-toggler , .navbar-toggler span svg,.navbar svg.es-icon.icon-sm use {
            stroke:${theme.navbar_text_color && theme.navbar_text_color} !important;
        }
        #navbar-breadcrumbs li a::before {
            content: '›';
        }
        button.navbar-toggler{
            border-color:${theme.navbar_text_color && theme.navbar_text_color} !important;
        }
        #navbar-breadcrumbs li a{
            color: ${theme.navbar_text_color && theme.navbar_text_color} !important;
        }
        #navbar-breadcrumbs li.disabled a{
            color: ${(theme.navbar_color && theme.navbar_text_color) ? theme.navbar_text_color : theme.navbar_color && '#56373F'} !important;
        }
        .d-lg-block,
        .d-sm-block {
            display: ${theme.hide_help_button == 1 && 'none'} !important;
        }

        /* Primary Btn */
        .btn-primary, .btn-primary:active{
            background-color: ${theme.button_background_color && theme.button_background_color} !important;
        }
        .btn-primary span, .btn-primary:active span{
            color: ${theme.button_text_color && theme.button_text_color} !important;
        }


        /* main Contant*/
            
        body{
            background-color: ${theme.body_background_color && theme.body_background_color} !important;
        }
        .content.page-container{
            background-color: ${theme.body_background_color && theme.body_background_color} !important;
        }
        .page-head {
            background-color: ${theme.body_background_color && theme.body_background_color} !important;
        }
        .layout-main-section, .row.form-section.card-section.visible-section{
            background-color: ${theme.main_body_content_box_background_color && theme.main_body_content_box_background_color} !important;
            border-radius: 10px!important;
        }
        @media(min-width: 992px) {
            [data-page-route=Workspaces].layout-main.layout-main-section.edit-mode {
                background-color: ${theme.main_body_content_box_background_color && theme.main_body_content_box_background_color} !important;
            }
        }
        .desk-sidebar-item.standard-sidebar-item.selected,.desk-sidebar-item.standard-sidebar-item.selected span{
            background-color: ${theme.secondary_button_background_color && theme.secondary_button_background_color} !important;
            color: ${theme.secondary_button_text_color && theme.secondary_button_text_color} !important;
        }
        .desk-sidebar-item.standard-sidebar-item: hover,.desk-sidebar-item.standard-sidebar-item:hover span{
            background-color: ${theme.secondary_button_hover_background_color && theme.secondary_button_hover_background_color} !important;
            color: ${theme.secondary_button_hover_text_color && theme.secondary_button_hover_text_color} !important;
        }
        .btn.btn -default.ellipsis, .btn -default , .btn -default:active{
            background-color: ${theme.secondary_button_background_color && theme.secondary_button_background_color} !important;
            color: ${theme.secondary_button_text_color && theme.secondary_button_text_color} !important; s
        }
        .btn.btn -default.ellipsis: hover, .btn -default:hover{
            background-color: ${theme.secondary_button_hover_background_color && theme.secondary_button_hover_background_color} !important;
            color: ${theme.secondary_button_hover_text_color && theme.secondary_button_hover_text_color} !important;
        }
        .page-form.flex{
            background-color: ${theme.main_body_content_box_background_color && theme.main_body_content_box_background_color} !important;
        }
        .widget{
            background-color: ${theme.main_body_content_box_background_color && theme.main_body_content_box_background_color} !important;
        }


            /* table */
        .level.list-row-head.text-muted{
            background-color: ${theme.table_head_background_color && theme.table_head_background_color} !important;
        }
        .level-left.list-header-subject.list-row-col.ellipsis.hidden-xs, span.level-item{
            color: ${theme.table_head_text_color && theme.table_head_text_color} !important;
        }
        .level.list-row,.level-item.bold.ellipsis a,.filterable.ellipsis{
            background-color:${theme.table_body_background_color && theme.table_body_background_color} !important;
            color: ${theme.table_body_text_color && theme.table_body_text_color} !important;
        }
        .level-right{
            background-color: none!important;
        }

            /* Widgets */
        .widget.number-widget-box{
            background-color: ${theme.number_card_background_color && theme.number_card_background_color} !important;
            border: 2px solid ${theme.number_card_border_color ? theme.number_card_border_color : '#EDEDED'} !important;
        }
        .widget-head, .widget-label, .widget-title, .widget-body,.widget-content div.number{
            color: ${theme.number_card_text_color && theme.number_card_text_color} !important;
        }
    `;
    document.head.appendChild(style);
}
applyTheme()