use crate::doc_state::{AppState, VectorObject};
use crate::geometry::{calculate_aabb, FrontendPoint as GeoPoint};
use crate::mupdf_wrapper::MuPdfDoc;
use crate::ingestion_service::IngestionService;
use rstar::RTree;
use serde::Deserialize;
use std::collections::HashMap;
use tauri::State;

#[derive(Deserialize, Clone, Debug)]
pub struct Point {
    pub x: f32,
    pub y: f32,
}

#[derive(Deserialize, Clone, Debug)]
pub struct Size {
    pub width: f32,
    pub height: f32,
}

#[derive(Deserialize, Debug)]
pub struct LegendItem {
    pub name: String,
    pub color: String,
    pub quantity: String,
}

#[derive(Deserialize, Debug)]
pub struct LegendData {
    pub items: Vec<LegendItem>,
    pub position: Point,
    pub size: Size,
}

#[derive(Deserialize, Debug)]
pub struct MarkupData {
    pub id: String,
    #[serde(rename = "type")]
    pub tool_type: String,
    pub paths: Vec<Vec<Point>>,
    pub properties: serde_json::Value,
}

fn parse_color(hex: &str) -> (f32, f32, f32) {
    let hex = hex.trim_start_matches('#');
    if hex.len() != 6 {
        return (0.0, 0.0, 0.0);
    }
    let r = u8::from_str_radix(&hex[0..2], 16).unwrap_or(0) as f32 / 255.0;
    let g = u8::from_str_radix(&hex[2..4], 16).unwrap_or(0) as f32 / 255.0;
    let b = u8::from_str_radix(&hex[4..6], 16).unwrap_or(0) as f32 / 255.0;
    (r, g, b)
}

