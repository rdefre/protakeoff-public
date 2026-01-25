#include "mupdf_bridge.h"
#include <mupdf/fitz.h>
#include <mupdf/pdf.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

struct mupdf_bridge_context {
    fz_context *ctx;
};

struct mupdf_bridge_document {
    fz_document *doc;
};

struct mupdf_overlay_context {
    fz_device *dev;
    fz_buffer *buf;
    pdf_document *doc;
    pdf_obj *resources;
    int page_idx;
    fz_font *helvetica; // Keep a reference to the font
};

// --- Existing Context Functions ---

mupdf_bridge_context *mupdf_new_context(void) {
    // FZ_STORE_DEFAULT allows the context to cache fonts, etc.
    fz_context *ctx = fz_new_context(NULL, NULL, FZ_STORE_DEFAULT);
    if (!ctx) return NULL;
    fz_register_document_handlers(ctx);
    mupdf_bridge_context *bctx = (mupdf_bridge_context *)malloc(sizeof(mupdf_bridge_context));
    bctx->ctx = ctx;
    return bctx;
}

void mupdf_drop_context(mupdf_bridge_context *ctx) {
    if (ctx) {
        fz_drop_context(ctx->ctx);
        free(ctx);
    }
}

// --- Document Functions ---

mupdf_bridge_document *mupdf_open_document(mupdf_bridge_context *ctx, const char *path, int *error_code) {
    fz_document *doc = NULL;
    mupdf_bridge_document *bdoc = NULL;
    
    fz_var(doc);
    fz_try(ctx->ctx) {
        doc = fz_open_document(ctx->ctx, path);
        bdoc = (mupdf_bridge_document *)malloc(sizeof(mupdf_bridge_document));
        bdoc->doc = doc;
        *error_code = MUPDF_SUCCESS;
    }
    fz_catch(ctx->ctx) {
        if (doc) fz_drop_document(ctx->ctx, doc);
        *error_code = MUPDF_ERROR_OPEN;
        return NULL;
    }
    return bdoc;
}

void mupdf_drop_document(mupdf_bridge_context *ctx, mupdf_bridge_document *doc) {
    if (doc) {
        fz_drop_document(ctx->ctx, doc->doc);
        free(doc);
    }
}

int mupdf_get_page_count(mupdf_bridge_context *ctx, mupdf_bridge_document *doc) {
    if (!doc || !doc->doc) return 0;
    int count = 0;
    fz_try(ctx->ctx) {
        count = fz_count_pages(ctx->ctx, doc->doc);
    }
    fz_catch(ctx->ctx) {
        count = 0;
    }
    return count;
}

uint8_t *mupdf_render_page_to_png(mupdf_bridge_context *ctx, mupdf_bridge_document *doc, int page_number, float zoom, int *out_size, int *error_code) {
    fz_pixmap *pix = NULL;
    fz_buffer *buf = NULL;
    uint8_t *result = NULL;

    fz_var(pix);
    fz_var(buf);

    fz_try(ctx->ctx) {
        fz_matrix ctm = fz_scale(zoom, zoom);
        pix = fz_new_pixmap_from_page_number(ctx->ctx, doc->doc, page_number, ctm, fz_device_rgb(ctx->ctx), 0);
        // Using fz_new_buffer_from_pixmap_as_png (native PNG writer)
        buf = fz_new_buffer_from_pixmap_as_png(ctx->ctx, pix, fz_default_color_params);

        size_t size;
        unsigned char *data;
        size = fz_buffer_storage(ctx->ctx, buf, &data);
        
        result = (uint8_t *)malloc(size);
        memcpy(result, data, size);
        *out_size = (int)size;
        *error_code = MUPDF_SUCCESS;
    }
    fz_always(ctx->ctx) {
        fz_drop_pixmap(ctx->ctx, pix);
        fz_drop_buffer(ctx->ctx, buf);
    }
    fz_catch(ctx->ctx) {
        *error_code = MUPDF_ERROR_RENDER;
        return NULL;
    }
    return result;
}

void mupdf_free_buffer(uint8_t *buffer) {
    if (buffer) free(buffer);
}

// --- PDF Export Implementation ---

