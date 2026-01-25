// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod doc_state;
mod error;
mod geometry;
mod menu;
mod mupdf_wrapper;
mod project_io;
mod vello_renderer;
mod ingestion_service;

use crate::doc_state::AppState;
use tauri::Manager;

fn main() {
    println!("Tauri Application Starting...");
    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            println!("Tauri: Application SETUP complete");
            if let Some(window) = app.get_webview_window("main") {
                println!("Tauri: Main window found during setup");
                // FORCE OPEN DEVTOOLS FOR DEBUGGING
                #[cfg(debug_assertions)]
                window.open_devtools();
            } else {
                eprintln!("Tauri: Warning - Main window not found during setup");
            }
            
            // Setup Tessdata for OCR
            match app.path().resource_dir() {
                Ok(resource_path) => {
                    let tessdata_path = resource_path.join("tessdata");
                    if tessdata_path.exists() {
                        let path_str = tessdata_path.to_string_lossy().to_string();
                        // Windows robust fix: Strip `\\?\` prefix if present, as Tesseract C++ lib dislikes it
                        #[cfg(windows)]
                        let path_final = path_str.strip_prefix("\\\\?\\").unwrap_or(&path_str).to_string();
                        #[cfg(not(windows))]
                        let path_final = path_str;

                        std::env::set_var("TESSDATA_PREFIX", &path_final);
                        println!("Tauri: Set TESSDATA_PREFIX to {}", path_final);
                    } else {
                        eprintln!("Tauri: Warning - Tessdata path not found at {:?}", tessdata_path);
                    }

                    // Setup Pdfium Library Path
                    // Fix for: dlopen(libpdfium.dylib): image not found
                    let _pdfium_path = resource_path.join("resources").join("libpdfium.dylib");
                     // Note: "resources" inside resource_path?
                     // Verify structure:
                     // Bundled "resources/libpdfium.dylib" -> resource_dir/resources/libpdfium.dylib
                     // OR just resource_dir/libpdfium.dylib?
                     // Tauri flattens? No, it preserves structure if glob is used?
                     // Let's assume it preserves 'resources/libpdfium.dylib' structure if we listed it that way?
                     // Wait, in tauri.conf.json we listed "resources/libpdfium.dylib".
                     // Actually usually resources are dumped in root of resource_dir unless we specify target.
                     // Let's try locating it.

                    let possible_paths = vec![
                        resource_path.join("libpdfium.dylib"), // If flattened
                        resource_path.join("resources").join("libpdfium.dylib"), // If nested
                    ];

                    for p in possible_paths {
                        if p.exists() {
                             println!("Tauri: Found bundled Pdfium at {:?}", p);

                             let parent = p.parent().unwrap();
                             let parent_str = parent.to_string_lossy().to_string();
                             
                             // Set environment variables so dlopen can find libpdfium
                             // PDFIUM_LIB_DIR: For pdfium-render's bind_to_system_library fallback
                             std::env::set_var("PDFIUM_LIB_DIR", &parent_str);
                             
                             // DYLD_LIBRARY_PATH (macOS): For dlopen to find the library
                             #[cfg(target_os = "macos")]
                             {
                                 let existing = std::env::var("DYLD_LIBRARY_PATH").unwrap_or_default();
                                 let new_path = if existing.is_empty() {
                                     parent_str.clone()
                                 } else {
                                     format!("{}:{}", parent_str, existing)
                                 };
                                 std::env::set_var("DYLD_LIBRARY_PATH", &new_path);
                                 println!("Tauri: Set DYLD_LIBRARY_PATH to {}", new_path);
                             }
                             
                             // LD_LIBRARY_PATH (Linux): For dlopen to find the library
                             #[cfg(target_os = "linux")]
                             {
                                 let existing = std::env::var("LD_LIBRARY_PATH").unwrap_or_default();
                                 let new_path = if existing.is_empty() {
                                     parent_str.clone()
                                 } else {
                                     format!("{}:{}", parent_str, existing)
                                 };
                                 std::env::set_var("LD_LIBRARY_PATH", &new_path);
                                 println!("Tauri: Set LD_LIBRARY_PATH to {}", new_path);
                             }
                             
                             println!("Tauri: Set PDFIUM_LIB_DIR to {}", parent_str);

                             // Manual Binding for our own direct use in AppState
                             match pdfium_render::prelude::Pdfium::bind_to_library(pdfium_render::prelude::Pdfium::pdfium_platform_library_name_at_path(&parent_str)) {
                                 Ok(pdfium) => {
                                     println!("Tauri: Successfully bound to Pdfium library!");
                                     let state = app.state::<AppState>();
                                     if let Ok(mut lock) = state.pdfium.write() {
                                         let pdfium_instance = pdfium_render::prelude::Pdfium::new(pdfium);
                                         *lock = Some(std::sync::Arc::new(crate::doc_state::ThreadSafePdfium(pdfium_instance)));
                                         println!("Tauri: Pdfium binding stored in AppState.");
                                     } else {
                                         eprintln!("Tauri: Failed to lock AppState to store Pdfium.");
                                     };
                                 },
                                 Err(e) => {
                                     eprintln!("Tauri: Failed to bind to Pdfium library at {:?}: {}", p, e);
                                 }
                             }
                             break;
                        }
                    }
                },
                Err(e) => eprintln!("Tauri: Failed to get resource dir: {}", e),
            }
            
            // Setup native menu
            if let Err(e) = menu::create_menu(app) {
                eprintln!("Failed to create menu: {}", e);
            }
            menu::setup_menu_events(app);
            
            Ok(())
        })
        .manage(AppState::new())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_http::init())
        .register_uri_scheme_protocol("protakeoff", |ctx, request| {
            println!("Protocol: ENTERING HANDLER for {}", request.uri());
            let app_handle = ctx.app_handle();
            let state = app_handle.state::<AppState>();
            
            let uri = request.uri();
            let path = uri.path(); 
            let query = uri.query().unwrap_or("");
            
            println!("Protocol: Raw URI: {}", uri);
            println!("Protocol: Parsed Path: {}", path);
            
            // Handle potentially different host parsing behavior between OS
            // We want to route based on the path segments
            // Typical path: /page/{id}/{page_num}
            // But if host is treated as 'page', path might differ?
            // Let's rely on standard path parsing.
            
            // Normalize path to ensure consistent handling
            let normalized_path = if path.starts_with('/') { path.to_string() } else { format!("/{}", path) };
            
            println!("Protocol: Normalized Path: {}", normalized_path);

            if normalized_path.starts_with("/page/") {
                // Format: /page/{id}/{page_num}
                let segments: Vec<&str> = normalized_path.split('/').collect();
                // segments[0] = "", segments[1] = "page", segments[2] = id, segments[3] = page_num
                
                if segments.len() >= 4 {
                    let doc_id = segments[2];
                    if let Ok(page_num) = segments[3].trim_end_matches(".png").parse::<i32>() {
                        // Extract zoom
                        let mut zoom = 1.5;
                        for pair in query.split('&') {
                            if let Some((key, value)) = pair.split_once('=') {
                                if key == "zoom" {
                                    if let Ok(z) = value.parse::<f32>() {
                                        zoom = z;
                                    }
                                }
                            }
                        }

                        // Render
                        // Use read lock since we're only reading the document
                        match state.documents.read() {
                            Ok(docs) => {
                                if let Some(doc) = docs.get(doc_id) {
                                    match doc.render_page_to_buffer(page_num, zoom) {
                                        Ok(bytes) => {
                                            println!("Protocol: Rendering success. Returning {} bytes.", bytes.len());
                                            return tauri::http::Response::builder()
                                                .header("Content-Type", "image/png")
                                                .header("Access-Control-Allow-Origin", "*")
                                                .body(bytes)
                                                .unwrap_or_else(|e| {
                                                    eprintln!("Protocol: Failed to build response: {}", e);
                                                    tauri::http::Response::builder()
                                                        .status(500)
                                                        .header("Access-Control-Allow-Origin", "*")
                                                        .body(Vec::new())
                                                        .expect("Failed to build 500 error response")
                                                });
                                        }
                                        Err(e) => {
                                            eprintln!("Protocol: Render error: {}", e);
                                        }
                                    }
                                } else {
                                    println!("Protocol: Document ID {} NOT FOUND in state. Available keys: {:?}", doc_id, docs.keys());
                                }
                            }
                            Err(e) => {
                                eprintln!("Protocol: Failed to lock documents mutex: {}", e);
                            }
                        }
                    } else {
                        println!("Protocol: Invalid page number in path: {}", segments[3]);
                    }
                } else {
                    println!("Protocol: Invalid segment length: {}", segments.len());
                }
            } else {
                println!("Protocol ERROR: Path does not start with /page/: '{}'", normalized_path);
            }

            println!("Protocol: Returning 404 for {}", uri);
            tauri::http::Response::builder()
                .status(404)
                .header("Access-Control-Allow-Origin", "*")
                .body(Vec::new())
                .expect("Failed to build 404 response")
        })
        .invoke_handler(tauri::generate_handler![
            commands::open_file,
            commands::get_viewport_vectors,
            commands::get_page_image_bytes,
            commands::export_pdf,
            commands::generate_page_thumbnail,
            project_io::save_project_file,
            project_io::load_project_file,
            project_io::read_file_as_base64,
            project_io::write_base64_to_temp_file,
            commands::get_machine_id,
            commands::extract_page_text,
            commands::search_page,
            commands::search_document,
            commands::has_ocr_support,
            commands::ingest_file,
            commands::search_index
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
