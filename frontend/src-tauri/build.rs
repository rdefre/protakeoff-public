fn main() {
    // Standard Tauri build hook
    tauri_build::build();

    let target_os = std::env::var("CARGO_CFG_TARGET_OS").unwrap_or_else(|_| "macos".to_string());
    let mut include_dirs = vec![std::path::PathBuf::from("src")];

    if target_os == "windows" {
        // Link against system MuPDF on Windows
        let root = std::env::var("CARGO_MANIFEST_DIR").unwrap();
        let mupdf_dir = std::path::Path::new(&root)
            .parent()
            .unwrap()
            .parent()
            .unwrap()
            .join("mupdf");
        let mupdf_lib_dir = mupdf_dir
            .join("platform")
            .join("win32")
            .join("x64")
            .join("Release");
        let mupdf_include_dir = mupdf_dir.join("include");
        include_dirs.push(mupdf_include_dir);

        println!("cargo:rustc-link-search=native={}", mupdf_lib_dir.display());

        // Core MuPDF libs
        println!("cargo:rustc-link-lib=static=libmupdf");
        println!("cargo:rustc-link-lib=static=libthirdparty");
        println!("cargo:rustc-link-lib=static=libresources");

        // Additional libs
        println!("cargo:rustc-link-lib=static=libharfbuzz");
        println!("cargo:rustc-link-lib=static=libzxing");
        println!("cargo:rustc-link-lib=static=libtesseract");
        println!("cargo:rustc-link-lib=static=libleptonica");

        // System dependencies for MuPDF on Windows
        println!("cargo:rustc-link-lib=user32");
        println!("cargo:rustc-link-lib=gdi32");
        println!("cargo:rustc-link-lib=shell32");
        println!("cargo:rustc-link-lib=comdlg32");
        println!("cargo:rustc-link-lib=advapi32");
        println!("cargo:rustc-link-lib=ws2_32");
    } else {
        // macOS or Linux
        if let Ok(mupdf) = pkg_config::Config::new()
            .atleast_version("1.20")
            .probe("mupdf")
        {
            for path in mupdf.include_paths {
                include_dirs.push(path);
            }
        } else if target_os == "macos" {
            // Manual fallback for Homebrew MuPDF
            let brew_prefix = "/opt/homebrew";
            let mupdf_include = std::path::Path::new(brew_prefix).join("include");
            let mupdf_lib = std::path::Path::new(brew_prefix).join("lib");

            if mupdf_include.exists() && mupdf_lib.exists() {
                include_dirs.push(mupdf_include);
                println!("cargo:rustc-link-search=native={}", mupdf_lib.display());
                println!("cargo:rustc-link-lib=mupdf");
            }
        } else {
            println!("cargo:rustc-link-lib=mupdf");
        }
    }

    // Compile our bridge
    println!("cargo:rerun-if-changed=src/mupdf_bridge.c");
    println!("cargo:rerun-if-changed=src/mupdf_bridge.h");
    let mut build = cc::Build::new();
    build.file("src/mupdf_bridge.c");
    for inc in include_dirs {
        build.include(inc);
    }
    
    // Define HAVE_TESSERACT to enable OCR code in C bridge
    // We assume availability if on Windows (static link) or if detected via pkg-config
    if target_os == "windows" {
        build.define("HAVE_TESSERACT", None);
    } else {
        // For macOS/Linux, we might want to check pkg-config or default to enabled if linking
        // For now, let's enable it if we found mupdf headers, assuming standard build
        build.define("HAVE_TESSERACT", None); 
    }

    build.compile("mupdf_bridge");
}