mupdf_bridge_document *mupdf_create_pdf(mupdf_bridge_context *ctx, int *error_code) {
    pdf_document *doc = NULL;
    mupdf_bridge_document *bdoc = NULL;
    
    fz_var(doc);
    fz_try(ctx->ctx) {
        doc = pdf_create_document(ctx->ctx);
        bdoc = (mupdf_bridge_document *)malloc(sizeof(mupdf_bridge_document));
        bdoc->doc = (fz_document *)doc; 
        *error_code = MUPDF_SUCCESS;
    }
    fz_catch(ctx->ctx) {
        if (doc) pdf_drop_document(ctx->ctx, doc);
        *error_code = MUPDF_ERROR_CREATE;
        return NULL;
    }
    return bdoc;
}

int mupdf_save_document(mupdf_bridge_context *ctx, mupdf_bridge_document *doc, const char *path) {
    int result = MUPDF_SUCCESS;
    pdf_document *pdf_doc = NULL;
    
    fz_try(ctx->ctx) {
        pdf_doc = pdf_specifics(ctx->ctx, doc->doc);
        if (!pdf_doc) fz_throw(ctx->ctx, FZ_ERROR_GENERIC, "Not a PDF document");

        pdf_write_options opts = pdf_default_write_options;
        opts.do_compress = 1;
        // do_incremental = 0 usually ensures a full rewrite (cleaner for new docs)
        // opts.do_incremental = 0; 
        pdf_save_document(ctx->ctx, pdf_doc, path, &opts);
    }
    fz_catch(ctx->ctx) {
        printf("ERROR in mupdf_save_document: %s\n", fz_caught_message(ctx->ctx));
        result = MUPDF_ERROR_SAVE;
    }
    return result;
}

int mupdf_copy_page(mupdf_bridge_context *ctx, mupdf_bridge_document *dest_doc, mupdf_bridge_document *src_doc, int src_page_idx, int *error_code) {
    pdf_document *pdf_dest = NULL;
    pdf_document *pdf_src = NULL;
    
    fz_try(ctx->ctx) {
        pdf_dest = pdf_specifics(ctx->ctx, dest_doc->doc);
        pdf_src = pdf_specifics(ctx->ctx, src_doc->doc);
        
        if (!pdf_dest || !pdf_src) fz_throw(ctx->ctx, FZ_ERROR_GENERIC, "Documents must be PDF");

        pdf_graft_page(ctx->ctx, pdf_dest, -1, pdf_src, src_page_idx);
        *error_code = MUPDF_SUCCESS;
    }
    fz_catch(ctx->ctx) {
        *error_code = MUPDF_ERROR_INTERNAL;
        return 0; // Failure
    }
    return 1; // Success
}

// --- Overlay ---

