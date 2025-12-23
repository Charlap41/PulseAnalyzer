
export interface DataPoint {
    ts: number;
    hr: number;
}

export interface Dataset {
    id: string;
    name: string;
    data: DataPoint[];
    color: string;
    offset: number;
    visible: boolean;
    startTime: number;
}

export interface AnalysisResult {
    device: string;
    activity: string;
    mae: number;
    stdDevError: number;
    correlation: number;
    rmse: number;
    bias: number;
    dropouts: number;
    dropoutDetails?: { start: number; end: number; duration: number }[];
    score: number; // New Trust Score (0-100)
    dynamicMae: number;
    dataPoints: number;
}

export interface Session {
    id: string;
    name: string;
    type: string;
    date: number; // Timestamp of the actual activity
    createdAt: number; // Timestamp of import
    datasets: Dataset[];
    analysisResults: AnalysisResult[];
    analysisText: string;
    referenceDatasetId: string | null;
    lastAnalysisSignature: string;
}

export interface User {
    uid: string;
    email: string | null;
}

export type ViewState = 'landing' | 'app' | 'help' | 'privacy' | 'terms' | 'contact' | 'quick-analysis';

export type Language = 'fr' | 'en';

export type SubscriptionPlan = 'free' | '24h' | 'annual';

// Window augmentation for libraries loaded via script tag
declare global {
    interface Window {
        FitParser: any;
        Chart: any;
        html2canvas: any;
        jspdf: any;
        ChartZoom: any;
    }
}
