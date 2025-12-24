import { version } from "react";

const PISTON_API = "https://emkc.org/api/v2/piston"

const LANGUAGE_VERSIONS = {

    javascript: { language: "javascript", version: "18.15.0" },
    java: { language: "java", version: "15.0.2" },
    python: { language: "python", version: "3.10.0" },
}


export async function executeCode(language, code) {
    try {
        const languageconfig = LANGUAGE_VERSIONS[language];
        if (!languageconfig) {
            return {
                success: false,
                error: `Unsupported language :${language}`,
            };
        }

        const response = await fetch(`${PISTON_API}/execute`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                language: languageconfig.language,
                version: languageconfig.version,
                files: [
                    {
                        name: `main.${getFileExtension(language)}`,
                        content: code,
                    },
                ],
            }),
        });

        if (!response.ok) {
            return {
                success: false,
                error: `HTTP error! status :${response.status}`,
            };
        }

        const data = await response.json();
        const output = data.run.output || "";
        const stderr = data.run.stderr || "";
        if (stderr) {
            return {
                success: false,
                output: output,
                error: stderr,
            };
        }

        return {
            success: true,
            output: output || "No output",
        };
    } catch (error) {
        return {
            success: false,
            error: `Failed to execute code :${error.message}`,
        };
    }
}


function getFileExtension(language) {
    const Extension = {
        javascript: "js",
        python: "py",
        java: "java",
    };

    return Extension[language] || "txt";
}