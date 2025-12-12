// Script to generate the complete demoData.ts file
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FitParser from 'fit-file-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const demoDataDir = path.join(__dirname, 'demo-data');

// Device colors (from app)
const COLORS = ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff', '#ff9f40'];

// Device name extraction
const extractDeviceName = (filename) => {
    let name = filename.substring(0, filename.lastIndexOf('.')) || filename;
    if (name.includes('_')) {
        name = name.split('_')[0];
    }
    return name || "Unknown";
};

// Parse FIT file
const parseFitFile = (filepath) => {
    return new Promise((resolve) => {
        const fitParser = new FitParser({ force: true, mode: 'both' });
        const buffer = fs.readFileSync(filepath);

        fitParser.parse(buffer, (error, data) => {
            if (error) return resolve(null);
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
            resolve(points.length ? points : null);
        });
    });
};

// Parse TCX file
const parseTcxFile = (filepath) => {
    const content = fs.readFileSync(filepath, 'utf-8');
    const points = [];
    const trackpointRegex = /<Trackpoint>[\s\S]*?<Time>([^<]+)<\/Time>[\s\S]*?<HeartRateBpm>[\s\S]*?<Value>(\d+)<\/Value>[\s\S]*?<\/HeartRateBpm>[\s\S]*?<\/Trackpoint>/g;

    let match;
    while ((match = trackpointRegex.exec(content)) !== null) {
        const ts = new Date(match[1]).getTime();
        const hr = parseInt(match[2]);
        if (!isNaN(ts) && !isNaN(hr)) {
            points.push({ ts, hr });
        }
    }
    return points.length ? points : null;
};