mupdf_overlay_context *mupdf_begin_overlay(mupdf_bridge_context *ctx, mupdf_bridge_document *doc, int page_idx, int *error_code) {
    mupdf_overlay_context *overlay = NULL;
    pdf_document *pdf_doc = NULL;
    
    fz_var(overlay);
   // fz_var(pdf_doc); // pointers generally safe but good practice if mixed with complex control flow

    fz_try(ctx->ctx) {
        pdf_doc = pdf_specifics(ctx->ctx, doc->doc);
        if (!pdf_doc) fz_throw(ctx->ctx, FZ_ERROR_GENERIC, "Not a PDF");

        overlay = (mupdf_overlay_context *)malloc(sizeof(mupdf_overlay_context));
        memset(overlay, 0, sizeof(mupdf_overlay_context));
        overlay->doc = pdf_doc;
        overlay->page_idx = page_idx;

        // Create buffer for content stream
        overlay->buf = fz_new_buffer(ctx->ctx, 0);
        
        // Create resources dict
        overlay->resources = pdf_new_dict(ctx->ctx, pdf_doc, 1);
        
        // --- Font Loading ---
        // Try multiple methods to get a basic font
        fz_try(ctx->ctx) {
             // 1. Try standard Base14 font (most reliable for simple text)
             // Use "Helvetica" explicitly.
             overlay->helvetica = fz_new_base14_font(ctx->ctx, "Helvetica");
        }
        fz_catch(ctx->ctx) {
             printf("WARN: fz_new_base14_font(Helvetica) failed: %s\n", fz_caught_message(ctx->ctx));
             overlay->helvetica = NULL;
        }

        if (!overlay->helvetica) {
             // 2. Fallback to builtin font if available
             fz_try(ctx->ctx) {
                  // Some versions use "Ti" or "Times-Roman" or just NULL for default
                  // const char *font_name = "Helvetica"; 
                  // const unsigned char *data;
                  // int len;
                  // Look up builtin font data directly if exposed? NO, use wrapper.
                  // fz_lookup_builtin_font(font_name, &data, &len);
                  // fz_new_font_from_memory...
                  // Let's try simpler:
                  overlay->helvetica = fz_new_base14_font(ctx->ctx, "Times-Roman");
             }
             fz_catch(ctx->ctx) {
                  printf("WARN: Fallback font failed: %s\n", fz_caught_message(ctx->ctx));
             }
        }
        
        if (overlay->helvetica) {
             printf("DEBUG: Font loaded successfully.\n");
        } else {
             printf("ERROR: NO FONT LOADED. Text will not render.\n");
        }


        // Coordinate Space setup
        // We want to draw in coordinates that match the visual page (Top-Left 0,0)
        // PDF pages can be rotated or have cropboxes.
        
        pdf_page *page = pdf_load_page(ctx->ctx, pdf_doc, page_idx);
        fz_matrix page_ctm;
        fz_rect mediabox;
        
        // This calculates the matrix that maps PDF Rect to a canonical View Rect (0,0 at top-left, scaled)
        // But what 'zoom' level? Usually fit-to-width or similar. `pdf_page_transform` uses zoom-agnostic logic (pixels?)
        // Actually `pdf_page_transform` produces the matrix to draw into the mediabox dimensions properly rotated.
        pdf_page_transform(ctx->ctx, page, &mediabox, &page_ctm);
        
        // printf("DEBUG: Page CTM: [%g %g %g %g %g %g]\n", page_ctm.a, page_ctm.b, page_ctm.c, page_ctm.d, page_ctm.e, page_ctm.f);
        
        pdf_drop_page(ctx->ctx, page);

        // We want our "User Space" inputs (which align with the visible view) to map TO the PDF space.
        // So we apply the Inverse of the Page Transform.
        fz_matrix inv_ctm = fz_invert_matrix(page_ctm);

        // Begin Device
        // Note: pdf_new_pdf_device writes operators. Passing a matrix here sets the Initial CTM for the content stream.
        // So 'inv_ctm' will be applied to all coordinates we issue.
        // 
        // Example: If we draw at (10,10) in User Space.
        // The stream will contain operators transformed by inv_ctm? 
        // OR the stream will contain `cm` operator at start?
        // `pdf_new_pdf_device` typically adds a `cm` operator if matrix is provided.
        // So: EffectiveCoord = DrawnCoord * Matrix.
        // EffectiveCoord (PDF Space) = DrawnCoord (User Space) * InvCTM.
        // Then Viewer renders: ScreenCoord = EffectiveCoord * PageCTM
        // ScreenCoord = (DrawnCoord * InvCTM) * PageCTM = DrawnCoord * Identity.
        // This confirms our logic is correct for coordinate mapping.
        
        overlay->dev = pdf_new_pdf_device(ctx->ctx, pdf_doc, inv_ctm, overlay->resources, overlay->buf);
        
        *error_code = MUPDF_SUCCESS;
    }
    fz_catch(ctx->ctx) {
        if (overlay) {
             fz_drop_buffer(ctx->ctx, overlay->buf);
             pdf_drop_obj(ctx->ctx, overlay->resources);
             free(overlay);
        }
        *error_code = MUPDF_ERROR_INTERNAL;
        return NULL;
    }
    return overlay;
}

