use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder},
    App, Emitter, Manager,
};

/// Creates the native OS menu for the application
pub fn create_menu(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    // === File Menu ===
    let new_project = MenuItemBuilder::new("New Project")
        .id("new_project")
        .accelerator("CmdOrCtrl+N")
        .build(app)?;

    let open = MenuItemBuilder::new("Open...")
        .id("open")
        .accelerator("CmdOrCtrl+O")
        .build(app)?;

    let save = MenuItemBuilder::new("Save")
        .id("save")
        .accelerator("CmdOrCtrl+S")
        .build(app)?;

    let save_as = MenuItemBuilder::new("Save As...")
        .id("save_as")
        .accelerator("CmdOrCtrl+Shift+S")
        .build(app)?;

    let file_menu = SubmenuBuilder::new(app, "File")
        .item(&new_project)
        .item(&open)
        .separator()
        .item(&save)
        .item(&save_as)
        .separator()
        .close_window()
        .build()?;

    // === Edit Menu ===
    let undo = MenuItemBuilder::new("Undo")
        .id("undo")
        .accelerator("CmdOrCtrl+Z")
        .build(app)?;

    let redo = MenuItemBuilder::new("Redo")
        .id("redo")
        .accelerator("CmdOrCtrl+Shift+Z")
        .build(app)?;

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .item(&undo)
        .item(&redo)
        .separator()
        .cut()
        .copy()
        .paste()
        .separator()
        .select_all()
        .build()?;

    // === Help Menu ===
    let help_guide = MenuItemBuilder::new("Help Guide")
        .id("help_guide")
        .accelerator("F1")
        .build(app)?;

    let about = MenuItemBuilder::new("About ProTakeoff")
        .id("about")
        .build(app)?;

    let license_status = MenuItemBuilder::new("Account & License")
        .id("license_status")
        .build(app)?;

    let help_menu = SubmenuBuilder::new(app, "Help")
        .item(&help_guide)
        .separator()
        .item(&license_status)
        .separator()
        .item(&about)
        .build()?;

    // === Build the complete menu ===
    // On macOS, the first submenu becomes the "App" menu, so we add an About submenu
    #[cfg(target_os = "macos")]
    let menu = {
        let app_menu = SubmenuBuilder::new(app, "ProTakeoff")
            .about(None)
            .separator()
            .services()
            .separator()
            .hide()
            .hide_others()
            .show_all()
            .separator()
            .quit()
            .build()?;

        MenuBuilder::new(app)
            .item(&app_menu)
            .item(&file_menu)
            .item(&edit_menu)
            .item(&help_menu)
            .build()?
    };

    #[cfg(not(target_os = "macos"))]
    let menu = MenuBuilder::new(app)
        .item(&file_menu)
        .item(&edit_menu)
        .item(&help_menu)
        .build()?;

    app.set_menu(menu)?;

    Ok(())
}

/// Sets up menu event handling - emits events to the frontend
pub fn setup_menu_events(app: &App) {
    let app_handle = app.handle().clone();

    app.on_menu_event(move |_app, event| {
        let id = event.id().0.as_str();
        println!("Menu event: {}", id);

        // Emit to frontend for handling
        if let Some(window) = app_handle.get_webview_window("main") {
            match id {
                "new_project" | "open" | "save" | "save_as" | "undo" | "redo" | "help_guide"
                | "about" | "license_status" => {
                    let _ = window.emit("menu-event", id);
                }
                _ => {}
            }
        }
    });
}
