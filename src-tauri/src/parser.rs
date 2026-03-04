use regex::Regex;

pub fn extract_image_refs(md: &str) -> Vec<String> {
    let markdown_re = Regex::new(r"!\[[^\]]*\]\(([^)]+)\)").unwrap();
    let wikilink_re = Regex::new(r"!\[\[([^\]]+)\]\]").unwrap();

    let mut refs = Vec::new();

    for caps in markdown_re.captures_iter(md) {
        let raw = caps.get(1).map(|m| m.as_str()).unwrap_or("");
        if raw.starts_with("http://") || raw.starts_with("https://") {
            continue;
        }
        if let Some(name) = normalize_filename(raw) {
            refs.push(name);
        }
    }

    for caps in wikilink_re.captures_iter(md) {
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
}