int mupdf_end_overlay(mupdf_bridge_context *ctx, mupdf_overlay_context *overlay) {
    if (!overlay) return 0;
    
    fz_try(ctx->ctx) {
        // Finish device usage
        fz_close_device(ctx->ctx, overlay->dev);
        fz_drop_device(ctx->ctx, overlay->dev);
        overlay->dev = NULL;

        // Create stream object for our new content
        // pdf_add_stream usually compresses and inserts into doc structure
        // Returns a pointer that shouldn't be dropped? Need to check semantics.
        // usually: returns text of stream or object?
        // Actually pdf_add_stream returns `pdf_obj*` (reference).
        // It consumes the buffer?? No, it reads from it.
        pdf_obj *stream_obj = pdf_add_stream(ctx->ctx, overlay->doc, overlay->buf, overlay->resources, 0);

        // Get the page object
        pdf_obj *page_obj = pdf_lookup_page_obj(ctx->ctx, overlay->doc, overlay->page_idx);
        if (!page_obj) fz_throw(ctx->ctx, FZ_ERROR_GENERIC, "Page missing");

        // --- Merge Resources ---
        // This ensures fonts/images used in overlay are available to page
        pdf_obj *page_res = pdf_dict_get(ctx->ctx, page_obj, PDF_NAME(Resources));
        if (!page_res) {
            page_res = pdf_new_dict(ctx->ctx, overlay->doc, 2);
            pdf_dict_put_drop(ctx->ctx, page_obj, PDF_NAME(Resources), page_res);
        }
        
        int n = pdf_dict_len(ctx->ctx, overlay->resources);
        for (int i = 0; i < n; i++) {
            pdf_obj *key = pdf_dict_get_key(ctx->ctx, overlay->resources, i);
            pdf_obj *val = pdf_dict_get_val(ctx->ctx, overlay->resources, i);
            
            // If resource category (e.g. /Font) exists, merge inner
            pdf_obj *target_cat = pdf_dict_get(ctx->ctx, page_res, key);
            if (target_cat && pdf_is_dict(ctx->ctx, target_cat) && pdf_is_dict(ctx->ctx, val)) {
                int m = pdf_dict_len(ctx->ctx, val);
                for (int j = 0; j < m; j++) {
                     pdf_obj *res_name = pdf_dict_get_key(ctx->ctx, val, j);
                     pdf_obj *res_ref = pdf_dict_get_val(ctx->ctx, val, j);
                     // Only add if not present (collide?) or just overwrite
                     pdf_dict_put(ctx->ctx, target_cat, res_name, res_ref);
                }
            } else {
                // Category doesn't exist, just add it (shallow copy of dict is fine? val is ref)
                // BUT we need to be careful not to overwrite existing category if it was somehow not dict?
                // Probably safe to just PUT if missing.
                if (!target_cat) {
                    pdf_dict_put(ctx->ctx, page_res, key, val);
                }
            }
        }

        // --- Append Contents ---
        pdf_obj *contents = pdf_dict_get(ctx->ctx, page_obj, PDF_NAME(Contents));
        if (!contents) {
            pdf_dict_put(ctx->ctx, page_obj, PDF_NAME(Contents), stream_obj);
        } else if (pdf_is_array(ctx->ctx, contents)) {
            pdf_array_push(ctx->ctx, contents, stream_obj);
        } else {
            pdf_obj *arr = pdf_new_array(ctx->ctx, overlay->doc, 2);
            pdf_array_push(ctx->ctx, arr, contents);
            pdf_array_push(ctx->ctx, arr, stream_obj);
            pdf_dict_put_drop(ctx->ctx, page_obj, PDF_NAME(Contents), arr);
        }
        
        pdf_drop_obj(ctx->ctx, stream_obj);
    }
    fz_always(ctx->ctx) {
        fz_drop_buffer(ctx->ctx, overlay->buf);
        pdf_drop_obj(ctx->ctx, overlay->resources);
        if (overlay->dev) fz_drop_device(ctx->ctx, overlay->dev);
        if (overlay->helvetica) fz_drop_font(ctx->ctx, overlay->helvetica);
        free(overlay);
    }
    fz_catch(ctx->ctx) {
        return MUPDF_ERROR_INTERNAL;
    }
    return MUPDF_SUCCESS;
}

// --- Draw Helpers ---

int mupdf_overlay_draw_line(mupdf_bridge_context *ctx, mupdf_overlay_context *overlay, float x1, float y1, float x2, float y2, float thickness, float r, float g, float b, float a) {
    if (!overlay) return 0;
    fz_path *path = NULL;
    fz_try(ctx->ctx) {
        path = fz_new_path(ctx->ctx);
        fz_moveto(ctx->ctx, path, x1, y1);
        fz_lineto(ctx->ctx, path, x2, y2);
        
        fz_stroke_state *stroke = fz_new_stroke_state(ctx->ctx);
        stroke->linewidth = thickness;
        
        float color[3] = {r, g, b};
        fz_stroke_path(ctx->ctx, overlay->dev, path, stroke, fz_identity, fz_device_rgb(ctx->ctx), color, a, fz_default_color_params);
        fz_drop_stroke_state(ctx->ctx, stroke);
    }
    fz_always(ctx->ctx) {
        fz_drop_path(ctx->ctx, path);
    }
    fz_catch(ctx->ctx) {
        return MUPDF_ERROR_DRAW;
    }
    return MUPDF_SUCCESS;
}

