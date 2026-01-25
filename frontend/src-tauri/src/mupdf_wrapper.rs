//! MuPDF FFI Wrapper
//!
//! # Safety Invariants
//!
//! ## Thread Safety Model
//! MuPDF contexts are NOT inherently thread-safe. We ensure safety via:
//! 1. `Mutex<MuPdfInner>` - Only one thread can access ctx/doc at a time
//! 2. `Arc<RwLock<AppState>>` in Tauri - Protects the HashMap of documents
//! 3. Protocol handler uses read lock only (no concurrent mutations)
//!
//! ## Memory Management
//! - `own_context: bool` tracks context ownership to prevent double-free
//! - `Drop` impl releases resources in correct order (doc before ctx)
//! - Sibling documents share context but don't own it
//!
//! ## Pointer Validity
//! - Context pointer remains valid for document lifetime (checked in C)
//! - Mutex prevents use-after-free via mutation lock

use std::error::Error;
use std::ffi::CString;
use std::os::raw::{c_char, c_float, c_int, c_void};
use std::sync::Mutex;

/// MuPDF error codes for clearer error handling
const MUPDF_SUCCESS: i32 = 0;
const MUPDF_ERR_FILE_BUSY: i32 = 5;

#[repr(C)]
struct BridgeContext(c_void);
#[repr(C)]
struct BridgeDocument(c_void);
#[repr(C)]
pub struct BridgeOverlay(c_void);

extern "C" {
    fn mupdf_new_context() -> *mut BridgeContext;
    fn mupdf_drop_context(ctx: *mut BridgeContext);
    fn mupdf_open_document(
        ctx: *mut BridgeContext,
        path: *const c_char,
        error_code: *mut c_int,
    ) -> *mut BridgeDocument;
    fn mupdf_drop_document(ctx: *mut BridgeContext, doc: *mut BridgeDocument);
    fn mupdf_get_page_count(ctx: *mut BridgeContext, doc: *mut BridgeDocument) -> c_int;
    fn mupdf_render_page_to_png(
        ctx: *mut BridgeContext,
        doc: *mut BridgeDocument,
        page_number: c_int,
        zoom: c_float,
        out_size: *mut c_int,
        error_code: *mut c_int,
    ) -> *mut u8;
    fn mupdf_free_buffer(buffer: *mut u8);

    // Export & Overlay
    fn mupdf_create_pdf(ctx: *mut BridgeContext, error_code: *mut c_int) -> *mut BridgeDocument;
    fn mupdf_copy_page(
        ctx: *mut BridgeContext,
        dest_doc: *mut BridgeDocument,
        src_doc: *mut BridgeDocument,
        src_page_idx: c_int,
        error_code: *mut c_int,
    ) -> c_int;
    fn mupdf_save_document(
        ctx: *mut BridgeContext,
        doc: *mut BridgeDocument,
        path: *const c_char,
    ) -> c_int;

    fn mupdf_begin_overlay(
        ctx: *mut BridgeContext,
        doc: *mut BridgeDocument,
        page_idx: c_int,
        error_code: *mut c_int,
    ) -> *mut BridgeOverlay;
    fn mupdf_end_overlay(ctx: *mut BridgeContext, overlay: *mut BridgeOverlay) -> c_int;
    fn mupdf_overlay_draw_line(
        ctx: *mut BridgeContext,
        overlay: *mut BridgeOverlay,
        x1: c_float,
        y1: c_float,
        x2: c_float,
        y2: c_float,
        thickness: c_float,
        r: c_float,
        g: c_float,
        b: c_float,
        a: c_float,
    ) -> c_int;
    fn mupdf_overlay_draw_rect(
        ctx: *mut BridgeContext,
        overlay: *mut BridgeOverlay,
        x: c_float,
        y: c_float,
        w: c_float,
        h: c_float,
        thickness: c_float,
        r: c_float,
        g: c_float,
        b: c_float,
        a: c_float,
        fill: c_int,
    ) -> c_int;
    fn mupdf_overlay_draw_text(
        ctx: *mut BridgeContext,
        overlay: *mut BridgeOverlay,
        x: c_float,
        y: c_float,
        text: *const c_char,
        font_size: c_float,
        r: c_float,
        g: c_float,
        b: c_float,
    ) -> c_int;
    fn mupdf_overlay_measure_text(
        ctx: *mut BridgeContext,
        overlay: *mut BridgeOverlay,
        text: *const c_char,
        font_size: c_float,
    ) -> c_float;
    fn mupdf_overlay_draw_polygon(
        ctx: *mut BridgeContext,
        overlay: *mut BridgeOverlay,
        points: *const c_float,
        point_count: c_int,
        r: c_float,
        g: c_float,
        b: c_float,
        a: c_float,
    ) -> c_int;


    fn mupdf_overlay_draw_image(
        ctx: *mut BridgeContext,
        overlay: *mut BridgeOverlay,
        png_data: *const u8,
        png_len: c_int,
        x: c_float,
        y: c_float,
        w: c_float,
        h: c_float,
        alpha: c_float,
    ) -> c_int;

    // Text extraction and search
    fn mupdf_extract_page_text(
        ctx: *mut BridgeContext,
        doc: *mut BridgeDocument,
        page_idx: c_int,
        out_length: *mut c_int,
    ) -> *mut c_char;

    fn mupdf_free_text(text: *mut c_char);

    fn mupdf_search_page(
        ctx: *mut BridgeContext,
        doc: *mut BridgeDocument,
        page_idx: c_int,
        needle: *const c_char,
        out_quads: *mut c_float,
        max_results: c_int,
    ) -> c_int;

    fn mupdf_has_ocr_support() -> c_int;
}