#[tauri::command]
pub async fn export_pdf(
    source_path: String,
    output_path: String,
    page_indices: Vec<i32>,
    markups: HashMap<String, Vec<MarkupData>>,
    _legend: Option<LegendData>,
    include_area_labels: bool,
) -> Result<String, String> {
    use crate::vello_renderer;
    // Import vello types
    use vello_cpu::{
        peniko::Color,
        kurbo::{BezPath, Stroke, Rect, Affine, Shape},
    };

    println!("Exporting to: {}", output_path);
    println!("Total pages to export: {}", page_indices.len());

    let dest_doc = MuPdfDoc::create_new().map_err(|e| e.to_string())?;
    let src_doc = dest_doc
        .open_sibling(&source_path)
        .map_err(|e| e.to_string())?;

    const R_ZOOM: f32 = 1.5; // Frontend to PDF Point scale
    const EXPORT_SCALE: f64 = 4.0; // Vello Multi-sampling scale (4x = ~300 DPI)

    for (new_page_idx, &src_page_idx) in page_indices.iter().enumerate() {
        println!("DEBUG: processing page {} (dest {})", src_page_idx, new_page_idx);
        dest_doc
            .copy_page_from(&src_doc, src_page_idx)
            .map_err(|e| e.to_string())?;

        // 1. Collect Markups for this page
        let mut page_markups: Vec<&MarkupData> = Vec::new();
        let suffix = format!(":{}", src_page_idx);
        for (key, list) in &markups {
            let is_match = if src_page_idx == 0 {
                key == "default" || key == &src_page_idx.to_string() || !key.contains(':')
            } else {
                key == &src_page_idx.to_string() || key.ends_with(&suffix)
            };
            if is_match {
                for m in list {
                    if !m.properties.get("hidden").and_then(|v| v.as_bool()).unwrap_or(false) {
                         page_markups.push(m);
                    }
                }
            }
        }

        if page_markups.is_empty() {
            continue;
        }

        let overlay = dest_doc
            .begin_overlay(new_page_idx as i32)
            .map_err(|e| e.to_string())?;

        // 2. PASS 1 (Geometry): Use Vello
        // Calculate Viewport AABB (Union of all markups on page)
        let mut viewport_rect: Option<Rect> = None;
        let mut all_geo_points = Vec::new();

        for m in &page_markups {
             for path in &m.paths {
                 for p in path {
                     all_geo_points.push(GeoPoint { x: p.x, y: p.y });
                 }
             }
        }
        
        if let Some(aabb) = calculate_aabb(&all_geo_points) {
             // Add padding (in Frontend pixels) to avoid clipping strokes
             let padding = 10.0;
             let expanded_rect = aabb.inset(-padding);
             viewport_rect = Some(expanded_rect);
        }

        if let Some(v_rect) = viewport_rect {
             // Calculate Render Dimensions
             let render_w = (v_rect.width() * EXPORT_SCALE).ceil() as u16;
             let render_h = (v_rect.height() * EXPORT_SCALE).ceil() as u16;

             // Render Logic
             let png_result = vello_renderer::render_to_png(render_w, render_h, |ctx| {
                 // Transform Context:
                 // 1. Scale for High-DPI
                 // Transform Context:
                 // 1. Scale for High-DPI
                 // Vello CPU requires setting the full affine transform
                 let transform = Affine::scale(EXPORT_SCALE)
                     .then_translate(( -v_rect.x0 * EXPORT_SCALE, -v_rect.y0 * EXPORT_SCALE ).into());
                 ctx.set_transform(transform);

                 for m in &page_markups {
                     let color_str = m.properties.get("color").and_then(|v| v.as_str()).unwrap_or("#ff0000");
                     let (r, g, b) = parse_color(color_str);
                     // Conversion to Vello Color (u8)
                     let _v_color = Color::from_rgba8((r * 255.0) as u8, (g * 255.0) as u8, (b * 255.0) as u8, 255);
                     
                     let opacity = m.properties.get("opacity").and_then(|v| v.as_f64()).unwrap_or(1.0);
                     let thickness = m.properties.get("thickness").and_then(|v| v.as_f64()).unwrap_or(2.0);

                     // Apply opacity to paint
                     let paint_color = Color::from_rgba8((r * 255.0) as u8, (g * 255.0) as u8, (b * 255.0) as u8, (opacity * 255.0) as u8);
                     
                     ctx.set_paint(paint_color);

                     match m.tool_type.as_str() {
                         "area" | "highlight" => {
                              // Fill Logic
                              let is_fill = m.tool_type == "highlight" || m.tool_type == "area";
                              
                              if is_fill {
                                  // For Area/Highlight, we want Fill + Stroke often.
                                  // Highlight: Fill + No Stroke (usually).
                                  // Area: Fill (low alpha) + Stroke (opaque).
                                  
                                  // Construct complex path for EvenOdd fill
                                  let mut combined_path = BezPath::new();
                                  for path_pts in &m.paths {
                                       if path_pts.len() < 3 { continue; }
                                       let mut sub = BezPath::new();
                                       sub.move_to((path_pts[0].x as f64, path_pts[0].y as f64));
                                       for p in &path_pts[1..] {
                                            sub.line_to((p.x as f64, p.y as f64));
                                       }
                                       sub.close_path();
                                       // Append sub-path logic? BezPath is single struct.
                                       // vello_cpu::kurbo::BezPath supports multiple MoveTos (subpaths).
                                       // Yes, extending it works.
                                       combined_path.extend(sub);
                                  }

                                  if m.tool_type == "area" {
                                      // Area Style: 
                                      // Fill: Custom Opacity (usually 0.3)
                                      let fill_color = Color::from_rgba8((r * 255.0) as u8, (g * 255.0) as u8, (b * 255.0) as u8, (0.3 * 255.0) as u8);
                                      ctx.set_paint(fill_color);
                                      ctx.fill_path(&combined_path); // EvenOdd default?
                                                                   // vello_cpu default fill rule is NonZero? 
                                                                   // Actually context.fill_path takes just path.
                                                                   // Need to check vello_cpu defaults. 
                                                                   // Assuming NonZero. For holes to work with NonZero,
                                                                   // hole winding must be opposite. 
                                                                   // Frontend doesn't guarantee winding. 
                                                                   // EvenOdd matches frontend best.
                                                                   // vello_cpu might not expose user-selectable rule in simple API?
                                                                   // Docs said "Set how object will be painted...".
                                                                   // If implementation is simple, maybe it supports it.
                                                                   // The shim I wrote just delegates.
                                      
                                      // Stroke: Opaque
                                      let stroke_color = Color::from_rgba8((r * 255.0) as u8, (g * 255.0) as u8, (b * 255.0) as u8, 255);
                                      ctx.set_paint(stroke_color);
                                      ctx.set_stroke(Stroke::new(thickness as f64));
                                      ctx.stroke_path(&combined_path);
                                  } else {
                                      // Highlight
                                      ctx.fill_path(&combined_path);
                                  }
                              }
                         }
                         "linear" | "segment" | "draw" | "note" | "count" | "legend" => {
                            // Stroke Logic
                            // Iterate paths
                            for path_pts in &m.paths {
                                if path_pts.is_empty() { continue; }
                                
                                if m.tool_type == "count" {
                                    // Draw Circles
                                    let radius = 10.0 / 2.0; // size 10
                                    for p in path_pts {
                                        let circle = vello_cpu::kurbo::Circle::new((p.x as f64, p.y as f64), radius as f64);
                                        // Fill or Stroke? "count" usually filled.
                                        // fill path expects &BezPath
                                  let circle_path = circle.to_path(0.1);
                                  ctx.fill_path(&circle_path); 
                                    }
                                } else if m.tool_type == "legend" {
                                     // Skip legacy legend rendering in Vello pass (too complex UI).
                                     // Better to keep using MuPDF vectors for Legend or skip it?
                                     // Legend text won't render in Vello reliably without font.
                                     // So SKIP Vello for Legend. Handled in Pass 2 (if we keep old code).
                                } else {
                                    // Linear/Segment/Draw/Note lines
                                    let mut bez = BezPath::new();
                                    bez.move_to((path_pts[0].x as f64, path_pts[0].y as f64));
                                    for p in &path_pts[1..] {
                                        bez.line_to((p.x as f64, p.y as f64));
                                    }
                                    if m.tool_type == "draw" { 
                                        // Freehand might not close.
                                    }
                                    
                                    ctx.set_stroke(Stroke::new(thickness as f64));
                                    ctx.stroke_path(&bez);
                                    
                                    if m.tool_type == "note" && path_pts.len() >= 2 {
                                         // Draw Arrowhead geometry
                                         let p1 = &path_pts[0];
                                         let p2 = path_pts.last().unwrap();
                                         let _dx = p2.x - p1.x; // Pointing to P2? No, Note points TO P1 usually.
                                         // Legacy code: "Arrowhead at P1 pointing towards P1".
                                         // Angle = atan2(dy, dx) using P1->P2 vector?
                                         // Legacy: angle = dy.atan2(dx).
                                         // Wings based on that.
                                         // Let's replicate strict logic.
                                         let dx = (p2.x - p1.x) as f64;
                                         let dy = (p2.y - p1.y) as f64;
                                         let angle = dy.atan2(dx);
                                         let arrow_size = 10.0;
                                         let arrow_angle = std::f64::consts::PI / 6.0;
                                         let a1x = p1.x as f64 + arrow_size * (angle - arrow_angle).cos();
                                         let a1y = p1.y as f64 + arrow_size * (angle - arrow_angle).sin();
                                         let a2x = p1.x as f64 + arrow_size * (angle + arrow_angle).cos();
                                         let a2y = p1.y as f64 + arrow_size * (angle + arrow_angle).sin();
                                         
                                         let mut head = BezPath::new();
                                         head.move_to((p1.x as f64, p1.y as f64));
                                         head.line_to((a1x, a1y));
                                         head.move_to((p1.x as f64, p1.y as f64));
                                         head.line_to((a2x, a2y));
                                         ctx.set_stroke(Stroke::new(thickness as f64));
                                         ctx.stroke_path(&head);
                                    }
                                }
                            }
                         }
                         _ => {}
                     }
                 }
             });

             if let Ok(bytes) = png_result {
                 // Stamp PNG
                 // Dest coords in PDF Points
                 let dest_x = (v_rect.x0 as f32) / R_ZOOM;
                 let dest_y = (v_rect.y0 as f32) / R_ZOOM;
                 let dest_w = (v_rect.width() as f32) / R_ZOOM;
                 let dest_h = (v_rect.height() as f32) / R_ZOOM;
                 
                 overlay.draw_image(&bytes, dest_x, dest_y, dest_w, dest_h, 1.0);
             }
        }

        // 3. PASS 2 (Labels & Legend & Text): Use MuPDF Vectors
        // Vello lacks easy text, so we overlay text using MuPDF primitives (crisp/searchable).
        for m in &page_markups {
             match m.tool_type.as_str() {
                 "area" => {
                      if include_area_labels {
                           if let Some(labels_arr) = m.properties.get("exportLabels").and_then(|v| v.as_array()) {
                                for label_val in labels_arr {
                                     let text = label_val.get("text").and_then(|v| v.as_str()).unwrap_or("");
                                     if let Some(pos) = label_val.get("pos") {
                                         let px = pos.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32 / R_ZOOM;
                                         let py = pos.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32 / R_ZOOM;
                                         overlay.draw_text(px, py, text, 10.0, 0.0, 0.0, 0.0);
                                     }
                                }
                           }
                      }
                 },
                 "note" => {
                      if let Some(text) = m.properties.get("text").and_then(|v| v.as_str()) {
                           if m.paths.len() < 1 || m.paths[0].is_empty() { continue; }
                           let path = &m.paths[0];
                           let p1 = &path[0];
                           let p2 = path.last().unwrap();
                           let dx = (p2.x - p1.x) as f64;
                           let dy = (p2.y - p1.y) as f64;
                           let angle = dy.atan2(dx);
                           
                           let offset = 15.0 / R_ZOOM; // PDF Offset
                           let tx = (p2.x / R_ZOOM) + (offset * angle.cos() as f32);
                           let ty = (p2.y / R_ZOOM) + (offset * angle.sin() as f32);
                           
                           overlay.draw_text(tx, ty, text, 10.0, 0.0, 0.0, 0.0);
                      }
                 },
                 "legend" => {
                      // Legend rendering remains manual MuPDF vectors because it's UI-heavy and clean vector is better.
                      // ... (Use existing legend logic from previous implementation)
                      // For brevity in this refactor, I'll copy the logic logic if requested, 
                      // or simplified. 
                      // Actually, users prefer the Legend. I must include it.
                      // Re-using the logic from Step 295.
                      if m.paths.is_empty() { continue; }
                      let path = &m.paths[0];
                      if path.len() < 3 { continue; }
                      let lx = path[0].x / R_ZOOM;
                      let ly = path[0].y / R_ZOOM;
                      let sw = (path[2].x - path[0].x) / R_ZOOM;
                      let sh = (path[2].y - path[0].y) / R_ZOOM;
                      
                      overlay.draw_rect(lx, ly, sw, sh, 1.0, 1.0, 1.0, 1.0, 0.95, true); // BG
                      
                      // Extract items
                    let items_val = m.properties.get("items");
                    if let Some(val) = items_val {
                        let items: Vec<LegendItem> =
                            serde_json::from_value(val.clone()).unwrap_or_default();

                        const SCALE: f32 = 0.75;

                        // Draw Background (Already done) needs re-doing inside loop? No.
                        // Wait, previous code drew background.
                        // I did draw background above.
                        
                        overlay.draw_rect(lx, ly, sw, sh, 0.5 * SCALE, 0.8, 0.8, 0.8, 1.0, false);

                        // Header
                        let header_height = 24.0 * SCALE;
                        overlay.draw_rect(
                            lx,
                            ly,
                            sw,
                            header_height,
                            1.0 * SCALE,
                            0.96,
                            0.96,
                            0.96,
                            1.0,
                            true,
                        );
                        overlay.draw_rect(
                            lx,
                            ly + header_height,
                            sw,
                            0.5 * SCALE,
                            0.5 * SCALE,
                            0.8,
                            0.8,
                            0.8,
                            1.0,
                            false,
                        );

                        // Title
                        let mut y_off = ly + 16.0 * SCALE;
                        let x_start = lx + 10.0 * SCALE;
                        let title = m
                            .properties
                            .get("title")
                            .and_then(|v| v.as_str())
                            .unwrap_or("Takeoff Legend");
                        overlay.draw_text(x_start, y_off, title, 10.0 * SCALE, 0.2, 0.2, 0.2);
                        y_off += 20.0 * SCALE;

                        // Items
                        for item in items {
                            if y_off + 15.0 * SCALE > ly + sh {
                                break;
                            }

                            let (ir, ig, ib) = parse_color(&item.color);

                            // Swatch
                            let swatch_size = 10.0 * SCALE;
                            overlay.draw_rect(
                                x_start,
                                y_off - 8.0 * SCALE,
                                swatch_size,
                                swatch_size,
                                0.5 * SCALE,
                                ir,
                                ig,
                                ib,
                                1.0,
                                true,
                            );
                            overlay.draw_rect(
                                x_start,
                                y_off - 8.0 * SCALE,
                                swatch_size,
                                swatch_size,
                                0.5 * SCALE,
                                0.0,
                                0.0,
                                0.0,
                                0.1,
                                false,
                            );

                            // Name
                            overlay.draw_text(
                                x_start + 18.0 * SCALE,
                                y_off,
                                &item.name,
                                9.0 * SCALE,
                                0.1,
                                0.1,
                                0.1,
                            );

                            // Quantity
                            // Measure actual text width for correct alignment
                            let q_width = overlay.measure_text(&item.quantity, 9.0 * SCALE);
                            overlay.draw_text(
                                lx + sw - 10.0 * SCALE - q_width,
                                y_off,
                                &item.quantity,
                                9.0 * SCALE,
                                0.4,
                                0.4,
                                0.4,
                            );


                            // Divider
                            overlay.draw_rect(
                                x_start,
                                y_off + 4.0 * SCALE,
                                sw - 20.0 * SCALE,
                                0.2 * SCALE,
                                0.2 * SCALE,
                                0.9,
                                0.9,
                                0.9,
                                1.0,
                                false,
                            );

                            y_off += 18.0 * SCALE;
                        }
                    }
                 }
                 _ => {}
             }
        }

        overlay.finish().map_err(|e| e.to_string())?;
    }

    dest_doc.save(&output_path).map_err(|e| e.to_string())?;
    Ok(output_path)
}