int mupdf_overlay_draw_rect(mupdf_bridge_context *ctx, mupdf_overlay_context *overlay, float x, float y, float w, float h, float thickness, float r, float g, float b, float a, int fill) {
    if (!overlay) return 0;
    fz_path *path = NULL;
    fz_try(ctx->ctx) {
        path = fz_new_path(ctx->ctx);
        fz_moveto(ctx->ctx, path, x, y);
        fz_lineto(ctx->ctx, path, x + w, y);
        fz_lineto(ctx->ctx, path, x + w, y + h);
        fz_lineto(ctx->ctx, path, x, y + h);
        fz_closepath(ctx->ctx, path);

        float color[3] = {r, g, b};
        if (fill) {
            fz_fill_path(ctx->ctx, overlay->dev, path, 0, fz_identity, fz_device_rgb(ctx->ctx), color, a, fz_default_color_params);
        } else {
            fz_stroke_state *stroke = fz_new_stroke_state(ctx->ctx);
            stroke->linewidth = thickness;
            fz_stroke_path(ctx->ctx, overlay->dev, path, stroke, fz_identity, fz_device_rgb(ctx->ctx), color, a, fz_default_color_params);
            fz_drop_stroke_state(ctx->ctx, stroke);
        }
    }
    fz_always(ctx->ctx) {
        fz_drop_path(ctx->ctx, path);
    }
    fz_catch(ctx->ctx) {
        return MUPDF_ERROR_DRAW;
    }
    return MUPDF_SUCCESS;
}

int mupdf_overlay_draw_text(mupdf_bridge_context *ctx, mupdf_overlay_context *overlay, float x, float y, const char *text, float font_size, float r, float g, float b) {
    if (!overlay || !text) return MUPDF_SUCCESS;
    if (!overlay->helvetica) {
        // Silent failure if font never loaded, but we logged it in begin_overlay
        return MUPDF_ERROR_DRAW;
    }
    
    fz_text *text_obj = NULL;
    fz_try(ctx->ctx) {
        // TRICKY PART:
        // We are drawing into a device that has init_ctm = inv_ctm.
        // Screen coords: (x,y) is top-left down.
        // Font coords: standard PDF fonts render "Up" from baseline.
        
        // If we just translate(x,y) and scale(size, size):
        // The text will be at X,Y but "Up" will be towards NEGATIVE Y (because of scale?) 
        // No, init_ctm handles coord space.
        
        // Wait, inv_ctm flips Y?
        // Page CTM: PDF(Y-Up) -> Screen(Y-Down). So Page CTM has scale(S, -S).
        // Inv CTM: Screen(Y-Down) -> PDF(Y-Up). So Inv CTM has scale(1/S, -1/S).
        
        // If we draw text with Identity transform in "Screen Space":
        // Base Font vector (0,1) ("Up") -> Transformed by InvCTM -> (0, -1/S) ("Down" in PDF).
        // So visually on a Y-Up PDF page, it points Down. Upside Down.
        // So we need to flip the text LOCALLY so that when InvCTM flips it again, it's Upright.
        
        // So we need `scale(size, -size)`.
        // (0, 1)_local -> (0, -1)_flipped -> (-InvCTM->) -> (0, 1)_pdf. UPRIGHT!
        
        fz_matrix trm = fz_scale(font_size, -font_size);
        fz_matrix pos = fz_translate(x, y);
        fz_matrix final_tm = fz_concat(trm, pos); 

        float color[3] = {r, g, b};
        
        text_obj = fz_new_text(ctx->ctx);
        // fz_show_string expects the font, transform, and text.
        fz_show_string(ctx->ctx, text_obj, overlay->helvetica, final_tm, text, 0, 0, FZ_BIDI_LTR, FZ_LANG_UNSET);
        
        // Fill text (draw it)
        fz_fill_text(ctx->ctx, overlay->dev, text_obj, fz_identity, fz_device_rgb(ctx->ctx), color, 1.0f, fz_default_color_params);
    }
    fz_always(ctx->ctx) {
        if (text_obj) fz_drop_text(ctx->ctx, text_obj);
    }
    fz_catch(ctx->ctx) {
        printf("DEBUG C: Error drawing text '%s': %s\n", text, fz_caught_message(ctx->ctx));
        return MUPDF_ERROR_DRAW;
    }
    return MUPDF_SUCCESS;
}

