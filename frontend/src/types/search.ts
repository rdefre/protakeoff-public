/** A quad representing a hit's bounding area on the page */
export interface SearchHitQuad {
    ul: [number, number];
    ur: [number, number];
    lr: [number, number];
    ll: [number, number];
}

/** Search hits for a single page */
export interface PageSearchResult {
    page_idx: number;
    hits: SearchHitQuad[];
}

/** Result from smart index search (Kreuzberg) */
export interface IndexSearchResult {
    doc_id: string;
    matches: string[]; // Text snippets
}