struct MuPdfInner {
    ctx: *mut BridgeContext,
    doc: *mut BridgeDocument,
}

// SAFETY: Internal pointers are handled by Mutex in MuPdfDoc
unsafe impl Send for MuPdfInner {}

pub struct MuPdfDoc {
    inner: Mutex<MuPdfInner>,
    page_count: i32,
    own_context: bool,
}

/// MuPdfDoc wraps raw C pointers to MuPDF context and document.
///
/// # RAII Pattern
/// Drop implementation ensures proper cleanup of C resources.
impl Drop for MuPdfDoc {
    fn drop(&mut self) {
        if let Ok(inner) = self.inner.lock() {
            unsafe {
                if !inner.doc.is_null() {
                    mupdf_drop_document(inner.ctx, inner.doc);
                }
                if !inner.ctx.is_null() && self.own_context {
                    mupdf_drop_context(inner.ctx);
                }
            }
        }
    }
}

// SAFETY: MuPdfDoc can be sent between threads because:
// 1. The MuPDF C library's context is designed to be thread-safe when each thread
//    uses its own context or the context is protected by external synchronization.
// 2. We protect access via RwLock in AppState, ensuring single-writer/multi-reader.
// 3. The ctx and doc pointers are only accessed through &self methods (immutable).
unsafe impl Send for MuPdfDoc {}

// SAFETY: MuPdfDoc can be shared between threads (&MuPdfDoc) because:
// 1. All methods that access the pointers are &self (shared reference).
// 2. The MuPDF rendering functions are thread-safe for read operations.
// 3. External synchronization (RwLock) ensures no concurrent writes.
unsafe impl Sync for MuPdfDoc {}

impl MuPdfDoc {
    pub fn open(path: &str) -> Result<Self, Box<dyn Error>> {
        // SAFETY: mupdf_new_context returns a valid pointer or null.
        // mupdf_open_document requires a valid context and null-terminated path.
        // We handle null returns and clean up on failure.
        unsafe {
            let ctx = mupdf_new_context();
            if ctx.is_null() {
                return Err("Failed to create MuPDF context".into());
            }

            let c_path = CString::new(path)?;
            let mut error_code: c_int = 0;
            let doc = mupdf_open_document(ctx, c_path.as_ptr(), &mut error_code);

            if doc.is_null() {
                mupdf_drop_context(ctx);
                return Err(format!("Failed to open document (error code: {})", error_code).into());
            }

            let page_count = mupdf_get_page_count(ctx, doc);

            Ok(Self {
                inner: Mutex::new(MuPdfInner { ctx, doc }),
                page_count,
                own_context: true,
            })
        }
    }

    pub fn create_new() -> Result<Self, Box<dyn Error>> {
        // SAFETY: mupdf_create_pdf allocates a new PDF document.
        // We check for null and clean up context on failure.
        unsafe {
            let ctx = mupdf_new_context();
            if ctx.is_null() {
                return Err("Failed context".into());
            }

            let mut ec = 0;
            let doc = mupdf_create_pdf(ctx, &mut ec);
            if doc.is_null() {
                mupdf_drop_context(ctx);
                return Err(format!("Failed to create PDF (ec: {})", ec).into());
            }

            Ok(Self {
                inner: Mutex::new(MuPdfInner { ctx, doc }),
                page_count: 0,
                own_context: true,
            })
        }
    }

