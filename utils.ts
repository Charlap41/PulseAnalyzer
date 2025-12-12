import { Dataset, Session, AnalysisResult, DataPoint, Language } from './types';

import firebase from 'firebase/compat/app';
import 'firebase/compat/functions';


// --- Math Helpers ---
export const calculateMean = (arr: number[]) => {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
};

export const calculateSD = (arr: number[]) => {
    if (arr.length < 2) return 0;
    const mean = calculateMean(arr);
    const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (arr.length - 1);
    return Math.sqrt(variance);
};

export const calculateRMSE = (errors: number[]) => {
    if (errors.length === 0) return 0;
    return Math.sqrt(errors.reduce((sum, err) => sum + err * err, 0) / errors.length);
};

export const calculateBlandAltmanMetrics = (errors: number[]) => {
    if (errors.length === 0) return { bias: 0, loa: 0 };
    const meanError = calculateMean(errors);
    const stdDevError = calculateSD(errors);
    const limitOfAgreement = 1.96 * stdDevError;
    return {
        bias: meanError,
        upperLoa: meanError + limitOfAgreement,
        lowerLoa: meanError - limitOfAgreement
    };
};

export const calculatePearson = (arrX: number[], arrY: number[]) => {
    if (arrX.length !== arrY.length || arrX.length === 0) return 0;
    const n = arrX.length;
    const meanX = calculateMean(arrX);
    const meanY = calculateMean(arrY);
    let sumXY = 0; let sumX2 = 0; let sumY2 = 0;
    for (let i = 0; i < n; i++) {
        sumXY += (arrX[i] - meanX) * (arrY[i] - meanY);
        sumX2 += Math.pow(arrX[i] - meanX, 2);
        sumY2 += Math.pow(arrY[i] - meanY, 2);
    }
    const denominator = Math.sqrt(sumX2) * Math.sqrt(sumY2);
    if (denominator === 0) return 0;
    const correlation = sumXY / denominator;
    return Math.max(-1, Math.min(1, correlation));
};

export const calculateTrustScore = (correlation: number, mae: number, stdDevError: number, integrity: number = 1) => {
    // Weighted Components (Max 100)
    const corrScore = Math.max(0, (correlation - 0.7) / 0.3) * 50; // 50% Importance
    const maeScore = Math.max(0, (5 - mae) / 5) * 30; // 30% Importance
    const stdDevScore = Math.max(0, (3 - stdDevError) / 3) * 20; // 20% Importance

    const baseScore = corrScore + maeScore + stdDevScore;

    // Penalize by Integrity (Coverage Ratio)
    // If 10% data missing -> Score * 0.9
    // If 50% data missing -> Score * 0.5
    // But maybe strict penalty: Score * (Integrity ^ 2) to punish heavy drops more?
    // Let's stick to linear penalty for now:
    return Math.round(Math.min(100, Math.max(0, baseScore * integrity)));
};

