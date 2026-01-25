use crate::mupdf_wrapper::MuPdfDoc;
use rstar::RTree;
use std::sync::{Arc, RwLock};
use pdfium_render::prelude::*;

pub struct VectorObject {
    #[allow(dead_code)]
    pub id: usize,
    pub geom: rstar::primitives::Rectangle<[f64; 2]>,
    // Add other properties like color, layer, etc.
}

impl rstar::RTreeObject for VectorObject {
    type Envelope = rstar::AABB<[f64; 2]>;

    fn envelope(&self) -> Self::Envelope {
        rstar::AABB::from_corners(self.geom.lower(), self.geom.upper())
    }
}

use std::collections::HashMap;

/// Wrapper to assert thread safety for global Pdfium instance.
/// Pdfium is generally thread-safe for rendering different docs/pages.
pub struct ThreadSafePdfium(#[allow(dead_code)] pub Pdfium);
unsafe impl Send for ThreadSafePdfium {}
unsafe impl Sync for ThreadSafePdfium {}

/// Global application state shared across Tauri commands.
/// Uses RwLock to favor read-heavy workloads (viewport queries).
pub struct AppState {
    pub documents: RwLock<HashMap<String, MuPdfDoc>>,
    /// High-performance in-memory R-Tree for spatial indexing
    pub spatial_index: RwLock<RTree<VectorObject>>,
    /// Global Pdfium binding (manual for production bundles)
    pub pdfium: RwLock<Option<Arc<ThreadSafePdfium>>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            documents: RwLock::new(HashMap::new()),
            spatial_index: RwLock::new(RTree::new()),
            pdfium: RwLock::new(None),
        }
    }
}