float mupdf_overlay_measure_text(mupdf_bridge_context *ctx, mupdf_overlay_context *overlay, const char *text, float font_size) {
    if (!overlay || !text || !overlay->helvetica) return 0.0f;
    
    fz_text *text_obj = NULL;
    float width = 0.0f;

    fz_try(ctx->ctx) {
        fz_matrix trm = fz_scale(font_size, -font_size);
        text_obj = fz_new_text(ctx->ctx);
        fz_show_string(ctx->ctx, text_obj, overlay->helvetica, trm, text, 0, 0, FZ_BIDI_LTR, FZ_LANG_UNSET);
        
        fz_rect bounds;
        bounds = fz_bound_text(ctx->ctx, text_obj, NULL, fz_identity);
        width = bounds.x1 - bounds.x0;
    }
    fz_always(ctx->ctx) {
        if (text_obj) fz_drop_text(ctx->ctx, text_obj);
    }
    fz_catch(ctx->ctx) {
        return 0.0f;
    }
    return width;
}

int mupdf_overlay_draw_polygon(mupdf_bridge_context *ctx, mupdf_overlay_context *overlay, float *points, int point_count, float r, float g, float b, float a) {
    if (!overlay || !points || point_count < 3) return MUPDF_SUCCESS;

    fz_path *path = NULL;
    fz_try(ctx->ctx) {
        path = fz_new_path(ctx->ctx);
        
        // Move to first point
        fz_moveto(ctx->ctx, path, points[0], points[1]);
        
        // Line to subsequent points
        for (int i = 1; i < point_count; i++) {
            fz_lineto(ctx->ctx, path, points[i * 2], points[i * 2 + 1]);
        }
        
        // Close the path
        fz_closepath(ctx->ctx, path);

        float color[3] = {r, g, b};
        fz_fill_path(ctx->ctx, overlay->dev, path, 0, fz_identity, fz_device_rgb(ctx->ctx), color, a, fz_default_color_params);
    }
    fz_always(ctx->ctx) {
        fz_drop_path(ctx->ctx, path);
    }
    fz_catch(ctx->ctx) {
        return MUPDF_ERROR_DRAW;
    }
    return MUPDF_SUCCESS;
}

int mupdf_overlay_draw_complex_polygon(mupdf_bridge_context *ctx, mupdf_overlay_context *overlay, float **paths, int *vertex_counts, int path_count, float r, float g, float b, float a) {
    if (!overlay || !paths || !vertex_counts || path_count <= 0) return MUPDF_SUCCESS;

    fz_path *path = NULL;
    fz_try(ctx->ctx) {
        path = fz_new_path(ctx->ctx);
        
        for (int p_idx = 0; p_idx < path_count; p_idx++) {
            float *points = paths[p_idx];
            int v_count = vertex_counts[p_idx];
            if (v_count < 3) continue;

            // Move to first point of sub-path
            fz_moveto(ctx->ctx, path, points[0], points[1]);
            
            // Line to subsequent points
            for (int i = 1; i < v_count; i++) {
                fz_lineto(ctx->ctx, path, points[i * 2], points[i * 2 + 1]);
            }
            
            // Close the sub-path
            fz_closepath(ctx->ctx, path);
        }

        float color[3] = {r, g, b};
        // even_odd = 1 enables the Even-Odd fill rule, which correctly handles subtracting overlapping paths (holes).
        fz_fill_path(ctx->ctx, overlay->dev, path, 1, fz_identity, fz_device_rgb(ctx->ctx), color, a, fz_default_color_params);
    }
    fz_always(ctx->ctx) {
        fz_drop_path(ctx->ctx, path);
    }
    fz_catch(ctx->ctx) {
        return MUPDF_ERROR_DRAW;
    }
    return MUPDF_SUCCESS;
}

