//! Vello CPU Renderer Module
//!
//! Provides high-performance CPU-based 2D rendering using the Vello engine.
//! This module is designed to accelerate PDF export by rendering complex markup
//! layers into raster images using SIMD and multi-threading.
//!
//! # Architecture
//! - Uses `vello_cpu::RenderContext` for retained-mode rendering.
//! - Outputs to a `Pixmap` which can be converted to PNG.
//!
//! # Performance Notes
//! - SIMD: Automatically uses AVX2/SSE4.2/NEON depending on platform.
//! - Multi-threading: Enabled via the `multithreading` feature.

use vello_cpu::{Pixmap, RenderContext};
pub use vello_cpu::color::palette::css;
pub use vello_cpu::kurbo::Rect;

/// Render a scene to a PNG buffer.
///
/// # Arguments
/// * `width` - Width of the output image in pixels (max 65535).
/// * `height` - Height of the output image in pixels (max 65535).
/// * `draw_fn` - A closure that populates the render context with drawing commands.
///
/// # Returns
/// A `Vec<u8>` containing the PNG-encoded image data.
pub fn render_to_png<F>(width: u16, height: u16, draw_fn: F) -> Result<Vec<u8>, String>
where
    F: FnOnce(&mut RenderContext),
{
    let mut ctx = RenderContext::new(
        width.try_into().unwrap_or(u16::MAX),
        height.try_into().unwrap_or(u16::MAX),
    );

    // Execute the user's drawing commands
    draw_fn(&mut ctx);

    // Flush for multi-threaded mode (always safe to call)
    ctx.flush();

    // Render to pixmap
    let mut pixmap = Pixmap::new(
        width.try_into().unwrap_or(u16::MAX),
        height.try_into().unwrap_or(u16::MAX),
    );
    ctx.render_to_pixmap(&mut pixmap);

    // Encode to PNG
    pixmap.into_png().map_err(|e| format!("PNG encoding failed: {:?}", e))
}

/// Helper function to render a filled rectangle using vello_cpu.
#[allow(dead_code)]
pub fn fill_rect_example(ctx: &mut RenderContext, rect: &Rect) {
    ctx.set_paint(css::BLUE);
    ctx.fill_rect(rect);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_render() {
        let result = render_to_png(100, 100, |_ctx| {
            // Empty scene for now
        });
        assert!(result.is_ok());
        let png_bytes = result.unwrap();
        // PNG header starts with these magic bytes
        assert_eq!(&png_bytes[0..4], &[0x89, 0x50, 0x4E, 0x47]);
    }
}
