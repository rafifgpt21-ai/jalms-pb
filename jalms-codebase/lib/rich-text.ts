const BLOCK_SEPARATOR_PATTERN = /<\/?(?:p|div|h[1-6]|li|blockquote|pre)[^>]*>|<br\s*\/?\s*>/gi
const HTML_TAG_PATTERN = /<[^>]*>/g

function decodeHtmlEntities(value: string) {
    const decodeCodePoint = (code: number) => (
        Number.isInteger(code) && code >= 0 && code <= 0x10FFFF ? String.fromCodePoint(code) : ""
    )

    return value
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#(?:39|x27);/gi, "'")
        .replace(/&#(\d+);/g, (_, code: string) => decodeCodePoint(Number(code)))
        .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => decodeCodePoint(Number.parseInt(code, 16)))
}

export function richTextToPlainText(value: string | null | undefined) {
    if (!value) return ""

    return decodeHtmlEntities(value
        .replace(BLOCK_SEPARATOR_PATTERN, " ")
        .replace(HTML_TAG_PATTERN, " "))
        .replace(/\s+/g, " ")
        .trim()
}

export function isRichTextEmpty(value: string | null | undefined) {
    return richTextToPlainText(value).length === 0
}
