-- schema.sql

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Table for raw PDF geometry (extracted via MuPDF)
-- We store the geometry as a PostGIS GEOMETRY object (2D).
-- 'geometry_dump' could be a specific type like LINESTRING, POLYGON, etc., or generic GEOMETRY.
CREATE TABLE pdf_layers (
    id SERIAL PRIMARY KEY,
    pdf_id UUID NOT NULL,            -- Reference to the source PDF file
    page_number INT NOT NULL,        -- Page number in the PDF
    layer_name TEXT,                 -- Optional layer name from PDF
    geom GEOMETRY(Geometry, 3857) NOT NULL, -- Web Mercator projection (common for web maps) or 0 for Cartesian
    styles JSONB                     -- Store stroke color, width, fill, etc. as JSON
);

-- Spatial Index for fast viewport querying
CREATE INDEX idx_pdf_layers_geom ON pdf_layers USING GIST (geom);

-- 2. Table for user markups (Polygons, Lines drawn by user)
CREATE TABLE user_markups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    page_id UUID NOT NULL,
    geom GEOMETRY(Geometry, 3857) NOT NULL,
    properties JSONB,                -- Color, label, area calculation result, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial Index for user markups
CREATE INDEX idx_user_markups_geom ON user_markups USING GIST (geom);

-- Example Query for Viewport (Conceptual):
-- SELECT ST_AsBinary(geom), styles FROM pdf_layers
-- WHERE pdf_id = $1 AND page_number = $2
-- AND geom && ST_MakeEnvelope(min_x, min_y, max_x, max_y, 3857);