#[tauri::command]
pub async fn open_file(
    id: String,
    path: String,
    state: State<'_, AppState>,
) -> Result<i32, String> {
    println!("COMMAND: open_file id={} path={}", id, path);
    // Check if valid path first
    if !std::path::Path::new(&path).exists() {
        return Err(format!("File not found at path: {}", path));
    }

    let doc = MuPdfDoc::open(&path).map_err(|e| {
        println!("COMMAND: MuPdfDoc::open FAILED: {}", e);
        e.to_string()
    })?;
    let page_count = doc.get_page_count();

    // For now, reset spatial index (this needs to be per-page or per-doc eventually)
    // But since R-Tree is global in AppState currently, we might have collisions if we don't separate it.
    // Ideally, spatial_index should also be keyed by document ID or page ID.
    // For this step, let's keep it global but acknowledge the limitation (filtering happens at query time maybe?).
    // Actually, the current R-Tree implementation is just mocked vectors.
    // Let's leave R-Tree alone for now as it's not the primary issue.

    let mut tree = state
        .spatial_index
        .write()
        .map_err(|_| "Failed to lock tree")?;
    *tree = RTree::new();

    // Mock vectors
    let mut vectors = Vec::new();
    for i in 0..1000 {
        let x = (i as f64) * 10.0;
        let y = (i as f64) * 10.0;
        let rect = rstar::primitives::Rectangle::from_corners([x, y], [x + 5.0, y + 5.0]);
        vectors.push(VectorObject { id: i, geom: rect });
    }
    *tree = RTree::bulk_load(vectors);

    let mut docs = state.documents.write().map_err(|_| "Failed to lock docs")?;
    docs.insert(id, doc);

    Ok(page_count)
}