// Draws an image (PNG data) onto the overlay.
int mupdf_overlay_draw_image(mupdf_bridge_context *ctx, mupdf_overlay_context *overlay, const unsigned char *png_data, int png_len, float x, float y, float w, float h, float alpha) {
    if (!overlay || !png_data || png_len <= 0) return MUPDF_SUCCESS;

    fz_image *image = NULL;
    fz_buffer *buf = NULL;

    fz_try(ctx->ctx) {
        // Create buffer from PNG data (making a copy to be safe)
        buf = fz_new_buffer_from_copied_data(ctx->ctx, png_data, png_len);
        
        // Create image from buffer (auto-detects PNG)
        image = fz_new_image_from_buffer(ctx->ctx, buf);
        
        // Calculate CTM: Translate(x,y) * Scale(w,h)
        // Note: fz_scale(w,h) scales the unit square to w x h.
        // fz_translate(x,y) moves origin.
        fz_matrix ctm = fz_scale(w, h);
        ctm = fz_concat(ctm, fz_translate(x, y));

        // Draw
        fz_fill_image(ctx->ctx, overlay->dev, image, ctm, alpha, fz_default_color_params);
    }
    fz_always(ctx->ctx) {
        fz_drop_image(ctx->ctx, image);
        fz_drop_buffer(ctx->ctx, buf);
    }
    fz_catch(ctx->ctx) {
        return MUPDF_ERROR_DRAW;
    }
    return MUPDF_SUCCESS;
}

// --- Text Extraction & Search Implementation ---

char* mupdf_extract_page_text(
    mupdf_bridge_context *bridge_ctx,
    mupdf_bridge_document *bridge_doc,
    int page_idx,
    int *out_length
) {
    if (!bridge_ctx || !bridge_doc || !out_length) return NULL;
    
    fz_context *ctx = bridge_ctx->ctx;
    fz_document *doc = bridge_doc->doc;
    char *result = NULL;
    *out_length = 0;
    
    fz_buffer *buf = NULL;
    fz_var(buf);
    
    fz_try(ctx) {
        // Use default stext options for text extraction
        fz_stext_options opts = { 0 };
        
        // Get text buffer directly from page
        buf = fz_new_buffer_from_page_number(ctx, doc, page_idx, &opts);
        
        if (buf) {
            size_t len = 0;
            unsigned char *data = NULL;
            len = fz_buffer_storage(ctx, buf, &data);
            
            if (data && len > 0) {
                result = (char *)malloc(len + 1);
                if (result) {
                    memcpy(result, data, len);
                    result[len] = '\0';
                    *out_length = (int)len;
                }
            }
        }
    }
    fz_always(ctx) {
        fz_drop_buffer(ctx, buf);
    }
    fz_catch(ctx) {
        // Return NULL on error
        if (result) {
            free(result);
            result = NULL;
        }
        *out_length = 0;
    }
    
    return result;
}

void mupdf_free_text(char *text) {
    if (text) free(text);
}

