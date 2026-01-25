use std::path::PathBuf;
use std::sync::Arc;

// Define a result structure for frontend consumption
#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct IngestionResult {
    pub doc_id: String,
    pub text: String,
    pub page_count: i32,
    pub metadata: serde_json::Value,
}

#[derive(serde::Serialize, Debug, thiserror::Error)]
pub enum IngestionError {
    #[error("File not found: {0}")]
    FileNotFound(String),
    #[error("Extraction failed: {0}")]
    ExtractionError(String),
    #[error("IO Error: {0}")]
    IoError(String),
}


pub struct IngestionService;

impl IngestionService {
    pub async fn ingest_document(doc_id: String, path: PathBuf) -> Result<IngestionResult, IngestionError> {
        if !path.exists() {
            return Err(IngestionError::FileNotFound(path.to_string_lossy().to_string()));
        }

        // Configure Kreuzberg for basic ingestion
        let config = kreuzberg::ExtractionConfig {
            ocr: Some(kreuzberg::OcrConfig {
                backend: "tesseract".to_string(),
                language: "eng".to_string(),
                ..Default::default()
            }),
            ..Default::default()
        };
        
        // Run extraction
        println!("Ingestion: Starting extraction for {:?} with backend {}", path, config.ocr.as_ref().map(|o| &o.backend).unwrap_or(&"none".to_string()));
        let start = std::time::Instant::now();
        
        let k_result = kreuzberg::extract_file(&path, None, &config)
            .await
            .map_err(|e| {
                println!("Ingestion: Failed after {:?}: {}", start.elapsed(), e);
                IngestionError::ExtractionError(e.to_string())
            })?;

        println!("Ingestion: Extraction finished in {:?}. Content len: {}", start.elapsed(), k_result.content.len());

        // Convert metadata to generic JSON
        let metadata_json = serde_json::to_value(&k_result.metadata)
            .unwrap_or(serde_json::json!({ "error": "failed to serialize metadata" }));

        // Map result
        Ok(IngestionResult {
            doc_id,
            text: k_result.content,
            page_count: k_result.metadata.pages.map(|p| p.total_count as i32).unwrap_or(1),
            metadata: metadata_json,
        })
    }
}