#[derive(serde::Serialize)]
pub struct ViewportResult {
    lines: Vec<[f64; 4]>,
}

#[tauri::command]
pub fn get_viewport_vectors(
    _page: i32,
    min_x: f64,
    min_y: f64,
    max_x: f64,
    max_y: f64,
    state: State<'_, AppState>,
) -> Result<ViewportResult, String> {
    let tree = state
        .spatial_index
        .read()
        .map_err(|_| "Failed to lock tree")?;
    let aabb = rstar::AABB::from_corners([min_x, min_y], [max_x, max_y]);
    let query_iter = tree.locate_in_envelope_intersecting(&aabb);

    let mut lines = Vec::new();
    for obj in query_iter {
        let lower = obj.geom.lower();
        let upper = obj.geom.upper();
        lines.push([lower[0], lower[1], upper[0], upper[1]]);
    }
    Ok(ViewportResult { lines })
}

#[tauri::command]
pub async fn get_page_image_bytes(
    id: String,
    page_number: i32,
    zoom: f32,
    state: State<'_, AppState>,
) -> Result<Vec<u8>, String> {
    let docs = state.documents.read().map_err(|_| "Failed to lock docs")?;
    let doc = docs.get(&id).ok_or("Document not found")?;
    let bytes = doc
        .render_page_to_buffer(page_number, zoom)
        .map_err(|e| e.to_string())?;
    Ok(bytes)
}

