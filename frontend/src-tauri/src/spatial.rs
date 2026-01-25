use rstar::{RTreeObject, AABB};
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct VectorElement {
    pub id: usize,
    pub points: Vec<(f64, f64)>, // Simple line strip
    pub is_closed: bool,
}

impl RTreeObject for VectorElement {
    type Envelope = AABB<[f64; 2]>;

    fn envelope(&self) -> Self::Envelope {
        if self.points.is_empty() {
            return AABB::from_corners([0.0, 0.0], [0.0, 0.0]); // Empty
        }

        let mut min_x = f64::MAX;
        let mut min_y = f64::MAX;
        let mut max_x = f64::MIN;
        let mut max_y = f64::MIN;

        for (x, y) in &self.points {
            if *x < min_x { min_x = *x; }
            if *x > max_x { max_x = *x; }
            if *y < min_y { min_y = *y; }
            if *y > max_y { max_y = *y; }
        }

        AABB::from_corners([min_x, min_y], [max_x, max_y])
    }
}