// Math helpers
const calculateMean = (arr) => arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
const calculateSD = (arr) => {
    if (arr.length < 2) return 0;
    const mean = calculateMean(arr);
    const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (arr.length - 1);
    return Math.sqrt(variance);
};
const calculateCorrelation = (x, y) => {
    if (x.length !== y.length || x.length < 2) return 0;
    const meanX = calculateMean(x);
    const meanY = calculateMean(y);
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < x.length; i++) {
        const dx = x[i] - meanX;
        const dy = y[i] - meanY;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
    }
    return denX === 0 || denY === 0 ? 0 : num / Math.sqrt(denX * denY);
};
const calculateTrustScore = (correlation, mae, stdDevError) => {
    const corrScore = Math.max(0, (correlation - 0.8) / 0.2) * 60;
    const maeScore = Math.max(0, (5 - mae) / 5) * 30;
    const stdDevScore = Math.max(0, (3 - stdDevError) / 3) * 10;
    return Math.round(corrScore + maeScore + stdDevScore);
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

        let points;
        if (ext === '.fit') {
            points = await parseFitFile(filepath);
        } else if (ext === '.tcx') {
            points = await parseTcxFile(filepath);
        } else {
            continue;
        }

        if (points && points.length > 0) {
            console.log(`  Found ${points.length} HR points`);
            datasets.push({ deviceName, filename: file, points, startTime: points[0].ts });
        }
    }

    // Sort - Polar first (reference)
    datasets.sort((a, b) => {
        if (a.deviceName.toLowerCase().includes('polar')) return -1;
        if (b.deviceName.toLowerCase().includes('polar')) return 1;
        return a.deviceName.localeCompare(b.deviceName);
    });

    const refDataset = datasets[0]; // PolarH10
    const globalStart = Math.min(...datasets.map(d => d.startTime));

    // Sample data - every 2 seconds to reduce size
    const sampleInterval = 2000;
    const sampledDatasets = datasets.map((d, idx) => {
        const sampled = [];
        let lastTs = 0;
        for (const p of d.points) {
            if (p.ts - lastTs >= sampleInterval) {
                sampled.push(p);
                lastTs = p.ts;
            }
        }
        return {
            id: `demo-ds-${idx}`,
            name: d.deviceName,
            data: sampled,
            color: COLORS[idx % COLORS.length],
            offset: 0,
            visible: true,
            startTime: d.startTime
        };
    });

    console.log('\n=== Sampled datasets ===');
    sampledDatasets.forEach(d => console.log(`${d.name}: ${d.data.length} points`));

    // Calculate analysis results
    const processForStats = (ds) => {
        const data = [];
        for (const p of ds.data) {
            const t = Math.round((p.ts - globalStart) / 1000 + ds.offset);
            data.push({ t, hr: p.hr });
        }
        return data;
    };

    const refData = processForStats(sampledDatasets[0]);
    const nonRefDatasets = sampledDatasets.slice(1);

    const analysisResults = nonRefDatasets.map(ds => {
        const testData = processForStats(ds);

        // Match by time
        const errors = [];
        const refHRs = [];
        const testHRs = [];
        let prevRef = 0;

        for (const tp of testData) {
            const matchRef = refData.find(rp => Math.abs(rp.t - tp.t) <= 2);
            if (matchRef) {
                const err = tp.hr - matchRef.hr;
                errors.push(err);
                refHRs.push(matchRef.hr);
                testHRs.push(tp.hr);
            }
        }

        if (errors.length < 10) {
            return { device: ds.name, activity: 'course', mae: 0, stdDevError: 0, rmse: 0, bias: 0, correlation: 0, dropouts: 0, dynamicMae: 0, dataPoints: 0 };
        }

        const absErrors = errors.map(Math.abs);
        const mae = calculateMean(absErrors);
        const stdDev = calculateSD(errors);
        const rmse = Math.sqrt(calculateMean(errors.map(e => e * e)));
        const bias = calculateMean(errors);
        const corr = calculateCorrelation(refHRs, testHRs);

        // Dropouts (jumps > 30 BPM)
        let dropouts = 0;
        for (let i = 1; i < testHRs.length; i++) {
            if (Math.abs(testHRs[i] - testHRs[i - 1]) > 30) dropouts++;
        }

        return {
            device: ds.name,
            activity: 'course',
            mae: Math.round(mae * 100) / 100,
            stdDevError: Math.round(stdDev * 100) / 100,
            rmse: Math.round(rmse * 100) / 100,
            bias: Math.round(bias * 100) / 100,
            correlation: Math.round(corr * 1000) / 1000,
            dropouts,
            dynamicMae: Math.round(mae * 100) / 100,
            dataPoints: errors.length
        };
    });

    console.log('\n=== Analysis Results ===');
    analysisResults.forEach(r => {
        const score = calculateTrustScore(r.correlation, r.mae, r.stdDevError);
        console.log(`${r.device}: Score=${score}, Corr=${r.correlation}, MAE=${r.mae}, RMSE=${r.rmse}, Bias=${r.bias}`);
    });

    // Generate TypeScript file
    const demoSession = {
        id: 'demo-session',
        name: 'Course à pied - Démo',
        type: 'course',
        date: globalStart,
        createdAt: Date.now(),
        datasets: sampledDatasets,
        analysisResults,
        analysisText: '', // Will be filled with AI-generated text
        referenceDatasetId: sampledDatasets[0].id,
        lastAnalysisSignature: 'demo'
    };

    // Create AI analysis text
    const aiText = `## 🎯 Synthèse de l'Analyse Comparative

Cette analyse compare **4 dispositifs** de mesure cardiaque lors d'une **course à pied** par rapport à la référence **Polar H10** (ceinture thoracique).

---

### 📊 Classement par Fiabilité

${analysisResults.map((r, i) => {
        const score = calculateTrustScore(r.correlation, r.mae, r.stdDevError);
        const emoji = score >= 80 ? '🥇' : score >= 60 ? '🥈' : score >= 40 ? '🥉' : '⚠️';
        return `${i + 1}. **${r.device}** ${emoji} — Score: **${score}/100** | Corrélation: ${r.correlation} | MAE: ${r.mae} bpm`;
    }).join('\n')}

---

### 🔍 Observations Détaillées

${analysisResults.map(r => {
        const score = calculateTrustScore(r.correlation, r.mae, r.stdDevError);
        let comment = '';
        if (score >= 80) {
            comment = `Excellente performance avec une corrélation très élevée (${r.correlation}). Ce dispositif peut être utilisé en toute confiance pour le suivi d'entraînement.`;
        } else if (score >= 60) {
            comment = `Bonne précision générale avec quelques écarts occasionnels. Convient pour un suivi régulier mais attention aux valeurs extrêmes.`;
        } else if (score >= 40) {
            comment = `Précision modérée avec des écarts notables (MAE: ${r.mae} bpm). Recommandé uniquement pour un suivi indicatif.`;
        } else {
            comment = `Fiabilité insuffisante pour un usage précis. Des écarts significatifs ont été détectés (Biais: ${r.bias} bpm).`;
        }
        return `#### ${r.device}
${comment}
- Erreur moyenne absolue: **${r.mae} bpm**
- Écart-type: **${r.stdDevError} bpm**
- RMSE: **${r.rmse} bpm**
- Biais: **${r.bias > 0 ? '+' : ''}${r.bias} bpm**
`;
    }).join('\n')}

---

### 💡 Recommandations

1. **Pour l'entraînement intensif**: Privilégiez les dispositifs avec un score > 80
2. **Pour le suivi quotidien**: Un score > 60 est généralement suffisant
3. **Zones cardiaques**: Utilisez la référence (Polar H10) pour calibrer vos zones

> ⚡ *Cette analyse a été générée automatiquement par Pulse Analyzer AI*`;

    demoSession.analysisText = aiText;

    // Generate TypeScript content
    const tsContent = `// Auto-generated demo data - DO NOT EDIT
import { Session, Dataset, AnalysisResult } from './types';

export const DEMO_SESSION: Session = ${JSON.stringify(demoSession, null, 2)};

export const DEMO_AI_TEXT = \`${aiText.replace(/`/g, '\\`')}\`;
`;

    const outputPath = path.join(__dirname, 'demoData.ts');
    fs.writeFileSync(outputPath, tsContent);
    console.log(`\n✅ Generated: ${outputPath}`);

    // Check file size
    const stats = fs.statSync(outputPath);
    console.log(`File size: ${(stats.size / 1024).toFixed(1)} KB`);
}

main().catch(console.error);