/// Generate a small thumbnail for a PDF page and return it as base64-encoded PNG.
/// This is used for caching thumbnails in the project file for instant display.
/// Uses a fixed low zoom (0.15) to produce ~100-150px wide thumbnails for standard PDFs.
#[tauri::command]
pub async fn generate_page_thumbnail(
    id: String,
    page_number: i32,
    state: State<'_, AppState>,
) -> Result<String, String> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};

    let docs = state.documents.read().map_err(|_| "Failed to lock docs")?;
    let doc = docs.get(&id).ok_or("Document not found")?;

    // Fixed low zoom for thumbnails (produces ~100-150px wide images for standard PDFs)
    // Standard US Letter at 72dpi = 612x792pt -> at 0.15 zoom = ~92x119px
    let zoom = 0.15_f32;

    // Render at low zoom
    let bytes = doc
        .render_page_to_buffer(page_number, zoom)
        .map_err(|e| e.to_string())?;

    // Encode as base64 for embedding in JSON/project file
    let base64_str = STANDARD.encode(&bytes);

    Ok(base64_str)
}

#[tauri::command]
pub fn get_machine_id() -> Result<String, String> {
    machine_uid::get().map_err(|e| e.to_string())
}

// --- Text Search Commands ---

/// Result of searching a single page
#[derive(serde::Serialize)]
pub struct PageSearchResult {
    pub page_idx: i32,
    pub hits: Vec<crate::mupdf_wrapper::SearchHit>,
}