    /// Open a document using the same context as this one.
    /// The returned doc shares the context (own_context=false) so it won't drop it.
    pub fn open_sibling(&self, path: &str) -> Result<Self, Box<dyn Error>> {
        let inner = self.inner.lock().map_err(|_| "Mutex poisoned")?;
        unsafe {
            let c_path = CString::new(path)?;
            let mut ec = 0;
            let doc = mupdf_open_document(inner.ctx, c_path.as_ptr(), &mut ec);
            if doc.is_null() {
                return Err(format!("Failed to open sibling doc (ec: {})", ec).into());
            }
            let page_count = mupdf_get_page_count(inner.ctx, doc);
            Ok(Self {
                inner: Mutex::new(MuPdfInner {
                    ctx: inner.ctx,
                    doc,
                }),
                page_count,
                own_context: false, // Do NOT drop context when this doc is dropped
            })
        }
    }

    pub fn get_page_count(&self) -> i32 {
        self.page_count
    }

    pub fn render_page_to_buffer(
        &self,
        page_index: i32,
        zoom: f32,
    ) -> Result<Vec<u8>, Box<dyn Error>> {
        let inner = self.inner.lock().map_err(|_| "Mutex poisoned")?;
        unsafe {
            let mut out_size: c_int = 0;
            let mut error_code: c_int = 0;

            let ptr = mupdf_render_page_to_png(
                inner.ctx,
                inner.doc,
                page_index,
                zoom,
                &mut out_size,
                &mut error_code,
            );

            if ptr.is_null() {
                return Err(format!(
                    "Failed to render page {} (error code: {})",
                    page_index, error_code
                )
                .into());
            }

            // Copy bytes before freeing - the slice is valid because out_size was set by C
            let bytes = std::slice::from_raw_parts(ptr, out_size as usize).to_vec();
            mupdf_free_buffer(ptr);

            Ok(bytes)
        }
    }

    // Export Helpers

    pub fn save(&self, path: &str) -> Result<(), Box<dyn Error>> {
        let inner = self.inner.lock().map_err(|_| "Mutex poisoned")?;
        unsafe {
            let c_path = CString::new(path)?;
            let res = mupdf_save_document(inner.ctx, inner.doc, c_path.as_ptr());
            if res != MUPDF_SUCCESS {
                if res == MUPDF_ERR_FILE_BUSY {
                    return Err("Failed to save PDF: The file is likely open in another program. Please close it and try again.".into());
                }
                return Err(format!("Failed to save PDF (code: {})", res).into());
            }
            Ok(())
        }
    }

    pub fn copy_page_from(&self, src: &MuPdfDoc, src_page_idx: i32) -> Result<(), Box<dyn Error>> {
        let dest_inner = self.inner.lock().map_err(|_| "Dest Mutex poisoned")?;
        let src_inner = src.inner.lock().map_err(|_| "Src Mutex poisoned")?;
        unsafe {
            let mut ec = 0;
            let res = mupdf_copy_page(
                dest_inner.ctx,
                dest_inner.doc,
                src_inner.doc,
                src_page_idx,
                &mut ec,
            );
            if res == 0 {
                return Err(format!("Failed to copy page (ec: {})", ec).into());
            }
            Ok(())
        }
    }

    pub fn begin_overlay(&self, page_idx: i32) -> Result<MuPdfOverlay, Box<dyn Error>> {
        let inner = self.inner.lock().map_err(|_| "Mutex poisoned")?;
        unsafe {
            let mut ec = 0;
            let overlay = mupdf_begin_overlay(inner.ctx, inner.doc, page_idx, &mut ec);
            if overlay.is_null() {
                return Err(format!("Failed to begin overlay (ec: {})", ec).into());
            }
            Ok(MuPdfOverlay {
                ctx: inner.ctx,
                overlay,
            })
        }
    }

    /// Extract all text from a page as a string
    pub fn extract_text(&self, page_idx: i32) -> Result<String, Box<dyn Error>> {
        let inner = self.inner.lock().map_err(|e| format!("Lock error: {}", e))?;

        let mut out_length: c_int = 0;
        let text_ptr = unsafe {
            mupdf_extract_page_text(
                inner.ctx,
                inner.doc,
                page_idx,
                &mut out_length,
            )
        };

        if text_ptr.is_null() {
            return Ok(String::new());
        }

        let text = unsafe {
            let slice = std::slice::from_raw_parts(text_ptr as *const u8, out_length as usize);
            let result = String::from_utf8_lossy(slice).into_owned();
            mupdf_free_text(text_ptr);
            result
        };

        Ok(text)
    }

