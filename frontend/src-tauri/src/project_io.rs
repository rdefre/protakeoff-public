//! Project File I/O Commands
//!
//! Handles reading and writing .ptf (ProTakeoff File) project files.
//! Cross-platform compatible for macOS and Windows App Store submissions.

use std::fs;
use std::path::{Path, PathBuf};

/// Validates a file path for security issues.
///
/// Checks for:
/// - Path traversal attacks (../)
/// - Null bytes that could truncate paths  
/// - Ensures path is absolute after canonicalization
///
/// # Returns
/// - Ok(PathBuf) with the canonicalized, validated path
/// - Err(String) if validation fails
fn validate_path_security(path: &str) -> Result<PathBuf, String> {
    // Check for null bytes which could be used for path truncation attacks
    if path.contains('\0') {
        return Err("Invalid path: contains null bytes".to_string());
    }

    // Check for explicit path traversal sequences
    if path.contains("..") {
        return Err("Invalid path: path traversal detected".to_string());
    }

    let path_obj = Path::new(path);

    // Path must be absolute
    if !path_obj.is_absolute() {
        return Err(format!("Invalid path: must be absolute, got: {}", path));
    }

    // Canonicalize to resolve any remaining symlinks or relative components
    // This also verifies the path exists for read operations
    // For write operations on new files, we check parent directory
    if path_obj.exists() {
        path_obj
            .canonicalize()
            .map_err(|e| format!("Failed to canonicalize path: {}", e))
    } else {
        // For new files, ensure parent exists and is valid
        if let Some(parent) = path_obj.parent() {
            if parent.exists() {
                parent
                    .canonicalize()
                    .map(|p| p.join(path_obj.file_name().unwrap_or_default()))
                    .map_err(|e| format!("Failed to canonicalize parent path: {}", e))
            } else {
                // Parent doesn't exist, will be created - validate what we can
                Ok(path_obj.to_path_buf())
            }
        } else {
            Err("Invalid path: no parent directory".to_string())
        }
    }
}

/// Save project data to a .ptf file
///
/// # Arguments
/// * `path` - Absolute path to the destination file (user-selected via dialog)
/// * `data` - JSON string containing the serialized project data
///
/// # Platform Notes
/// - Uses std::fs::write which is cross-platform
/// - Path validation handled by Tauri's fs plugin permissions
#[tauri::command]
pub async fn save_project_file(path: String, data: String) -> Result<(), String> {
    // Security: Validate path before any operations
    let validated_path = validate_path_security(&path)?;
    let file_path = validated_path.as_path();

    // Ensure parent directory exists (cross-platform)
    if let Some(parent) = file_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
        }
    }

    // Optimization: Embed PDFs in the backend to avoid frontend processing
    let mut json_val: serde_json::Value = serde_json::from_str(&data)
        .map_err(|e| format!("Failed to parse project JSON for saving: {}", e))?;

    // Check if we need to embed PDFs
    // We look for PDFs in the project that don't have corresponding data in embeddedPdfs
    // This happens because the frontend now skips embedding to save performance
    let mut pdfs_to_embed = Vec::new();

    if let Some(project) = json_val.get("project") {
        if let Some(pdfs) = project.get("pdfs").and_then(|v| v.as_array()) {
            for pdf in pdfs {
                if let (Some(id), Some(url)) = (
                    pdf.get("id").and_then(|v| v.as_str()),
                    pdf.get("url").and_then(|v| v.as_str()),
                ) {
                    // Check if already embedded?
                    let needs_embedding = if let Some(embedded) =
                        json_val.get("embeddedPdfs").and_then(|v| v.as_object())
                    {
                        !embedded.contains_key(id)
                    } else {
                        true
                    };

                    if needs_embedding && !url.starts_with("blob:") && !url.is_empty() {
                        pdfs_to_embed.push((id.to_string(), url.to_string()));
                    }
                }
            }
        }
    }

    if !pdfs_to_embed.is_empty() {
        println!(
            "[ProjectIO] Optimizing: Embedding {} PDFs in backend...",
            pdfs_to_embed.len()
        );

        // Ensure embeddedPdfs object exists
        if !json_val.get("embeddedPdfs").is_some() {
            json_val["embeddedPdfs"] = serde_json::Value::Object(serde_json::Map::new());
        }

        if let Some(embedded_map) = json_val
            .get_mut("embeddedPdfs")
            .and_then(|v| v.as_object_mut())
        {
            for (id, url) in pdfs_to_embed {
                let p = Path::new(&url);
                if p.exists() {
                    match fs::read(p) {
                        Ok(bytes) => {
                            use base64::Engine;
                            let encoded = base64::engine::general_purpose::STANDARD.encode(&bytes);
                            embedded_map.insert(id.clone(), serde_json::Value::String(encoded));
                            println!("[ProjectIO] Embedded PDF {} from {}", id, url);
                        }
                        Err(e) => println!(
                            "[ProjectIO] Failed to read PDF for embedding {}: {}",
                            url, e
                        ),
                    }
                } else {
                    println!("[ProjectIO] PDF path not found for embedding: {}", url);
                }
            }
        }
    }

    // Serialize final JSON to bytes
    let final_json = serde_json::to_string(&json_val)
        .map_err(|e| format!("Failed to serialize project for saving: {}", e))?;

    // Write the file
    fs::write(&path, final_json.as_bytes())
        .map_err(|e| format!("Failed to save project file: {}", e))?;

    println!("[ProjectIO] Saved project to: {}", path);
    Ok(())
}