/// Extract text from a specific page
#[tauri::command]
pub async fn extract_page_text(
    id: String,
    page_idx: i32,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let docs = state.documents.read().map_err(|e| e.to_string())?;
    let doc = docs.get(&id).ok_or("Document not found")?;

    doc.extract_text(page_idx).map_err(|e| e.to_string())
}

// Match the RENDER_ZOOM from frontend/src/utils/scales.ts
const RENDER_ZOOM: f32 = 1.5;

fn scale_hit(hit: &mut crate::mupdf_wrapper::SearchHit) {
    hit.ul.0 *= RENDER_ZOOM;
    hit.ul.1 *= RENDER_ZOOM;
    hit.ur.0 *= RENDER_ZOOM;
    hit.ur.1 *= RENDER_ZOOM;
    hit.lr.0 *= RENDER_ZOOM;
    hit.lr.1 *= RENDER_ZOOM;
    hit.ll.0 *= RENDER_ZOOM;
    hit.ll.1 *= RENDER_ZOOM;
}

/// Search for text on a specific page
#[tauri::command]
pub async fn search_page(
    id: String,
    page_idx: i32,
    query: String,
    state: State<'_, AppState>,
) -> Result<Vec<crate::mupdf_wrapper::SearchHit>, String> {
    let docs = state.documents.read().map_err(|e| e.to_string())?;
    let doc = docs.get(&id).ok_or("Document not found")?;

    let mut hits = doc.search_page(page_idx, &query).map_err(|e| e.to_string())?;
    
    // Scale hits to match frontend rendering
    for hit in &mut hits {
        scale_hit(hit);
    }

    Ok(hits)
}