    /// Search for text on a specific page, returns hit quads
    pub fn search_page(&self, page_idx: i32, needle: &str) -> Result<Vec<SearchHit>, Box<dyn Error>> {
        let inner = self.inner.lock().map_err(|e| format!("Lock error: {}", e))?;

        let c_needle = CString::new(needle)?;
        const MAX_RESULTS: usize = 100;
        let mut quads: [c_float; MAX_RESULTS * 8] = [0.0; MAX_RESULTS * 8];

        let hit_count = unsafe {
            mupdf_search_page(
                inner.ctx,
                inner.doc,
                page_idx,
                c_needle.as_ptr(),
                quads.as_mut_ptr(),
                MAX_RESULTS as c_int,
            )
        };

        let mut results = Vec::new();
        for i in 0..(hit_count as usize).min(MAX_RESULTS) {
            let base = i * 8;
            results.push(SearchHit {
                ul: (quads[base], quads[base + 1]),
                ur: (quads[base + 2], quads[base + 3]),
                lr: (quads[base + 4], quads[base + 5]),
                ll: (quads[base + 6], quads[base + 7]),
            });
        }

        Ok(results)
    }
}

/// A text search hit with bounding quad coordinates
#[derive(Debug, Clone, serde::Serialize)]
pub struct SearchHit {
    /// Upper-left corner
    pub ul: (f32, f32),
    /// Upper-right corner
    pub ur: (f32, f32),
    /// Lower-right corner
    pub lr: (f32, f32),
    /// Lower-left corner
    pub ll: (f32, f32),
}

/// Check if Tesseract OCR support is compiled in
pub fn has_ocr_support() -> bool {
    unsafe { mupdf_has_ocr_support() != 0 }
}

pub struct MuPdfOverlay {
    ctx: *mut BridgeContext,
    overlay: *mut BridgeOverlay,
}

impl MuPdfOverlay {
    pub fn draw_line(
        &self,
        x1: f32,
        y1: f32,
        x2: f32,
        y2: f32,
        thickness: f32,
        r: f32,
        g: f32,
        b: f32,
        a: f32,
    ) {
        unsafe {
            mupdf_overlay_draw_line(
                self.ctx,
                self.overlay,
                x1,
                y1,
                x2,
                y2,
                thickness,
                r,
                g,
                b,
                a,
            );
        }
    }

    pub fn draw_rect(
        &self,
        x: f32,
        y: f32,
        w: f32,
        h: f32,
        thickness: f32,
        r: f32,
        g: f32,
        b: f32,
        a: f32,
        fill: bool,
    ) {
        unsafe {
            mupdf_overlay_draw_rect(
                self.ctx,
                self.overlay,
                x,
                y,
                w,
                h,
                thickness,
                r,
                g,
                b,
                a,
                if fill { 1 } else { 0 },
            );
        }
    }

    pub fn draw_text(&self, x: f32, y: f32, text: &str, font_size: f32, r: f32, g: f32, b: f32) {
        unsafe {
            let c_text = CString::new(text).unwrap_or_default();
            mupdf_overlay_draw_text(
                self.ctx,
                self.overlay,
                x,
                y,
                c_text.as_ptr(),
                font_size,
                r,
                g,
                b,
            );
        }
    }

    pub fn measure_text(&self, text: &str, font_size: f32) -> f32 {
        unsafe {
            let c_text = CString::new(text).unwrap_or_default();
            mupdf_overlay_measure_text(self.ctx, self.overlay, c_text.as_ptr(), font_size)
        }
    }

    pub fn draw_polygon(&self, points: &[(f32, f32)], r: f32, g: f32, b: f32, a: f32) {
        if points.len() < 3 {
            return;
        }
        unsafe {
            // Flatten points to [x0, y0, x1, y1, ...]
            let flat: Vec<f32> = points.iter().flat_map(|(x, y)| [*x, *y]).collect();
            mupdf_overlay_draw_polygon(
                self.ctx,
                self.overlay,
                flat.as_ptr(),
                points.len() as i32,
                r,
                g,
                b,
                a,
            );
        }
    }



    pub fn draw_image(&self, png_data: &[u8], x: f32, y: f32, w: f32, h: f32, alpha: f32) {
        if png_data.is_empty() {
            return;
        }
        unsafe {
            mupdf_overlay_draw_image(
                self.ctx,
                self.overlay,
                png_data.as_ptr(),
                png_data.len() as c_int,
                x,
                y,
                w,
                h,
                alpha,
            );
        }
    }

    pub fn finish(self) -> Result<(), Box<dyn Error>> {
        unsafe {
            let res = mupdf_end_overlay(self.ctx, self.overlay);
            if res != 0 {
                return Err(format!("Failed to end overlay (code: {})", res).into());
            }
            Ok(())
        }
    }
}
