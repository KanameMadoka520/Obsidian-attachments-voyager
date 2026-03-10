use regex::Regex;

/// Strip fenced code blocks (```...```) and inline code (`...`) from markdown
/// so that image references inside code are not picked up.
fn strip_code(md: &str) -> String {
    let mut out = String::with_capacity(md.len());
    let mut in_fence = false;
    let mut fence_char: char = '`';
    let mut fence_count: usize = 0;

    for line in md.lines() {
        let trimmed = line.trim_start();
        if !in_fence {
            // Check if this line opens a fenced block
            let (ch, cnt) = if trimmed.starts_with("```") {
                ('`', trimmed.chars().take_while(|&c| c == '`').count())
            } else if trimmed.starts_with("~~~") {
                ('~', trimmed.chars().take_while(|&c| c == '~').count())
            } else {
                ('\0', 0)
            };
            if cnt >= 3 {
                in_fence = true;
                fence_char = ch;
                fence_count = cnt;
                out.push('\n');
                continue;
            }
        } else {
            // Check if this line closes the fence
            let close_cnt = trimmed.chars().take_while(|&c| c == fence_char).count();
            let after_ticks = trimmed[fence_char.len_utf8() * close_cnt..].trim();
            if close_cnt >= fence_count && after_ticks.is_empty() {
                in_fence = false;
                out.push('\n');
                continue;
            }
            // Inside fence — skip line
            out.push('\n');
            continue;
        }
        // Strip inline code spans
        let mut cleaned = String::with_capacity(line.len());
        let mut chars = line.chars().peekable();
        while let Some(c) = chars.next() {
            if c == '`' {
                // Skip until closing backtick
                let mut found_close = false;
                for inner in chars.by_ref() {
                    if inner == '`' { found_close = true; break; }
                }
                if !found_close {
                    // Unclosed backtick — treat as literal
                    cleaned.push(c);
                }
            } else {
                cleaned.push(c);
            }
        }
        out.push_str(&cleaned);
        out.push('\n');
    }
    out
}

pub fn extract_image_refs(md: &str) -> Vec<String> {
    let cleaned = strip_code(md);

    let markdown_re = Regex::new(r"!\[[^\]]*\]\(([^)]+)\)").unwrap();
    let wikilink_re = Regex::new(r"!\[\[([^\]]+)\]\]").unwrap();

    let mut refs = Vec::new();

    for caps in markdown_re.captures_iter(&cleaned) {
        let raw = caps.get(1).map(|m| m.as_str()).unwrap_or("");
        if raw.starts_with("http://") || raw.starts_with("https://") {
            continue;
        }
        // Skip data URIs (e.g. data:image/png;base64,...)
        if raw.starts_with("data:") {
            continue;
        }
        if let Some(name) = normalize_filename(raw) {
            refs.push(name);
        }
    }

    for caps in wikilink_re.captures_iter(&cleaned) {
        let raw = caps.get(1).map(|m| m.as_str()).unwrap_or("");
        if let Some(name) = normalize_filename(raw) {
            refs.push(name);
        }
    }

    refs
}

fn normalize_filename(raw: &str) -> Option<String> {
    let no_alias = raw.split('|').next().unwrap_or(raw).trim();
    let no_query = no_alias.split('?').next().unwrap_or(no_alias).trim();
    let normalized = no_query.replace('\\', "/");

    normalized
        .rsplit('/')
        .find(|segment| !segment.is_empty())
        .map(|s| s.to_string())
}

#[cfg(test)]
mod tests {
    use super::extract_image_refs;

    #[test]
    fn parses_markdown_and_wikilink_image_refs() {
        let md = "![](./attachments/a.png)\n![[b.jpg]]\n![[attachments/c.webp]]";
        let refs = extract_image_refs(md);
        assert_eq!(refs, vec!["a.png", "b.jpg", "c.webp"]);
    }

    #[test]
    fn ignores_images_inside_code_blocks() {
        let md = r#"
# Some note

```python
img = f"![](data:image/png;base64,{base64_img})"
```

Normal text with ![[real.png]]

`![](inline_code.png)`

~~~
![[fenced_tilde.png]]
~~~
"#;
        let refs = extract_image_refs(md);
        assert_eq!(refs, vec!["real.png"]);
    }

    #[test]
    fn ignores_data_uris() {
        let md = "![alt](data:image/png;base64,abc123)\n![[real.jpg]]";
        let refs = extract_image_refs(md);
        assert_eq!(refs, vec!["real.jpg"]);
    }
}