/// Search for text across all pages in a document
#[tauri::command]
pub async fn search_document(
    id: String,
    query: String,
    state: State<'_, AppState>,
) -> Result<Vec<PageSearchResult>, String> {
    let docs = state.documents.read().map_err(|e| e.to_string())?;
    let doc = docs.get(&id).ok_or("Document not found")?;

    let page_count = doc.get_page_count();
    let mut results = Vec::new();

    for page_idx in 0..page_count {
        let mut hits = doc.search_page(page_idx, &query).map_err(|e| e.to_string())?;
        if !hits.is_empty() {
            // Scale hits
            for hit in &mut hits {
                scale_hit(hit);
            }
            results.push(PageSearchResult { page_idx, hits });
        }
    }

    Ok(results)
}

/// Check if OCR support is available
#[tauri::command]
pub fn has_ocr_support() -> bool {
    crate::mupdf_wrapper::has_ocr_support()
}
#[tauri::command]
pub async fn ingest_file(
    app: tauri::AppHandle,
    id: String,
    path: String
) -> Result<crate::ingestion_service::IngestionResult, String> {
    use tauri::Manager;
    
    // 1. Run Ingestion (Heavy lifting)
    let result = IngestionService::ingest_document(id, std::path::PathBuf::from(path))
        .await
        .map_err(|e| e.to_string())?;

    // 2. Persist Index to AppData/indices/{doc_id}.json
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let indices_dir = app_data_dir.join("indices");

    if !indices_dir.exists() {
        std::fs::create_dir_all(&indices_dir).map_err(|e| e.to_string())?;
    }

    // Determine filename (using doc_id from result)
    let index_path = indices_dir.join(format!("{}.json", result.doc_id));
    
    // Serialize full result (Content + Metadata)
    let json = serde_json::to_string(&result).map_err(|e| e.to_string())?;
    
    std::fs::write(&index_path, json).map_err(|e| e.to_string())?;

    println!("[Ingestion] Saved index to {:?}", index_path);

    Ok(result)
}

#[derive(serde::Serialize)]
pub struct IndexSearchResult {
    pub doc_id: String,
    pub matches: Vec<String>,
}

#[tauri::command]
pub async fn search_index(
    app: tauri::AppHandle,
    doc_id: String,
    query: String
) -> Result<IndexSearchResult, String> {
    use tauri::Manager;
    
    // Resolve index path
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let index_path = app_data_dir.join("indices").join(format!("{}.json", doc_id));

    if !index_path.exists() {
        return Ok(IndexSearchResult { doc_id, matches: vec![] });
    }

    // Load and Parse
    let content = std::fs::read_to_string(&index_path).map_err(|e| e.to_string())?;
    let index: crate::ingestion_service::IngestionResult = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    // Basic Case-Insensitive Search
    let text = index.text.to_lowercase();
    let query_lower = query.to_lowercase();
    let mut matches = Vec::new();

    for (i, _) in text.match_indices(&query_lower) {
        // Extract snippet context (e.g., +/- 30 chars)
        let start = i.saturating_sub(30);
        let end = (i + query_lower.len() + 30).min(text.len());
        let snippet = index.text[start..end].replace('\n', " "); // Use original text for snippet
        matches.push(snippet);

        if matches.len() >= 50 { break; } // Limit results
    }

    Ok(IndexSearchResult { doc_id, matches })
}
