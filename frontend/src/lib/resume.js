// Extracts plain text from a resume file in the browser. PDF parsing (pdf.js) is loaded only when needed.
export const MAX_RESUME_CHARS = 15000;
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

const tidy = (text) =>
    text
        .replace(/\r/g, "")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .slice(0, MAX_RESUME_CHARS);

async function pdfToText(file) {
    const pdfjs = await import("pdfjs-dist");
    const { default: workerUrl } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = [];
    for (let i = 1; i <= Math.min(doc.numPages, 10); i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        let line = "";
        const lines = [];
        for (const item of content.items) {
            line += item.str;
            if (item.hasEOL) {
                lines.push(line);
                line = "";
            } else {
                line += " ";
            }
        }
        if (line) lines.push(line);
        pages.push(lines.join("\n"));
    }
    await doc.destroy();
    return pages.join("\n\n");
}

export async function extractResumeText(file) {
    if (file.size > MAX_RESUME_BYTES) throw new Error("File is too large (max 5 MB).");
    const name = file.name.toLowerCase();
    let text;
    if (file.type === "application/pdf" || name.endsWith(".pdf")) {
        text = await pdfToText(file);
    } else if (/\.(txt|md|markdown|rtf)$/.test(name) || file.type.startsWith("text/")) {
        text = await file.text();
    } else {
        throw new Error("Upload a PDF or text file. For Word documents, save as PDF first.");
    }
    const cleaned = tidy(text);
    if (cleaned.length < 50) throw new Error("Couldn't read much text from that file. If it's a scanned PDF, paste your resume text instead.");
    return cleaned;
}
