//! Centralized error types for ProTakeoff Tauri backend
//!
//! Provides consistent error handling across all Tauri commands
//! following Rust best practices (Rule 5, Rule 13 from critical-rules.md).

use thiserror::Error;

/// Application-wide error type for Tauri commands
#[derive(Error, Debug)]
pub enum AppError {
    /// PDF-related operation failed
    #[error("PDF operation failed: {0}")]
    PdfError(String),

    /// Requested file was not found
    #[error("File not found: {0}")]
    FileNotFound(String),

    /// File is locked by another process
    #[error("File is locked by another program. Please close it and try again.")]
    FileBusy,

    /// Invalid path (traversal, null bytes, etc.)
    #[error("Invalid path: {0}")]
    InvalidPath(String),

    /// Failed to acquire lock on shared state
    #[error("Failed to acquire state lock")]
    LockError,

    /// Document not found in state
    #[error("Document not found: {0}")]
    DocumentNotFound(String),

    /// Generic internal error
    #[error("Internal error: {0}")]
    Internal(String),
}

/// Convert AppError to String for Tauri command returns
impl From<AppError> for String {
    fn from(err: AppError) -> String {
        err.to_string()
    }
}
