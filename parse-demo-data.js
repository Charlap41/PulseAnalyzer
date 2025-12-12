import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FitParser from 'fit-file-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const demoDataDir = path.join(__dirname, 'demo-data');

// Device name extraction (same as app)
const extractDeviceName = (filename) => {
    let name = filename.substring(0, filename.lastIndexOf('.')) || filename;
    if (name.includes('_')) {
        name = name.split('_')[0];
    }
    if (!name) return "Unknown Device";
    name = name.trim();
    if (name.length < 2) return name.toUpperCase();
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
};

// Parse FIT file
const parseFitFile = (filepath) => {
    return new Promise((resolve) => {
        const fitParser = new FitParser({ force: true, mode: 'both' });
        const buffer = fs.readFileSync(filepath);

        fitParser.parse(buffer, (error, data) => {
            if (error) {
                console.error(`Error parsing ${filepath}:`, error);
                return resolve(null);
            }

            let points = [];
            if (data.records) {
                data.records.forEach((record) => {
                    if (record.timestamp && record.heart_rate) {
                        points.push({
                            ts: new Date(record.timestamp).getTime(),
                            hr: record.heart_rate
                        });
                    }
                });
            }

            resolve(points.length ? { filename: path.basename(filepath), points } : null);
        });
    });
};

// Parse TCX file
const parseTcxFile = (filepath) => {
    return new Promise((resolve) => {
        const content = fs.readFileSync(filepath, 'utf-8');
        const points = [];

        // Simple regex parsing for TCX
        const trackpointRegex = /<Trackpoint>[\s\S]*?<Time>([^<]+)<\/Time>[\s\S]*?<HeartRateBpm>[\s\S]*?<Value>(\d+)<\/Value>[\s\S]*?<\/HeartRateBpm>[\s\S]*?<\/Trackpoint>/g;

        let match;
        while ((match = trackpointRegex.exec(content)) !== null) {
            const ts = new Date(match[1]).getTime();
            const hr = parseInt(match[2]);
            if (!isNaN(ts) && !isNaN(hr)) {
                points.push({ ts, hr });
            }
        }

        resolve(points.length ? { filename: path.basename(filepath), points } : null);
    });
};

// Main function
async function main() {
    const files = fs.readdirSync(demoDataDir);
    const datasets = [];

    console.log('Parsing demo files...\n');

    for (const file of files) {
        const filepath = path.join(demoDataDir, file);
        const ext = path.extname(file).toLowerCase();
        const deviceName = extractDeviceName(file);

        console.log(`Processing: ${file} -> Device: ${deviceName}`);

        let result;
        if (ext === '.fit') {
            result = await parseFitFile(filepath);
        } else if (ext === '.tcx') {
            result = await parseTcxFile(filepath);
        } else {
            console.log(`  Skipping unsupported format: ${ext}`);
            continue;
        }

        if (result && result.points.length > 0) {
            console.log(`  Found ${result.points.length} HR points`);
            console.log(`  Time range: ${new Date(result.points[0].ts).toISOString()} to ${new Date(result.points[result.points.length - 1].ts).toISOString()}`);
            console.log(`  HR range: ${Math.min(...result.points.map(p => p.hr))} - ${Math.max(...result.points.map(p => p.hr))} BPM`);

            datasets.push({
                deviceName,
                filename: file,
                points: result.points,
                startTime: result.points[0].ts
            });
        } else {
            console.log(`  No HR data found!`);
        }
        console.log('');
    }

    // Sort by device name, put reference device first
    datasets.sort((a, b) => {
        if (a.deviceName.toLowerCase().includes('polar')) return -1;
        if (b.deviceName.toLowerCase().includes('polar')) return 1;
        return a.deviceName.localeCompare(b.deviceName);
    });

    console.log('\n=== Summary ===');
    datasets.forEach(d => {
        console.log(`${d.deviceName}: ${d.points.length} points`);
    });

    // Save raw data for inspection
    const outputPath = path.join(__dirname, 'demo-data-parsed.json');

    // Simplify data for output (sample every 1 second)
    const simplifiedDatasets = datasets.map(d => {
        const sampledPoints = [];
        let lastTs = 0;
        for (const p of d.points) {
            if (p.ts - lastTs >= 1000) {
                sampledPoints.push(p);
                lastTs = p.ts;
            }
        }
        return {
            ...d,
            points: sampledPoints
        };
    });

    fs.writeFileSync(outputPath, JSON.stringify(simplifiedDatasets, null, 2));
    console.log(`\nData saved to: ${outputPath}`);
}

main().catch(console.error);