/// Load project data from a .ptf file
///
/// # Arguments
/// * `path` - Absolute path to the source file (user-selected via dialog)
///
/// # Returns
/// * JSON string containing the project data
#[tauri::command]
pub async fn load_project_file(path: String) -> Result<String, String> {
    // Security: Validate path before any operations
    let validated_path = validate_path_security(&path)?;
    let file_path = validated_path.as_path();

    // Validate file exists
    if !file_path.exists() {
        return Err(format!("Project file not found: {}", path));
    }

    // Validate extension (optional but good for UX)
    if let Some(ext) = file_path.extension() {
        if ext != "ptf" {
            println!(
                "[ProjectIO] Warning: File does not have .ptf extension: {}",
                path
            );
        }
    }

    // Read file contents as UTF-8 string
    let contents =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read project file: {}", e))?;

    let mut json_val: serde_json::Value = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse project JSON: {}", e))?;

    // Optimization: Extract embedded PDFs to temp files on the backend
    // This avoids sending massive base64 strings to the frontend
    if let Some(embedded_pdfs) = json_val
        .get_mut("embeddedPdfs")
        .and_then(|v| v.as_object_mut())
    {
        if !embedded_pdfs.is_empty() {
            println!(
                "[ProjectIO] Optimizing: Extracting {} embedded PDFs...",
                embedded_pdfs.len()
            );

            // We need to map pdfId -> tempPath
            let mut extracted_paths = std::collections::HashMap::new();

            // Iterate over embedded PDFs
            // We clone keys to avoid borrowing issues while mutating
            let keys: Vec<String> = embedded_pdfs.keys().cloned().collect();

            for pdf_id in keys {
                if let Some(base64_val) = embedded_pdfs.remove(&pdf_id) {
                    if let Some(base64_str) = base64_val.as_str() {
                        // Decode
                        use base64::Engine;
                        match base64::engine::general_purpose::STANDARD.decode(base64_str) {
                            Ok(bytes) => {
                                // Write to temp file
                                let temp_dir = std::env::temp_dir();
                                let file_name =
                                    format!("protakeoff_temp_{}.pdf", uuid::Uuid::new_v4());
                                let file_path = temp_dir.join(&file_name);

                                if let Ok(mut file) = fs::File::create(&file_path) {
                                    use std::io::Write;
                                    if file.write_all(&bytes).is_ok() {
                                        let path_str = file_path.to_string_lossy().to_string();
                                        extracted_paths.insert(pdf_id.clone(), path_str.clone());
                                        println!(
                                            "[ProjectIO] Extracted PDF {} to {}",
                                            pdf_id, path_str
                                        );
                                    }
                                }
                            }
                            Err(e) => {
                                println!("[ProjectIO] Failed to decode PDF {}: {}", pdf_id, e)
                            }
                        }
                    }
                }
            }

            // Update the project.pdfs array with new URLs
            if let Some(project) = json_val.get_mut("project") {
                if let Some(pdfs) = project.get_mut("pdfs").and_then(|v| v.as_array_mut()) {
                    for pdf in pdfs {
                        if let Some(id_val) = pdf.get("id").and_then(|v| v.as_str()) {
                            if let Some(new_path) = extracted_paths.get(id_val) {
                                // Update URL
                                pdf["url"] = serde_json::Value::String(new_path.clone());
                                // Ensure originalPath is preserved if needed, but url is what matters for loading
                            }
                        }
                    }
                }
            }
        }
    }

    // Re-serialize the optimized JSON
    // It should now be much smaller as embeddedPdfs is empty
    let optimized_json = serde_json::to_string(&json_val)
        .map_err(|e| format!("Failed to serialize optimized project: {}", e))?;

    println!(
        "[ProjectIO] Loaded project from: {} (optimized size: {} bytes)",
        path,
        optimized_json.len()
    );
    Ok(optimized_json)
}

/// Read a file as base64-encoded string (for embedding PDFs)
///
/// # Arguments
/// * `path` - Absolute path to the file
///
/// # Returns
/// * Base64-encoded string of file contents
#[tauri::command]
pub async fn read_file_as_base64(path: String) -> Result<String, String> {
    // Security: Validate path before any operations
    let validated_path = validate_path_security(&path)?;
    let file_path = validated_path.as_path();

    if !file_path.exists() {
        return Err(format!("File not found: {}", path));
    }

    let bytes = fs::read(file_path).map_err(|e| format!("Failed to read file: {}", e))?;

    use base64::Engine;
    let encoded = base64::engine::general_purpose::STANDARD.encode(&bytes);

    println!(
        "[ProjectIO] Read file as base64: {} ({} bytes -> {} chars)",
        path,
        bytes.len(),
        encoded.len()
    );
    Ok(encoded)
}

/// Write base64-encoded string to a temporary file
///
/// # Arguments
/// * `base64_data` - Base64 encoded file content
/// * `original_name` - Original filename (for extension)
///
/// # Returns
/// * Absolute path to the created temporary file
#[tauri::command]
pub async fn write_base64_to_temp_file(
    base64_data: String,
    original_name: String,
) -> Result<String, String> {
    use base64::Engine;
    use std::io::Write;

    // Decode base64
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&base64_data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    // Create temp file path
    let temp_dir = std::env::temp_dir();
    let ext = Path::new(&original_name)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("pdf");
    let file_name = format!("protakeoff_temp_{}.{}", uuid::Uuid::new_v4(), ext);
    let file_path = temp_dir.join(file_name);

    let path_str = file_path.to_string_lossy().to_string();

    // Write file
    let mut file =
        fs::File::create(&file_path).map_err(|e| format!("Failed to create temp file: {}", e))?;

    file.write_all(&bytes)
        .map_err(|e| format!("Failed to write to temp file: {}", e))?;

    println!(
        "[ProjectIO] Wrote temp file: {} ({} bytes)",
        path_str,
        bytes.len()
    );
    Ok(path_str)
}
