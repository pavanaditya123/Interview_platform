import { useCallback, useEffect, useRef, useState } from "react";

const Recognition = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
const synth = typeof window !== "undefined" ? window.speechSynthesis : null;

const strip = (md) => md.replace(/[*_`#>]/g, "").replace(/\[(.*?)\]\(.*?\)/g, "$1");

/** Text-to-speech for the AI interviewer's voice. */
export function useSpeaker() {
    const [speaking, setSpeaking] = useState(false);
    const supported = Boolean(synth);

    const stop = useCallback(() => {
        synth?.cancel();
        setSpeaking(false);
    }, []);

    const speak = useCallback((text) => {
        if (!synth || !text) return;
        synth.cancel();
        const u = new SpeechSynthesisUtterance(strip(text));
        const voices = synth.getVoices();
        u.voice =
            voices.find((v) => /en[-_](US|GB)/i.test(v.lang) && /female|samantha|aria|jenny|google us english/i.test(v.name)) ||
            voices.find((v) => /^en/i.test(v.lang)) ||
            null;
        u.rate = 1.02;
        u.onstart = () => setSpeaking(true);
        u.onend = () => setSpeaking(false);
        u.onerror = () => setSpeaking(false);
        synth.speak(u);
    }, []);

    useEffect(() => () => synth?.cancel(), []);
    return { speak, stop, speaking, supported };
}

/** Speech-to-text dictation. onFinal receives each finalized phrase. */
export function useDictation(onFinal) {
    const [listening, setListening] = useState(false);
    const [interim, setInterim] = useState("");
    const recRef = useRef(null);
    const onFinalRef = useRef(onFinal);
    useEffect(() => {
        onFinalRef.current = onFinal;
    }, [onFinal]);

    const supported = Boolean(Recognition);

    const stop = useCallback(() => {
        recRef.current?.stop();
    }, []);

    const start = useCallback(() => {
        if (!Recognition || recRef.current) return;
        const rec = new Recognition();
        rec.lang = "en-US";
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (e) => {
            let partial = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const r = e.results[i];
                if (r.isFinal) onFinalRef.current?.(r[0].transcript.trim());
                else partial += r[0].transcript;
            }
            setInterim(partial);
        };
        rec.onerror = () => {};
        rec.onend = () => {
            recRef.current = null;
            setListening(false);
            setInterim("");
        };
        recRef.current = rec;
        rec.start();
        setListening(true);
    }, []);

    useEffect(() => () => recRef.current?.abort(), []);
    return { start, stop, listening, interim, supported };
}