int mupdf_search_page(
    mupdf_bridge_context *bridge_ctx,
    mupdf_bridge_document *bridge_doc,
    int page_idx,
    const char *needle,
    float *out_quads,
    int max_results
) {
    if (!bridge_ctx || !bridge_doc || !needle || !out_quads) return 0;
    
    fz_context *ctx = bridge_ctx->ctx;
    fz_document *doc = bridge_doc->doc;
    int hit_count = 0;
    
    fz_quad *quads = NULL;
    int *marks = NULL;
    fz_var(quads);
    fz_var(marks);
    
    fz_stext_page *text = NULL;
    fz_stext_options opts = { 0 };

    fz_try(ctx) {
        // Allocate quad array
        quads = fz_malloc_array(ctx, max_results, fz_quad);
        marks = fz_malloc_array(ctx, max_results, int);

        // 1. Initial Extraction (Fast, no OCR)
        // Note: fz_new_stext_page_from_page_number is not always available in minimal headers, 
        // using valid fz_new_stext_page_from_page logic:
        // Need to load page first
        fz_page *page = fz_load_page(ctx, doc, page_idx);
        text = fz_new_stext_page_from_page(ctx, page, &opts);
        
        // 2. Check Text Density
        int char_count = 0;
        int visible_char_count = 0;
        for (fz_stext_block *block = text->first_block; block; block = block->next) {
            if (block->type == FZ_STEXT_BLOCK_TEXT) {
                for (fz_stext_line *line = block->u.t.first_line; line; line = line->next) {
                    for (fz_stext_char *ch = line->first_char; ch; ch = ch->next) {
                        char_count++;
                        if (ch->c > 32) visible_char_count++;
                    }
                }
            }
        }

        printf("DEBUG: Page %d Analysis - Total Chars: %d, Visible: %d. OCR Available: %d\n", 
               page_idx, char_count, visible_char_count, mupdf_has_ocr_support());

        // 3. Fallback to OCR if sparse
        // Increased threshold to 100 to catch more 'sparse' but valid looking vector docs
        if (visible_char_count < 100) {
            #ifdef HAVE_TESSERACT
            printf("DEBUG: Low text count (<100). Retrying with OCR for page %d...\n", page_idx);
            fz_drop_stext_page(ctx, text);
            text = NULL;
            
            text = NULL;
            
            // Explicit OCR Device Chain (Since FZ_STEXT_OCR_APPLY is missing/version-dependent)
            fz_rect mediabox;
            mediabox = fz_bound_page(ctx, page);
            
            // OCR usually works better with some scaling? Standard PDF unit is 72dpi. 
            // Tesseract likes 300dpi. So scale ~4.16x?
            // However, fz_new_ocr_device doc says "ctm" is used to get size/resolution.
            // Let's try 1.0 first, or maybe 2.0 for better detection if small text.
            fz_matrix ctm = fz_identity; 
            
            text = fz_new_stext_page(ctx, mediabox);
            if (text) {
                fz_device *text_dev = fz_new_stext_device(ctx, text, &opts);
                fz_device *ocr_dev = NULL;
                
                fz_try(ctx) {
                    ocr_dev = fz_new_ocr_device(ctx, text_dev, ctm, mediabox, 1, NULL, NULL, NULL, NULL);
                    if (ocr_dev) {
                        fz_run_page(ctx, page, ocr_dev, ctm, NULL);
                        fz_close_device(ctx, ocr_dev);
                        fz_close_device(ctx, text_dev); // Fix: Ensure text device is also closed
                    } else {
                        printf("DEBUG: fz_new_ocr_device returned NULL.\n");
                    }
                }
                fz_always(ctx) {
                   if (ocr_dev) fz_drop_device(ctx, ocr_dev);
                   if (text_dev) fz_drop_device(ctx, text_dev);
                }
                fz_catch(ctx) {
                    printf("DEBUG: OCR failed with exception.\n");
                    fz_drop_stext_page(ctx, text);
                    text = NULL;
                }
            }
            
            if (text) {
                 printf("DEBUG: OCR Retry successful. New text block generated.\n");
                 printf("DEBUG-TEXT-START: >>>\n");
                 int limit = 600;
                 for (fz_stext_block *block = text->first_block; block && limit > 0; block = block->next) {
                    if (block->type == FZ_STEXT_BLOCK_TEXT) {
                        for (fz_stext_line *line = block->u.t.first_line; line && limit > 0; line = line->next) {
                            for (fz_stext_char *ch = line->first_char; ch && limit > 0; ch = ch->next) {
                                if (ch->c >= 32 && ch->c < 127) putchar(ch->c);
                                else if (ch->c == '\n') putchar('\n');
                                else putchar('?');
                                limit--;
                            }
                            putchar('\n'); 
                        }
                        putchar('\n');
                    }
                 }
                 printf("<<< DEBUG-TEXT-END\n");
            } else {
                 printf("DEBUG: OCR Retry FAILED (text is null).\n");
            }
            #else
            printf("DEBUG: Low text count detected, but HAVE_TESSERACT is NOT defined. Skipping OCR.\n");
            #endif
        } else {
             printf("DEBUG: Page has sufficient text (%d chars). Skipping OCR.\n", visible_char_count);
        }
        
        fz_drop_page(ctx, page); // Page no longer needed, we have the text

        // 4. Perform Search
        hit_count = fz_search_stext_page(ctx, text, needle, marks, quads, max_results);
        
        // Convert quads
        for (int i = 0; i < hit_count && i < max_results; i++) {
            float *q = out_quads + (i * 8);
            q[0] = quads[i].ul.x; q[1] = quads[i].ul.y;
            q[2] = quads[i].ur.x; q[3] = quads[i].ur.y;
            q[4] = quads[i].lr.x; q[5] = quads[i].lr.y;
            q[6] = quads[i].ll.x; q[7] = quads[i].ll.y;
        }
    }
    fz_always(ctx) {
        fz_drop_stext_page(ctx, text);
        fz_free(ctx, quads);
        fz_free(ctx, marks);
    }
    fz_catch(ctx) {
        hit_count = 0;
    }
    
    return hit_count;
}

int mupdf_has_ocr_support(void) {
    #ifdef HAVE_TESSERACT
    return 1;
    #else
    return 0;
    #endif
}
