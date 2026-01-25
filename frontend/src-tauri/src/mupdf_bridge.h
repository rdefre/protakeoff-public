#ifndef MUPDF_BRIDGE_H
#define MUPDF_BRIDGE_H

#include <stdint.h>

typedef struct mupdf_bridge_context mupdf_bridge_context;
typedef struct mupdf_bridge_document mupdf_bridge_document;
typedef struct mupdf_overlay_context mupdf_overlay_context;

// Result codes
#define MUPDF_SUCCESS 0
#define MUPDF_ERROR_CONTEXT 1
#define MUPDF_ERROR_OPEN 2
#define MUPDF_ERROR_PAGE_COUNT 3
#define MUPDF_ERROR_RENDER 4
#define MUPDF_ERROR_SAVE 5
#define MUPDF_ERROR_DRAW 6
#define MUPDF_ERROR_CREATE 7
#define MUPDF_ERROR_INTERNAL 8

mupdf_bridge_context *mupdf_new_context();
void mupdf_drop_context(mupdf_bridge_context *ctx);

mupdf_bridge_document *mupdf_open_document(mupdf_bridge_context *ctx, const char *path, int *error_code);
void mupdf_drop_document(mupdf_bridge_context *ctx, mupdf_bridge_document *doc);

int mupdf_get_page_count(mupdf_bridge_context *ctx, mupdf_bridge_document *doc);

// Renders a page to PNG and returns the pointer to bytes.
// 'out_size' will contain the length of the PNG buffer.
uint8_t *mupdf_render_page_to_png(mupdf_bridge_context *ctx, mupdf_bridge_document *doc, int page_number, float zoom, int *out_size, int *error_code);

// Must call this to free the PNG buffer returned by mupdf_render_page_to_png
void mupdf_free_buffer(uint8_t *buffer);

// --- PDF Export Functions ---

// Creates a new empty PDF document
mupdf_bridge_document *mupdf_create_pdf(mupdf_bridge_context *ctx, int *error_code);

// Copies a page from src_doc to dest_doc
int mupdf_copy_page(mupdf_bridge_context *ctx, mupdf_bridge_document *dest_doc, mupdf_bridge_document *src_doc, int src_page_idx, int *error_code);

// Saves the document to the specified path
int mupdf_save_document(mupdf_bridge_context *ctx, mupdf_bridge_document *doc, const char *path);

// --- Overlay Drawing (Batch) ---

// Begins an overlay session on a specific page. Returns an opaque context.
// 'src_page_idx' is the page index in 'doc' to draw upon.
mupdf_overlay_context *mupdf_begin_overlay(mupdf_bridge_context *ctx, mupdf_bridge_document *doc, int page_idx, int *error_code);

// Ends the overlay session, applying the drawings to the page.
int mupdf_end_overlay(mupdf_bridge_context *ctx, mupdf_overlay_context *overlay);

// Draw operations on the overlay
int mupdf_overlay_draw_line(mupdf_bridge_context *ctx, mupdf_overlay_context *overlay, float x1, float y1, float x2, float y2, float thickness, float r, float g, float b, float a);

// fill: 1 = fill, 0 = stroke
int mupdf_overlay_draw_rect(mupdf_bridge_context *ctx, mupdf_overlay_context *overlay, float x, float y, float w, float h, float thickness, float r, float g, float b, float a, int fill);

int mupdf_overlay_draw_text(mupdf_bridge_context *ctx, mupdf_overlay_context *overlay, float x, float y, const char *text, float font_size, float r, float g, float b);

// Returns width of text
float mupdf_overlay_measure_text(mupdf_bridge_context *ctx, mupdf_overlay_context *overlay, const char *text, float font_size);

// Draws a filled polygon from an array of points (x0,y0,x1,y1,...)
int mupdf_overlay_draw_polygon(mupdf_bridge_context *ctx, mupdf_overlay_context *overlay, float *points, int point_count, float r, float g, float b, float a);

// Draws a complex polygon (with holes) using Even-Odd fill rule. 
// Takes an array of path pointers, and an array of vertex counts per path.
// Draws a complex polygon (with holes) using Even-Odd fill rule. 
// Takes an array of path pointers, and an array of vertex counts per path.
int mupdf_overlay_draw_complex_polygon(mupdf_bridge_context *ctx, mupdf_overlay_context *overlay, float **paths, int *vertex_counts, int path_count, float r, float g, float b, float a);

// Draws an image (PNG data) onto the overlay.
int mupdf_overlay_draw_image(mupdf_bridge_context *ctx, mupdf_overlay_context *overlay, const unsigned char *png_data, int png_len, float x, float y, float w, float h, float alpha);

// --- Text Extraction & Search ---

// Extract all text from a page as UTF-8 string
// Returns allocated string that caller must free with mupdf_free_text()
char* mupdf_extract_page_text(
    mupdf_bridge_context *ctx,
    mupdf_bridge_document *doc,
    int page_idx,
    int *out_length
);

// Free text buffer returned by mupdf_extract_page_text
void mupdf_free_text(char *text);

// Search for text on a page, returns number of hits found
// out_quads: flat array of floats, 8 per hit (4 x,y corner points of quad)
int mupdf_search_page(
    mupdf_bridge_context *ctx,
    mupdf_bridge_document *doc,
    int page_idx,
    const char *needle,
    float *out_quads,
    int max_results
);

// Check if Tesseract OCR is available (built with tesseract=yes)
int mupdf_has_ocr_support(void);

#endif // MUPDF_BRIDGE_H
