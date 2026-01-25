// wasm/src/lib.rs
use wasm_bindgen::prelude::*;

// Mocking the imported schema module structure for demonstration
// use crate::schema_generated::pro_takeoff::{ViewportResponse, Point};

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

/// Calculate polygon area using Shoelace formula.
/// Points are [x0, y0, x1, y1, ...]
#[wasm_bindgen]
pub fn calculate_shoelace_area(points: &[f64]) -> f64 {
    let mut area = 0.0;
    let n = points.len();
    if n < 4 { return 0.0; } // Need at least 2 points (4 coords)

    for i in (0..n).step_by(2) {
        let x_i = points[i];
        let y_i = points[i + 1];
        
        // Wrap around for the last point
        let next_idx = (i + 2) % n;
        let x_next = points[next_idx];
        let y_next = points[next_idx + 1];

        area += (x_i * y_next) - (x_next * y_i);
    }

    (area.abs() / 2.0)
}

/// Snap lookup result
#[wasm_bindgen]
pub struct SnapResult {
    pub x: f64,
    pub y: f64,
}

/// Find nearest vertex in the FlatBuffer blob to the cursor.
/// `geometry_buffer` is the raw bytes from the API response.
#[wasm_bindgen]
pub fn snap_to_vertex(cursor_x: f64, cursor_y: f64, geometry_buffer: &[u8]) -> Option<SnapResult> {
    // 1. Initialize FlatBuffer verifier/reader
    // let root = flatbuffers::root::<ViewportResponse>(geometry_buffer).ok()?;
    
    // 2. Iterate entities
    // let entities = root.entities()?;
    
    // Optimization: In a real "Formula 1" engine, we wouldn't scan all points linearly.
    // The FlatBuffer structure itself isn't a spatial index.
    // Ideally, we would have built a cheap QuadTree in Wasm memory upon data load.
    // But per requirements, we read the buffer. We'll do a linear scan for simplicity or assume structure allows it.
    
    // For demonstration of "Reading Binary Directly":
    // We'll mock the iteration.
    
    let mut min_dist_sq = f64::MAX;
    let mut nearest = None;
    let snap_radius = 20.0; // pixels/units
    let snap_radius_sq = snap_radius * snap_radius;

    // Hypothetical loop over points in the buffer
    // for entity in entities {
    //    match entity.geometry_type() {
    //       Geometry::Polyline => {
    //           let polyline = entity.geometry_as_polyline().unwrap();
    //           for p in polyline.points() { ... check dist ... }
    //       }
    //       ...
    //    }
    // }

    // Since we don't have the generated code, here is the logic:
    // Iterate all points, check distance squared.
    // return closest if < snap_radius
    
    // Pseudo-implementation to satisfy type checker:
    if geometry_buffer.len() > 0 && cursor_x > 0.0 {
         // Dummy logic -> if cursor is close to (100, 100), snap to it.
         let target_x = 100.0;
         let target_y = 100.0;
         let dx = cursor_x - target_x;
         let dy = cursor_y - target_y;
         if dx*dx + dy*dy < snap_radius_sq {
             return Some(SnapResult { x: target_x, y: target_y });
         }
    }

    nearest
}
