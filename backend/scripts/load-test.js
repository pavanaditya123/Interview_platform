// Tiny dependency-free load test: node scripts/load-test.js [url] [totalRequests] [concurrency]
import http from "http";

const url = new URL(process.argv[2] || "http://localhost:3000/health");
const total = Number(process.argv[3] || 5000);
const concurrency = Number(process.argv[4] || 100);

const agent = new http.Agent({ keepAlive: true, maxSockets: concurrency });
const latencies = [];
let sent = 0;
let errors = 0;
const statuses = {};

const one = () =>
    new Promise((resolve) => {
        const start = performance.now();
        http
            .get(url, { agent, headers: { "Accept-Encoding": "gzip" } }, (res) => {
                res.resume();
                res.on("end", () => {
                    statuses[res.statusCode] = (statuses[res.statusCode] || 0) + 1;
                    latencies.push(performance.now() - start);
                    resolve();
                });
            })
            .on("error", () => {
                errors++;
                resolve();
            });
    });

const worker = async () => {
    while (sent < total) {
        sent++;
        await one();
    }
};

const t0 = performance.now();
await Promise.all(Array.from({ length: concurrency }, worker));
const secs = (performance.now() - t0) / 1000;
latencies.sort((a, b) => a - b);
const pct = (p) => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * p))].toFixed(1);

console.log(`${url.href}: ${total} requests, ${concurrency} concurrent, ${secs.toFixed(2)}s`);
console.log(`throughput ${Math.round(total / secs)} req/s | p50 ${pct(0.5)}ms p95 ${pct(0.95)}ms p99 ${pct(0.99)}ms`);
console.log(`statuses ${JSON.stringify(statuses)} | network errors ${errors}`);
agent.destroy();
