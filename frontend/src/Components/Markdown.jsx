import { memo } from "react";
import ReactMarkdown from "react-markdown";

// Renders AI output safely (react-markdown never renders raw HTML). Hides a trailing ```json score block.
function Markdown({ children, className = "" }) {
    const text = String(children ?? "").replace(/```json[\s\S]*$/i, "").trimEnd();
    return (
        <div className={`md ${className}`}>
            <ReactMarkdown
                components={{
                    a: ({ href, children: c }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer">
                            {c}
                        </a>
                    ),
                }}
            >
                {text}
            </ReactMarkdown>
        </div>
    );
}

export default memo(Markdown);
