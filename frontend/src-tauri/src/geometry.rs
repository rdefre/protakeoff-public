//! Geometry Module
//!
//! Provides high-performance 2D geometry primitives via the `kurbo` crate.
//! This module serves as the single source of truth for all geometric calculations
//! (points, rects, bezier paths, affine transforms) in the application.
//!
//! # Performance Notes
//! Kurbo is designed for precision and SIMD compatibility. All coordinates are f64.

pub use vello_cpu::kurbo::{BezPath, Point, Rect};

/// Extension trait to convert frontend point data to kurbo Points.
pub trait PointExt {
    fn to_kurbo(&self) -> Point;
}

/// Simple 2D point from frontend data (f32).
#[derive(Debug, Clone, Copy, serde::Deserialize)]
pub struct FrontendPoint {
    pub x: f32,
    pub y: f32,
}

impl PointExt for FrontendPoint {
    fn to_kurbo(&self) -> Point {
        Point::new(self.x as f64, self.y as f64)
    }
}

/// Convert a slice of frontend points to a closed kurbo BezPath (polygon).
pub fn points_to_bez_path(points: &[FrontendPoint], closed: bool) -> BezPath {
    let mut path = BezPath::new();
    if points.is_empty() {
        return path;
    }

    path.move_to(points[0].to_kurbo());
    for p in &points[1..] {
        path.line_to(p.to_kurbo());
    }

    if closed {
        path.close_path();
    }

    path
}

/// Calculate the axis-aligned bounding box (AABB) of a slice of points.
pub fn calculate_aabb(points: &[FrontendPoint]) -> Option<Rect> {
    if points.is_empty() {
        return None;
    }

    let mut min_x = f64::MAX;
    let mut min_y = f64::MAX;
    let mut max_x = f64::MIN;
    let mut max_y = f64::MIN;

    for p in points {
        let x = p.x as f64;
        let y = p.y as f64;
        if x < min_x {
            min_x = x;
        }
        if y < min_y {
            min_y = y;
        }
        if x > max_x {
            max_x = x;
        }
        if y > max_y {
            max_y = y;
        }
    }

    Some(Rect::new(min_x, min_y, max_x, max_y))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_points_to_bez_path() {
        let points = vec![
            FrontendPoint { x: 0.0, y: 0.0 },
            FrontendPoint { x: 10.0, y: 0.0 },
            FrontendPoint { x: 10.0, y: 10.0 },
        ];
        let path = points_to_bez_path(&points, true);
        // A closed triangle should have 4 elements: MoveTo, LineTo, LineTo, ClosePath
        assert_eq!(path.elements().len(), 4);
    }

    #[test]
    fn test_calculate_aabb() {
        let points = vec![
            FrontendPoint { x: 5.0, y: 5.0 },
            FrontendPoint { x: 15.0, y: 25.0 },
        ];
        let aabb = calculate_aabb(&points).unwrap();
        assert_eq!(aabb.x0, 5.0);
        assert_eq!(aabb.y0, 5.0);
        assert_eq!(aabb.x1, 15.0);
        assert_eq!(aabb.y1, 25.0);
    }
}