export const formatAIResponse = (text: string, forceLight: boolean = false) => {
    if (!text) return '';
    const lines = text.trim().split('\n');
    let html = '';
    let inList = false;

    // Define classes based on mode
    const textClass = forceLight ? 'text-gray-900' : 'text-gray-700 dark:text-gray-300';
    const headingClass = forceLight
        ? 'text-brand-600 mt-5 mb-2 border-b border-gray-200 pb-1'
        : 'text-brand-600 dark:text-brand-500 mt-5 mb-2 border-b border-gray-200 dark:border-white/10 pb-1';
    const listClass = forceLight ? 'text-gray-900' : 'text-gray-700 dark:text-gray-300';

    for (const line of lines) {
        let processedLine = line;
        processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        if (processedLine.trim().startsWith('* ') || processedLine.trim().startsWith('- ')) {
            if (!inList) {
                html += `<ul class="list-outside space-y-1 my-2 ${listClass}">`;
                inList = true;
            }
            const content = processedLine.replace(/^[\*\-]\s+/, '').trim();
            html += `<li class="ml-4 flex items-start"><span class="mr-2">•</span><span>${content}</span></li>`;

        } else if (processedLine.trim().startsWith('##')) {
            if (inList) html += '</ul>';
            inList = false;
            const content = processedLine.replace(/^##\s*/, '').trim();
            html += `<h4 class="text-base font-bold ${headingClass}">${content}</h4>`;

        } else if (processedLine.trim().length === 0) {
            if (inList) html += '</ul>';
            inList = false;

        } else {
            if (inList) {
                html += '</ul>';
                inList = false;
            }
            html += `<p class="mb-2 leading-relaxed ${textClass}">${processedLine.trim()}</p>`;
        }
    }
    if (inList) html += '</ul>';
    return html;
};

// --- Parsers ---

export const extractDeviceNameFromFilename = (filename: string): string => {
    let name = filename.substring(0, filename.lastIndexOf('.')) || filename;
    if (name.includes('_')) {
        name = name.split('_')[0];
    }
    if (!name) return "Unknown Device";
    name = name.trim();
    if (name.length < 2) return name.toUpperCase();
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
};

export const parseFitFile = (buffer: ArrayBuffer, filename: string): Promise<any> => {
    return new Promise(async (resolve) => {
        try {
            // @ts-ignore
            let FitParserClass = window.FitParser?.default || window.FitParser;
            if (typeof FitParserClass !== 'function') {
                try {
                    console.log("Global FitParser not found, attempting dynamic import from Skypack...");
                    // @ts-ignore
                    const module = await import('https://cdn.skypack.dev/fit-file-parser@1.9.0');
                    FitParserClass = module.default;
                } catch (importErr) {
                    console.error("FitParser dynamic import failed:", importErr);
                }
            }
            if (typeof FitParserClass !== 'function') {
                return resolve(null);
            }
            const parser = new FitParserClass({ force: true });
            parser.parse(buffer, (error: any, data: any) => {
                if (error) return resolve(null);
                let points: any[] = [];
                if (data.records) {
                    data.records.forEach((record: any) => {
                        if (record.timestamp && record.heart_rate) {
                            points.push({ ts: new Date(record.timestamp).getTime(), hr: record.heart_rate });
                        }
                    });
                }
                resolve(points.length ? { name: filename, points } : null);
            });
        } catch (e) {
            resolve(null);
        }
    });
};

export const parseTextFile = (content: string, filename: string, ext: string): Promise<any> => {
    return new Promise((resolve) => {
        let points: any[] = [];
        const parser = new DOMParser();

        try {
            if (ext === 'gpx' || ext === 'tcx') {
                const doc = parser.parseFromString(content, "text/xml");
                const isGpx = ext === 'gpx';
                const selector = isGpx ? 'trkpt' : 'Trackpoint';
                doc.querySelectorAll(selector).forEach(pt => {
                    const tNode = pt.querySelector(isGpx ? 'time' : 'Time');
                    let hrNode;
                    if (isGpx) hrNode = pt.querySelector('hr, ns3\\:hr, gpxtpx\\:hr, TrackPointExtension > hr');
                    else hrNode = pt.querySelector('HeartRateBpm > Value');

                    if (tNode && hrNode && tNode.textContent && hrNode.textContent) {
                        const ts = new Date(tNode.textContent).getTime();
                        const hr = parseInt(hrNode.textContent);
                        if (!isNaN(ts) && !isNaN(hr)) {
                            points.push({ ts, hr });
                        }
                    }
                });
            } else if (ext === 'csv') {
                const lines = content.split(/\r\n|\n/);
                const sep = (lines[0] && lines[0].includes(';')) || (lines[1] && lines[1].includes(';')) ? ';' : ',';
                const now = Date.now();
                const startIndex = /[a-zA-Z]/.test(lines[0]) ? 1 : 0;

                lines.slice(startIndex).forEach(line => {
                    if (!line.trim()) return;
                    const parts = line.split(sep);
                    if (parts.length >= 2) {
                        let val1 = parseFloat(parts[0]);
                        const hr = parseFloat(parts[1]);
                        if (!isNaN(val1) && !isNaN(hr)) {
                            let ts = val1 < 1000000 ? (now + val1 * 1000) : val1;
                            points.push({ ts: ts, hr });
                        }
                    }
                });
            }
        } catch (e) {
            console.error("Text Parse Error", e);
        }

        resolve(points.length ? { name: filename, points } : null);
    });
};

// --- Analysis Logic ---

export const calculateSessionStats = (session: Session) => {
    const refDs = session.datasets.find(d => d.id === session.referenceDatasetId);
    if (!refDs) return null;

    const visibleDatasets = session.datasets.filter(d => d.visible);
    const globalStart = Math.min(...visibleDatasets.map(d => d.startTime));

    const processForStats = (ds: Dataset) => {
        const data = [];
        for (const p of ds.data) {
            const t = Math.round((p.ts - globalStart) / 1000 + ds.offset);
            data.push({ t, hr: p.hr });
        }
        return data;
    };

    const refData = processForStats(refDs);
    const refMap = new Map();
    refData.forEach(p => refMap.set(p.t, p.hr));

    const dynamicTimestamps = new Set();
    for (let i = 1; i < refData.length; i++) {
        if (Math.abs(refData[i].hr - refData[i - 1].hr) > 2) {
            dynamicTimestamps.add(refData[i].t);
        }
    }

    const analysisResults = visibleDatasets.map(ds => { // CHANGED: Include refDs to calculate its intrinsic stats (Dropouts, Stability)
        const dsData = processForStats(ds);
        const errors = [];
        const dynamicErrors = [];
        const refVals = [];
        const dsVals = [];
        let dropouts = 0;

        const dropoutDetails = [];
        for (let i = 1; i < dsData.length; i++) {
            const gap = dsData[i].t - dsData[i - 1].t;
            if (gap > 1) {
                dropouts++;
                dropoutDetails.push({
                    start: dsData[i - 1].t,
                    end: dsData[i].t,
                    duration: gap
                });
            }
        }

        for (const p of dsData) {
            if (refMap.has(p.t)) {
                const refVal = refMap.get(p.t);
                const err = p.hr - refVal;
                errors.push(err);
                refVals.push(refVal);
                dsVals.push(p.hr);
                if (dynamicTimestamps.has(p.t)) dynamicErrors.push(Math.abs(err));
            }
        }

        const mae = errors.length > 0 ? calculateMean(errors.map(Math.abs)) : 0;
        const stdDev = calculateSD(errors);
        const rmse = calculateRMSE(errors);
        const bias = calculateMean(errors);
        const corr = calculatePearson(refVals, dsVals);
        const dynMae = dynamicErrors.length > 0 ? calculateMean(dynamicErrors) : 0;

        const globalDuration = (dsData.length > 0) ? (dsData[dsData.length - 1].t - dsData[0].t) : 0;
        // Total dropout duration
        const totalDropoutTime = dropoutDetails.reduce((acc, d) => acc + d.duration, 0);
        // Estimate integrity (Ratio of time WITH signal vs Total Time)
        // If globalDuration is 0 (one point), integrity is 1
        const integrity = globalDuration > 0 ? Math.max(0, 1 - (totalDropoutTime / globalDuration)) : 1;

        const score = calculateTrustScore(corr, mae, stdDev, integrity);

        return {
            device: ds.name,
            activity: session.type,
            mae,
            stdDevError: stdDev,
            rmse,
            bias,
            correlation: corr,
            dropouts,
            dropoutDetails,
            score,
            dynamicMae: dynMae,
            dataPoints: errors.length
        } as AnalysisResult;
    });

    const refStats = {
        avgHR: Math.round(calculateMean(refData.map(d => d.hr))),
        maxHR: Math.max(...refData.map(d => d.hr))
    };

    return { analysisResults, refStats };
};


// --- Gemini API ---

export const fetchAIAnalysis = async (session: Session, analysisData: any[], refDs: Dataset, refStats: any, lang: Language): Promise<string> => {
    // No API Key check here anymore, it's handled in the backend


    const promptFr = `Vous êtes un expert en analyse de données sportives.
Les données ont été synchronisées temporellement et filtrées de manière équivalente.
Comparez les appareils suivants par rapport à l'appareil de référence (${refDs.name}) pour une session de type "${session.type}".

Données de Référence (${refDs.name}):
- FC Moyenne: ${refStats.avgHR} bpm
- FC Max: ${refStats.maxHR} bpm

Données des Appareils Comparés (métriques vs. Référence):
${analysisData.map((d: any) => `- **${d.device}**:
    - Corrélation (r): ${d.correlation.toFixed(3)} (1.0 = parfait)
    - Biais (Bland-Altman): ${d.bias.toFixed(2)} bpm (Biais systématique ?)
    - Erreur Moyenne Absolue (MAE): ${d.mae.toFixed(2)} bpm
    - **Erreur en Phase Dynamique**: ${d.dynamicMae.toFixed(2)} bpm (Erreur quand le cœur change vite de rythme. Plus c'est bas, plus l'appareil est réactif).
    - Stabilité (Écart-Type): ${d.stdDevError.toFixed(2)} bpm
    - **Pertes de Signal (Dropouts)**: ${d.dropouts} fois (Coupures > 3s).`).join('\n')}

Veuillez fournir une analyse concise et structurée (environ 200 mots) en français :

1.  Commencez par "## Verdict de l'Expert".
2.  **Analysez la Réactivité (Score Dynamique)** : Quel appareil suit le mieux les changements de rythme (Erreur Dynamique faible + forte Corrélation) ?
3.  **Analysez la Fiabilité (Continuité)** : Y a-t-il des appareils avec des pertes de signal (Dropouts) ou un bruit important (Stabilité) ?
4.  **Analysez le Biais** : Y a-t-il une sous-estimation ou sur-estimation constante ?
5.  Fournissez un classement final simple sous forme de liste.
6.  Concluez brièvement sur l'appareil le plus fiable pour ce type d'activité.

Utilisez du **gras** pour les points clés. Ne mettez pas de code Markdown brut, le texte sera affiché tel quel.`;

    const promptEn = `You are a sports data scientist expert.
The data has been time-synchronized and filtered equally.
Compare the following devices against the reference device (${refDs.name}) for a "${session.type}" session.

Reference Data (${refDs.name}):
- Avg HR: ${refStats.avgHR} bpm
- Max HR: ${refStats.maxHR} bpm

Compared Devices Data (metrics vs. Reference):
${analysisData.map((d: any) => `- **${d.device}**:
    - Correlation (r): ${d.correlation.toFixed(3)} (1.0 = perfect)
    - Bias (Bland-Altman): ${d.bias.toFixed(2)} bpm (Systematic bias?)
    - Mean Absolute Error (MAE): ${d.mae.toFixed(2)} bpm
    - **Dynamic Phase Error**: ${d.dynamicMae.toFixed(2)} bpm (Error when heart rate changes rapidly. Lower is more reactive).
    - Stability (StdDev): ${d.stdDevError.toFixed(2)} bpm
    - **Signal Dropouts**: ${d.dropouts} times (Gaps > 3s).`).join('\n')}

Please provide a concise and structured analysis (approx 200 words) in English:

1.  Start with "## Expert Verdict".
2.  **Analyze Reactivity (Dynamic Score)**: Which device tracks rhythm changes best?
3.  **Analyze Reliability (Continuity)**: Are there signal dropouts or significant noise?
4.  **Analyze Bias**: Is there constant underestimation or overestimation?
5.  Provide a simple final ranking list.
6.  Conclude briefly on the most reliable device for this activity type.

Use **bold** for key points. Do not use raw Markdown code blocks, the text will be rendered as is.`;

    try {
        const analyzeSession = firebase.functions().httpsCallable('analyzeSession');
        const result = await analyzeSession({
            prompt: lang === 'fr' ? promptFr : promptEn,
            model: 'gemini-2.5-flash'
        });
        return result.data.text || "No AI response.";
    } catch (error: any) {
        console.error("Cloud Function Error Details:", {
            message: error.message,
            code: error.code,
            details: error.details
        });
        // Display the DETAILED error from backend (3rd arg of HttpsError)
        return `AI Error: ${error.details || error.message || 'Unknown'}`;
    }
};

export const fetchGlobalAIAnalysis = async (globalData: string, activityData: string, lang: Language): Promise<string> => {
    // Backend handles Auth & Key


    const promptFr = `Vous êtes un expert en analyse de données sportives.
Analysez le rapport de fiabilité global suivant.

CLASSEMENT GLOBAL (Tous appareils, toutes activités):
${globalData}

RÉSUMÉ PAR ACTIVITÉ (Meilleur appareil):
${activityData}

Veuillez fournir une analyse de haut niveau (environ 200 mots) en français :
1.  Commencez par "## Rapport d'Expert Global".
2.  Identifiez le grand gagnant (meilleur Score de Confiance global) et le grand perdant.
3.  Commentez la fiabilité globale et les biais systématiques éventuels.
4.  Mentionnez les différences notables selon le type d'activité (ex: un appareil bon en course mais mauvais en musculation).
5.  Terminez par une recommandation générale.

Utilisez du **gras** pour les noms d'appareils et les points clés.`;

    const promptEn = `You are a sports data scientist expert.
Analyze the following global reliability report.

GLOBAL RANKING (All devices, all activities):
${globalData}

ACTIVITY SUMMARY (Best device):
${activityData}

Please provide a high-level analysis (approx 200 words) in English:
1.  Start with "## Global Expert Report".
2.  Identify the overall winner (best Global Trust Score) and the loser.
3.  Comment on overall reliability and any systematic biases.
4.  Mention notable differences by activity type (e.g., a device good for running but bad for weightlifting).
5.  End with a general recommendation.

Use **bold** for device names and key points.`;

    try {
        const analyzeSession = firebase.functions().httpsCallable('analyzeSession');
        const result = await analyzeSession({
            prompt: lang === 'fr' ? promptFr : promptEn,
            model: 'gemini-2.5-flash'
        });
        return result.data.text || "No AI response.";
    } catch (error: any) {
        console.error("Global AI Function Error Details:", {
            message: error.message,
            code: error.code,
            details: error.details
        });
        return `Global AI Error: ${error.details || error.message || 'Unknown'}`;
    }
}

export const fetchSimpleAI = async (prompt: string, model: string): Promise<string> => {
    try {
        const analyzeSession = firebase.functions().httpsCallable('analyzeSession');
        const result = await analyzeSession({
            prompt: prompt,
            model: model
        });
        return result.data.text || "No AI response.";
    } catch (error: any) {
        console.error("Simple AI Error:", error);
        return `Error: ${error.details || error.message || 'Unknown'}`;
    }
};