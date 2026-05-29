import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { 
    Search, 
    Building, 
    CheckCircle, 
    XCircle, 
    Copy, 
    AlertCircle, 
    RefreshCw, 
    Calendar, 
    Mail, 
    Phone, 
    MapPin, 
    Building2, 
    Landmark, 
    Check, 
    ShieldCheck, 
    ExternalLink,
    X,
    Download,
    History,
    QrCode,
    Sparkles,
    AlertTriangle,
    FileText,
    Upload,
    Camera,
    Video,
    Volume2,
    Sun,
    Moon,
    Image as ImageIcon,
    Scale,
    ArrowLeftRight,
    Printer,
    Palette
} from 'lucide-react';
import { fetchRucDetails, RucBusinessDetails } from '../services/pseService';
import { isValidRUC } from '../services/riskService';
import { useAuth } from '../context/AuthContext';
import { AppRole } from '../types';
import { jsPDF } from 'jspdf';
import { validateBankAccount } from '../services/validationService';

interface RucLookupProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectBusiness?: (business: RucBusinessDetails) => void;
}

const PRESET_RUCS = [
    { ruc: "20123456789", name: "Corp. Textil Gamarra" },
    { ruc: "20601234567", name: "SAMI Finanzas & Tech" },
    { ruc: "20543210987", name: "Inversiones Alimentos" },
    { ruc: "20489218291", name: "Metalúrgica Lima Norte" },
    { ruc: "10456782912", name: "Juan Gómez (Bodega)" }
];

const containerVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.02,
            type: "spring",
            stiffness: 100,
            damping: 18
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { 
        opacity: 1, 
        y: 0,
        transition: { type: "spring", stiffness: 100, damping: 15 }
    }
};

const inputVariants = {
    idle: {
        scale: 1,
        x: 0,
        boxShadow: "0 0 0 0px rgba(16, 185, 129, 0)"
    },
    pulse: {
        scale: [1, 1.02, 1],
        boxShadow: [
            "0 0 0 0px rgba(16, 185, 129, 0)",
            "0 0 0 6px rgba(16, 185, 129, 0.4)",
            "0 0 0 0px rgba(16, 185, 129, 0)"
        ],
        transition: { duration: 0.5, ease: "easeInOut" }
    },
    shake: {
        x: [0, -8, 8, -6, 6, -3, 3, 0],
        transition: { duration: 0.4 }
    }
};

const calculateRiskMetrics = (details: any) => {
    if (!details) return null;

    let score = 30; // base score

    const positiveFactors: string[] = [];
    const warningFactors: string[] = [];

    // 1. Active State
    if (details.active) {
        score += 25;
        positiveFactors.push("Contribuyente ACTIVO en SUNAT");
    } else {
        score -= 40;
        warningFactors.push("BAJA DE OFICIO o INACTIVO (Riesgo tributario crítico)");
    }

    // 2. Condition
    if (details.condition === 'HABIDO') {
        score += 15;
        positiveFactors.push("Domicilio Fiscal HABIDO (Localizable/Verificado)");
    } else if (details.condition) {
        score -= 25;
        warningFactors.push(`Condición de Domicilio: ${details.condition} (Local no verificado)`);
    } else {
        score -= 25;
        warningFactors.push("Domicilio Fiscal NO HABIDO");
    }

    // 3. Tax Regime
    const regime = (details.taxRegime || '').toUpperCase();
    if (regime.includes('MYPE TRIBUTARIO') || regime.includes('RMT')) {
        score += 15;
        positiveFactors.push("Régimen MYPE Tributario (Alta idoneidad crediticia)");
    } else if (regime.includes('GENERAL')) {
        score += 15;
        positiveFactors.push("Régimen General (Firma consolidada / Gran escala)");
    } else if (regime.includes('ESPECIAL') || regime.includes('RER')) {
        score += 10;
        positiveFactors.push("Régimen Especial (RER) de comercio o servicios");
    } else if (regime.includes('RUS') || regime.includes('SIMPLE')) {
        score += 5;
        warningFactors.push("Nuevo RUS (Límites de venta reducidos para financiamiento)");
    } else {
        score += 5;
    }

    // 4. Electronic Billing
    if (details.electronicBilling) {
        score += 10;
        positiveFactors.push("Facturación Electrónica Activa (Buen historial digital)");
    } else {
        score -= 5;
        warningFactors.push("Sin registro de Facturación Electrónica activa");
    }

    // 5. Retaining and Perception Agents
    if (details.retainingAgent) {
        score += 10;
        positiveFactors.push("AGENTE DE RETENCIÓN (Confianza fiscal SUNAT)");
    }
    if (details.agentOfPerception) {
        score += 10;
        positiveFactors.push("AGENTE DE PERCEPCIÓN (Garante fiscal verificado)");
    }

    // 6. Registration seniority
    const regDate = details.registrationDate || '';
    if (regDate) {
        const match = regDate.match(/\d{4}/);
        if (match) {
            const year = parseInt(match[0], 10);
            const currentYear = new Date().getFullYear();
            const years = currentYear - year;
            if (years >= 8) {
                score += 10;
                positiveFactors.push(`Sólida trayectoria: +${years} años en SUNAT`);
            } else if (years >= 3) {
                score += 5;
                positiveFactors.push(`Antigüedad media: ${years} años operando`);
            } else {
                warningFactors.push(`Firma de reciente constitución: ${years} años de antigüedad`);
            }
        }
    }

    score = Math.max(5, Math.min(100, score));

    // Determine category
    let riskLevel = 'Moderado';
    let riskColor = 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    let label = 'Riesgo Moderado';
    
    if (score >= 80) {
        riskLevel = 'Bajo';
        riskColor = 'text-green-400 bg-green-500/10 border-green-500/25';
        label = 'Riesgo Bajo (A++)';
    } else if (score >= 60) {
        riskLevel = 'Bajo';
        riskColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
        label = 'Riesgo Moderado-Bajo (A)';
    } else if (score >= 45) {
        riskLevel = 'Moderado';
        riskColor = 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
        label = 'Riesgo Moderado (B)';
    } else if (score >= 30) {
        riskLevel = 'Alto';
        riskColor = 'text-orange-500 bg-orange-500/10 border-orange-500/20';
        label = 'Riesgo Alto (C)';
    } else {
        riskLevel = 'Crítico';
        riskColor = 'text-rose-500 bg-rose-500/10 border-rose-500/20';
        label = 'Riesgo Crítico (D/E)';
    }

    return {
        score,
        riskLevel,
        riskColor,
        label,
        positives: positiveFactors,
        warnings: warningFactors
    };
};

const getThemeClass = (paletteName: 'slate-dark' | 'slate-light' | 'high-contrast' | 'emerald' | 'warm') => {
    switch (paletteName) {
        case 'slate-dark':
            return {
                modalBg: 'bg-gray-900 border-white/10 text-gray-205 text-gray-200 shadow-2xl',
                headerBg: 'bg-white/5 border-white/5',
                headerTitle: 'text-white',
                headerSubtitle: 'text-gray-400',
                bodyBg: 'bg-gray-900 text-gray-200',
                cardBg: 'bg-white/5 border-white/10',
                borderCol: 'border-white/10',
                textMuted: 'text-gray-400',
                textPrimary: 'text-gray-100',
                textContrast: 'text-white',
                inputBg: 'bg-slate-950/40',
                inputBorder: 'border-white/10',
                inputText: 'text-gray-205 text-gray-200',
                btnPrimary: 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white',
                labelAccent: 'text-indigo-400 font-extrabold'
            };
        case 'high-contrast':
            return {
                modalBg: 'bg-black border-2 border-white text-white font-semibold shadow-[0_0_20px_rgba(255,255,255,0.4)]',
                headerBg: 'bg-black border-b-2 border-white',
                headerTitle: 'text-yellow-400 font-extrabold tracking-wider',
                headerSubtitle: 'text-yellow-300 font-black',
                bodyBg: 'bg-black text-white',
                cardBg: 'bg-black border border-white',
                borderCol: 'border-white',
                textMuted: 'text-yellow-305 text-yellow-300 font-bold',
                textPrimary: 'text-white font-extrabold',
                textContrast: 'text-cyan-400 font-black',
                inputBg: 'bg-black',
                inputBorder: 'border-white',
                inputText: 'text-white font-black',
                btnPrimary: 'bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-black border border-white font-black',
                labelAccent: 'text-yellow-450 text-yellow-400 font-black'
            };
        case 'emerald':
            return {
                modalBg: 'bg-stone-955 bg-stone-90c bg-stone-950 border-emerald-500/30 text-emerald-100 shadow-[0_15px_50px_rgba(4,120,87,0.15)]',
                headerBg: 'bg-emerald-950/20 border-b border-emerald-500/20',
                headerTitle: 'text-emerald-300 font-extrabold',
                headerSubtitle: 'text-emerald-400/80',
                bodyBg: 'bg-stone-950 text-emerald-100',
                cardBg: 'bg-emerald-955 bg-emerald-950/45 border border-emerald-500/20',
                borderCol: 'border-emerald-500/20',
                textMuted: 'text-emerald-300/70',
                textPrimary: 'text-emerald-100 font-medium',
                textContrast: 'text-emerald-300 font-bold',
                inputBg: 'bg-emerald-950/40',
                inputBorder: 'border-emerald-500/25',
                inputText: 'text-emerald-200 font-semibold',
                btnPrimary: 'bg-emerald-600 hover:bg-emerald-550 active:bg-emerald-700 text-white font-bold',
                labelAccent: 'text-emerald-400 font-bold'
            };
        case 'warm':
            return {
                modalBg: 'bg-[#faf6ee] border-amber-200 text-amber-900 shadow-2xl',
                headerBg: 'bg-amber-100/50 border-b border-amber-200',
                headerTitle: 'text-amber-950 font-black',
                headerSubtitle: 'text-amber-805 text-amber-800/80',
                bodyBg: 'bg-[#faf6ee] text-amber-900',
                cardBg: 'bg-white border border-amber-200 shadow-sm',
                borderCol: 'border-amber-205 border-amber-200/50',
                textMuted: 'text-amber-800/70',
                textPrimary: 'text-amber-900',
                textContrast: 'text-amber-950 font-bold',
                inputBg: 'bg-white',
                inputBorder: 'border-amber-204 border-amber-200',
                inputText: 'text-amber-900 font-semibold',
                btnPrimary: 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold',
                labelAccent: 'text-amber-700 font-bold'
            };
        case 'slate-light':
        default:
            return {
                modalBg: 'bg-slate-50 border-slate-200 text-slate-700 shadow-2xl',
                headerBg: 'bg-slate-100 border-b border-slate-200',
                headerTitle: 'text-slate-900 font-extrabold',
                headerSubtitle: 'text-slate-505 text-slate-500',
                bodyBg: 'bg-slate-50 text-slate-700',
                cardBg: 'bg-white border border-slate-250 border-slate-200 shadow-sm',
                borderCol: 'border-slate-200',
                textMuted: 'text-slate-500',
                textPrimary: 'text-slate-905 text-slate-900',
                textContrast: 'text-slate-950 font-semibold',
                inputBg: 'bg-white',
                inputBorder: 'border-slate-300',
                inputText: 'text-slate-800',
                btnPrimary: 'bg-indigo-650 bg-indigo-600 hover:bg-indigo-705 text-white font-bold shadow-sm',
                labelAccent: 'text-indigo-650 text-indigo-700 font-bold'
            };
    }
};

export const RucLookup: React.FC<RucLookupProps> = ({ isOpen, onClose, onSelectBusiness }) => {
    const { currentUser } = useAuth();
    const [isModalDarkMode, setIsModalDarkMode] = useState(true);
    const [modalPalette, setModalPalette] = useState<'slate-dark' | 'slate-light' | 'high-contrast' | 'emerald' | 'warm'>(() => {
        try {
            const saved = localStorage.getItem('sami_ruc_modal_palette');
            return (saved as any) || 'slate-dark';
        } catch {
            return 'slate-dark';
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('sami_ruc_modal_palette', modalPalette);
        } catch (e) {}

        if (modalPalette === 'slate-dark' || modalPalette === 'high-contrast' || modalPalette === 'emerald') {
            setIsModalDarkMode(true);
        } else {
            setIsModalDarkMode(false);
        }
    }, [modalPalette]);

    const [rucQuery, setRucQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [fetchingProgress, setFetchingProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<RucBusinessDetails | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [powerExpiryDate, setPowerExpiryDate] = useState<string>('');
    const [queryLatency, setQueryLatency] = useState<number | null>(null);
    const [creditLimitInput, setCreditLimitInput] = useState<string>('');
    const [powerFile, setPowerFile] = useState<{ name: string; size: string } | null>(null);
    const [isFileDragging, setIsFileDragging] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);

    // Dynamic Credit Limit Recalculation engine states
    const [activityLevel, setActivityLevel] = useState<'low' | 'medium' | 'high' | 'excellent'>('medium');
    const [recalcLoading, setRecalcLoading] = useState(false);
    const [recalcSummary, setRecalcSummary] = useState<{
        previousLimit: number;
        newLimit: number;
        reasons: string[];
        riskScore: number;
        riskLevel: 'Bajo' | 'Moderado' | 'Alto' | 'Extremo';
        isApplied?: boolean;
    } | null>(null);

    const historicalDebtCapacityData = useMemo(() => {
        if (!result) return [];
        const currentLimit = result.creditLimit || 25000;
        const seedValue = parseInt(result.ruc.slice(-4)) || 1234;
        const multipliers = [
            0.62 + (seedValue % 8) * 0.02,
            0.75 - ((seedValue >> 1) % 6) * 0.015,
            0.82 + ((seedValue >> 2) % 5) * 0.02,
            0.70 - ((seedValue >> 3) % 4) * 0.015,
            0.90 + ((seedValue >> 4) % 6) * 0.01,
            1.00
        ];
        const months = ['Dic 2025', 'Ene 2026', 'Feb 2026', 'Mar 2026', 'Abr 2026', 'May 2026'];
        return months.map((month, idx) => {
            const limit = Math.round(currentLimit * multipliers[idx]);
            const capacity = Math.round(limit * (0.75 + (idx * 0.035)));
            return {
                mes: month,
                'Límite de Crédito': limit,
                'Capacidad de Endeudamiento': capacity,
            };
        });
    }, [result, result?.creditLimit]);

    const [isComparePickerOpen, setIsComparePickerOpen] = useState(false);

    // Digital Signature Validation states
    const [pkiValidationStep, setPkiValidationStep] = useState<'idle' | 'analyzing' | 'verifying' | 'valid' | 'invalid'>('idle');
    const [pkiValidationProgress, setPkiValidationProgress] = useState(0);
    const [signatureHash, setSignatureHash] = useState<string>('');
    const [pkiForceInvalid, setPkiForceInvalid] = useState(false);
    const [pkiErrorMessage, setPkiErrorMessage] = useState<string | null>(null);

    // QR Camera Scanner States
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scannerStream, setScannerStream] = useState<MediaStream | null>(null);
    const [scannerError, setScannerError] = useState<string | null>(null);
    const [scannerStatus, setScannerStatus] = useState<'idle' | 'initializing' | 'scanning' | 'detected' | 'error'>('idle');
    const [scannedResult, setScannedResult] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    // Document Camera OCR Scanner States (Physical RUC Scan)
    const [isDocCameraOpen, setIsDocCameraOpen] = useState(false);
    const [docCameraStream, setDocCameraStream] = useState<MediaStream | null>(null);
    const [docCameraError, setDocCameraError] = useState<string | null>(null);
    const [docCameraStatus, setDocCameraStatus] = useState<'idle' | 'initializing' | 'scanning' | 'captured' | 'analyzing' | 'extracted' | 'error'>('idle');
    const [docOcrDetectedRuc, setDocOcrDetectedRuc] = useState<string | null>(null);
    const [docOcrProgress, setDocOcrProgress] = useState(0);
    const [docCameraCapturedImage, setDocCameraCapturedImage] = useState<string | null>(null);
    const [capturedImageBase64, setCapturedImageBase64] = useState<string | null>(null);
    const [isOcrAnalyzingTradeName, setIsOcrAnalyzingTradeName] = useState(false);
    const docVideoRef = useRef<HTMLVideoElement | null>(null);
    const docCanvasRef = useRef<HTMLCanvasElement | null>(null);

    const analyzeTradeName = async (imageSrc: string, rucVal: string) => {
        setIsOcrAnalyzingTradeName(true);
        console.log("[SAMI OCR] Sending captured MYPE RUC image to analyzer...");
        try {
            const response = await fetch('/api/v1/ocr/analyze-trade-name', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ image: imageSrc, ruc: rucVal })
            });
            const data = await response.json();
            if (data.success && data.tradeName) {
                setResult(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        tradeName: data.tradeName
                    };
                });
                console.log("[SAMI OCR] Trade name successfully extracted:", data.tradeName);
            }
        } catch (err) {
            console.error("[SAMI OCR] Error scanning trade name:", err);
        } finally {
            setIsOcrAnalyzingTradeName(false);
        }
    };

    // Mock OCR Image Upload States
    const [isOcrOpen, setIsOcrOpen] = useState(false);
    const [inputAnimationState, setInputAnimationState] = useState<"idle" | "pulse" | "shake">("idle");

    // Bank Account Verification and SAMI Partnership states
    const [bankAccountNum, setBankAccountNum] = useState('00219100234567890123'); // Default 20-digit CCI
    const [bankSelected, setBankSelected] = useState('banco_c'); // Default to Banco ProMYPE
    const [bankSyncStatus, setBankSyncStatus] = useState<'idle' | 'validating' | 'checking_partnership' | 'synchronized' | 'failed' | 'no_partnership'>('idle');
    const [bankSyncMessage, setBankSyncMessage] = useState<string | null>(null);
    const [bankAccountHolder, setBankAccountHolder] = useState<string>('');

    const triggerPulse = () => {
        setInputAnimationState("idle");
        setTimeout(() => {
            setInputAnimationState("pulse");
        }, 10);
    };

    const triggerShake = () => {
        setInputAnimationState("idle");
        setTimeout(() => {
            setInputAnimationState("shake");
        }, 10);
    };
    const [ocrFile, setOcrFile] = useState<{ name: string; size: string; previewUrl: string } | null>(null);
    const [ocrStatus, setOcrStatus] = useState<'idle' | 'reading' | 'parsing' | 'extracted' | 'error'>('idle');
    const [ocrDetectedRuc, setOcrDetectedRuc] = useState<string | null>(null);
    const [ocrError, setOcrError] = useState<string | null>(null);
    const ocrInputRef = useRef<HTMLInputElement>(null);
    const [logoStyle, setLogoStyle] = useState<'tech' | 'traditional' | 'eco'>('tech');

    const stopDocCamera = () => {
        if (docCameraStream) {
            docCameraStream.getTracks().forEach(track => {
                track.stop();
                console.log(`[Doc Camera] Track ${track.label} stopped.`);
            });
            setDocCameraStream(null);
        }
        setIsDocCameraOpen(false);
        setDocCameraStatus('idle');
    };

    const stopScanner = () => {
        if (scannerStream) {
            scannerStream.getTracks().forEach(track => {
                track.stop();
                console.log(`[Camera] Track ${track.label} stopped.`);
            });
            setScannerStream(null);
        }
        setIsScannerOpen(false);
        setScannerStatus('idle');
    };

    useEffect(() => {
        if (!isOpen) {
            stopScanner();
            stopDocCamera();
        }
        return () => {
            if (scannerStream) {
                scannerStream.getTracks().forEach(track => track.stop());
            }
            if (docCameraStream) {
                docCameraStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isOpen]);

    const startDocCamera = async () => {
        // Stop any other active scanner
        if (scannerStream) {
            scannerStream.getTracks().forEach(track => track.stop());
            setScannerStream(null);
            setIsScannerOpen(false);
            setScannerStatus('idle');
        }
        setIsOcrOpen(false);
        setCompareMode(false);

        setIsDocCameraOpen(true);
        setDocCameraStatus('initializing');
        setDocCameraError(null);
        setDocOcrDetectedRuc(null);
        setDocOcrProgress(0);
        setDocCameraCapturedImage(null);
        setCapturedImageBase64(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            setDocCameraStream(stream);
            setDocCameraStatus('scanning');

            setTimeout(() => {
                if (docVideoRef.current) {
                    docVideoRef.current.srcObject = stream;
                    docVideoRef.current.play().catch(e => console.error("Error starting doc video playback:", e));
                }
            }, 150);
        } catch (err: any) {
            console.error("Doc Camera access error:", err);
            setDocCameraError(
                err.name === 'NotAllowedError'
                    ? 'Permiso de cámara denegado. Habilite el acceso en su navegador para escanear documentos.'
                    : 'No se encontró un de cámara activo o no es compatible en este navegador/entorno.'
            );
            setDocCameraStatus('error');
        }
    };

    const captureAndExtractDoc = (customRuc?: string) => {
        if (docCameraStatus !== 'scanning') return;

        // Try to capture a frame from the live video stream onto a virtual canvas
        if (docCanvasRef.current && docVideoRef.current) {
            const video = docVideoRef.current;
            const canvas = docCanvasRef.current;
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                try {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const dataUrl = canvas.toDataURL('image/jpeg');
                    setDocCameraCapturedImage(dataUrl);
                    setCapturedImageBase64(dataUrl);
                } catch (e) {
                    console.log("[Doc Camera] Non-blocking canvas draw error: ", e);
                }
            }
        }

        // Stop stream so the video player freezes on the final capture state
        if (docCameraStream) {
            docCameraStream.getTracks().forEach(track => track.stop());
            setDocCameraStream(null);
        }

        setDocCameraStatus('analyzing');
        setDocOcrProgress(10);

        // Simulated high-fidelity OCR scanning interval
        const interval = setInterval(() => {
            setDocOcrProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return prev + 15;
            });
        }, 250);

        // Select chosen or random preset RUC
        const selectedRuc = customRuc || PRESET_RUCS[Math.floor(Math.random() * PRESET_RUCS.length)].ruc;

        setTimeout(() => {
            clearInterval(interval);
            setDocOcrProgress(100);
            setDocOcrDetectedRuc(selectedRuc);
            setDocCameraStatus('extracted');

            // Play high quality feedback beep
            try {
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                oscillator.type = 'triangle';
                oscillator.frequency.value = 660;
                gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.2);
            } catch (e) {
                // Audio blocked or unsupported
            }

            // Autofill query search and clear camera state on success
            setTimeout(() => {
                setRucQuery(selectedRuc);
                stopDocCamera();
                setTimeout(() => {
                    handleSearch(selectedRuc);
                }, 250);
            }, 1500);

        }, 2200);
    };

    const startScanner = async () => {
        setIsScannerOpen(true);
        setScannerStatus('initializing');
        setScannerError(null);
        setScannedResult(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            setScannerStream(stream);
            setScannerStatus('scanning');
            
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(e => console.error("Error starting video playback:", e));
                }
            }, 150);
        } catch (err: any) {
            console.error("Camera access error:", err);
            setScannerError(
                err.name === 'NotAllowedError' 
                    ? 'Permiso de cámara denegado. Habilite el acceso en su navegador para escanear.' 
                    : 'No se encontró un dispositivo de cámara activo o no es compatible en este navegador/entorno.'
            );
            setScannerStatus('error');
        }
    };

    const handleScanSuccess = (ruc: string) => {
        setScannedResult(ruc);
        setScannerStatus('detected');
        
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.value = 880;
            gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.15);
        } catch (e) {
            // Audio context failed or blocked by browser permission policies, ignore
        }

        setTimeout(() => {
            setRucQuery(ruc);
            stopScanner();
            setTimeout(() => {
                handleSearch(ruc);
            }, 250);
        }, 1250);
    };

    const handleOcrFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        processOcrFile(file);
    };

    const handleOcrFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        processOcrFile(file);
    };

    const processOcrFile = (file: File | undefined) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setOcrError('Por favor seleccione un archivo de imagen válido (PNG, JPG, WEBP).');
            setOcrStatus('error');
            return;
        }

        setOcrError(null);
        setOcrStatus('reading');
        
        const sizeStr = (file.size / 1024).toFixed(1) + ' KB';
        const previewUrl = URL.createObjectURL(file);
        setOcrFile({
            name: file.name,
            size: sizeStr,
            previewUrl
        });

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setCapturedImageBase64(base64String);
        };
        reader.readAsDataURL(file);

        // Stage 1: Reading file
        setTimeout(() => {
            setOcrStatus('parsing');
            
            // Stage 2: Parsing/Extracting RUC
            setTimeout(() => {
                // Select a random sample RUC from PRESET_RUCS
                const randomIndex = Math.floor(Math.random() * PRESET_RUCS.length);
                const selectedPreset = PRESET_RUCS[randomIndex];
                
                setOcrDetectedRuc(selectedPreset.ruc);
                setOcrStatus('extracted');

                // Play success beep
                try {
                    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const oscillator = audioCtx.createOscillator();
                    const gainNode = audioCtx.createGain();
                    oscillator.type = 'sine';
                    oscillator.frequency.value = 1100;
                    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
                    oscillator.connect(gainNode);
                    gainNode.connect(audioCtx.destination);
                    oscillator.start();
                    oscillator.stop(audioCtx.currentTime + 0.18);
                } catch (be_err) {
                    // Ignored if blocked
                }

                // Automatically insert the RUC into the query search box and submit search after 1.8s
                setTimeout(() => {
                    setRucQuery(selectedPreset.ruc);
                    setIsOcrOpen(false);
                    setTimeout(() => {
                        handleSearch(selectedPreset.ruc);
                    }, 250);
                }, 1800);

            }, 1400);
        }, 900);
    };

    const resetOcr = () => {
        if (ocrFile?.previewUrl) {
            URL.revokeObjectURL(ocrFile.previewUrl);
        }
        setOcrFile(null);
        setOcrStatus('idle');
        setOcrDetectedRuc(null);
        setOcrError(null);
    };

    useEffect(() => {
        return () => {
            if (ocrFile?.previewUrl) {
                URL.revokeObjectURL(ocrFile.previewUrl);
            }
        };
    }, [ocrFile]);

    const isAdmin = currentUser?.role && (
        currentUser.role === AppRole.SAMI_ADMIN || 
        currentUser.role === AppRole.MYPE_ADMIN || 
        currentUser.role === AppRole.BANK_ADMIN || 
        currentUser.role === AppRole.BANK_SUPERVISOR ||
        (currentUser.role as string) === 'admin'
    );

    const [recentSearches, setRecentSearches] = useState<{ ruc: string; name: string }[]>(() => {
        try {
            const saved = localStorage.getItem('sami_ruc_recent_searches');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [compareMode, setCompareMode] = useState(false);
    const [compareRucA, setCompareRucA] = useState<string>('');
    const [compareRucB, setCompareRucB] = useState<string>('');
    const [detailsA, setDetailsA] = useState<RucBusinessDetails | null>(null);
    const [detailsB, setDetailsB] = useState<RucBusinessDetails | null>(null);
    const [isCompareLoading, setIsCompareLoading] = useState(false);
    const [rucCache, setRucCache] = useState<Record<string, RucBusinessDetails>>(() => {
        try {
            const saved = localStorage.getItem('sami_ruc_details_cache');
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    useEffect(() => {
        const loadCompareDetails = async () => {
            if (!compareRucA && !compareRucB) {
                setDetailsA(null);
                setDetailsB(null);
                return;
            }

            setIsCompareLoading(true);
            try {
                if (compareRucA && (!detailsA || detailsA.ruc !== compareRucA)) {
                    if (rucCache[compareRucA]) {
                        setDetailsA(rucCache[compareRucA]);
                    } else {
                        const res = await fetchRucDetails(compareRucA);
                        if (res) {
                            let savedLimit = 0;
                            try {
                                const savedLimits = localStorage.getItem('sami_ruc_credit_limits');
                                if (savedLimits) {
                                    savedLimit = JSON.parse(savedLimits)[compareRucA] || 0;
                                }
                            } catch {}
                            const details = savedLimit > 0 ? { ...res, creditLimit: savedLimit } : res;
                            setDetailsA(details);
                            setRucCache(prev => {
                                const updated = { ...prev, [compareRucA]: details };
                                try {
                                    localStorage.setItem('sami_ruc_details_cache', JSON.stringify(updated));
                                } catch {}
                                return updated;
                            });
                        } else {
                            setDetailsA(null);
                        }
                    }
                } else if (!compareRucA) {
                    setDetailsA(null);
                }

                if (compareRucB && (!detailsB || detailsB.ruc !== compareRucB)) {
                    if (rucCache[compareRucB]) {
                        setDetailsB(rucCache[compareRucB]);
                    } else {
                        const res = await fetchRucDetails(compareRucB);
                        if (res) {
                            let savedLimit = 0;
                            try {
                                const savedLimits = localStorage.getItem('sami_ruc_credit_limits');
                                if (savedLimits) {
                                    savedLimit = JSON.parse(savedLimits)[compareRucB] || 0;
                                }
                            } catch {}
                            const details = savedLimit > 0 ? { ...res, creditLimit: savedLimit } : res;
                            setDetailsB(details);
                            setRucCache(prev => {
                                const updated = { ...prev, [compareRucB]: details };
                                try {
                                    localStorage.setItem('sami_ruc_details_cache', JSON.stringify(updated));
                                } catch {}
                                return updated;
                            });
                        } else {
                            setDetailsB(null);
                        }
                    }
                } else if (!compareRucB) {
                    setDetailsB(null);
                }
            } catch (err) {
                console.error("Error loading comparison details:", err);
            } finally {
                setIsCompareLoading(false);
            }
        };

        loadCompareDetails();
    }, [compareRucA, compareRucB]);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isLoading) {
            setFetchingProgress(0);
            const startTime = Date.now();
            const duration = 1200; // Matches 1200ms simulated latency in fetchRucDetails
            interval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const percent = Math.min(Math.floor((elapsed / duration) * 100), 100);
                setFetchingProgress(percent);
                if (percent >= 100) {
                    if (interval) clearInterval(interval);
                }
            }, 30);
        } else {
            setFetchingProgress(0);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isLoading]);

    const getRucValidationStatus = () => {
        if (rucQuery.length === 0) return 'empty';
        if (rucQuery.length < 11) return 'incomplete';
        return isValidRUC(rucQuery) ? 'valid' : 'invalid';
    };

    const validationStatus = getRucValidationStatus();

    useEffect(() => {
        if (validationStatus === 'valid') {
            triggerPulse();
        } else if (validationStatus === 'invalid') {
            triggerShake();
        }
    }, [validationStatus]);

    const isPowerExpired = (() => {
        if (!powerExpiryDate) return false;
        try {
            const selectedDate = new Date(powerExpiryDate + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return selectedDate < today;
        } catch {
            return false;
        }
    })();

    const getBorderAndFocusClasses = () => {
        switch (validationStatus) {
            case 'valid':
                return 'border-green-500 focus:ring-green-500/30 focus:border-green-500';
            case 'invalid':
                return 'border-red-500 hover:border-red-400 focus:ring-red-500/30 focus:border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.1)]';
            case 'incomplete':
                return 'border-amber-500/40 focus:ring-amber-500/30 focus:border-amber-500';
            default:
                return isModalDarkMode
                    ? 'border-white/10 focus:ring-indigo-500/30 focus:border-indigo-500'
                    : 'border-slate-300 focus:ring-indigo-500/30 focus:border-indigo-500';
        }
    };

    if (!isOpen) return null;

    const handleSearch = async (targetRuc?: string) => {
        const query = targetRuc || rucQuery;
        setError(null);

        if (!query) {
            setError('Por favor, ingrese un número de RUC.');
            triggerShake();
            return;
        }

        if (query.length !== 11 || !/^\d+$/.test(query)) {
            setError('El RUC debe constar de exactamente 11 dígitos numéricos.');
            triggerShake();
            return;
        }

        if (!isValidRUC(query)) {
            // We can still search, but we show a warning or inform the user
            console.warn('[SUNAT] Checksum verification failed, but querying anyway.');
        }

        setIsLoading(true);
        setResult(null);
        setRecalcSummary(null);
        setActivityLevel('medium');
        setQueryLatency(null);
        const startTime = performance.now();

        try {
            const data = await fetchRucDetails(query);
            const endTime = performance.now();
            const rawDuration = Math.round(endTime - startTime);
            // Sunat queries usually have standard communication penalty, simulate realistic network baseline if too fast
            const baselineDuration = rawDuration < 60 ? rawDuration + Math.floor(Math.random() * 120) + 140 : rawDuration;
            setQueryLatency(baselineDuration);

            if (data) {
                let savedLimit = 0;
                try {
                    const savedLimits = localStorage.getItem('sami_ruc_credit_limits');
                    if (savedLimits) {
                        const limitsMap = JSON.parse(savedLimits);
                        savedLimit = limitsMap[data.ruc] || 0;
                    }
                } catch (e) {
                    console.error('[SUNAT] Error parsing saved credit limits:', e);
                }

                const dataWithLimit = savedLimit > 0 ? { ...data, creditLimit: savedLimit } : data;
                setResult(dataWithLimit);

                // Auto-detect trade name if an OCR image was captured or uploaded and tradeName is not present
                if (capturedImageBase64 && !dataWithLimit.tradeName) {
                    analyzeTradeName(capturedImageBase64, data.ruc);
                }
                setRucCache(prev => {
                    const updated = { ...prev, [data.ruc]: dataWithLimit };
                    try {
                        localStorage.setItem('sami_ruc_details_cache', JSON.stringify(updated));
                    } catch {}
                    return updated;
                });
                setCreditLimitInput(savedLimit > 0 ? savedLimit.toString() : '');
                // Default to 2 years in the future for power expiry
                const futureDate = new Date();
                futureDate.setFullYear(futureDate.getFullYear() + 2);
                setPowerExpiryDate(futureDate.toISOString().split('T')[0]);

                // Track successful search
                setRecentSearches(prev => {
                    const filtered = prev.filter(item => item.ruc !== data.ruc);
                    const updated = [{ ruc: data.ruc, name: data.businessName }, ...filtered].slice(0, 3);
                    try {
                        localStorage.setItem('sami_ruc_recent_searches', JSON.stringify(updated));
                    } catch (e) {
                        console.error('[SUNAT] Failed to save search history:', e);
                    }
                    return updated;
                });
            } else {
                setError('No se encontraron detalles para este RUC en el padrón de SUNAT.');
                triggerShake();
            }
        } catch (err) {
            setError('Error al conectar con el servidor de SUNAT / PSE.');
            triggerShake();
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = (text: string, fieldName: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 1500);
    };

    const handleCreditLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawVal = e.target.value.replace(/[^\d]/g, ''); // Digits only
        const valAsNum = rawVal ? parseInt(rawVal, 10) : 0;
        
        // Update local state for input rendering
        setCreditLimitInput(rawVal);

        // Save/persist value mapped by RUC in LocalStorage
        if (result) {
            const updatedResult = { ...result, creditLimit: valAsNum > 0 ? valAsNum : undefined };
            setResult(updatedResult);
            
            // Save to persistent credit limits map in localStorage
            try {
                const savedLimits = localStorage.getItem('sami_ruc_credit_limits');
                const limitsMap = savedLimits ? JSON.parse(savedLimits) : {};
                if (valAsNum > 0) {
                    limitsMap[result.ruc] = valAsNum;
                } else {
                    delete limitsMap[result.ruc];
                }
                localStorage.setItem('sami_ruc_credit_limits', JSON.stringify(limitsMap));
            } catch (error) {
                console.error('[SUNAT] Failed to persist credit limit:', error);
            }
        }
    };

    const handleRecalculateCreditLimit = () => {
        if (!result) return;
        setRecalcLoading(true);
        
        setTimeout(() => {
            const baseLimit = result.creditLimit || 22000;
            
            // Expiry multiplier
            let powerMultiplier = 1.0;
            let expiryDays: number | null = null;
            
            if (!powerExpiryDate) {
                powerMultiplier = 0.4; // 60% penalty
            } else {
                try {
                    const expiryDateObj = new Date(powerExpiryDate + 'T00:00:00');
                    const todayObj = new Date('2026-05-23T00:00:00'); // Use precise user system context date
                    const diffTime = expiryDateObj.getTime() - todayObj.getTime();
                    expiryDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    if (expiryDays < 0) {
                        powerMultiplier = 0.1; // 90% penalty
                    } else if (expiryDays <= 30) {
                        powerMultiplier = 0.7; // 30% penalty
                    } else if (expiryDays > 180) {
                        powerMultiplier = 1.25; // 25% bonus
                    }
                } catch {
                    powerMultiplier = 0.4;
                }
            }
            
            // Signature verification multiplier
            let signatureMultiplier = 1.0;
            if (powerFile) {
                if (pkiValidationStep === 'valid') {
                    signatureMultiplier = 1.15; // 15% bonus for certified cryptographic signature
                } else if (pkiValidationStep === 'invalid') {
                    signatureMultiplier = 0.45; // 55% penalty for tampered signature or invalid PKI
                } else if (pkiValidationStep === 'analyzing' || pkiValidationStep === 'verifying') {
                    signatureMultiplier = 0.80; // 20% penalty while verification is pending
                }
            }
            
            // Activity level multiplier
            let activityMultiplier = 1.0;
            if (activityLevel === 'low') {
                activityMultiplier = 0.6;
            } else if (activityLevel === 'high') {
                activityMultiplier = 1.5;
            } else if (activityLevel === 'excellent') {
                activityMultiplier = 2.1;
            }
            
            // SUNAT parameters
            let sunatMultiplier = 1.0;
            if (result.electronicBilling) sunatMultiplier += 0.15;
            if (result.retainingAgent) sunatMultiplier += 0.20;
            if (result.agentOfPerception) sunatMultiplier += 0.20;
            
            // Combined calculation
            const rawNewLimit = baseLimit * powerMultiplier * signatureMultiplier * activityMultiplier * sunatMultiplier;
            const newLimit = Math.max(0, Math.round(rawNewLimit / 500) * 500); // Rounded to nearest S/. 500
            
            // Reasons list
            const reasons: string[] = [];
            
            if (!powerExpiryDate) {
                reasons.push("⚠️ Sin vigencia legal confirmada: No se registró Fecha de Vencimiento de Poder (Penalidad -60%).");
            } else if (expiryDays !== null && expiryDays < 0) {
                reasons.push("❌ Alerta de Riesgo Legal: Firma y Poder vencido en el padrón (Penalidad -90%).");
            } else if (expiryDays !== null && expiryDays <= 30) {
                reasons.push("⚠️ Vencimiento de Poder próximo: Vigencia expira en menos de 30 días (Ajuste preventivo -30%).");
            } else if (expiryDays !== null && expiryDays > 180) {
                reasons.push("🛡️ Cobertura jurídica extendida: Certificado de vigencia de poder a largo plazo (+25%).");
            } else {
                reasons.push("✅ Poder legal vigente: Cobertura jurídica estándar verificada.");
            }

            // PKI Signature check reason additions
            if (powerFile) {
                if (pkiValidationStep === 'valid') {
                    reasons.push("🔒 Autenticidad PKI Certificada: El archivo de vigencia adjunto posee una firma digital válida verificada contra la clave pública (+15%).");
                } else if (pkiValidationStep === 'invalid') {
                    reasons.push("🚨 ALERTA CRÍTICA DE RIESGO: Firma digital inválida u alterada en vigencia cargada. Alto riesgo de falsificación documental (-55%).");
                } else {
                    reasons.push("⏳ Verificación de Integridad en Curso: Firma digital del pdf se encuentra en proceso de descifrado criptográfico (-20%).");
                }
            } else if (powerExpiryDate) {
                reasons.push("⚠️ Falta Respaldo Criptográfico: No se cargó copia literal firmada digitalmente para sustentar la vigencia declarada.");
            }
            
            if (activityLevel === 'low') {
                reasons.push("📉 Actividad comercial reducida: Ritmo de transacciones lento ajusta la exposición de riesgo (-40%).");
            } else if (activityLevel === 'high') {
                reasons.push("📈 Actividad comercial dinámica: Crecimiento y regularidad de flujos incrementan capacidad (+50%).");
            } else if (activityLevel === 'excellent') {
                reasons.push("🚀 Actividad comercial estelar: Facturación récord y excelentes flujos proyectados (+110%).");
            } else {
                reasons.push("🔹 Actividad comercial dentro del rango promedio estable.");
            }
            
            if (result.electronicBilling) {
                reasons.push("🔌 Facturador electrónico activo: Transparencia fiscal para scoring (+15%).");
            }
            if (result.retainingAgent) {
                reasons.push("💎 Excelente reputación y estatus fiscal: Agente de Retención SUNAT (+20%).");
            }
            if (result.agentOfPerception) {
                reasons.push("💎 Excelente reputación y estatus fiscal: Agente de Percepción SUNAT (+20%).");
            }
            
            // Risk score
            let baseScore = 50;
            if (!powerExpiryDate) baseScore -= 20;
            else if (expiryDays !== null && expiryDays < 0) baseScore -= 45;
            else if (expiryDays !== null && expiryDays <= 30) baseScore -= 10;
            else if (expiryDays !== null && expiryDays > 180) baseScore += 15;

            // PKI scoring adjustment
            if (powerFile) {
                if (pkiValidationStep === 'valid') baseScore += 15;
                else if (pkiValidationStep === 'invalid') baseScore -= 40;
                else if (pkiValidationStep === 'verifying' || pkiValidationStep === 'analyzing') baseScore -= 10;
            }
            
            if (activityLevel === 'low') baseScore -= 20;
            else if (activityLevel === 'high') baseScore += 15;
            else if (activityLevel === 'excellent') baseScore += 30;
            
            if (result.electronicBilling) baseScore += 10;
            if (result.retainingAgent || result.agentOfPerception) baseScore += 15;
            
            const riskScore = Math.min(100, Math.max(5, baseScore));
            
            let riskLevel: 'Bajo' | 'Moderado' | 'Alto' | 'Extremo' = 'Moderado';
            if (riskScore >= 75) riskLevel = 'Bajo';
            else if (riskScore >= 50) riskLevel = 'Moderado';
            else if (riskScore >= 30) riskLevel = 'Alto';
            else riskLevel = 'Extremo';
            
            setRecalcSummary({
                previousLimit: result.creditLimit || 0,
                newLimit,
                reasons,
                riskScore,
                riskLevel,
                isApplied: false
            });
            
            setRecalcLoading(false);
        }, 800);
    };

    const handleApplyRecalculatedLimit = () => {
        if (!result || !recalcSummary) return;
        
        const roundedLimit = recalcSummary.newLimit;
        
        // Update input
        setCreditLimitInput(String(roundedLimit));
        
        // Update model details
        const updatedResult = { ...result, creditLimit: roundedLimit };
        setResult(updatedResult);
        
        // Update cache
        setRucCache(prev => {
            const updated = { ...prev, [result.ruc]: updatedResult };
            try {
                localStorage.setItem('sami_ruc_details_cache', JSON.stringify(updated));
            } catch {}
            return updated;
        });
        
        // Save to persistent credit limits map in localStorage
        try {
            const savedLimits = localStorage.getItem('sami_ruc_credit_limits');
            const limitsMap = savedLimits ? JSON.parse(savedLimits) : {};
            if (roundedLimit > 0) {
                limitsMap[result.ruc] = roundedLimit;
            } else {
                delete limitsMap[result.ruc];
            }
            localStorage.setItem('sami_ruc_credit_limits', JSON.stringify(limitsMap));
        } catch (error) {
            console.error('[SUNAT] Failed to persist credit limit:', error);
        }
        
        // Mark as applied
        setRecalcSummary(prev => prev ? { ...prev, isApplied: true } : null);
    };

    const handleSyncBank = async () => {
        if (!bankAccountNum) {
            setBankSyncStatus('failed');
            setBankSyncMessage('Por favor ingrese un número de cuenta válido.');
            return;
        }

        setBankSyncStatus('validating');
        setBankSyncMessage('Validando existencia de cuenta corriente comercial en la SBS...');

        try {
            // Step 1: Validate bank account with SBS
            const validation = await validateBankAccount(bankAccountNum, bankSelected);
            
            if (!validation.isValid) {
                setBankSyncStatus('failed');
                setBankSyncMessage(validation.message || 'Error de validación de la cuenta con la SBS.');
                return;
            }

            // Step 2: Check active partnership with SAMI
            setBankSyncStatus('checking_partnership');
            setBankSyncMessage('Petición PSE iniciada: Verificando alianza de conciliación activa con SAMI...');
            
            await new Promise(resolve => setTimeout(resolve, 1500));

            const hasActivePartnership = ['banco_c', 'caja_b', 'fintech_a'].includes(bankSelected);

            if (hasActivePartnership) {
                setBankSyncStatus('synchronized');
                setBankAccountHolder(validation.data?.accountHolder || 'MYPE ASOCIADA AL PADRÓN');
                setBankSyncMessage('¡Sincronización Exitosa! Asociación activa encontrada. Integración bidireccional de estados de cuenta vía PSE habilitada.');
                
                // Add a cool side effect: update dynamic scoring and recalc summary if they have run a recalc already!
                if (recalcSummary) {
                    setRecalcSummary(prev => {
                        if (!prev) return null;
                        // Avoid adding duplicates
                        const reasonsFiltered = prev.reasons.filter(r => !r.includes('Sincronización Bancaria'));
                        return {
                            ...prev,
                            newLimit: prev.newLimit + 5000, // Sync bonus
                            riskScore: Math.min(100, prev.riskScore + 8),
                            reasons: [
                                ...reasonsFiltered,
                                '⚡ Sincronización Bancaria Aliada: Alianza activa con SAMI otorga bonificación de credibilidad y +S/ 5,000 en límite de riesgo (+8%).'
                            ]
                        };
                    });
                }
            } else {
                setBankSyncStatus('no_partnership');
                setBankSyncMessage('Sin Alianza Directa: Cuenta válida pero este banco no cuenta con una alianza de sincronización en tiempo real con SAMI. Se requerirá la carga manual de estados de cuenta en PDF.');
            }
        } catch (err: any) {
            setBankSyncStatus('failed');
            setBankSyncMessage(err.message || 'Error en el servicio de sincronización PSE.');
        }
    };

    const startPkiVerification = (fileName: string, fileSize: string, forceIncorrect?: boolean) => {
        setPkiValidationStep('analyzing');
        setPkiValidationProgress(0);
        setPkiErrorMessage(null);
        
        // Compute a deterministic simulated SHA-256 hash
        let sum = 0;
        for (let i = 0; i < fileName.length; i++) {
            sum = (sum << 5) - sum + fileName.charCodeAt(i);
            sum |= 0;
        }
        const hex = Math.abs(sum).toString(16).padEnd(8, '4f');
        const simulatedHash = `SHA256: d5aec8f9024f92bc30a91f516a2d9db7e89ab06e789bc441ae8c9a${hex.substring(0, 4)}1f57d60`;
        setSignatureHash(simulatedHash);

        const isInvalid = forceIncorrect !== undefined ? forceIncorrect : pkiForceInvalid;

        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            setPkiValidationProgress(progress);
            if (progress === 30) {
                setPkiValidationStep('verifying');
            }
            if (progress >= 100) {
                clearInterval(interval);
                if (isInvalid) {
                    setPkiValidationStep('invalid');
                    setPkiErrorMessage("Alerta PKI: La firma digital del archivo de vigencia está alterada o la clave pública simulada no coincide.");
                } else {
                    setPkiValidationStep('valid');
                }
            }
        }, 120);
    };

    const handlePowerFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsFileDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            const sizeStr = (file.size / 1024).toFixed(1) + ' KB';
            setPowerFile({
                name: file.name,
                size: sizeStr
            });
            setFileError(null);
            startPkiVerification(file.name, sizeStr);
        }
    };

    const handlePowerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const sizeStr = (file.size / 1024).toFixed(1) + ' KB';
            setPowerFile({
                name: file.name,
                size: sizeStr
            });
            setFileError(null);
            startPkiVerification(file.name, sizeStr);
        }
    };

    const handleRemovePowerFile = () => {
        setPowerFile(null);
        setFileError(null);
        setPkiValidationStep('idle');
        setPkiValidationProgress(0);
        setPkiErrorMessage(null);
    };

    const triggerPreset = (ruc: string) => {
        setRucQuery(ruc);
        handleSearch(ruc);
    };

    const handleDownloadJson = () => {
        if (!result) return;
        const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ruc-${result.ruc}-sunat.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDownloadQr = async () => {
        if (!result) return;
        const text = `RUC: ${result.ruc}\nEmpresa: ${result.businessName}\nDirección: ${result.address}, ${result.district} - ${result.province}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(text)}`;
        try {
            const res = await fetch(qrUrl);
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `ruc-qr-${result.ruc}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error('[SUNAT] Failed to download QR natively, opening in new tab:', err);
            const fallbackLink = document.createElement('a');
            fallbackLink.href = qrUrl;
            fallbackLink.target = '_blank';
            fallbackLink.click();
        }
    };

    const getCompanyInitials = (name: string): string => {
        if (!name) return 'MP';
        const cleanName = name
            .replace(/\b(S\.?A\.?C?|E\.?I\.?R\.?L|S\.?R\.?L|S\.?A\.?A|S\.?A|S\.?R\.?L\.?T\.?D\.?A)\b/gi, '')
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
            .trim();
        const words = cleanName.split(/\s+/).filter(w => w.length > 0);
        if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
        if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
        return 'MP';
    };

    const drawLogoOnCanvas = (
        ctx: CanvasRenderingContext2D,
        ruc: string,
        businessName: string,
        style: 'tech' | 'traditional' | 'eco'
    ) => {
        // Base background: maintains blue and silver palette
        let bgGrad;
        if (style === 'tech') {
            // High-end brushed metal look / diagonal metallic blue & silver finish
            bgGrad = ctx.createLinearGradient(0, 0, 512, 512);
            bgGrad.addColorStop(0, '#090d16');    // deep steel blue-black
            bgGrad.addColorStop(0.25, '#1e293b'); // slate silver-blue
            bgGrad.addColorStop(0.4, '#475569');  // light metallic silver streak
            bgGrad.addColorStop(0.45, '#121824'); // steel groove gap shadow
            bgGrad.addColorStop(0.65, '#1e293b'); // mid slate steel
            bgGrad.addColorStop(0.8, '#475569');  // light metallic silver streak
            bgGrad.addColorStop(1, '#020617');    // deep dark steel plate
        } else {
            bgGrad = ctx.createRadialGradient(256, 256, 10, 256, 256, 360);
            bgGrad.addColorStop(0, '#0f172a'); // slate-900
            bgGrad.addColorStop(0.6, '#020617'); // slate-950
            bgGrad.addColorStop(1, '#020512');
        }
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 512, 512);

        if (style === 'tech') {
            // Finer, subtle silver gridlines (tech design blueprint vibe)
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.05)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            for (let i = 24; i < 512; i += 24) {
                ctx.moveTo(i, 0); ctx.lineTo(i, 512);
                ctx.moveTo(0, i); ctx.lineTo(512, i);
            }
            ctx.stroke();

            // Accent major gridlines (Fintech Blue touch)
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.12)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = 64; i < 512; i += 128) {
                ctx.moveTo(i, 0); ctx.lineTo(i, 512);
                ctx.moveTo(0, i); ctx.lineTo(512, i);
            }
            ctx.stroke();

            // Circular tech reticle layout (Silver & Blue)
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)'; // Slate silver
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            ctx.arc(256, 256, 220, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(59, 130, 246, 0.22)'; // Fintech Blue outer ring
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(256, 256, 185, 0, Math.PI * 2);
            ctx.stroke();

            // Hexagon with silver plating linear gradient
            const polyGrad = ctx.createLinearGradient(160, 160, 352, 352);
            polyGrad.addColorStop(0, '#ffffff'); // pure shiny silver
            polyGrad.addColorStop(0.3, '#94a3b8'); // mid silver
            polyGrad.addColorStop(0.7, '#cbd5e1'); // platinum highlight
            polyGrad.addColorStop(1, '#475569'); // dark slate steel
            ctx.strokeStyle = polyGrad;
            ctx.lineWidth = 4;
            ctx.beginPath();
            const sides = 6;
            const radius = 125;
            for (let i = 0; i <= sides; i++) {
                const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
                const x = 256 + radius * Math.cos(angle);
                const y = 256 + radius * Math.sin(angle);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();

            // Tech details: Connector dots on vertices (Vibrant blue & chrome cores)
            for (let i = 0; i < sides; i++) {
                const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
                const x = 256 + radius * Math.cos(angle);
                const y = 256 + radius * Math.sin(angle);
                
                // Blue outer glow
                ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
                ctx.beginPath();
                ctx.arc(x, y, 9, 0, Math.PI * 2);
                ctx.fill();

                // Inner Silver-blue cap
                ctx.fillStyle = '#60a5fa'; // tech blue
                ctx.beginPath();
                ctx.arc(x, y, 4.5, 0, Math.PI * 2);
                ctx.fill();

                // Bright Chrome center
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        } 
        else if (style === 'traditional') {
            // Elegant double circular border (Silver & Blue)
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)'; // Silver
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(256, 256, 220, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = '#3b82f6'; // Stately Blue
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(256, 256, 212, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)'; // Inner Silver ring
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(256, 256, 175, 0, Math.PI * 2);
            ctx.stroke();

            // Decorative star anchors (Silver)
            // Left star
            drawStar(ctx, 80, 256, 5, 10, 5);
            // Right star
            drawStar(ctx, 432, 256, 5, 10, 5);

            // Stately Laurel branch wreaths simulation (minimalist curves)
            ctx.strokeStyle = 'rgba(203, 213, 225, 0.25)'; // silver leaf vines
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(256, 256, 140, Math.PI * 0.25, Math.PI * 0.75);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(256, 256, 140, Math.PI * 1.25, Math.PI * 1.75);
            ctx.stroke();

            // Stately outer text banner
            ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
            ctx.fillStyle = '#94a3b8'; // Silver
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('• EXCELENCIA COMERCIAL •', 256, 68);
        }
        else if (style === 'eco') {
            // Soft rounded nested organic-looking canvas overlays
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)'; // Slate-blue
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(256, 256, 210, 0, Math.PI * 2);
            ctx.stroke();

            // Elegant single silver leaf curved stem
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)'; // Silver stem
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(100, 380);
            ctx.quadraticCurveTo(120, 100, 380, 100);
            ctx.stroke();

            const leafCoords = [
                {x: 120, y: 310, r: 8, angle: -Math.PI / 4},
                {x: 150, y: 220, r: 11, angle: -Math.PI / 4},
                {x: 200, y: 150, r: 12, angle: -Math.PI / 3},
                {x: 280, y: 115, r: 11, angle: -Math.PI / 6},
                {x: 350, y: 102, r: 8, angle: 0}
            ];

            const leafGrad = ctx.createLinearGradient(100, 100, 400, 400);
            leafGrad.addColorStop(0, '#60a5fa'); // blue
            leafGrad.addColorStop(0.5, '#94a3b8'); // silver
            leafGrad.addColorStop(1, '#3b82f6'); // darker blue
            ctx.fillStyle = leafGrad;

            leafCoords.forEach(leaf => {
                ctx.save();
                ctx.translate(leaf.x, leaf.y);
                ctx.rotate(leaf.angle);
                ctx.beginPath();
                ctx.ellipse(0, 0, leaf.r, leaf.r / 2, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                ctx.lineWidth = 0.5;
                ctx.stroke();
                ctx.restore();
            });

            // Modern, clean, thin outer ring
            ctx.strokeStyle = 'rgba(96, 165, 250, 0.4)'; // Blue ring
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(256, 256, 175, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Initials formatting
        const initials = getCompanyInitials(businessName);

        // Core visual text: Initials
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const textGrad = ctx.createLinearGradient(120, 200, 380, 300);
        if (style === 'tech') {
            textGrad.addColorStop(0, '#ffffff');    // polished silver
            textGrad.addColorStop(0.3, '#ffffff');  // shiny highlight
            textGrad.addColorStop(0.5, '#cbd5e1');  // light silver
            textGrad.addColorStop(0.8, '#60a5fa');  // bright tech blue
            textGrad.addColorStop(1, '#1d4ed8');    // deep metallic cobalt
        } else if (style === 'traditional') {
            textGrad.addColorStop(0, '#ffffff');
            textGrad.addColorStop(0.3, '#94a3b8'); // stately silver
            textGrad.addColorStop(0.6, '#3b82f6'); // stately blue
            textGrad.addColorStop(1, '#0f172a'); // steel
        } else { // eco
            textGrad.addColorStop(0, '#ffffff');
            textGrad.addColorStop(0.4, '#cbd5e1'); // soft silver
            textGrad.addColorStop(0.8, '#60a5fa'); // sky blue
            textGrad.addColorStop(1, '#1e3a8a'); // dark navy
        }
        
        ctx.font = style === 'traditional' 
            ? '600 100px Georgia, Garamond, serif'
            : style === 'eco'
                ? '300 115px "Helvetica Neue", "Inter", sans-serif'
                : '900 110px "Space Grotesk", "Outfit", "Montserrat", "Century Gothic", sans-serif';

        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = style === 'tech' ? 12 : style === 'traditional' ? 16 : 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = textGrad;
        ctx.fillText(initials, 256, 246);

        // Reset shadow for other details
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Corporate design text (Fintech Blue & Silver accent)
        ctx.font = style === 'traditional'
            ? 'bold 12px Garamond, Georgia, serif'
            : style === 'eco'
                ? '500 13px system-ui, -apple-system, sans-serif'
                : '900 12px "Space Grotesk", "Outfit", "Century Gothic", sans-serif';

        ctx.fillStyle = style === 'eco' ? '#93c5fd' : '#60a5fa'; // Blue accent
        ctx.fillText(
            style === 'traditional' 
                ? '• REGISTRO CORPORATIVO •' 
                : style === 'eco' 
                    ? '• GESTIÓN COMERCIAL ECO •' 
                    : '• MYPE ENTERPRISE •', 
            256, 
            335
        );

        // Subtitle labels (Silver)
        ctx.font = style === 'tech'
            ? 'bold 10px "Space Grotesk", "Outfit", monospace'
            : 'bold 10px monospace';
        ctx.fillStyle = 'rgba(203, 213, 225, 0.4)';
        ctx.fillText(`RUC ${ruc}`, 256, 430);

        ctx.font = style === 'traditional'
            ? '600 9px Georgia, serif'
            : style === 'tech'
                ? '900 9px "Space Grotesk", "Outfit", sans-serif'
                : 'bold 9px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = 'rgba(96, 165, 250, 0.5)';
        ctx.fillText(
            style === 'traditional'
                ? 'PREMIUM HERITAGE SCORING'
                : style === 'eco'
                    ? 'ECOLOGICAL FINTECH SCORING'
                    : 'FINTECH PREMIUM IDENTITY', 
            256, 450
        );
    };

    const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fillStyle = '#cbd5e1'; // Silver star color
        ctx.fill();
    };

    const handleDownloadProfileLogo = () => {
        if (!result) return;
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        drawLogoOnCanvas(ctx, result.ruc, result.businessName, logoStyle);

        try {
            const url = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = url;
            a.download = `logo-${logoStyle}-perfil-${result.ruc}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (e) {
            console.error('[SUNAT] Failed to download profile logo:', e);
        }
    };

    const handleExportPdf = () => {
        if (!result) return;

        // Create high-res branding canvas for PDF
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            drawLogoOnCanvas(ctx, result.ruc, result.businessName, logoStyle);
        }

        const logoDataUrl = canvas.toDataURL('image/png');

        // Initialize PDF Document
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Branding colors
        const primaryColor = [15, 23, 42]; // Slate 900
        const textMain = [30, 41, 59]; // Slate 800
        const textSecondary = [100, 116, 139]; // Slate 500
        const lightGray = [248, 250, 252]; // Slate 50
        const borderLight = [226, 232, 240]; // Slate 200

        // Background decorative color band (top)
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, 210, 45, 'F');

        // Header Title
        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('FICHA INFORMATIVA DE INSCRIPCIÓN RUC', 15, 18);

        doc.setFontSize(9);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text('REPORTE OFICIAL DE CONSULTA HOMOLOGADA • SAMI AI FINTECH', 15, 24);

        // Verification indicator
        const now = new Date();
        const verificationTime = now.toLocaleDateString('es-PE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        doc.setFillColor(30, 41, 59);
        doc.rect(15, 30, 180, 10, 'F');
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(34, 197, 94); // Light Green
        doc.text(`VERIFICACIÓN ACTIVA SUNAT: ${verificationTime.toUpperCase()}`, 20, 36.5);
        
        const randomHash = Math.random().toString(36).substring(2, 8).toUpperCase() + "-" + result.ruc.substring(7, 11);
        doc.setTextColor(148, 163, 184);
        doc.text(`ID DE COMPROBACIÓN: SAMI-${randomHash}`, 140, 36.5);

        // Render corporate logo generated
        doc.addImage(logoDataUrl, 'PNG', 15, 60, 42, 42);

        // Sidebar card beneath logo
        doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
        doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
        doc.rect(15, 106, 42, 34, 'FD');

        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text('ESTADO DE HISTORIAL', 18, 112);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
        doc.text(`Régimen:`, 18, 117);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(textMain[0], textMain[1], textMain[2]);
        const regimeLines = doc.splitTextToSize(result.taxRegime || 'Sin régimen', 36);
        doc.text(regimeLines, 18, 121);

        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
        doc.text(`Límite Asignado:`, 18, 130);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(79, 70, 229);
        doc.text(result.creditLimit ? `S/. ${result.creditLimit.toLocaleString('es-PE')}` : 'Sin asignación', 18, 134);

        // Main business information details
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(result.businessName.toUpperCase(), 64, 66);

        doc.setFontSize(9.5);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(79, 70, 229); 
        doc.text(`RUC: ${result.ruc}`, 64, 72);

        // Status pill: Activo / Habido
        doc.setFillColor(result.active ? 220 : 254, result.active ? 252 : 242, result.active ? 231 : 242); 
        doc.rect(64, 76, 25, 5.5, 'F');
        doc.setTextColor(result.active ? 21 : 220, result.active ? 128 : 38, result.active ? 61 : 38); 
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(result.active ? '● ACTIVO' : '■ INACTIVO', 66.5, 80);

        doc.setFillColor(238, 242, 255); 
        doc.rect(92, 76, 25, 5.5, 'F');
        doc.setTextColor(79, 70, 229); 
        doc.text(`● ${result.condition}`, 94.5, 80);

        // Horizontal visual divider line
        doc.setLineWidth(0.2);
        doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
        doc.line(64, 87, 195, 87);

        // Detailed field drawing util
        const drawField = (label: string, value: string, x: number, y: number, width: number) => {
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
            doc.text(label.toUpperCase(), x, y);

            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(textMain[0], textMain[1], textMain[2]);
            const lines = doc.splitTextToSize(value || '-', width);
            doc.text(lines, x, y + 4.5);
        };

        let currentY = 94;
        drawField('Dirección Fiscal', `${result.address}, ${result.district} - ${result.province}, ${result.department}`, 64, currentY, 130);
        
        currentY += 12;
        drawField('Fecha de Inscripción', result.registrationDate || 'No registra', 64, currentY, 40);
        drawField('Contacto Telefónico', result.phone || 'No registrado', 115, currentY, 40);
        drawField('Correo Registrado', result.email || 'No registrado', 155, currentY, 40);

        currentY += 12;
        drawField('Actividad Económica (CIIU)', `${result.ciiu || ''} - ${result.mainActivity || ''}`, 64, currentY, 130);

        // Separator Line
        currentY += 15;
        doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
        doc.line(15, currentY, 195, currentY);

        // Financial compliance
        currentY += 8;
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('REGISTRO FINANCIERO Y COMPATIBILIDAD TRIBUTARIA', 15, currentY);

        currentY += 4;
        const panelY = currentY;
        doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
        doc.rect(15, panelY, 180, 24, 'F');

        // Check 1: Electronic Billing
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(textMain[0], textMain[1], textMain[2]);
        doc.text('Emisor Electrónico:', 20, panelY + 7);
        doc.setFontSize(7.5);
        if (result.electronicBilling) {
            doc.setTextColor(22, 163, 74); 
            doc.text('AUTORIZADO (SÍ)', 60, panelY + 7);
        } else {
            doc.setTextColor(148, 163, 184); 
            doc.text('NO REGISTRA', 60, panelY + 7);
        }

        // Check 2: Retaining Agent
        doc.setTextColor(textMain[0], textMain[1], textMain[2]);
        doc.setFontSize(8);
        doc.text('Agente de Retención:', 20, panelY + 14);
        doc.setFontSize(7.5);
        if (result.retainingAgent) {
            doc.setTextColor(22, 163, 74); 
            doc.text('DESIGNADO (SÍ)', 60, panelY + 14);
        } else {
            doc.setTextColor(148, 163, 184); 
            doc.text('NO DESIGNADO', 60, panelY + 14);
        }

        // Check 3: Perceiving Agent
        doc.setTextColor(textMain[0], textMain[1], textMain[2]);
        doc.setFontSize(8);
        doc.text('Agente de Percepción:', 20, panelY + 21);
        doc.setFontSize(7.5);
        if (result.agentOfPerception) {
            doc.setTextColor(22, 163, 74);
            doc.text('DESIGNADO (SÍ)', 60, panelY + 21);
        } else {
            doc.setTextColor(148, 163, 184);
            doc.text('NO DESIGNADO', 60, panelY + 21);
        }

        // Power Expiry Date & Attachment Status
        doc.setTextColor(textMain[0], textMain[1], textMain[2]);
        doc.setFontSize(8);
        doc.setFont('Helvetica', 'bold');
        doc.text('Fecha Poder Legal:', 110, panelY + 7);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7.5);
        if (powerExpiryDate) {
            const formattedDate = new Date(powerExpiryDate + 'T00:00:00').toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
            doc.text(formattedDate, 142, panelY + 7);
            
            const today = new Date();
            const expiry = new Date(powerExpiryDate + 'T23:59:59');
            const isPowerExpired = expiry < today;
            
            if (isPowerExpired) {
                doc.setTextColor(220, 38, 38);
                doc.setFont('Helvetica', 'bold');
                doc.text('VENCIDO / CADUCO', 142, panelY + 11);
            } else {
                doc.setTextColor(22, 163, 74);
                doc.setFont('Helvetica', 'bold');
                doc.text('VIGENTE / ACTIVO', 142, panelY + 11);
            }
        } else {
            doc.setTextColor(148, 163, 184);
            doc.text('No ingresada', 142, panelY + 7);
        }

        // Attachment Status
        doc.setTextColor(textMain[0], textMain[1], textMain[2]);
        doc.setFontSize(8);
        doc.setFont('Helvetica', 'bold');
        doc.text('Documento Adjunto:', 110, panelY + 18);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7.5);
        if (powerFile) {
            doc.setTextColor(22, 163, 74);
            const truncatedName = powerFile.name.length > 20 ? `${powerFile.name.substring(0, 17)}...` : powerFile.name;
            doc.text(`CARGADO (${truncatedName})`, 142, panelY + 18);
            doc.setFontSize(7);
            doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
            doc.text(`Tamaño: ${powerFile.size}`, 142, panelY + 22);
        } else {
            doc.setTextColor(148, 163, 184);
            doc.text('Ningún documento cargado', 142, panelY + 18);
        }

        // Footnote banner
        doc.setLineWidth(0.4);
        doc.setDrawColor(79, 70, 229); 
        doc.line(15, 260, 195, 260);

        doc.setTextColor(148, 163, 184);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7);
        doc.text('AVISO LEGAL: El presente documento constituye una Ficha Informativa consolidada de forma automática por SAMI AI Fintech.', 15, 266);
        doc.text('La exactitud de la información mostrada depende enteramente de la respuesta de la pasarela SUNAT en tiempo real y la veracidad de los datos aportados.', 15, 271);
        doc.text('No constituye certificación tributaria directa de SUNAT y se expide únicamente para propósitos de análisis microfinanciero interno de crédito SAMI.', 15, 276);

        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(79, 70, 229);
        doc.text('SAMI AI Fintech - Soluciones Digitales Inteligentes para la Microempresa Peruana', 15, 283);

        // Self validation design right corner
        doc.setFontSize(5.5);
        doc.setTextColor(148, 163, 184);
        doc.text('CÓDIGO DE AUTO-VERIFICACIÓN', 158, 266);
        
        doc.setFillColor(30, 41, 59);
        doc.rect(170, 269, 12, 12, 'F');
        doc.setFillColor(255, 255, 255);
        doc.rect(172, 271, 3, 3);
        doc.rect(177, 271, 3, 3);
        doc.rect(172, 276, 3, 3);
        doc.rect(178, 277, 1, 1);

        // Download core PDF
        doc.save(`Ficha_RUC_${result.ruc}_${result.businessName.substring(0, 15).replace(/\s+/g, '_')}_SAMI.pdf`);
    };

    return (
        <div id="ruc-lookup-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    /* Hide standard page elements & backgrounds */
                    html, body {
                        background: #ffffff !important;
                        color: #000000 !important;
                        font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
                        font-size: 10.5pt !important;
                        line-height: 1.4 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        height: auto !important;
                    }
                    
                    /* Hide the rest of the application completely */
                    #root > *:not(#ruc-lookup-modal),
                    #main-content, 
                    #dashboard-view,
                    #navigation,
                    header,
                    footer,
                    aside,
                    nav,
                    .no-print,
                    .print-hidden,
                    .bg-gray-950\\/80.backdrop-blur-sm,
                    [class*="backdrop-blur-sm"] {
                        display: none !important;
                        visibility: hidden !important;
                        height: 0 !important;
                        overflow: hidden !important;
                    }
                    
                    /* Make the modal body cover the full printable page */
                    #ruc-lookup-modal {
                        position: relative !important;
                        display: block !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        height: auto !important;
                        max-height: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                        box-shadow: none !important;
                        border: none !important;
                        overflow: visible !important;
                        z-index: 99999 !important;
                    }

                    /* Force display of the modal body container & override transform/translate */
                    #ruc-lookup-modal > div,
                    #ruc-lookup-modal .relative {
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        height: auto !important;
                        max-height: none !important;
                        transform: none !important;
                        margin: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                        border-radius: 0 !important;
                    }

                    /* main scrollable container must expand, no scrolls */
                    #ruc-lookup-modal .overflow-y-auto,
                    #ruc-lookup-modal [class*="overflow-y-auto"] {
                        overflow: visible !important;
                        max-height: none !important;
                        height: auto !important;
                        padding: 0 !important;
                    }
                    
                    /* Hide elements that are not useful on physical paper */
                    #ruc-search-controls,
                    #preset-selector-container,
                    #preset-selector,
                    #ruc-recent-searches,
                    #compare-picker-container,
                    #btn-trigger-compare-picker,
                    #ruc-lookup-modal button,
                    #ruc-lookup-modal button *,
                    .modal-close-btn,
                    .print-hide {
                        display: none !important;
                    }
                    
                    /* Ensure backgrounds are light/transparent, borders are subtle, and text is readable */
                    .dark, [class*="dark"] {
                        background-color: #ffffff !important;
                        color: #000000 !important;
                    }

                    /* Target dark mode classes to override background/text color for print */
                    #ruc-lookup-modal .bg-gray-900,
                    #ruc-lookup-modal .bg-gray-950,
                    #ruc-lookup-modal .bg-slate-900,
                    #ruc-lookup-modal .bg-slate-950,
                    #ruc-lookup-modal .bg-slate-900\\/40,
                    #ruc-lookup-modal .bg-indigo-950,
                    #ruc-lookup-modal .bg-black,
                    #ruc-lookup-modal .bg-white\\/5,
                    #ruc-lookup-modal .bg-slate-50,
                    #ruc-lookup-modal .bg-indigo-500\\/5,
                    #ruc-lookup-modal .bg-emerald-500\\/5,
                    #ruc-lookup-modal .bg-red-500\\/5,
                    #ruc-lookup-modal .bg-slate-950\\/65 {
                        background: #ffffff !important;
                        background-color: #ffffff !important;
                        color: #000000 !important;
                        border-color: #cbd5e1 !important;
                    }
                    
                    #ruc-lookup-modal .text-white,
                    #ruc-lookup-modal .text-indigo-400,
                    #ruc-lookup-modal .text-gray-100,
                    #ruc-lookup-modal .text-gray-200,
                    #ruc-lookup-modal .text-gray-300,
                    #ruc-lookup-modal .text-gray-400,
                    #ruc-lookup-modal .text-gray-500,
                    #ruc-lookup-modal .text-slate-200,
                    #ruc-lookup-modal .text-slate-300,
                    #ruc-lookup-modal .text-slate-400,
                    #ruc-lookup-modal .text-slate-700,
                    #ruc-lookup-modal .text-slate-900 {
                        color: #000000 !important;
                    }

                    #ruc-lookup-modal .border-white\\/10,
                    #ruc-lookup-modal .border-white\\/5,
                    #ruc-lookup-modal .border-dashed {
                        border-color: #94a3b8 !important;
                    }

                    /* Optimize typography for hard-copy records */
                    #ruc-lookup-modal h1,
                    #ruc-lookup-modal h2 {
                        font-size: 18pt !important;
                        font-weight: 800 !important;
                        color: #000000 !important;
                        margin-bottom: 8pt !important;
                        border-bottom: 1.5pt solid #000000 !important;
                        padding-bottom: 4pt !important;
                        page-break-after: avoid !important;
                    }

                    #ruc-lookup-modal h3,
                    #ruc-lookup-modal h4 {
                        font-size: 13pt !important;
                        font-weight: 700 !important;
                        color: #000005 !important;
                        margin-top: 10pt !important;
                        margin-bottom: 4pt !important;
                        page-break-after: avoid !important;
                    }

                    #ruc-lookup-modal .font-mono,
                    #ruc-lookup-modal code {
                        font-family: "Courier New", Courier, monospace !important;
                        font-size: 9.5pt !important;
                    }

                    /* Give structure to dynamic tables and boards so they clean-print nicely */
                    .ruc-result-panel,
                    .ruc-result-panel > div {
                        border: 1px solid #cbd5e1 !important;
                        padding: 15px !important;
                        margin-bottom: 15px !important;
                        border-radius: 8px !important;
                        page-break-inside: avoid !important;
                    }

                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                    }

                    th, td {
                        border: 1px solid #cbd5e1 !important;
                        padding: 8px !important;
                        color: black !important;
                    }

                    /* Make sure alert boxes are clear but retain warning text styling */
                    .bg-red-500\\/10, .bg-red-500\\/5 {
                        border: 1px solid #ef4444 !important;
                        background-color: #fef2f2 !important;
                        color: #991b1b !important;
                    }
                    
                    .bg-green-500\\/10, .bg-green-500\\/5 {
                        border: 1px solid #10b981 !important;
                        background-color: #ecfdf5 !important;
                        color: #065f46 !important;
                    }
                    
                    .bg-amber-500\\/10, .bg-amber-500\\/5 {
                        border: 1px solid #f59e0b !important;
                        background-color: #fffbeb !important;
                        color: #92400e !important;
                    }

                    /* Avoid splitting critical sections across pages */
                    #pki-validation-container,
                    .ruc-score-meter,
                    .ruc-reasons-list {
                        page-break-inside: avoid !important;
                    }
                }
            ` }} />
            {/* Backdrop */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className={`relative w-full max-w-3xl border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all duration-200 ${
                    getThemeClass(modalPalette).modalBg
                }`}
            >
                {/* Header */}
                <div className={`px-6 py-4 border-b flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between transition-colors duration-200 ${
                    getThemeClass(modalPalette).headerBg
                }`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl transition-all ${
                            isModalDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-100 text-indigo-600'
                        }`}>
                            <Building2 size={22} />
                        </div>
                        <div>
                            <h3 className={`text-base font-bold tracking-wide transition-colors duration-200 ${
                                getThemeClass(modalPalette).headerTitle
                            }`}>Consulta Rápida RUC SUNAT</h3>
                            <p className={`text-xs transition-colors duration-200 ${
                                getThemeClass(modalPalette).headerSubtitle
                            }`}>Consulta de datos del padrón de contribuyentes a través de PSE</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        {/* Adaptable Color Palette Selector */}
                        <div className="flex items-center gap-1.5 bg-black/10 dark:bg-white/5 p-1 rounded-xl border border-gray-200 dark:border-white/10 shrink-0">
                            {[
                                { id: 'slate-dark', name: 'Oscuro', color: 'bg-[#0f172a]', tooltip: 'Estilo Oscuro Clásico' },
                                { id: 'slate-light', name: 'Claro', color: 'bg-[#f8fafc]', tooltip: 'Estilo Claro Clínico' },
                                { id: 'high-contrast', name: 'Contraste', color: 'bg-[#000000]', tooltip: 'Alto Contraste y Accesibilidad' },
                                { id: 'emerald', name: 'Esmeralda', color: 'bg-[#064e3b]', tooltip: 'Sostenible Eco-MYPE' },
                                { id: 'warm', name: 'Cálido', color: 'bg-[#fef3c7]', tooltip: 'Filtro Ámbar Calma' }
                            ].map((paletteOpt) => (
                                <button
                                    key={paletteOpt.id}
                                    type="button"
                                    onClick={() => setModalPalette(paletteOpt.id as any)}
                                    className={`relative p-1 rounded-md transition-all cursor-pointer flex items-center justify-center border-2 ${
                                        modalPalette === paletteOpt.id
                                            ? 'border-indigo-500 scale-110 shadow-sm'
                                            : 'border-transparent hover:scale-105'
                                    }`}
                                    title={paletteOpt.tooltip}
                                    id={`palette-btn-${paletteOpt.id}`}
                                >
                                    <span className={`w-3.5 h-3.5 rounded-full ${paletteOpt.color} border border-slate-300 dark:border-white/20`} />
                                </button>
                            ))}
                        </div>

                        <button 
                            onClick={onClose}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isModalDarkMode ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
                            }`}
                            title="Cerrar modal"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Content body Scrollable */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    {/* QR Code Scanner Console */}
                    <AnimatePresence>
                        {isScannerOpen && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.98, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98, y: -10 }}
                                className="bg-slate-950 border border-indigo-500/30 rounded-2xl p-5 shadow-2xl overflow-hidden relative"
                            >
                                {/* Glowing scanner edge */}
                                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-pulse" />

                                <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                                        <span className="text-xs font-black uppercase tracking-wider text-gray-200 flex items-center gap-1.5 font-mono">
                                            <QrCode size={14} className="text-indigo-400" />
                                            Lector Holográfico QR RUC SUNAT
                                        </span>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={stopScanner}
                                        className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-1 rounded-lg transition-colors cursor-pointer"
                                        title="Apagar cámara"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                                    {/* Video / Camera Viewport */}
                                    <div className="md:col-span-7 aspect-[4/3] bg-black/90 rounded-xl border border-white/10 relative overflow-hidden flex flex-col items-center justify-center min-h-[220px]">
                                        {scannerStatus === 'initializing' && (
                                            <div className="text-center p-4">
                                                <RefreshCw size={24} className="animate-spin text-indigo-400 mx-auto mb-2" />
                                                <div className="text-xs text-gray-400 font-bold">Iniciando cámara...</div>
                                                <div className="text-[10px] text-gray-500 mt-1">Solicitando autorización al navegador</div>
                                            </div>
                                        )}

                                        {scannerStatus === 'error' && (
                                            <div className="text-center p-4">
                                                <AlertCircle size={28} className="text-red-400 mx-auto mb-2 animate-bounce" />
                                                <div className="text-xs text-red-300 font-bold mb-1">Error de Acceso de Cámara</div>
                                                <div className="text-[10px] text-gray-400 max-w-xs">{scannerError}</div>
                                            </div>
                                        )}

                                        {/* Camera stream view */}
                                        <video 
                                            ref={videoRef}
                                            playsInline
                                            muted
                                            autoPlay
                                            className={`w-full h-full object-cover transition-opacity duration-300 ${
                                                scannerStatus === 'scanning' || scannerStatus === 'detected' ? 'opacity-100' : 'opacity-0 absolute select-none pointer-events-none'
                                            }`}
                                        />

                                        {/* Scanning Viewfinder, Overlay laser and guides */}
                                        {(scannerStatus === 'scanning' || scannerStatus === 'detected') && (
                                            <>
                                                {/* Holographic scanner alignment viewport */}
                                                <div className="absolute inset-8 border border-white/10 rounded-lg flex items-center justify-center pointer-events-none">
                                                    {/* Scanning frame corners */}
                                                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-400 -mt-0.5 -ml-0.5" />
                                                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-indigo-400 -mt-0.5 -mr-0.5" />
                                                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-indigo-400 -mb-0.5 -ml-0.5" />
                                                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-400 -mb-0.5 -mr-0.5" />

                                                    {/* Central targeting crosshair */}
                                                    <div className="w-4 h-0.5 bg-indigo-400/30" />
                                                    <div className="h-4 w-0.5 bg-indigo-400/30 absolute" />
                                                </div>

                                                {/* Pulsing visual laser line */}
                                                {scannerStatus === 'scanning' && (
                                                    <div className="absolute left-8 right-8 h-0.5 bg-indigo-400/80 shadow-[0_0_12px_#6366f1] animate-bounce pointer-events-none" style={{ animationDuration: '2.5s' }} />
                                                )}

                                                {/* Scan detected overlay */}
                                                {scannerStatus === 'detected' && (
                                                    <div className="absolute inset-0 bg-indigo-600/20 backdrop-blur-[1px] flex items-center justify-center animate-fade-in pointer-events-none">
                                                        <div className="bg-slate-900/95 border border-green-500/40 text-green-400 px-4 py-3 rounded-xl flex flex-col items-center gap-1.5 shadow-2xl scale-110 transition-transform">
                                                            <CheckCircle size={22} className="text-green-400 animate-pulse" />
                                                            <div className="text-[10px] font-black uppercase tracking-widest">
                                                                ¡CÓDIGO QR RECONOCIDO!
                                                            </div>
                                                            <div className="text-xs font-mono font-bold text-white bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                                                                RUC {scannedResult}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {/* Scan Info / Testing Panel */}
                                    <div className="md:col-span-5 flex flex-col justify-between space-y-4">
                                        <div className="space-y-3">
                                            <div className="text-xs text-gray-200 font-bold leading-relaxed flex items-center gap-1.5">
                                                <Camera size={13} className="text-indigo-400" />
                                                Instrucciones de Lectura Directa:
                                            </div>
                                            <p className="text-[10.5px] text-gray-400 leading-relaxed">
                                                Apunte la cámara hacia el código QR impreso en el extremo superior de la Ficha RUC, Ficha de Inscripción o constancia emitida por SUNAT.
                                            </p>

                                            <div className="bg-white/5 border border-white/5 rounded-xl p-3 space-y-2">
                                                <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                                                    <Sparkles size={11} /> Simulación Automática (Pruebas)
                                                </div>
                                                <p className="text-[9.5px] text-gray-400 leading-normal">
                                                    Haga clic en cualquiera de las siguientes empresas modelo registradas en el padrón para simular una detección holográfica inmediata:
                                                </p>
                                                <div className="grid grid-cols-1 gap-1.5 pt-1">
                                                    {PRESET_RUCS.map((comp) => (
                                                        <button
                                                            key={comp.ruc}
                                                            type="button"
                                                            onClick={() => handleScanSuccess(comp.ruc)}
                                                            className="text-left w-full px-2.5 py-1.5 text-[10px] font-semibold bg-white/5 hover:bg-indigo-500/10 border border-white/5 rounded-lg text-gray-300 hover:text-indigo-300 transition-all flex items-center justify-between gap-1 cursor-pointer"
                                                        >
                                                            <span className="truncate">{comp.name}</span>
                                                            <span className="font-mono text-gray-400 text-[9px]">{comp.ruc}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-[9.5px] text-gray-500 font-mono">
                                            <span className="flex items-center gap-1">
                                                <Video size={10} className="animate-pulse" /> Cámara Activa
                                            </span>
                                            <span>SAMI SCAN v3.0</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Document Camera OCR Console */}
                    <AnimatePresence>
                        {isDocCameraOpen && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.98, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98, y: -10 }}
                                className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-5 shadow-2xl overflow-hidden relative text-left"
                            >
                                {/* Glowing scanner edge */}
                                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 animate-pulse" />

                                <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                        <span className="text-xs font-black uppercase tracking-wider text-gray-200 flex items-center gap-1.5 font-mono">
                                            <Camera size={14} className="text-emerald-400" />
                                            Escáner de Ficha RUC Física (Cámara OCR)
                                        </span>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={stopDocCamera}
                                        className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-1 rounded-lg transition-colors cursor-pointer"
                                        title="Apagar cámara"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                                    {/* Video / Camera Viewport */}
                                    <div className="md:col-span-7 aspect-[4/3] bg-black/95 rounded-xl border border-white/10 relative overflow-hidden flex flex-col items-center justify-center min-h-[220px]">
                                        
                                        {/* Hidden virtual canvas for framing captures */}
                                        <canvas ref={docCanvasRef} className="hidden" />

                                        {docCameraStatus === 'initializing' && (
                                            <div className="text-center p-4">
                                                <RefreshCw size={24} className="animate-spin text-emerald-400 mx-auto mb-2" />
                                                <div className="text-xs text-gray-400 font-bold">Iniciando cámara OCR...</div>
                                                <div className="text-[10px] text-gray-500 mt-1">Solicitando autorización al navegador</div>
                                            </div>
                                        )}

                                        {docCameraStatus === 'error' && (
                                            <div className="text-center p-4">
                                                <AlertCircle size={28} className="text-red-400 mx-auto mb-2 animate-bounce" />
                                                <div className="text-xs text-red-300 font-bold mb-1">Error de Acceso de Cámara</div>
                                                <div className="text-[10px] text-gray-400 max-w-xs">{docCameraError}</div>
                                            </div>
                                        )}

                                        {/* Live Camera Feed */}
                                        {docCameraStatus === 'scanning' && (
                                            <video 
                                                ref={docVideoRef}
                                                playsInline
                                                muted
                                                autoPlay
                                                className="w-full h-full object-cover transition-opacity duration-300"
                                            />
                                        )}

                                        {/* Captured Frame Freeze-frame */}
                                        {docCameraCapturedImage && (docCameraStatus === 'analyzing' || docCameraStatus === 'extracted') && (
                                            <img 
                                                src={docCameraCapturedImage} 
                                                alt="Documento capturado" 
                                                className="w-full h-full object-cover"
                                                referrerPolicy="no-referrer"
                                            />
                                        )}

                                        {/* HUD Scanning Viewfinder Box / Laser */}
                                        {(docCameraStatus === 'scanning' || docCameraStatus === 'analyzing' || docCameraStatus === 'extracted') && (
                                            <>
                                                {/* Holographic document alignment card (horizontal aspect) */}
                                                <div className="absolute inset-x-8 inset-y-12 border border-emerald-400/20 rounded-lg flex items-center justify-center pointer-events-none">
                                                    {/* Scanning corners */}
                                                    <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-emerald-400 -mt-0.5 -ml-0.5" />
                                                    <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-emerald-400 -mt-0.5 -mr-0.5" />
                                                    <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-emerald-400 -mb-0.5 -ml-0.5" />
                                                    <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-emerald-400 -mb-0.5 -mr-0.5" />

                                                    {/* Scanning frame waterlines */}
                                                    <div className="w-10 h-0.5 bg-emerald-400/40" />
                                                    <div className="h-10 w-0.5 bg-emerald-400/40 absolute" />
                                                </div>

                                                {/* Laser alignment scan bar */}
                                                {docCameraStatus === 'scanning' && (
                                                    <div className="absolute left-8 right-8 h-0.5 bg-emerald-400/80 shadow-[0_0_12px_#34d399] animate-bounce pointer-events-none" style={{ animationDuration: '2.5s' }} />
                                                )}

                                                {/* Simulated OCR loading matrix */}
                                                {docCameraStatus === 'analyzing' && (
                                                    <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-[1px] flex flex-col items-center justify-center pointer-events-none animate-fade-in">
                                                        <div className="bg-slate-900/95 border border-emerald-500/30 px-5 py-4 rounded-xl flex flex-col items-center gap-2.5 max-w-[240px] shadow-2xl">
                                                            <RefreshCw size={20} className="text-emerald-400 animate-spin" />
                                                            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                                                                ANALIZANDO MATRIZ OCR
                                                            </div>
                                                            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                                                <div 
                                                                    className="bg-emerald-500 h-full transition-all duration-300 rounded-full" 
                                                                    style={{ width: `${docOcrProgress}%` }}
                                                                />
                                                            </div>
                                                            <div className="text-[9px] font-mono text-gray-500">{docOcrProgress}% completado</div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Success scan confirmation badge */}
                                                {docCameraStatus === 'extracted' && (
                                                    <div className="absolute inset-0 bg-emerald-900/20 backdrop-blur-[1px] flex items-center justify-center pointer-events-none animate-fade-in animate-pulse">
                                                        <div className="bg-slate-900/95 border border-emerald-500/40 text-emerald-400 px-4 py-3 rounded-xl flex flex-col items-center gap-1.5 shadow-2xl scale-110 transition-transform">
                                                            <CheckCircle size={22} className="text-emerald-400 animate-pulse" />
                                                            <div className="text-[9.5px] font-black uppercase tracking-widest">
                                                                ¡RUC DETECTADO VÍA OCR!
                                                            </div>
                                                            <div className="text-xs font-mono font-bold text-white bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                                                RUC {docOcrDetectedRuc}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {/* Scan Info / Testing Panel */}
                                    <div className="md:col-span-5 flex flex-col justify-between space-y-4">
                                        <div className="space-y-3 text-left">
                                            <div className="text-xs text-gray-200 font-bold leading-relaxed flex items-center gap-1.5">
                                                <Sparkles size={13} className="text-emerald-400" />
                                                Digitalizador de Ficha RUC:
                                            </div>
                                            <p className="text-[10.5px] text-gray-400 leading-relaxed">
                                                Alinee la Ficha RUC impresa o la constancia de SUNAT dentro del cuadro verde. El reconocimiento óptico aislará los 11 dígitos pertinentes de manera automática.
                                            </p>

                                            {docCameraStatus === 'scanning' && (
                                                <div className="pt-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => captureAndExtractDoc()}
                                                        className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/10"
                                                    >
                                                        <Camera size={13} />
                                                        Capturar y Extraer RUC
                                                    </button>
                                                </div>
                                            )}

                                            <div className="bg-white/5 border border-white/5 rounded-xl p-3 space-y-2">
                                                <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                                                    <Sparkles size={11} /> Cargar Documento de Prueba
                                                </div>
                                                <p className="text-[9.5px] text-gray-400 leading-normal">
                                                    Simule alinear y capturar documentos reales de las siguientes mype configuradas en el padrón:
                                                </p>
                                                <div className="grid grid-cols-1 gap-1.5 pt-1">
                                                    {PRESET_RUCS.map((comp) => (
                                                        <button
                                                            key={comp.ruc}
                                                            type="button"
                                                            disabled={docCameraStatus !== 'scanning'}
                                                            onClick={() => captureAndExtractDoc(comp.ruc)}
                                                            className="text-left w-full px-2.5 py-1.5 text-[10px] font-semibold bg-white/5 hover:bg-emerald-500/10 border border-white/5 rounded-lg text-gray-300 hover:text-emerald-300 transition-all flex items-center justify-between gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <span className="truncate">{comp.name}</span>
                                                            <span className="font-mono text-gray-400 text-[9px]">{comp.ruc}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-[9.5px] text-gray-500 font-mono">
                                            <span className="flex items-center gap-1">
                                                <Video size={10} className="animate-pulse text-emerald-400" /> Canal Activo OCR
                                            </span>
                                            <span>SAMI SCAN v3.0</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* OCR Image Parser Console */}
                    <AnimatePresence>
                        {isOcrOpen && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.98, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98, y: -10 }}
                                className="bg-slate-950 border border-teal-500/30 rounded-2xl p-5 shadow-2xl overflow-hidden relative"
                            >
                                {/* Glowing scanner edge */}
                                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-teal-500 via-emerald-500 to-indigo-500 animate-pulse" />

                                <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                                        <span className="text-xs font-black uppercase tracking-wider text-gray-200 flex items-center gap-1.5 font-mono">
                                            <ImageIcon size={14} className="text-teal-400 animate-bounce" />
                                            Extractor Inteligente de Textos OCR (Ficha RUC)
                                        </span>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setIsOcrOpen(false)}
                                        className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-1 rounded-lg transition-colors cursor-pointer"
                                        title="Cerrar extractor OCR"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 animate-fade-in">
                                    {/* OCR Upload / Image preview viewport */}
                                    <div className="md:col-span-7 aspect-[4/3] bg-black/95 rounded-xl border border-white/10 relative overflow-hidden flex flex-col items-center justify-center min-h-[240px]">
                                        {ocrFile ? (
                                            <div className="w-full h-full relative group">
                                                <img 
                                                    src={ocrFile.previewUrl} 
                                                    alt="RUC OCR Document" 
                                                    className="w-full h-full object-contain pointer-events-none"
                                                    referrerPolicy="no-referrer"
                                                />
                                                {/* Simulated Reading / Scan Laser overlay */}
                                                {(ocrStatus === 'reading' || ocrStatus === 'parsing') && (
                                                    <div className="absolute inset-0 bg-teal-500/5 flex flex-col items-center justify-center pointer-events-none">
                                                        <div className="absolute left-0 right-0 h-0.5 bg-teal-400 shadow-[0_0_15px_#2dd4bf] animate-bounce" style={{ animationDuration: '2s' }} />
                                                        <div className="bg-slate-900/90 border border-teal-500/20 px-3 py-1.5 rounded-lg text-teal-400 font-mono text-[9px] font-black uppercase tracking-widest flex items-center gap-2 animate-pulse">
                                                            <RefreshCw size={10} className="animate-spin" />
                                                            {ocrStatus === 'reading' ? 'LEYENDO MATRIZ...' : 'CRUNCHING NEURAL DATA...'}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Laser alignment frame */}
                                                <div className="absolute inset-6 border border-teal-400/20 rounded-lg pointer-events-none">
                                                    <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-teal-400" />
                                                    <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-teal-400" />
                                                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-teal-400" />
                                                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-teal-400" />
                                                </div>

                                                {/* Extracted neon overlay highlight */}
                                                {ocrStatus === 'extracted' && (
                                                    <div className="absolute inset-x-12 top-1/3 bg-teal-500/10 border-2 border-teal-400 border-dashed rounded px-4 py-2 text-center shadow-[0_0_15px_rgba(45,212,191,0.25)] animate-pulse pointer-events-none">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-teal-300 block mb-1">OCR DETECTADO</span>
                                                        <span className="font-mono text-xs font-black text-white bg-slate-950 px-2 py-0.5 rounded border border-teal-500/30">
                                                            RUC {ocrDetectedRuc}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Remove file button */}
                                                <button 
                                                    type="button"
                                                    onClick={resetOcr}
                                                    className="absolute top-3 right-3 bg-slate-900/80 hover:bg-slate-900 text-gray-400 hover:text-white p-1.5 rounded-lg transition-colors border border-white/5 cursor-pointer"
                                                    title="Limpiar imagen"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div 
                                                onDragOver={(e) => { e.preventDefault(); }}
                                                onDrop={handleOcrFileDrop}
                                                onClick={() => ocrInputRef.current?.click()}
                                                className="w-full h-full border-2 border-dashed border-white/10 hover:border-teal-500/30 bg-slate-950/40 hover:bg-teal-500/5 transition-all text-center p-6 flex flex-col items-center justify-center gap-2 cursor-pointer"
                                            >
                                                <input 
                                                    type="file"
                                                    ref={ocrInputRef}
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={handleOcrFileSelect}
                                                />
                                                <Upload size={24} className="text-teal-400 animate-pulse" />
                                                <div className="text-xs font-bold text-gray-300">
                                                    Subir Imagen de Ficha RUC
                                                </div>
                                                <div className="text-[10px] text-gray-500 max-w-sm leading-relaxed">
                                                    Arrastre una foto/captura o haga clic para examinar (PNG, JPG, WEBP). El motor OCR emulado extraerá el RUC al instante.
                                                </div>
                                            </div>
                                        )}
                                        {ocrError && (
                                            <div className="absolute inset-x-4 bottom-4 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] p-2 rounded-lg text-center font-semibold">
                                                {ocrError}
                                            </div>
                                        )}
                                    </div>

                                    {/* OCR Information panel & Controls */}
                                    <div className="md:col-span-5 flex flex-col justify-between space-y-4">
                                        <div className="space-y-3">
                                            <div className="text-xs text-teal-300 font-bold flex items-center gap-1.5 font-sans">
                                                <Sparkles size={12} /> Explicación de Extracción OCR:
                                            </div>
                                            <p className="text-[10.5px] italic text-gray-400 leading-normal font-sans">
                                                La tecnología OCR (Reconocimiento Óptico de Caracteres) lee los caracteres alfanuméricos impresos en el documento SUNAT y extrae automáticamente los 11 dígitos pertinentes del RUC.
                                            </p>

                                            {ocrStatus === 'idle' && (
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5 space-y-1.5 text-center">
                                                    <div className="text-[10px] text-gray-400 leading-normal font-sans">
                                                        ¿No tiene una imagen real a mano? Puede simular una extracción OCR usando un modelo directamente:
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            // Create a mock image file representation
                                                            const mockFile = new File(["mock_data"], "captura_ficha_ruc.png", { type: "image/png" });
                                                            processOcrFile(mockFile);
                                                        }}
                                                        className="w-full py-1.5 px-3 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 hover:border-teal-500/35 text-teal-400 font-black text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                                                    >
                                                        Simular Extracción OCR Instantánea
                                                    </button>
                                                </div>
                                            )}

                                            {ocrFile && (
                                                <div className="bg-slate-900 border border-white/5 rounded-xl p-3 space-y-2.5 animate-fade-in text-left">
                                                    <div className="flex items-center gap-2 overflow-hidden border-b border-white/5 pb-1.5">
                                                        <FileText size={14} className="text-teal-400 shrink-0" />
                                                        <div className="truncate text-left">
                                                            <div className="text-[10px] font-bold text-gray-200 truncate">{ocrFile.name}</div>
                                                            <div className="text-[9px] text-gray-500">{ocrFile.size}</div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <div className="text-[9px] uppercase tracking-wider font-extrabold text-gray-400">Estado OCR:</div>
                                                        <div className="flex items-center gap-2">
                                                            {ocrStatus === 'reading' && (
                                                                <span className="flex items-center gap-1.5 text-[9.5px] font-bold text-teal-400 animate-pulse">
                                                                    <RefreshCw size={10} className="animate-spin" /> Escaneando matriz óptica...
                                                                </span>
                                                            )}
                                                            {ocrStatus === 'parsing' && (
                                                                <span className="flex items-center gap-1.5 text-[9.5px] font-bold text-purple-400 animate-pulse">
                                                                    <RefreshCw size={10} className="animate-spin" /> Procesando red de caracteres...
                                                                </span>
                                                            )}
                                                            {ocrStatus === 'extracted' && (
                                                                <div className="w-full space-y-1.5">
                                                                    <div className="flex items-center gap-1.5 text-[9.5px] font-black text-green-400">
                                                                        <CheckCircle size={11} /> ¡RUC EXTRAÍDO PERFECTAMENTE!
                                                                    </div>
                                                                    <div className="bg-[#10b981]/10 border border-[#10b981]/20 rounded-lg p-2 text-[10px] text-emerald-300 font-mono font-medium">
                                                                        Detectado: <span className="font-bold text-white bg-slate-950 px-1 py-0.5 rounded">{ocrDetectedRuc}</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[9px] text-gray-500 font-mono">
                                            <span className="flex items-center gap-1">
                                                <FileText size={10} /> OCR ACTIVO
                                            </span>
                                            <span>SAMI OCR v1.1.2</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Search Panel */}
                    {!compareMode && (
                        <div className="space-y-4">
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className={`relative flex-1 ${validationStatus === 'invalid' ? 'group/input' : ''}`}>
                                {validationStatus === 'invalid' && (
                                    <div 
                                        id="m11-border-tooltip" 
                                        className="absolute bottom-full left-0 mb-3 w-80 bg-gradient-to-b from-slate-950 to-slate-900 border border-red-500/50 text-gray-300 text-[10px] p-4 rounded-xl shadow-2xl opacity-0 invisible group-hover/input:opacity-100 group-hover/input:visible transition-all duration-200 z-50 leading-relaxed pointer-events-none"
                                    >
                                        <div className="flex items-center gap-1.5 text-red-400 font-extrabold mb-1.5 uppercase tracking-wider text-[10.5px] border-b border-red-500/20 pb-1">
                                            <AlertCircle size={14} className="shrink-0" />
                                            <span>Fallo de Validación Módulo 11</span>
                                        </div>
                                        <p className="text-gray-200 font-medium font-sans">
                                            La suma de control aritmética del RUC (<span className="text-red-400 font-mono font-bold">{rucQuery}</span>) no es correcta.
                                        </p>
                                        <p className="mt-1.5 text-gray-400 font-sans">
                                            El último dígito verificador (<span className="text-white font-mono bg-white/5 px-1 py-0.5 rounded">{rucQuery[10]}</span>) debe coincidir con el residuo del cálculo oficial de SUNAT usando factores ponderados.
                                        </p>
                                        <p className="mt-1.5 text-[9px] text-gray-500 italic font-sans">
                                            SAMI advierte sobre la discrepancia matemática, pero le permitirá realizar consultas con fines de prueba si es necesario.
                                        </p>
                                        <div className="absolute top-full left-6 w-2.5 h-2.5 bg-slate-900 border-r border-b border-red-500/50 transform rotate-45 -mt-1.5" />
                                    </div>
                                )}
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                                    {validationStatus === 'invalid' ? (
                                        <AlertCircle size={16} className="text-red-400 animate-pulse transition-colors" />
                                    ) : (
                                        <Building size={16} />
                                    )}
                                </span>
                                <motion.input 
                                    id="ruc-search-input"
                                    variants={inputVariants}
                                    animate={inputAnimationState}
                                    type="text"
                                    maxLength={11}
                                    value={rucQuery}
                                    onChange={(e) => setRucQuery(e.target.value.replace(/\D/g, ''))}
                                    placeholder="Ingrese RUC (11 dígitos, ej: 20123456789)"
                                    className={`w-full border rounded-xl pl-10 pr-28 py-3 text-sm font-bold transition-all font-mono focus:outline-none focus:ring-2 ${
                                        isModalDarkMode 
                                            ? 'bg-white/5 placeholder-gray-500 text-white' 
                                            : 'bg-white border-slate-300 placeholder-slate-400 text-slate-800 shadow-sm'
                                    } ${getBorderAndFocusClasses()}`}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                                {/* Real-time Status Badge */}
                                <span className="absolute inset-y-0 right-3 flex items-center gap-1.5 select-none z-10">
                                    {validationStatus === 'valid' && (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded animate-fade-in select-none pointer-events-none">
                                            <CheckCircle size={10} />
                                            <span>M11 OK</span>
                                        </span>
                                    )}
                                    {validationStatus === 'invalid' && (
                                        <div className="relative group cursor-help pointer-events-auto">
                                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded animate-fade-in hover:bg-red-500/20 transition-all duration-150">
                                                <XCircle size={10} />
                                                <span>M11 ERR</span>
                                            </span>
                                            {/* Modulo 11 Explanation Tooltip */}
                                            <div id="m11-error-tooltip" className="absolute bottom-full right-0 mb-3 w-72 bg-gradient-to-b from-slate-950 to-slate-900 border border-red-500/40 text-gray-300 text-[10px] p-4 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 leading-relaxed pointer-events-none">
                                                <div className="flex items-center gap-1.5 text-red-400 font-black mb-2 uppercase tracking-wider text-[10px] border-b border-red-500/20 pb-1.5">
                                                    <AlertCircle size={14} className="shrink-0" />
                                                    <span>Fallo de Validación Módulo 11</span>
                                                </div>
                                                <p className="text-gray-200 font-normal">
                                                    Suma de control inválida en el RUC ingresado (<span className="text-red-400 font-mono font-bold">{rucQuery}</span>).
                                                </p>
                                                <p className="mt-2 text-gray-300">
                                                    El último dígito es un verificador aritmético calculado mediante el algoritmo <span className="text-white font-mono bg-white/5 px-1 py-0.5 rounded">Módulo 11</span> ponderado con factores <span className="text-white font-mono bg-white/5 px-1 py-0.5 rounded">[5,4,3,2,7,6,5,4,3,2]</span> sobre los primeros 10 dígitos.
                                                </p>
                                                <p className="mt-2 text-[9.5px] text-gray-400 border-t border-white/5 pt-1.5 italic">
                                                    Nota: Si es un RUC simulado o de prueba, el sistema permitirá consultar, pero advierte sobre la discrepancia matemática.
                                                </p>
                                                <div className="absolute top-full right-6 w-2.5 h-2.5 bg-slate-900 border-r border-b border-red-500/40 transform rotate-45 -mt-1.5" />
                                            </div>
                                        </div>
                                    )}
                                    {validationStatus === 'incomplete' && (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded pointer-events-none select-none">
                                            <span>{rucQuery.length}/11</span>
                                        </span>
                                    )}
                                </span>
                            </div>
                            <button
                                onClick={() => handleSearch()}
                                disabled={isLoading}
                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {isLoading ? (
                                    <>
                                        <RefreshCw size={14} className="animate-spin" />
                                        <span>Consultando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Search size={14} />
                                        <span>Consultar</span>
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (isScannerOpen) {
                                        stopScanner();
                                    } else {
                                        stopDocCamera();
                                        setIsOcrOpen(false);
                                        startScanner();
                                    }
                                }}
                                className={`px-5 py-3 border font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                    isScannerOpen
                                        ? 'bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 border-red-500/30 text-red-400 font-bold'
                                        : isModalDarkMode
                                            ? 'bg-indigo-500/10 hover:bg-indigo-500/20 active:bg-indigo-500/30 border-indigo-500/20 hover:border-indigo-500/35 text-indigo-400 font-bold'
                                            : 'bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200/80 border-indigo-200 text-indigo-700 font-bold shadow-sm'
                                }`}
                                title="Escanear código QR de la Ficha RUC física"
                            >
                                <QrCode size={14} className={isScannerOpen ? '' : 'animate-pulse'} />
                                <span>{isScannerOpen ? 'Cerrar Escáner' : 'Escanear QR'}</span>
                            </button>
                            <button
                                type="button"
                                id="btn-doc-scanner-toggle"
                                onClick={() => {
                                    if (isDocCameraOpen) {
                                        stopDocCamera();
                                    } else {
                                        startDocCamera();
                                    }
                                }}
                                className={`px-5 py-3 border font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                    isDocCameraOpen
                                        ? 'bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 border-red-500/30 text-red-400 font-bold'
                                        : isModalDarkMode
                                            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 border-emerald-500/20 hover:border-emerald-500/35 text-emerald-400 font-bold'
                                            : 'bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200/80 border-emerald-200 text-emerald-700 font-bold shadow-sm'
                                }`}
                                title="Escanear una Ficha RUC física usando la cámara"
                            >
                                <Camera size={14} className={isDocCameraOpen ? '' : 'animate-pulse'} />
                                <span>{isDocCameraOpen ? 'Cerrar Cámara OCR' : 'Cámara OCR'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (isOcrOpen) {
                                        setIsOcrOpen(false);
                                    } else {
                                        stopScanner();
                                        stopDocCamera();
                                        setIsOcrOpen(true);
                                    }
                                }}
                                className={`px-5 py-3 border font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                    isOcrOpen
                                        ? 'bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 border-red-500/30 text-red-400 font-bold'
                                        : isModalDarkMode
                                            ? 'bg-teal-500/10 hover:bg-teal-500/20 active:bg-teal-500/30 border-teal-500/20 hover:border-teal-500/35 text-teal-400 font-bold'
                                            : 'bg-teal-50 hover:bg-teal-100 active:bg-teal-200/80 border-teal-200 text-teal-700 font-bold shadow-sm'
                                }`}
                                title="Subir imagen de la Ficha RUC para extracción OCR"
                            >
                                <FileText size={14} className={isOcrOpen ? '' : 'animate-pulse'} />
                                <span>{isOcrOpen ? 'Cerrar OCR' : 'Escanear Imagen (OCR)'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    stopScanner();
                                    stopDocCamera();
                                    setIsOcrOpen(false);
                                    setCompareMode(true);
                                }}
                                className={`px-5 py-3 border font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                    isModalDarkMode
                                        ? 'bg-violet-500/10 hover:bg-violet-500/20 active:bg-violet-500/30 border-violet-500/20 hover:border-violet-500/35 text-violet-400 font-bold'
                                        : 'bg-violet-50 hover:bg-violet-100 active:bg-violet-200/80 border-violet-200 text-violet-700 font-bold shadow-sm'
                                }`}
                                title="Comparar dos empresas del historial o muestras"
                            >
                                <Scale size={14} className="animate-pulse" />
                                <span>Comparar RUCs</span>
                            </button>
                        </div>

                        {validationStatus === 'invalid' && (
                            <div className="flex items-center gap-1.5 text-red-400 text-[11px] mt-2 bg-red-500/5 border border-red-500/10 px-3 py-1.5 rounded-xl animate-fade-in font-sans w-fit cursor-help relative group">
                                <AlertCircle size={12} className="shrink-0" />
                                <span className="font-semibold underline decoration-dotted decoration-red-400/40">
                                    ¡Atención! El RUC falló la validación matemática Módulo 11 de SUNAT. Ver detalle.
                                </span>
                                {/* Secondary Hover Help Tooltip */}
                                <div id="m11-sub-error-tooltip" className="absolute top-full left-0 mt-2 w-72 bg-gradient-to-b from-slate-950 to-slate-900 border border-red-500/40 text-gray-300 text-[10px] p-4 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 leading-relaxed pointer-events-none">
                                    <div className="flex items-center gap-1.5 text-red-400 font-black mb-2 uppercase tracking-wider text-[10px] border-b border-red-500/20 pb-1.5">
                                        <AlertCircle size={14} className="shrink-0" />
                                        <span>Explicación del Algoritmo</span>
                                    </div>
                                    <p className="text-gray-200 font-normal">
                                        Para validar un RUC peruano, SUNAT resta la suma ponderada del múltiplo de 11. Dado que el último dígito verificador (<span className="text-red-400 font-mono font-bold">{rucQuery[10]}</span>) no coincide con el residuo calculado, este RUC es inválido en la base oficial.
                                    </p>
                                    <p className="mt-2 text-gray-400 text-[9.5px]">
                                        Esto puede deberse a un error de digitación o a que se trata de un RUC ficticio.
                                    </p>
                                    <div className="absolute bottom-full left-6 w-2.5 h-2.5 bg-slate-950 border-t border-l border-red-500/40 transform rotate-45 -mb-1.5" />
                                </div>
                            </div>
                        )}

                        {/* Presets */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className={`text-[10px] font-black uppercase tracking-wider transition-colors duration-200 ${
                                isModalDarkMode ? 'text-gray-500' : 'text-slate-400'
                            }`}>Muestras de prueba:</span>
                            {PRESET_RUCS.map((item) => (
                                <button
                                    key={item.ruc}
                                    onClick={() => triggerPreset(item.ruc)}
                                    className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-all flex items-center gap-1 cursor-pointer ${
                                        isModalDarkMode
                                            ? 'bg-white/5 hover:bg-white/15 border border-white/10 text-indigo-300 hover:text-indigo-200'
                                            : 'bg-white hover:bg-indigo-50/70 border border-slate-200 text-indigo-600 hover:text-indigo-505 hover:text-indigo-500 shadow-sm'
                                    }`}
                                >
                                    <span className={`font-mono ${isModalDarkMode ? 'text-gray-400' : 'text-slate-400'}`}>{item.ruc}</span>
                                    <span className="opacity-75">({item.name})</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    )}

                    {/* Error Banner */}
                    <AnimatePresence mode="wait">
                        {!compareMode && error && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3"
                            >
                                <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-red-400">Error de Consulta</p>
                                    <p className="text-xs text-red-200/80 mt-1">{error}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Result Panel */}
                    <AnimatePresence mode="wait">
                        {!compareMode && isLoading && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                className="py-10 flex flex-col items-center justify-center"
                            >
                                <div className="w-full max-w-md bg-slate-950/30 border border-white/5 rounded-2xl p-6 space-y-4">
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2 font-bold text-gray-300">
                                            <RefreshCw className="text-indigo-400 animate-spin" size={13} />
                                            <span className="uppercase tracking-wider text-[10px]">Túnel de Comunicación SUNAT/PSE</span>
                                        </div>
                                        <span className="text-[10px] bg-indigo-500/15 border border-indigo-500/20 px-2 py-0.5 rounded-full font-mono text-indigo-300 font-bold uppercase animate-pulse">Consultando</span>
                                    </div>

                                    {/* Progress Bar Animation */}
                                    <div className="space-y-2">
                                        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5 relative">
                                            <div 
                                                style={{ width: `${fetchingProgress}%` }}
                                                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-400 rounded-full transition-all duration-150 ease-out"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-gray-400 italic">
                                            <span>Estableciendo conexión y procesando consulta...</span>
                                            <span className="font-mono text-indigo-400 font-bold">{fetchingProgress}%</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {!compareMode && result && !isLoading && !error && (
                            <motion.div
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                className="space-y-6 ruc-result-panel"
                            >
                                {/* Quick Badges & Header Title */}
                                <motion.div 
                                    variants={itemVariants}
                                    className={`p-5 border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200 ${
                                        isModalDarkMode 
                                            ? 'bg-white/5 border-white/10' 
                                            : 'bg-white border-slate-200 shadow-sm'
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Mini interactive MYPE Profile Avatar */}
                                        <div 
                                            onClick={handleDownloadProfileLogo}
                                            className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 border border-white/20 flex items-center justify-center text-white font-sans font-black tracking-wider text-sm shadow-inner cursor-pointer hover:border-indigo-400/50 transition-all active:scale-95 shrink-0 relative group"
                                            title="Descargar Logo de Perfil MYPE"
                                        >
                                            <div className="absolute inset-0 bg-blue-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                            {getCompanyInitials(result.businessName)}
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-mono font-bold transition-all ${isModalDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>{result.ruc}</span>
                                                <button 
                                                    onClick={() => handleCopy(result.ruc, 'ruc')}
                                                    className={`p-1 rounded transition-all cursor-pointer ${
                                                        isModalDarkMode ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                                                    }`}
                                                    title="Copiar RUC"
                                                >
                                                    {copiedField === 'ruc' ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                                                </button>
                                            </div>
                                            <h4 className={`text-base font-black uppercase tracking-tight transition-colors duration-200 ${
                                                isModalDarkMode ? 'text-white' : 'text-slate-900'
                                            }`}>{result.businessName}</h4>
                                            {result.tradeName && (
                                                <div className="flex items-center gap-1.5 mt-1 animate-fade-in">
                                                    <span className={`text-[9px] uppercase font-mono font-black tracking-widest px-1.5 py-0.5 rounded border ${
                                                        isModalDarkMode 
                                                            ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' 
                                                            : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                                    }`}>
                                                        Nombre Comercial:
                                                    </span>
                                                    <span className={`text-xs font-extrabold ${isModalDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                                                        {result.tradeName}
                                                     </span>
                                                 </div>
                                             )}
                                        </div>
                                    </div>
 
                                    {/* SUNAT Status Badges */}
                                    <div className="flex items-center flex-wrap gap-4">
                                        <div className="space-y-1 block">
                                            <div className={`text-[9.5px] font-black uppercase tracking-wider transition-colors duration-200 ${
                                                isModalDarkMode ? 'text-gray-400' : 'text-slate-550'
                                            }`}>Estado Contribuyente</div>
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black ${
                                                result.active 
                                                    ? 'bg-green-500/10 text-green-500 border border-green-500/25' 
                                                    : 'bg-red-500/10 text-red-500 border border-red-500/25'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${result.active ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                                                {result.active ? 'ACTIVO' : 'BAJA DE OFICIO'}
                                            </span>
                                        </div>
  
                                        <div className="space-y-1 block">
                                            <div className={`text-[9.5px] font-black uppercase tracking-wider transition-colors duration-200 ${
                                                isModalDarkMode ? 'text-gray-400' : 'text-slate-550'
                                            }`}>Condición de Domicilio</div>
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black ${
                                                result.condition === 'HABIDO' 
                                                    ? 'bg-indigo-500/10 text-indigo-550 border border-indigo-500/25 text-indigo-600' 
                                                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/25'
                                            }`}>
                                                {result.condition === 'HABIDO' ? <ShieldCheck size={12} /> : <AlertCircle size={12} />}
                                                {result.condition}
                                            </span>
                                        </div>

                                        {/* NUEVO: Botón de Comparar con Popover de Historial */}
                                        <div className="space-y-1 block relative" id="compare-picker-container">
                                            <div className={`text-[9.5px] font-black uppercase tracking-wider transition-colors duration-200 ${
                                                isModalDarkMode ? 'text-gray-400' : 'text-slate-550'
                                            }`}>Acción Comparar</div>
                                            
                                            <button
                                                type="button"
                                                id="btn-trigger-compare-picker"
                                                onClick={() => setIsComparePickerOpen(!isComparePickerOpen)}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 ${
                                                    isModalDarkMode 
                                                        ? 'bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30' 
                                                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm'
                                                }`}
                                                title="Comparar esta empresa con otra previamente consultada"
                                            >
                                                <ArrowLeftRight size={12} className="text-indigo-400 shrink-0" />
                                                <span>Comparar</span>
                                            </button>

                                            {isComparePickerOpen && (
                                                <div 
                                                    id="compare-picker-dropdown" 
                                                    className={`absolute right-0 md:right-auto md:left-0 top-full mt-2 w-72 rounded-2xl border p-3.5 z-55 shadow-2xl transition-all animate-fade-in ${
                                                        isModalDarkMode 
                                                            ? 'bg-slate-950 border-white/10 text-gray-200' 
                                                            : 'bg-white border-slate-250 text-slate-700 shadow-xl'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-dashed dark:border-white/5 border-slate-200">
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                                                            <Scale size={11} /> Seleccione RUC contraparte
                                                        </span>
                                                        <button 
                                                            type="button"
                                                            onClick={() => setIsComparePickerOpen(false)}
                                                            className="text-gray-500 hover:text-red-400 p-0.5 rounded transition-colors cursor-pointer"
                                                        >
                                                            <X size={10} />
                                                        </button>
                                                    </div>

                                                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                                                        {([
                                                            ...recentSearches.filter(r => r.ruc !== result.ruc),
                                                            ...PRESET_RUCS.filter(p => p.ruc !== result.ruc)
                                                        ].filter((v, i, a) => a.findIndex(t => t.ruc === v.ruc) === i)).length > 0 ? (
                                                            ([
                                                                ...recentSearches.filter(r => r.ruc !== result.ruc),
                                                                ...PRESET_RUCS.filter(p => p.ruc !== result.ruc)
                                                            ].filter((v, i, a) => a.findIndex(t => t.ruc === v.ruc) === i)).map((cand) => (
                                                                <button
                                                                    key={`compare-cand-${cand.ruc}`}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setCompareRucA(result.ruc);
                                                                        setCompareRucB(cand.ruc);
                                                                        setCompareMode(true);
                                                                        setIsComparePickerOpen(false);
                                                                    }}
                                                                    className={`w-full text-left p-2 rounded-xl text-xs flex flex-col gap-0.5 group transition-all duration-150 cursor-pointer ${
                                                                        isModalDarkMode 
                                                                            ? 'hover:bg-indigo-500/20 hover:text-indigo-200 text-gray-300' 
                                                                            : 'hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 hover:border-indigo-100'
                                                                    }`}
                                                                >
                                                                    <div className="font-extrabold truncate group-hover:translate-x-0.5 transition-transform">{cand.name}</div>
                                                                    <div className="text-[10px] font-mono text-gray-500 group-hover:text-amber-500 transition-colors">RUC {cand.ruc}</div>
                                                                </button>
                                                            ))
                                                        ) : (
                                                            <div className="text-[10px] p-3 text-center text-gray-500 font-bold">
                                                                No hay otros RUCs disponibles.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
 
                                {/* API Response Latency Metrics bar */}
                                {queryLatency !== null && (
                                    <motion.div 
                                        variants={itemVariants}
                                        id="ruc-api-latency-indicator" 
                                        className={`px-5 py-3 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] font-sans transition-all duration-200 ${
                                        isModalDarkMode 
                                            ? 'bg-slate-950/40 border-white/5' 
                                            : 'bg-slate-100/60 border-slate-200'
                                    }`}>
                                        <div className={`flex items-center gap-2 transition-colors duration-200 ${
                                            isModalDarkMode ? 'text-gray-300' : 'text-slate-600 font-medium'
                                        }`}>
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                                            <span className="font-bold uppercase tracking-wider text-[9.5px]">Comunicación SUNAT/PSE de Consulta</span>
                                        </div>
                                        <div className="flex items-center gap-3 justify-between sm:justify-end flex-1">
                                            {/* Bar visualization */}
                                            <div className={`h-1.5 w-24 rounded-full overflow-hidden border relative hidden xs:block ${
                                                isModalDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-200 border-slate-300/30'
                                            }`}>
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-500 ${
                                                        queryLatency < 200 
                                                            ? 'bg-emerald-500' 
                                                            : queryLatency < 400 
                                                                ? 'bg-amber-500' 
                                                                : 'bg-red-500'
                                                    }`} 
                                                    style={{ width: `${Math.min(100, Math.max(10, (queryLatency / 500) * 100))}%` }}
                                                />
                                            </div>
                                            <span className={`font-mono font-black transition-colors duration-200 ${
                                                isModalDarkMode ? 'text-gray-200' : 'text-slate-800'
                                            }`}>
                                                {queryLatency} ms 
                                                <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[8.5px] uppercase ${
                                                    queryLatency < 200 
                                                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold' 
                                                        : queryLatency < 400 
                                                            ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20 font-bold' 
                                                            : 'bg-red-500/10 text-red-500 border border-red-500/20 font-bold'
                                                }`}>
                                                    {queryLatency < 200 ? 'Rápido' : queryLatency < 400 ? 'Normal' : 'Lento'}
                                                </span>
                                            </span>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Detailed Fields Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Left Column: Fiscal Details */}
                                    <motion.div 
                                        variants={containerVariants}
                                        className={`border rounded-xl p-5 space-y-4 transition-all duration-200 ${
                                            isModalDarkMode 
                                                ? 'bg-white/5 border-white/5 text-gray-200' 
                                                : 'bg-white border-slate-200/95 text-slate-700 shadow-sm'
                                        }`}
                                    >
                                        <motion.h5 
                                            variants={itemVariants}
                                            className={`text-xs font-black uppercase tracking-wider border-b pb-2 transition-colors duration-200 ${
                                                isModalDarkMode ? 'text-gray-400 border-white/5' : 'text-slate-500 border-slate-100'
                                            }`}
                                        >
                                            Información Fiscal
                                        </motion.h5>
                                        
                                        <div className="space-y-3">
                                            <motion.div variants={itemVariants}>
                                                <div className="flex items-center justify-between">
                                                    <div className={`text-[10px] font-bold uppercase ${isModalDarkMode ? 'text-gray-500' : 'text-slate-450'}`}>
                                                        Nombre Comercial de la MYPE
                                                    </div>
                                                    {isOcrAnalyzingTradeName ? (
                                                        <span className="flex items-center gap-1 text-[8.5px] font-black text-indigo-400 uppercase tracking-wider animate-pulse font-mono">
                                                            <RefreshCw size={9} className="animate-spin text-indigo-400" /> Analizando con AI...
                                                        </span>
                                                    ) : (
                                                        result.tradeName && (
                                                            <span className="text-[8px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
                                                                AUTO-COMPLETADO VÍA OCR
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                                <div className="relative mt-1">
                                                    <input 
                                                        id="mype-trade-name-field"
                                                        type="text"
                                                        value={result.tradeName || ''}
                                                        onChange={(e) => {
                                                            setResult(prev => {
                                                                if (!prev) return null;
                                                                return {
                                                                    ...prev,
                                                                    tradeName: e.target.value
                                                                };
                                                            });
                                                        }}
                                                        placeholder="Ingrese o autodetecte el nombre de fantasía"
                                                        className={`w-full border rounded-xl px-3 py-2 text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                                            isModalDarkMode
                                                                ? 'bg-slate-950/40 border-white/10 text-gray-200 focus:border-indigo-500 font-sans'
                                                                : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500 shadow-sm font-sans'
                                                        }`}
                                                    />
                                                </div>
                                            </motion.div>

                                            <motion.div variants={itemVariants}>
                                                <div className={`text-[10px] font-bold uppercase ${isModalDarkMode ? 'text-gray-500' : 'text-slate-450'}`}>Dirección Fiscal</div>
                                                <div className={`text-xs font-bold mt-1 flex items-start gap-1.5 transition-colors duration-200 ${
                                                    isModalDarkMode ? 'text-gray-200' : 'text-slate-800'
                                                }`}>
                                                    <MapPin size={13} className="text-indigo-500 shrink-0 mt-0.5" />
                                                    <span>{result.address}, {result.district} - {result.province}, {result.department}</span>
                                                </div>
                                            </motion.div>

                                            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <div className={`text-[10px] font-bold uppercase ${isModalDarkMode ? 'text-gray-500' : 'text-slate-450'}`}>Régimen Tributario</div>
                                                    <span className={`inline-block px-2 py-0.5 font-semibold rounded text-xs mt-1 transition-all duration-250 ${
                                                        isModalDarkMode 
                                                            ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' 
                                                            : 'bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm'
                                                    }`}>
                                                        {result.taxRegime}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className={`text-[10px] font-bold uppercase ${isModalDarkMode ? 'text-gray-500' : 'text-slate-450'}`}>Fecha de Inscripción</div>
                                                    <div className={`text-xs font-bold mt-1 flex items-center gap-1.5 transition-colors duration-200 ${
                                                        isModalDarkMode ? 'text-gray-200' : 'text-slate-800'
                                                    }`}>
                                                        <Calendar size={13} className={isModalDarkMode ? 'text-gray-400' : 'text-slate-400'} />
                                                        <span>{result.registrationDate}</span>
                                                    </div>
                                                </div>
                                            </motion.div>

                                            <motion.div variants={itemVariants}>
                                                <div className={`text-[10px] font-bold uppercase ${isModalDarkMode ? 'text-gray-500' : 'text-slate-450'}`}>Código CIIU & Actividad Económica</div>
                                                <div className={`text-xs font-semibold mt-1 transition-colors duration-200 ${
                                                    isModalDarkMode ? 'text-gray-300' : 'text-slate-800'
                                                }`}>{result.ciiu}</div>
                                                <div className={`text-[10.5px] italic mt-0.5 transition-colors duration-200 ${
                                                    isModalDarkMode ? 'text-gray-400' : 'text-slate-500'
                                                }`}>{result.mainActivity}</div>
                                            </motion.div>
                                        </div>
 
                                            <motion.div variants={itemVariants} className={`border-t pt-3 space-y-3 transition-colors duration-200 ${
                                                isModalDarkMode ? 'border-white/5' : 'border-slate-100'
                                            } ${isPowerExpired ? 'bg-red-500/5 -mx-4 px-4 py-3 rounded-xl border border-red-500/15' : ''}`}>
                                                <div className="flex items-center justify-between">
                                                    <label className={`text-[10px] font-bold uppercase tracking-wider block ${isPowerExpired ? 'text-red-450' : 'text-amber-500'}`}>
                                                        Fecha de Vencimiento del Poder
                                                    </label>
                                                    {isPowerExpired && (
                                                        <span className="flex items-center gap-1 text-[9px] bg-red-500/15 text-red-500 border border-red-500/20 px-1.5 py-0.5 rounded font-black tracking-wider uppercase animate-pulse">
                                                            <AlertTriangle size={10} /> PODER EXPIRADO
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                <div className="relative">
                                                    <input 
                                                        type="date"
                                                        value={powerExpiryDate}
                                                        onChange={(e) => setPowerExpiryDate(e.target.value)}
                                                        className={`w-full border rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer font-mono ${
                                                            isPowerExpired 
                                                                ? 'border-red-500/50 focus:ring-2 focus:ring-red-500 focus:border-red-500 text-red-200 bg-red-500/10' 
                                                                : isModalDarkMode 
                                                                    ? 'bg-slate-950/40 border-white/10 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-200'
                                                                    : 'bg-white border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 shadow-sm'
                                                        }`}
                                                    />
                                                    {isPowerExpired && (
                                                        <span className="absolute right-3 top-2.5 text-red-500 pointer-events-none">
                                                            <AlertTriangle size={14} className="animate-bounce" />
                                                        </span>
                                                    )}
                                                </div>
 
                                                {powerExpiryDate && (
                                                    <div className="flex items-center justify-between">
                                                        <p className={`text-[10.5px] italic font-medium ${isPowerExpired ? 'text-red-400' : 'text-gray-500'}`}>
                                                            Vence en: {new Date(powerExpiryDate + 'T00:00:00').toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                        </p>
                                                    </div>
                                                )}
 
                                                {/* File Verification Step (Interactive drag-and-drop / selector) */}
                                                <div className={`mt-2 text-[10px] font-bold uppercase tracking-widest transition-colors duration-200 flex items-center justify-between ${
                                                    isModalDarkMode ? 'text-gray-500' : 'text-slate-450'
                                                }`}>
                                                    <span>Auditoría y Firma Digital (PKI)</span>
                                                    <span className="text-[8px] opacity-75 font-mono">ESTÁNDAR X.509</span>
                                                </div>
                                                
                                                {powerFile ? (
                                                    <div className="space-y-2.5" id="pki-validation-container">
                                                        {/* File Info Card */}
                                                        <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors duration-200 ${
                                                            pkiValidationStep === 'invalid'
                                                                ? 'bg-red-500/5 border-red-500/20 text-red-300' 
                                                                : pkiValidationStep === 'valid'
                                                                    ? 'bg-green-500/5 border-green-500/25 text-green-300'
                                                                    : 'bg-slate-905 bg-slate-900/40 border-slate-750 border-white/5'
                                                        }`}>
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                <FileText size={16} className={pkiValidationStep === 'invalid' ? 'text-red-400' : pkiValidationStep === 'valid' ? 'text-green-400' : 'text-indigo-400'} />
                                                                <div className="truncate">
                                                                    <div className={`font-bold truncate ${isModalDarkMode ? 'text-gray-200' : 'text-slate-805 text-slate-800'}`}>{powerFile.name}</div>
                                                                    <div className="text-[10px] opacity-70 font-mono">{powerFile.size}</div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <button 
                                                                    type="button"
                                                                    onClick={handleRemovePowerFile}
                                                                    className="text-gray-400 hover:text-red-500 hover:bg-red-500/10 p-1 rounded-lg transition-all cursor-pointer"
                                                                    title="Remover archivo"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* PKI Micro Engine Board */}
                                                        <div className={`p-3 rounded-xl border text-[11px] space-y-2.5 transition-colors duration-250 ${
                                                            isModalDarkMode ? 'bg-slate-950/65 border-white/5' : 'bg-slate-50 border-slate-200 shadow-sm'
                                                        }`}>
                                                            {/* Verification Progress Router */}
                                                            {(pkiValidationStep === 'analyzing' || pkiValidationStep === 'verifying') && (
                                                                <div className="space-y-1.5 py-1">
                                                                    <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-indigo-455 text-indigo-405 text-indigo-400">
                                                                        <span className="flex items-center gap-1">
                                                                            <RefreshCw size={10} className="animate-spin text-indigo-500" />
                                                                            {pkiValidationStep === 'analyzing' ? 'Paso 1: Analizando Estructura PDF...' : 'Paso 2: Descifrando Firma PKCS#7...'}
                                                                        </span>
                                                                        <span className="font-mono">{pkiValidationProgress}%</span>
                                                                    </div>
                                                                    <div className="w-full h-1 bg-slate-850 dark:bg-slate-800/80 rounded-full overflow-hidden">
                                                                        <div 
                                                                            className="h-full bg-indigo-500 transition-all duration-150" 
                                                                            style={{ width: `${pkiValidationProgress}%` }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Valid Signature Panel */}
                                                            {pkiValidationStep === 'valid' && (
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center gap-1.5 text-emerald-500 font-extrabold uppercase text-[9px] tracking-wider">
                                                                        <ShieldCheck size={12} className="shrink-0 animate-pulse text-emerald-400" />
                                                                        <span>Verificación de Firma Integrada Completa</span>
                                                                    </div>

                                                                    <div className={`p-2 rounded-lg text-[9px] font-mono leading-relaxed space-y-1 border border-emerald-500/10 ${
                                                                        isModalDarkMode ? 'bg-black/25 text-gray-300' : 'bg-white text-slate-705 text-slate-700'
                                                                    }`}>
                                                                        <div>
                                                                            <span className="text-gray-500 dark:text-gray-450 font-bold">Autoridad CA:</span> CN=RENIEC-CA, O=RENIEC, C=PE
                                                                        </div>
                                                                        <div className="truncate">
                                                                            <span className="text-gray-500 dark:text-gray-450 font-bold">Clave Pública CA:</span> RSA-2048 (ID: SUNAT-CA-2026-X1)
                                                                        </div>
                                                                        <div className="truncate">
                                                                            <span className="text-gray-500 dark:text-gray-450 font-bold">Hash Firmado Computado:</span> <span className="text-emerald-400">{signatureHash}</span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-gray-500 dark:text-gray-450 font-bold">Inscripción:</span> Certificado Vigente SUNARP #1102948
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center justify-between pt-1">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setPkiForceInvalid(true);
                                                                                startPkiVerification(powerFile.name, powerFile.size, true);
                                                                            }}
                                                                            className="text-[8.5px] font-black uppercase text-amber-550 text-amber-500 hover:text-amber-400 bg-amber-500/10 hover:bg-amber-500/15 py-1 px-2 rounded-md transition-all cursor-pointer"
                                                                        >
                                                                            Simular Hash Alterado (Test)
                                                                        </button>
                                                                        <span className="text-[8.5px] text-emerald-400 border border-emerald-500/10 px-1 py-0.5 rounded font-bold font-mono">HASH_OK</span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Invalid Signature Panel */}
                                                            {pkiValidationStep === 'invalid' && (
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center gap-1.5 text-red-500 font-extrabold uppercase text-[9px] tracking-wider animate-pulse">
                                                                        <AlertTriangle size={12} className="shrink-0" />
                                                                        <span>Falla Crítica de Integridad</span>
                                                                    </div>

                                                                    <p className="text-[9.5px] text-red-400 font-medium leading-normal bg-red-500/5 p-2 rounded-lg border border-red-500/15">
                                                                        {pkiErrorMessage || "Los hashes del documento y de la clave pública simulada no coinciden."}
                                                                    </p>

                                                                    <div className="flex items-center justify-between pt-1">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setPkiForceInvalid(false);
                                                                                startPkiVerification(powerFile.name, powerFile.size, false);
                                                                            }}
                                                                            className="text-[8.5px] font-black uppercase text-emerald-450 text-emerald-450 text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15 py-1 px-2 rounded-md transition-all cursor-pointer"
                                                                        >
                                                                            Simular Firma Correcta
                                                                        </button>
                                                                        <span className="text-[8.5px] text-red-400 border border-red-500/10 px-1 py-0.5 rounded font-bold font-mono">BAD_HASH</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div 
                                                        onDragOver={(e) => { e.preventDefault(); setIsFileDragging(true); }}
                                                        onDragLeave={() => setIsFileDragging(false)}
                                                        onDrop={handlePowerFileDrop}
                                                        className={`border-2 border-dashed rounded-xl p-3.5 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                                                            isFileDragging 
                                                                ? 'border-indigo-500 bg-indigo-505 bg-indigo-500/10' 
                                                                : isPowerExpired 
                                                                    ? 'border-red-500/20 hover:border-red-500/40 bg-red-500/5' 
                                                                    : isModalDarkMode
                                                                        ? 'border-white/10 hover:border-white/20 bg-slate-950/20'
                                                                        : 'border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-slate-100/55 shadow-sm'
                                                         }`}
                                                        onClick={() => document.getElementById('power-file-input')?.click()}
                                                    >
                                                        <input 
                                                            id="power-file-input"
                                                            type="file"
                                                            accept=".pdf,.png,.jpg,.jpeg"
                                                            className="hidden"
                                                            onChange={handlePowerFileSelect}
                                                        />
                                                        <Upload size={18} className={isPowerExpired ? 'text-red-500/60' : isModalDarkMode ? 'text-gray-400' : 'text-slate-400'} />
                                                        <div className={`text-[10px] font-bold transition-colors duration-200 ${
                                                            isModalDarkMode ? 'text-gray-300' : 'text-slate-700'
                                                        }`}>
                                                            Cargar Copia Literal / Vigencia de Poder
                                                        </div>
                                                        <div className={`text-[8.5px] transition-colors duration-200 ${
                                                            isModalDarkMode ? 'text-gray-400' : 'text-slate-500'
                                                        }`}>
                                                             Arrastre aquí o haga clic para subir (Debe incluir Firma Digital válida)
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
 
                                            {/* Credit Limit Field (Admin Customizable) */}
                                            <motion.div 
                                                variants={itemVariants}
                                                className={`border-t pt-3 space-y-2 transition-colors duration-200 ${
                                                    isModalDarkMode ? 'border-white/5' : 'border-slate-100'
                                                }`} 
                                                id="credit-limit-wrapper"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <label htmlFor="credit-limit-input" className={`text-[10px] font-bold uppercase tracking-wider block transition-colors duration-200 ${
                                                        isModalDarkMode ? 'text-indigo-400' : 'text-indigo-650 text-indigo-700 font-black'
                                                    }`}>
                                                        Límite de Crédito (S/.)
                                                    </label>
                                                    {isAdmin ? (
                                                        <span className="text-[8px] bg-indigo-500/15 text-indigo-455 border border-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-black tracking-widest uppercase">
                                                            ADMIN-CONTROL
                                                        </span>
                                                    ) : (
                                                        <span className={`text-[8px] border px-1.5 py-0.5 rounded font-black tracking-widest uppercase transition-colors duration-200 ${
                                                            isModalDarkMode ? 'bg-white/5 text-gray-500 border-white/5' : 'bg-slate-100 text-slate-400 border-slate-200'
                                                        }`}>
                                                            SOLO LECTURA
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {isAdmin ? (
                                                    <div className="relative">
                                                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 text-xs font-bold font-mono">
                                                            S/.
                                                        </span>
                                                        <input 
                                                            id="credit-limit-input"
                                                            type="text"
                                                            value={creditLimitInput}
                                                            onChange={handleCreditLimitChange}
                                                            placeholder="Ej: 75000 (0 para eliminar)"
                                                            className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                                                isModalDarkMode
                                                                    ? 'bg-slate-950/40 border-white/10 text-gray-250 text-gray-200'
                                                                    : 'bg-white border-slate-300 text-slate-800'
                                                            }`}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className={`p-2.5 border rounded-xl flex items-center justify-between transition-colors duration-205 ${
                                                        isModalDarkMode 
                                                            ? 'bg-slate-950/30 border border-white/5' 
                                                            : 'bg-slate-50 border border-slate-200 shadow-sm'
                                                    }`}>
                                                        <span className={`text-[10.5px] font-medium transition-colors duration-200 ${
                                                            isModalDarkMode ? 'text-gray-400' : 'text-slate-500'
                                                        }`}>Asignación de Riesgo SAMI:</span>
                                                        <span className={`text-xs font-mono font-black transition-colors duration-200 ${
                                                            isModalDarkMode ? 'text-emerald-400' : 'text-emerald-600'
                                                        }`}>
                                                            {result.creditLimit ? `S/. ${result.creditLimit.toLocaleString('es-PE')}` : 'Sin Límite Asignado'}
                                                        </span>
                                                    </div>
                                                )}
                                                <p className={`text-[9px] leading-relaxed italic transition-colors duration-200 ${
                                                    isModalDarkMode ? 'text-gray-400' : 'text-slate-500'
                                                }`}>
                                                    {isAdmin 
                                                        ? 'Defina el límite de crédito bancario máximo para regular ofertas y flujos de riesgo.'
                                                        : 'Límite máximo de crédito asignado para operaciones financieras de la MYPE.'
                                                    }
                                                </p>
                                            </motion.div>

                                            {/* Recalculador de Riesgos y Límite de Crédito Recurrente */}
                                            <div id="ruc-scoring-recalculator" className={`border-t pt-4 mt-2 space-y-3 transition-colors duration-200 ${
                                                isModalDarkMode ? 'border-white/5' : 'border-slate-200/60'
                                            }`}>
                                                <div className="flex items-center justify-between">
                                                    <label className={`text-[10px] font-bold uppercase tracking-wider block transition-colors duration-200 ${
                                                        isModalDarkMode ? 'text-indigo-400' : 'text-indigo-700 font-extrabold'
                                                    }`}>
                                                        Análisis de Riesgo & Recalculador
                                                    </label>
                                                    <span className={`text-[8px] border px-1.5 py-0.5 rounded font-black tracking-widest uppercase flex items-center gap-1 transition-colors duration-200 ${
                                                        isModalDarkMode 
                                                            ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' 
                                                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                    }`}>
                                                        <Sparkles size={8} className="animate-pulse" /> DYNAMIC-SCORING
                                                    </span>
                                                </div>

                                                <p className={`text-[9.5px] leading-relaxed transition-colors duration-200 ${
                                                    isModalDarkMode ? 'text-gray-400' : 'text-slate-500'
                                                }`}>
                                                    Ajuste dinámicamente el límite financiero considerando la vigencia de poder de firmas autorizadas y el volumen de liquidez comercial.
                                                </p>

                                                {/* Selector de Actividad Comercial Reciente */}
                                                <div className="space-y-1">
                                                    <span className={`text-[9px] font-bold uppercase block ${
                                                        isModalDarkMode ? 'text-gray-500' : 'text-slate-400'
                                                    }`}>Actividad Comercial Reciente</span>
                                                    <select
                                                        value={activityLevel}
                                                        onChange={(e) => setActivityLevel(e.target.value as any)}
                                                        className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-semibold cursor-pointer transition-all ${
                                                            isModalDarkMode
                                                                ? 'bg-slate-950/40 border-white/10 text-gray-200 focus:ring-1 focus:ring-indigo-500'
                                                                : 'bg-white border-slate-300 text-slate-800 shadow-sm focus:ring-1 focus:ring-indigo-500'
                                                        }`}
                                                    >
                                                        <option value="low" className={isModalDarkMode ? 'bg-slate-950 text-white' : 'bg-white text-slate-800'}>
                                                            Low - Bajo (Flujo estable menor)
                                                        </option>
                                                        <option value="medium" className={isModalDarkMode ? 'bg-slate-950 text-white' : 'bg-white text-slate-800'}>
                                                            Medium - Moderado (Facturación estándar)
                                                        </option>
                                                        <option value="high" className={isModalDarkMode ? 'bg-slate-950 text-white' : 'bg-white text-slate-800'}>
                                                            High - Alto (Crecimiento regular de flujos)
                                                        </option>
                                                        <option value="excellent" className={isModalDarkMode ? 'bg-slate-950 text-white' : 'bg-white text-slate-800'}>
                                                            Excellent - Fuerte (Flujo sobresaliente)
                                                        </option>
                                                    </select>
                                                </div>

                                                {/* Recalculate Trigger Button */}
                                                <button
                                                    type="button"
                                                    id="btn-recalculate-credit"
                                                    onClick={handleRecalculateCreditLimit}
                                                    disabled={recalcLoading}
                                                    className={`w-full py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] ${
                                                        recalcLoading 
                                                            ? 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed animate-pulse' 
                                                            : isModalDarkMode 
                                                                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-600/10' 
                                                                : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-md'
                                                    }`}
                                                >
                                                    {recalcLoading ? (
                                                        <>
                                                            <RefreshCw size={12} className="animate-spin text-indigo-400" />
                                                            <span>Evaluando Factores de Riesgo...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <RefreshCw size={12} className="animate-pulse" />
                                                            <span>Recalcular Límite de Crédito</span>
                                                        </>
                                                    )}
                                                </button>

                                                {/* Recalculation Results & Highlights Summary Card */}
                                                {recalcSummary && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 15 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className={`p-3.5 rounded-xl border space-y-3 transition-colors duration-250 ${
                                                            recalcSummary.riskLevel === 'Bajo'
                                                                ? isModalDarkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50/40 border-emerald-200'
                                                                : recalcSummary.riskLevel === 'Moderado'
                                                                    ? isModalDarkMode ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50/40 border-indigo-200'
                                                                    : recalcSummary.riskLevel === 'Alto'
                                                                        ? isModalDarkMode ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50/40 border-amber-200'
                                                                        : isModalDarkMode ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50/45 border-red-200'
                                                        }`}
                                                    >
                                                        {/* Header: Score and Evaluation Badge */}
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={`text-[9.5px] font-black uppercase tracking-wider ${
                                                                    isModalDarkMode ? 'text-gray-400' : 'text-slate-550 font-bold'
                                                                }`}>
                                                                    Scoring de Ajuste:
                                                                </span>
                                                                <span className={`text-xs font-black font-mono px-2 py-0.5 rounded ${
                                                                    recalcSummary.riskScore >= 75
                                                                        ? 'bg-emerald-500/15 text-emerald-400'
                                                                        : recalcSummary.riskScore >= 50
                                                                            ? 'bg-indigo-500/15 text-indigo-400'
                                                                            : recalcSummary.riskScore >= 30
                                                                                ? 'bg-amber-500/15 text-amber-500'
                                                                                : 'bg-red-500/15 text-red-500'
                                                                }`}>
                                                                    {recalcSummary.riskScore} / 100
                                                                </span>
                                                            </div>
                                                            <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                                                recalcSummary.riskLevel === 'Bajo'
                                                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                                    : recalcSummary.riskLevel === 'Moderado'
                                                                        ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                                                                        : recalcSummary.riskLevel === 'Alto'
                                                                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                                                                            : 'bg-red-500/10 border-red-500/20 text-red-500'
                                                            }`}>
                                                                Riesgo: {recalcSummary.riskLevel}
                                                            </span>
                                                        </div>

                                                        {/* Comparison: Limit Shift */}
                                                        <div className="grid grid-cols-2 gap-2 text-center py-2 bg-black/15 dark:bg-black/20 rounded-lg border border-white/5">
                                                            <div>
                                                                <div className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">Límite Anterior</div>
                                                                <div className={`text-[11px] font-mono font-black ${
                                                                    isModalDarkMode ? 'text-gray-300' : 'text-slate-600'
                                                                }`}>
                                                                    {recalcSummary.previousLimit > 0 ? `S/. ${recalcSummary.previousLimit.toLocaleString('es-PE')}` : 'S/. 0'}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="text-[8px] text-indigo-400 font-bold uppercase tracking-wider">Nuevo Límite Simulado</div>
                                                                <div className="text-[11px] font-mono font-black text-emerald-400 mt-0.5">
                                                                    S/. {recalcSummary.newLimit.toLocaleString('es-PE')}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Analysis Reasons bullet lists */}
                                                        <div className="space-y-1.5">
                                                            <div className={`text-[8.5px] font-black uppercase tracking-widest ${
                                                                isModalDarkMode ? 'text-indigo-400' : 'text-indigo-800'
                                                            }`}>Justificación de Riesgos:</div>
                                                            <div className="space-y-1 text-left max-h-36 overflow-y-auto pr-1">
                                                                {recalcSummary.reasons.map((reason, idx) => (
                                                                    <div key={`idx-${idx}`} className={`text-[10px] leading-relaxed flex items-start gap-1 font-medium ${
                                                                        isModalDarkMode ? 'text-gray-300' : 'text-slate-700'
                                                                    }`}>
                                                                        <span className="shrink-0 mt-0.5">•</span>
                                                                        <span>{reason}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Apply Recalculation Button */}
                                                        {recalcSummary.isApplied ? (
                                                            <div className="flex items-center justify-center gap-1.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider rounded-lg">
                                                                <Check size={13} />
                                                                <span>Límite Aplicado Correctamente</span>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                id="btn-apply-recalculated-limit"
                                                                onClick={handleApplyRecalculatedLimit}
                                                                className={`w-full py-1.5 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.985] ${
                                                                    isModalDarkMode 
                                                                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black' 
                                                                        : 'bg-emerald-650 bg-emerald-600 hover:bg-emerald-700 text-white font-bold'
                                                                }`}
                                                            >
                                                                <Check size={12} />
                                                                <span>Aplicar Nuevo Límite en Ficha RUC</span>
                                                            </button>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </div>

                                            {/* Sincronización Bancaria vía PSE */}
                                            <div id="ruc-bank-partnership-sync" className={`border-t pt-4 mt-2 space-y-3 transition-colors duration-200 ${
                                                getThemeClass(modalPalette).borderCol
                                            }`}>
                                                <div className="flex items-center justify-between">
                                                    <label className={`text-[10px] font-bold uppercase tracking-wider block transition-colors duration-200 ${
                                                        getThemeClass(modalPalette).labelAccent
                                                    }`}>
                                                        Sincronizar cuenta bancaria mype
                                                    </label>
                                                    <span className={`text-[8px] border px-1.5 py-0.5 rounded font-black tracking-widest uppercase flex items-center gap-1 transition-colors duration-200 ${
                                                        isModalDarkMode 
                                                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' 
                                                            : 'bg-blue-50 text-blue-700 border-blue-200'
                                                    }`}>
                                                        <Landmark size={8} /> PSE-BANK-GATEWAY
                                                    </span>
                                                </div>

                                                <p className={`text-[9.5px] leading-relaxed transition-colors duration-200 ${
                                                    getThemeClass(modalPalette).textMuted
                                                }`}>
                                                    Valide la cuenta corriente comercial via el canal PSE y verifique si el banco posee una alianza de conciliación automatizada activa con SAMI.
                                                </p>

                                                {/* Account Inputs Row */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    <div>
                                                        <span className={`text-[9px] font-bold uppercase block mb-1 ${
                                                            getThemeClass(modalPalette).textMuted
                                                        }`}>Banco Originador</span>
                                                        <select
                                                            disabled={bankSyncStatus === 'validating' || bankSyncStatus === 'checking_partnership'}
                                                            value={bankSelected}
                                                            onChange={(e) => {
                                                                setBankSelected(e.target.value);
                                                                setBankSyncStatus('idle');
                                                                setBankSyncMessage(null);
                                                            }}
                                                            className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-semibold cursor-pointer transition-all ${
                                                                getThemeClass(modalPalette).inputBg
                                                            } ${
                                                                getThemeClass(modalPalette).inputBorder
                                                            } ${
                                                                getThemeClass(modalPalette).inputText
                                                            } focus:ring-1 focus:ring-indigo-500`}
                                                        >
                                                            <option value="banco_c" className={isModalDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}>Banco ProMYPE (Socio Aliado)</option>
                                                            <option value="caja_b" className={isModalDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}>Caja Confianza (Socio Aliado)</option>
                                                            <option value="fintech_a" className={isModalDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}>Fintech Veloz (Socio Aliado)</option>
                                                            <option value="bcp" className={isModalDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}>Banco de Crédito (BCP)</option>
                                                            <option value="bbva" className={isModalDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}>BBVA Continental</option>
                                                            <option value="interbank" className={isModalDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}>Interbank</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <span className={`text-[9px] font-bold uppercase block mb-1 ${
                                                            getThemeClass(modalPalette).textMuted
                                                        }`}>CCI / Número de Cuenta</span>
                                                        <input
                                                            disabled={bankSyncStatus === 'validating' || bankSyncStatus === 'checking_partnership'}
                                                            type="text"
                                                            value={bankAccountNum}
                                                            onChange={(e) => {
                                                                setBankAccountNum(e.target.value.replace(/\D/g, '').substring(0, 20));
                                                                setBankSyncStatus('idle');
                                                                setBankSyncMessage(null);
                                                            }}
                                                            placeholder="Ingrese 10 a 20 dígitos"
                                                            className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold transition-all ${
                                                                getThemeClass(modalPalette).inputBg
                                                            } ${
                                                                getThemeClass(modalPalette).inputBorder
                                                            } ${
                                                                getThemeClass(modalPalette).inputText
                                                            } focus:ring-1 focus:ring-indigo-500`}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Action Sync Button */}
                                                {bankSyncStatus !== 'synchronized' && (
                                                    <button
                                                        type="button"
                                                        id="btn-sync-bank"
                                                        disabled={bankSyncStatus === 'validating' || bankSyncStatus === 'checking_partnership'}
                                                        onClick={handleSyncBank}
                                                        className={`w-full py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] ${
                                                            bankSyncStatus === 'validating' || bankSyncStatus === 'checking_partnership'
                                                                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 cursor-not-allowed'
                                                                : getThemeClass(modalPalette).btnPrimary
                                                        }`}
                                                    >
                                                        {(bankSyncStatus === 'validating' || bankSyncStatus === 'checking_partnership') ? (
                                                            <>
                                                                <RefreshCw size={13} className="animate-spin text-indigo-400" />
                                                                <span>Sincronizando...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <RefreshCw size={12} />
                                                                <span>Sincronizar Banco</span>
                                                            </>
                                                        )}
                                                    </button>
                                                )}

                                                {/* Status message banners */}
                                                {bankSyncMessage && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className={`p-3 rounded-xl border text-[10px] sm:text-[10.5px] leading-relaxed space-y-1.5 ${
                                                            bankSyncStatus === 'synchronized'
                                                                ? isModalDarkMode ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border-emerald-250 text-emerald-800'
                                                                : bankSyncStatus === 'no_partnership'
                                                                    ? isModalDarkMode ? 'bg-amber-500/5 border-amber-500/15 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
                                                                    : bankSyncStatus === 'failed'
                                                                        ? isModalDarkMode ? 'bg-red-500/5 border-red-500/15 text-red-300' : 'bg-red-50 border-red-200 text-red-800'
                                                                        : isModalDarkMode ? 'bg-slate-950/50 border-white/5 text-gray-400' : 'bg-slate-50 border-slate-200 text-slate-550'
                                                        }`}
                                                    >
                                                        <div className="flex items-start gap-1.5">
                                                            {bankSyncStatus === 'synchronized' && <ShieldCheck size={14} className="text-emerald-400 shrink-0 mt-0.5 animate-pulse" />}
                                                            {bankSyncStatus === 'no_partnership' && <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />}
                                                            {bankSyncStatus === 'failed' && <XCircle size={14} className="text-red-400 shrink-0 mt-0.5" />}
                                                            {(bankSyncStatus === 'validating' || bankSyncStatus === 'checking_partnership') && <RefreshCw size={14} className="text-indigo-400 shrink-0 mt-0.5 animate-spin" />}
                                                            <span>{bankSyncMessage}</span>
                                                        </div>

                                                        {bankSyncStatus === 'synchronized' && (
                                                            <div className={`mt-2 p-2 rounded-lg text-[9.5px] font-mono leading-tight border ${
                                                                isModalDarkMode ? 'bg-black/30 border-emerald-500/10 text-emerald-350' : 'bg-white border-emerald-150 text-emerald-700'
                                                            }`}>
                                                                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                                                                    <div><span className="opacity-60">Titular de Cuenta:</span></div>
                                                                    <div className="font-bold truncate">{bankAccountHolder}</div>
                                                                    <div><span className="opacity-60">Estado de Alianza:</span></div>
                                                                    <div className="font-extrabold text-emerald-500">ACTIVO / CO-ORGANIZADO</div>
                                                                    <div><span className="opacity-60">Canal de Consulta:</span></div>
                                                                    <div>API DIRECTO PSE</div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </div>
                                    </motion.div>

                                    {/* Right Column: Legal Indicators & Contacts */}
                                    <motion.div 
                                        variants={containerVariants}
                                        className={`border rounded-xl p-5 space-y-4 transition-all duration-200 ${
                                        isModalDarkMode 
                                            ? 'bg-white/5 border-white/5 text-gray-200' 
                                            : 'bg-white border-slate-200/95 text-slate-700 shadow-sm'
                                        }`}
                                    >
                                        <motion.h5 
                                            variants={itemVariants}
                                            className={`text-xs font-black uppercase tracking-wider border-b pb-2 transition-colors duration-200 ${
                                                isModalDarkMode ? 'text-gray-400 border-white/5' : 'text-slate-500 border-slate-100'
                                            }`}
                                        >
                                            Indicadores de Padrón SUNAT
                                        </motion.h5>

                                        <div className="space-y-4">
                                            <motion.div variants={itemVariants} className="space-y-2">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className={isModalDarkMode ? 'text-gray-400' : 'text-slate-550 font-semibold'}>Emisor Electrónico desde Origen</span>
                                                    {result.electronicBilling ? (
                                                        <span className="px-2 py-0.5 bg-green-500/10 text-green-400 font-bold border border-green-500/20 rounded text-[10px]">SÍ</span>
                                                    ) : (
                                                        <span className={`px-2 py-0.5 font-bold rounded text-[10px] border transition-colors duration-200 ${
                                                            isModalDarkMode ? 'bg-gray-500/10 text-gray-400 border-white/5' : 'bg-slate-100 text-slate-400 border-slate-200'
                                                        }`}>NO</span>
                                                    )}
                                                </div>
                                                
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-gray-400">Agente de Retención IGV</span>
                                                    {result.retainingAgent ? (
                                                        <span className="px-2 py-0.5 bg-green-500/10 text-green-400 font-bold border border-green-500/20 rounded text-[10px]">SÍ</span>
                                                    ) : (
                                                        <span className={`px-2 py-0.5 font-bold rounded text-[10px] border transition-colors duration-200 ${
                                                            isModalDarkMode ? 'bg-gray-500/10 text-gray-400 border-white/5' : 'bg-slate-100 text-slate-400 border-slate-200'
                                                        }`}>NO</span>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-gray-400">Agente de Percepción IGV</span>
                                                    {result.agentOfPerception ? (
                                                        <span className="px-2 py-0.5 bg-green-500/10 text-green-400 font-bold border border-green-500/20 rounded text-[10px]">SÍ</span>
                                                    ) : (
                                                        <span className={`px-2 py-0.5 font-bold rounded text-[10px] border transition-colors duration-200 ${
                                                            isModalDarkMode ? 'bg-gray-500/10 text-gray-400 border-white/5' : 'bg-slate-100 text-slate-400 border-slate-200'
                                                        }`}>NO</span>
                                                    )}
                                                </div>
                                            </motion.div>

                                            <motion.div 
                                                variants={itemVariants}
                                                className={`border-t pt-3 space-y-2.5 transition-colors duration-250 ${
                                                    isModalDarkMode ? 'border-white/5' : 'border-slate-100'
                                                }`}
                                            >
                                                <div className={`text-[10px] font-bold uppercase transition-colors duration-200 ${
                                                    isModalDarkMode ? 'text-gray-500' : 'text-slate-450'
                                                }`}>Datos de Contacto Coincidentes</div>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div className={`flex items-center gap-1.5 transition-colors duration-200 ${
                                                        isModalDarkMode ? 'text-gray-300' : 'text-slate-700'
                                                    }`}>
                                                        <Phone size={12} className={isModalDarkMode ? 'text-gray-450' : 'text-slate-400'} />
                                                        <span className="font-mono">{result.phone}</span>
                                                    </div>
                                                    <div className={`flex items-center gap-1.5 truncate transition-colors duration-200 ${
                                                        isModalDarkMode ? 'text-gray-300' : 'text-slate-700'
                                                    }`} title={result.email}>
                                                        <Mail size={12} className={isModalDarkMode ? 'text-gray-455 shrink-0' : 'text-slate-400 shrink-0'} />
                                                        <span className="truncate">{result.email}</span>
                                                    </div>
                                                </div>
                                            </motion.div>

                                            {/* MYPE Brand Logo Card */}
                                             <motion.div 
                                                variants={itemVariants}
                                                id="mype-brand-logo-card" 
                                                className={`border-t pt-4 space-y-3 transition-colors duration-200 ${
                                                    isModalDarkMode ? 'border-white/5' : 'border-slate-100'
                                                }`}
                                             >
                                                <div className="flex items-center justify-between">
                                                    <div className="text-[10px] text-indigo-400 font-black uppercase tracking-wider flex items-center gap-1.5">
                                                        <Sparkles size={12} className="text-indigo-400 animate-pulse" />
                                                        <span>Identidad MYPE • Logo Fintech</span>
                                                    </div>
                                                    <span className="text-[9px] text-gray-500 font-medium font-sans">Diseño Azul y Plata</span>
                                                </div>

                                                {/* Selector de Estilo */}
                                                <div className="space-y-2 border border-slate-100/10 dark:border-white/5 bg-slate-900/10 dark:bg-black/10 p-3 rounded-xl select-none" id="logo-style-selector-container">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                                        <label htmlFor="logo-style-select" className={`block text-[10px] font-bold uppercase tracking-wider ${isModalDarkMode ? 'text-gray-400' : 'text-slate-500'} text-left`}>
                                                            Estilo de Logo Corporativo:
                                                        </label>
                                                        <select
                                                            id="logo-style-select"
                                                            value={logoStyle}
                                                            onChange={(e) => setLogoStyle(e.target.value as 'tech' | 'traditional' | 'eco')}
                                                            className={`text-[10px] font-black uppercase tracking-wider py-1 px-2 rounded-lg border outline-none cursor-pointer transition-all ${
                                                                isModalDarkMode 
                                                                    ? 'bg-slate-900 border-white/10 text-gray-200 focus:border-indigo-500' 
                                                                    : 'bg-white border-slate-200 text-slate-705 focus:border-indigo-500 shadow-sm'
                                                            }`}
                                                        >
                                                            <option value="tech">Modo Tech</option>
                                                            <option value="traditional">Modo Tradicional</option>
                                                            <option value="eco">Modo Eco</option>
                                                        </select>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2 mt-1">
                                                        <button
                                                            id="logo-style-btn-tech"
                                                            type="button"
                                                            onClick={() => setLogoStyle('tech')}
                                                            className={`px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all text-center cursor-pointer ${
                                                                logoStyle === 'tech'
                                                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-500/50'
                                                                    : isModalDarkMode
                                                                        ? 'bg-white/5 hover:bg-white/10 text-gray-400 border border-white/5'
                                                                        : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
                                                            }`}
                                                        >
                                                            Modo Tech
                                                        </button>
                                                        <button
                                                            id="logo-style-btn-traditional"
                                                            type="button"
                                                            onClick={() => setLogoStyle('traditional')}
                                                            className={`px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all text-center cursor-pointer ${
                                                                logoStyle === 'traditional'
                                                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-500/50'
                                                                    : isModalDarkMode
                                                                        ? 'bg-white/5 hover:bg-white/10 text-gray-400 border border-white/5'
                                                                        : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
                                                            }`}
                                                        >
                                                            Modo Tradicional
                                                        </button>
                                                        <button
                                                            id="logo-style-btn-eco"
                                                            type="button"
                                                            onClick={() => setLogoStyle('eco')}
                                                            className={`px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all text-center cursor-pointer ${
                                                                logoStyle === 'eco'
                                                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-500/50'
                                                                    : isModalDarkMode
                                                                        ? 'bg-white/5 hover:bg-white/10 text-gray-400 border border-white/5'
                                                                        : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
                                                            }`}
                                                        >
                                                            Modo Eco
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className={`p-3 rounded-xl border flex flex-col sm:flex-row gap-4 items-center transition-all duration-200 ${
                                                    isModalDarkMode 
                                                        ? 'bg-slate-950/40 border-white/5' 
                                                        : 'bg-indigo-50/20 border-indigo-100 shadow-inner'
                                                }`}>
                                                    {/* Logo Preview box */}
                                                    <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-900 border p-1 flex flex-col justify-center items-center shadow-2xl relative overflow-hidden group shrink-0 transition-all duration-300 ${
                                                        logoStyle === 'tech' ? 'border-white/15' : logoStyle === 'traditional' ? 'border-slate-400/20' : 'border-blue-400/20'
                                                    }`}>
                                                        {logoStyle === 'tech' && (
                                                            <>
                                                                <div className="absolute inset-2 border border-slate-700/35 rounded-full pointer-events-none" />
                                                                <div className="absolute inset-4 border border-indigo-500/15 rounded-full pointer-events-none" />
                                                                <div className="absolute top-1 left-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full blur-[1px]" />
                                                                <div className="absolute bottom-1 left-1/2 w-1.5 h-1.5 bg-slate-300 rounded-full blur-[1px]" />
                                                                <span className="text-3xl font-black bg-gradient-to-b from-white via-slate-200 to-slate-400 bg-clip-text text-transparent font-sans tracking-wide drop-shadow-lg z-10 select-none group-hover:scale-110 transition-transform duration-300">
                                                                    {getCompanyInitials(result.businessName)}
                                                                </span>
                                                                <span className="text-[7px] text-blue-400/90 font-extrabold uppercase mt-1 tracking-widest z-10 select-none font-sans">
                                                                    TECH STYLE
                                                                </span>
                                                            </>
                                                        )}
                                                        
                                                        {logoStyle === 'traditional' && (
                                                            <>
                                                                <div className="absolute inset-2 border-2 border-slate-400/30 rounded-full pointer-events-none" />
                                                                <div className="absolute inset-3 border border-blue-500/25 rounded-full pointer-events-none" />
                                                                <div className="absolute inset-5 border border-dashed border-slate-600/20 rounded-full pointer-events-none" />
                                                                <div className="absolute left-1.5 top-11 text-slate-400 text-[8px] select-none">•</div>
                                                                <div className="absolute right-1.5 top-11 text-slate-400 text-[8px] select-none">•</div>
                                                                <span className="text-3xl font-semibold bg-gradient-to-b from-white via-slate-300 to-blue-400 bg-clip-text text-transparent font-serif tracking-normal drop-shadow-md z-10 select-none group-hover:scale-105 transition-transform duration-300">
                                                                    {getCompanyInitials(result.businessName)}
                                                                </span>
                                                                <span className="text-[7.5px] text-slate-300/80 font-bold uppercase mt-1 tracking-wider z-10 select-none font-serif">
                                                                    HERITAGE
                                                                </span>
                                                            </>
                                                        )}
                                                        
                                                        {logoStyle === 'eco' && (
                                                            <>
                                                                <div className="absolute inset-2 border border-teal-500/10 rounded-full pointer-events-none" />
                                                                <div className="absolute inset-4 border border-blue-400/20 rounded-full pointer-events-none" />
                                                                <svg className="absolute inset-1 w-22 h-22 opacity-35 pointer-events-none text-blue-400 fill-none stroke-current" viewBox="0 0 100 100">
                                                                    <path d="M 20 80 Q 25 20 80 20" strokeWidth="1.5" strokeLinecap="round" />
                                                                    <path d="M 25 60 Q 30 55 40 58 M 35 45 Q 40 40 50 45" strokeWidth="1" />
                                                                </svg>
                                                                <span className="text-3xl font-light bg-gradient-to-b from-white via-slate-200 to-blue-300 bg-clip-text text-transparent font-sans tracking-widest drop-shadow-md z-10 select-none group-hover:scale-110 transition-transform duration-350">
                                                                    {getCompanyInitials(result.businessName)}
                                                                </span>
                                                                <span className="text-[7px] text-blue-300/90 font-medium uppercase mt-1 tracking-widest z-10 select-none font-sans">
                                                                    ORGANIC ECO
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="space-y-2 flex-1 min-w-0 text-center sm:text-left">
                                                        <p className="text-[10.5px] text-gray-300 leading-relaxed font-sans">
                                                            Logo corporativo de alto contraste en <span className="text-indigo-300 font-bold">azul y plata</span> usando <span className="text-white font-extrabold capitalize">{logoStyle === 'tech' ? 'Modo Tech' : logoStyle === 'traditional' ? 'Modo Tradicional' : 'Modo Eco'}</span>. Listo para cargarse como avatar institucional de forma profesional.
                                                        </p>
                                                        <button
                                                            type="button"
                                                            onClick={handleDownloadProfileLogo}
                                                            className={`w-full sm:w-auto px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] ${
                                                                isModalDarkMode 
                                                                    ? 'bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 hover:border-indigo-500/30 text-indigo-300 hover:text-white' 
                                                                    : 'bg-indigo-50 hover:bg-indigo-100/85 active:bg-indigo-150 border border-indigo-200/60 text-indigo-750 hover:text-indigo-800'
                                                            }`}
                                                        >
                                                            <Download size={11} />
                                                            <span>Descargar Logo Perfil (PNG)</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>

                                            {/* QR Code Generator */}
                                            <motion.div 
                                                variants={itemVariants}
                                                id="ruc-qr-generator" 
                                                className={`border-t pt-4 space-y-3 transition-colors duration-200 ${
                                                    isModalDarkMode ? 'border-white/5' : 'border-slate-100'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="text-[10px] text-indigo-400 font-black uppercase tracking-wider flex items-center gap-1.5">
                                                        <QrCode size={12} />
                                                        <span>Código QR de la Ficha RUC</span>
                                                    </div>
                                                    <span className="text-[9px] text-gray-500 font-medium">Escanear para compartir</span>
                                                </div>
                                                <div className={`flex items-center gap-4 p-3 rounded-xl border transition-all duration-200 ${
                                                    isModalDarkMode 
                                                        ? 'bg-slate-950/40 border-white/5' 
                                                        : 'bg-indigo-50/20 border-indigo-100 shadow-inner'
                                                }`}>
                                                    <div className="p-1.5 bg-white rounded-lg inline-block shrink-0 shadow-lg shadow-black/40">
                                                        <img 
                                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                                                                `RUC: ${result.ruc}\nEmpresa: ${result.businessName}\nDirección: ${result.address}, ${result.district} - ${result.province}`
                                                            )}&color=030712`}
                                                            alt="Código QR RUC"
                                                            className="w-20 h-20 select-none"
                                                            referrerPolicy="no-referrer"
                                                        />
                                                    </div>
                                                    <div className="space-y-2 flex-1 min-w-0">
                                                        <p className="text-[10px] text-gray-400 leading-relaxed font-medium font-sans">
                                                            Este código almacena el RUC, la Razón Social y la Dirección Fiscal de la empresa para un traspaso rápido de datos a celulares.
                                                        </p>
                                                        <button
                                                            type="button"
                                                            onClick={handleDownloadQr}
                                                            className={`px-2.5 py-1.5 rounded-lg text-[9.5px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                                                isModalDarkMode 
                                                                    ? 'bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 hover:border-indigo-500/30 text-indigo-300 hover:text-white' 
                                                                    : 'bg-indigo-50 hover:bg-indigo-100/85 active:bg-indigo-150 border border-indigo-200/60 text-indigo-750 hover:text-indigo-800'
                                                            }`}
                                                        >
                                                            <Download size={11} />
                                                            <span>Descargar Código QR</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </div>
                                    </motion.div>
                                </div>

                                {/* Historical borrowing capacity graph */}
                                <motion.div
                                    variants={itemVariants}
                                    id="ruc-historical-limits-chart"
                                    className={`border rounded-xl p-5 space-y-4 transition-all duration-200 ${
                                        isModalDarkMode 
                                            ? 'bg-white/5 border-white/5 text-gray-200' 
                                            : 'bg-white border-slate-200/95 text-slate-700 shadow-sm'
                                    }`}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-dashed border-white/10">
                                        <div className="space-y-0.5">
                                            <h5 className={`text-xs font-black uppercase tracking-wider transition-colors duration-200 flex items-center gap-1.5 ${
                                                isModalDarkMode ? 'text-gray-200' : 'text-slate-800'
                                            }`}>
                                                <History size={14} className="text-indigo-400" />
                                                Evolución Histórica de Capacidad de Endeudamiento
                                            </h5>
                                            <p className={`text-[10px] transition-colors duration-200 ${
                                                isModalDarkMode ? 'text-gray-400' : 'text-slate-500'
                                            }`}>
                                                Análisis de comportamiento y cupos asignados por meses de la MYPE.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2.5 h-2.5 rounded bg-[#6366f1] block"></span>
                                                <span className={`text-[9.5px] font-bold ${isModalDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>Límite autorizado</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2.5 h-2.5 rounded bg-[#10b981] block"></span>
                                                <span className={`text-[9.5px] font-bold ${isModalDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>Capacidad libre</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-full h-56 pt-2 select-none">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={historicalDebtCapacityData}
                                                margin={{ top: 10, right: 5, left: -10, bottom: 0 }}
                                                barGap={5}
                                            >
                                                <CartesianGrid 
                                                    strokeDasharray="3 3" 
                                                    stroke={isModalDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)"} 
                                                    vertical={false} 
                                                />
                                                <XAxis 
                                                    dataKey="mes" 
                                                    tick={{ fontSize: 9.5, fill: isModalDarkMode ? '#9CA3AF' : '#64748B', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontWeight: 600 }} 
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                />
                                                <YAxis 
                                                    tick={{ fontSize: 9.5, fill: isModalDarkMode ? '#9CA3AF' : '#64748B', fontFamily: 'JetBrains Mono, ui-monospace, monospace' }} 
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                    tickFormatter={(v) => `S/${(v/1000).toFixed(0)}k`} 
                                                />
                                                <Tooltip
                                                    contentStyle={{ 
                                                        backgroundColor: isModalDarkMode ? 'rgb(15, 23, 42)' : 'rgb(255, 255, 255)', 
                                                        borderColor: isModalDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                                                        borderRadius: '12px', 
                                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                                                        fontFamily: 'Inter, sans-serif',
                                                        fontSize: '11px',
                                                        fontWeight: 500,
                                                    }}
                                                    itemStyle={{ color: isModalDarkMode ? '#f3f4f6' : '#1e293b' }}
                                                    labelStyle={{ color: isModalDarkMode ? '#9ca3af' : '#64748b', fontWeight: 700 }}
                                                    formatter={(value: any, name: string) => [
                                                        `S/. ${Number(value).toLocaleString('es-PE')}`, 
                                                        name
                                                     ]}
                                                    cursor={{ fill: isModalDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)' }}
                                                />
                                                <Bar 
                                                    dataKey="Límite de Crédito" 
                                                    fill="#6366f1" 
                                                    radius={[4, 4, 0, 0]} 
                                                    maxBarSize={28} 
                                                />
                                                <Bar 
                                                    dataKey="Capacidad de Endeudamiento" 
                                                    fill="#10b981" 
                                                    radius={[4, 4, 0, 0]} 
                                                    maxBarSize={28} 
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className={`text-[9.5px] leading-relaxed italic border-t pt-3 flex items-center gap-1 ${
                                        isModalDarkMode ? 'text-gray-400 border-white/5' : 'text-slate-500 border-slate-100'
                                    }`}>
                                        <span>* Gráfico interactivo con recálculo dinámico basado en las variables del motor SAMI-Risk.</span>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {compareMode && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-6"
                        >
                            {/* Comparison Title Header */}
                            <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all duration-200 ${
                                isModalDarkMode ? 'bg-indigo-950/20 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100 shadow-sm'
                            }`}>
                                <div className="space-y-1">
                                    <h4 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${
                                        isModalDarkMode ? 'text-indigo-400' : 'text-indigo-700'
                                    }`}>
                                        <Scale size={16} />
                                        <span>Comparador de Calificación y Riesgo MYPE</span>
                                    </h4>
                                    <p className={`text-[11px] leading-relaxed ${isModalDarkMode ? 'text-gray-400' : 'text-slate-650 text-slate-600'}`}>
                                        Almacene o digite dos RUCs para contrastar side-by-side situación SUNAT, cupos de crédito, contacto y régimen impositivo.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCompareRucA('');
                                            setCompareRucB('');
                                            setDetailsA(null);
                                            setDetailsB(null);
                                        }}
                                        className={`px-3 py-1.5 text-[10.5px] font-bold rounded-lg border transition-all cursor-pointer ${
                                            isModalDarkMode
                                                ? 'bg-slate-900 border-white/10 hover:bg-white/10 text-gray-400 hover:text-white'
                                                : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-600 hover:text-slate-800'
                                        }`}
                                    >
                                        Limpiar Todo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCompareMode(false)}
                                        className={`px-3 py-1.5 text-[10.5px] font-bold border rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                                            isModalDarkMode
                                                ? 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-white'
                                                : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-white shadow-sm'
                                        }`}
                                    >
                                        <ArrowLeftRight size={12} />
                                        <span>Volver a Consulta</span>
                                    </button>
                                </div>
                            </div>

                            {/* Selectors card grids */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Selector A */}
                                <div className={`p-5 rounded-2xl border transition-all duration-200 ${
                                    isModalDarkMode ? 'bg-slate-950/25 border-white/5' : 'bg-white border-slate-200 shadow-sm'
                                }`}>
                                    <span className={`block text-[10px] font-black uppercase tracking-wider mb-2.5 ${
                                        isModalDarkMode ? 'text-gray-400' : 'text-slate-500'
                                    }`}>Firma de Referencia A</span>

                                    <div className="space-y-3.5">
                                        {/* Selector dropdown unified list */}
                                        <select
                                            value={compareRucA}
                                            onChange={(e) => setCompareRucA(e.target.value)}
                                            className={`w-full p-2.5 text-xs font-bold rounded-xl border transition-colors ${
                                                isModalDarkMode 
                                                    ? 'bg-slate-950 border-white/10 text-white focus:border-indigo-500/50' 
                                                    : 'bg-white border-slate-300 text-slate-850 text-slate-800 focus:border-indigo-500 shadow-sm'
                                            }`}
                                        >
                                            <option value="" className={isModalDarkMode ? 'bg-slate-900 text-gray-400' : 'bg-white text-slate-400'}>-- Seleccionar del Historial / Muestras --</option>
                                            {Array.from(new Map([
                                                ...PRESET_RUCS.map(p => [p.ruc, p]),
                                                ...recentSearches.map(r => [r.ruc, r])
                                            ]).values()).map((item: any) => (
                                                <option key={`a-opt-${item.ruc}`} value={item.ruc} className={isModalDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}>
                                                    {item.ruc} - {item.name}
                                                </option>
                                            ))}
                                        </select>

                                        {/* Let manual input loading */}
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                id="compare-man-a"
                                                placeholder="Digite RUC de 11 dígitos"
                                                maxLength={11}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const val = e.currentTarget.value.trim();
                                                        if (val.length === 11) setCompareRucA(val);
                                                    }
                                                }}
                                                className={`flex-1 px-3 py-2 text-xs font-bold font-mono rounded-xl border transition-all focus:outline-none ${
                                                    isModalDarkMode 
                                                        ? 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:ring-1 focus:ring-indigo-500/30' 
                                                        : 'bg-white border-slate-300 text-slate-800 placeholder-slate-450 placeholder-slate-400 focus:ring-1 focus:ring-indigo-500/30 shadow-sm'
                                                }`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const input = document.getElementById('compare-man-a') as HTMLInputElement;
                                                    if (input && input.value.trim().length === 11) {
                                                        setCompareRucA(input.value.trim());
                                                    }
                                                }}
                                                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95"
                                            >
                                                Cargar
                                            </button>
                                        </div>

                                        {/* Brief preview of Selection */}
                                        {detailsA ? (
                                            <div className={`p-4 rounded-xl border flex items-center justify-between transition-colors duration-250 ${
                                                isModalDarkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-green-50/70 border-green-250 border-green-200'
                                            }`}>
                                                <div className="min-w-0">
                                                    <div className="text-[10px] font-mono font-bold text-emerald-505 text-emerald-500">{detailsA.ruc}</div>
                                                    <div className={`text-xs font-black truncate ${isModalDarkMode ? 'text-white' : 'text-slate-900'}`}>{detailsA.businessName}</div>
                                                </div>
                                                <CheckCircle size={15} className="text-emerald-505 text-emerald-500 shrink-0 ml-2" />
                                            </div>
                                        ) : (
                                            <div className={`text-center py-4 px-3 border border-dashed rounded-xl text-[10.5px] transition-colors ${
                                                isModalDarkMode ? 'border-white/5 text-gray-500' : 'border-slate-200 text-slate-450 text-slate-400'
                                            }`}>
                                                Sin empresa asignada para el Lado A.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Selector B */}
                                <div className={`p-5 rounded-2xl border transition-all duration-200 ${
                                    isModalDarkMode ? 'bg-slate-950/25 border-white/5' : 'bg-white border-slate-200 shadow-sm'
                                }`}>
                                    <span className={`block text-[10px] font-black uppercase tracking-wider mb-2.5 ${
                                        isModalDarkMode ? 'text-gray-400' : 'text-slate-500'
                                    }`}>Firma de Referencia B</span>

                                    <div className="space-y-3.5">
                                        {/* Selector dropdown unified list */}
                                        <select
                                            value={compareRucB}
                                            onChange={(e) => setCompareRucB(e.target.value)}
                                            className={`w-full p-2.5 text-xs font-bold rounded-xl border transition-colors ${
                                                isModalDarkMode 
                                                    ? 'bg-slate-950 border-white/10 text-white focus:border-indigo-500/50' 
                                                    : 'bg-white border-slate-300 text-slate-850 text-slate-800 focus:border-indigo-500 shadow-sm'
                                            }`}
                                        >
                                            <option value="" className={isModalDarkMode ? 'bg-slate-900 text-gray-400' : 'bg-white text-slate-400'}>-- Seleccionar del Historial / Muestras --</option>
                                            {Array.from(new Map([
                                                ...PRESET_RUCS.map(p => [p.ruc, p]),
                                                ...recentSearches.map(r => [r.ruc, r])
                                            ]).values()).map((item: any) => (
                                                <option key={`b-opt-${item.ruc}`} value={item.ruc} className={isModalDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-855 text-slate-800'}>
                                                    {item.ruc} - {item.name}
                                                </option>
                                            ))}
                                        </select>

                                        {/* Let manual input loading */}
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                id="compare-man-b"
                                                placeholder="Digite RUC de 11 dígitos"
                                                maxLength={11}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const val = e.currentTarget.value.trim();
                                                        if (val.length === 11) setCompareRucB(val);
                                                    }
                                                }}
                                                className={`flex-1 px-3 py-2 text-xs font-bold font-mono rounded-xl border transition-all focus:outline-none ${
                                                    isModalDarkMode 
                                                        ? 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:ring-1 focus:ring-indigo-500/30' 
                                                        : 'bg-white border-slate-300 text-slate-850 text-slate-800 placeholder-slate-450 placeholder-slate-400 focus:ring-1 focus:ring-indigo-500/30 shadow-sm'
                                                }`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const input = document.getElementById('compare-man-b') as HTMLInputElement;
                                                    if (input && input.value.trim().length === 11) {
                                                        setCompareRucB(input.value.trim());
                                                    }
                                                }}
                                                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95"
                                            >
                                                Cargar
                                            </button>
                                        </div>

                                        {/* Brief preview of Selection */}
                                        {detailsB ? (
                                            <div className={`p-4 rounded-xl border flex items-center justify-between transition-colors duration-250 ${
                                                isModalDarkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-green-50/70 border-green-200'
                                            }`}>
                                                <div className="min-w-0">
                                                    <div className="text-[10px] font-mono font-bold text-emerald-500">{detailsB.ruc}</div>
                                                    <div className={`text-xs font-black truncate ${isModalDarkMode ? 'text-white' : 'text-slate-900'}`}>{detailsB.businessName}</div>
                                                </div>
                                                <CheckCircle size={15} className="text-emerald-505 text-emerald-500 shrink-0 ml-2" />
                                            </div>
                                        ) : (
                                            <div className={`text-center py-4 px-3 border border-dashed rounded-xl text-[10.5px] transition-colors ${
                                                isModalDarkMode ? 'border-white/5 text-gray-500' : 'border-slate-200 text-slate-450 text-slate-400'
                                            }`}>
                                                Sin empresa asignada para el Lado B.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Comparison loader */}
                            {isCompareLoading && (
                                <div className="p-12 flex flex-col items-center justify-center space-y-4">
                                    <RefreshCw className="text-indigo-500 animate-spin" size={28} />
                                    <p className={`text-xs font-bold animate-pulse ${isModalDarkMode ? 'text-indigo-400' : 'text-indigo-650 text-indigo-600'}`}>Estableciendo túnel de consulta comparativa SUNAT...</p>
                                </div>
                            )}

                            {/* Dynamic Side-by-Side Risk Analysis Dashboard Grid */}
                            {detailsA && detailsB && !isCompareLoading && (() => {
                                const analysisA = calculateRiskMetrics(detailsA);
                                const analysisB = calculateRiskMetrics(detailsB);
                                if (!analysisA || !analysisB) return null;

                                return (
                                    <div className={`p-6 rounded-2xl border space-y-6 transition-all duration-200 ${
                                        isModalDarkMode 
                                            ? 'bg-slate-900/65 border-white/10' 
                                            : 'bg-slate-50 border-slate-200 shadow-inner'
                                    }`}>
                                        <div className="flex items-center justify-between border-b pb-3.5 border-dashed border-gray-200 dark:border-white/10">
                                            <div className="space-y-1 text-left border-0">
                                                <h4 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${
                                                    isModalDarkMode ? 'text-indigo-400' : 'text-indigo-700'
                                                }`}>
                                                    <AlertTriangle size={16} className="text-amber-500 animate-pulse" />
                                                    <span>Análisis y Diagnóstico Clínico de Riesgo (SAMI Shield)</span>
                                                </h4>
                                                <p className={`text-[10.5px] ${isModalDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
                                                    Métrica automatizada en base a cumplimiento fiscal, estabilidad en SUNAT e indicadores de confianza.
                                                </p>
                                            </div>
                                            <span className={`px-2.5 py-1 text-[9.5px] font-black rounded-lg font-mono ${
                                                isModalDarkMode ? 'bg-indigo-950/50 text-indigo-300' : 'bg-indigo-100 text-indigo-805 text-indigo-800'
                                            }`}>
                                                SAMI Score v2.1
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Empresa A Risk Card */}
                                            <div className={`p-4 rounded-xl border flex flex-col justify-between space-y-4 transition-all duration-200 hover:shadow-md ${
                                                isModalDarkMode ? 'bg-slate-950/40 border-white/5' : 'bg-white border-slate-200 shadow-sm'
                                            }`}>
                                                <div className="space-y-3.5">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div className="text-left">
                                                            <span className="block text-[8.5px] font-black tracking-wider text-gray-500 dark:text-gray-400 uppercase font-mono">EMPRESA A</span>
                                                            <h5 className={`text-xs font-black truncate max-w-[180px] ${isModalDarkMode ? 'text-white' : 'text-slate-900'}`} title={detailsA.businessName}>
                                                                {detailsA.businessName}
                                                            </h5>
                                                            <span className={`text-[9.5px] font-bold font-mono ${isModalDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>RUC {detailsA.ruc}</span>
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-black tracking-wider uppercase border text-center shrink-0 ${analysisA.riskColor}`}>
                                                            {analysisA.label}
                                                        </span>
                                                    </div>

                                                    {/* Score bar */}
                                                    <div className="space-y-1.5 text-left">
                                                        <div className="flex justify-between text-[11px] font-bold">
                                                            <span className={isModalDarkMode ? 'text-gray-400' : 'text-slate-600'}>Índice de Confianza Comercial:</span>
                                                            <span className={isModalDarkMode ? 'text-indigo-400' : 'text-indigo-700'}>{analysisA.score} / 100</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full transition-all duration-500 ${
                                                                    analysisA.score >= 80 ? 'bg-green-500' :
                                                                    analysisA.score >= 60 ? 'bg-emerald-500' :
                                                                    analysisA.score >= 45 ? 'bg-yellow-500' :
                                                                    analysisA.score >= 30 ? 'bg-orange-500' : 'bg-rose-500'
                                                                }`}
                                                                style={{ width: `${analysisA.score}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Strengths & Warnings */}
                                                <div className="space-y-3 pt-3.5 border-t border-dashed border-gray-100 dark:border-white/5 text-left flex-1 min-h-[120px]">
                                                    {/* Positive keys */}
                                                    {analysisA.positives.length > 0 && (
                                                        <div className="space-y-1">
                                                            <span className="text-[8.5px] font-black uppercase text-green-500 tracking-wider">Fortalezas Identificadas</span>
                                                            <div className="space-y-1">
                                                                {analysisA.positives.map((p, idx) => (
                                                                    <div key={`pos-a-${idx}`} className="flex items-start gap-1.5 text-[10px] font-semibold text-green-600 dark:text-green-400 leading-tight">
                                                                        <CheckCircle size={10.5} className="mt-0.5 shrink-0 text-green-500" />
                                                                        <span>{p}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Critical checks */}
                                                    {analysisA.warnings.length > 0 && (
                                                        <div className="space-y-1 pt-1.5">
                                                            <span className="text-[8.5px] font-black uppercase text-amber-500 tracking-wider">Señales de Alerta</span>
                                                            <div className="space-y-1">
                                                                {analysisA.warnings.map((w, idx) => (
                                                                    <div key={`warn-a-${idx}`} className="flex items-start gap-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 leading-tight">
                                                                        <AlertTriangle size={11} className="mt-0.5 shrink-0 text-amber-500" />
                                                                        <span>{w}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Empresa B Risk Card */}
                                            <div className={`p-4 rounded-xl border flex flex-col justify-between space-y-4 transition-all duration-200 hover:shadow-md ${
                                                isModalDarkMode ? 'bg-slate-950/40 border-white/5' : 'bg-white border-slate-200 shadow-sm'
                                            }`}>
                                                <div className="space-y-3.5">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div className="text-left">
                                                            <span className="block text-[8.5px] font-black tracking-wider text-gray-500 dark:text-gray-400 uppercase font-mono">EMPRESA B</span>
                                                            <h5 className={`text-xs font-black truncate max-w-[180px] ${isModalDarkMode ? 'text-white' : 'text-slate-900'}`} title={detailsB.businessName}>
                                                                {detailsB.businessName}
                                                            </h5>
                                                            <span className={`text-[9.5px] font-bold font-mono ${isModalDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>RUC {detailsB.ruc}</span>
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-black tracking-wider uppercase border text-center shrink-0 ${analysisB.riskColor}`}>
                                                            {analysisB.label}
                                                        </span>
                                                    </div>

                                                    {/* Score bar */}
                                                    <div className="space-y-1.5 text-left">
                                                        <div className="flex justify-between text-[11px] font-bold">
                                                            <span className={isModalDarkMode ? 'text-gray-400' : 'text-slate-600'}>Índice de Confianza Comercial:</span>
                                                            <span className={isModalDarkMode ? 'text-indigo-400' : 'text-indigo-700'}>{analysisB.score} / 100</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full transition-all duration-500 ${
                                                                    analysisB.score >= 80 ? 'bg-green-500' :
                                                                    analysisB.score >= 60 ? 'bg-emerald-500' :
                                                                    analysisB.score >= 45 ? 'bg-yellow-500' :
                                                                    analysisB.score >= 30 ? 'bg-orange-500' : 'bg-rose-500'
                                                                }`}
                                                                style={{ width: `${analysisB.score}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Strengths & Warnings */}
                                                <div className="space-y-3 pt-3.5 border-t border-dashed border-gray-100 dark:border-white/5 text-left flex-1 min-h-[120px]">
                                                    {/* Positive keys */}
                                                    {analysisB.positives.length > 0 && (
                                                        <div className="space-y-1">
                                                            <span className="text-[8.5px] font-black uppercase text-green-500 tracking-wider">Fortalezas Identificadas</span>
                                                            <div className="space-y-1">
                                                                {analysisB.positives.map((p, idx) => (
                                                                    <div key={`pos-b-${idx}`} className="flex items-start gap-1.5 text-[10px] font-semibold text-green-600 dark:text-green-400 leading-tight">
                                                                        <CheckCircle size={10.5} className="mt-0.5 shrink-0 text-green-500" />
                                                                        <span>{p}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Critical checks */}
                                                    {analysisB.warnings.length > 0 && (
                                                        <div className="space-y-1 pt-1.5">
                                                            <span className="text-[8.5px] font-black uppercase text-amber-500 tracking-wider">Señales de Alerta</span>
                                                            <div className="space-y-1">
                                                                {analysisB.warnings.map((w, idx) => (
                                                                    <div key={`warn-b-${idx}`} className="flex items-start gap-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 leading-tight">
                                                                        <AlertTriangle size={11} className="mt-0.5 shrink-0 text-amber-500" />
                                                                        <span>{w}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Direct Recommendation Comparison Verdict alert */}
                                        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center gap-3 text-left ${
                                            isModalDarkMode ? 'bg-indigo-950/20 border-indigo-505/15' : 'bg-indigo-50/40 border-indigo-150 border-indigo-100 shadow-sm'
                                        }`}>
                                            <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 self-start sm:self-auto">
                                                <Scale size={16} />
                                            </div>
                                            <div className="flex-1 space-y-0.5">
                                                <h5 className={`text-xs font-black uppercase tracking-wider ${isModalDarkMode ? 'text-indigo-300' : 'text-indigo-805 text-indigo-800'}`}>Comparativa SAMI Shield: Veredicto Clínico de Riesgo</h5>
                                                <p className={`text-[10.5px] leading-relaxed ${isModalDarkMode ? 'text-gray-400' : 'text-slate-650'}`}>
                                                    {analysisA.score === analysisB.score ? (
                                                        <span>Ambos expedientes registran el mismo Índice de Confianza (<strong>{analysisA.score}/100</strong>). Recomendamos contrastar antigüedad legal y límites de crédito autorizado en la matriz inferior.</span>
                                                    ) : analysisA.score > analysisB.score ? (
                                                        <span>La empresa <strong>{detailsA.businessName} (A)</strong> ostenta mayor solvencia con un Índice de Confianza de <strong>{analysisA.score}/100</strong> frente al score de <strong>{analysisB.score}/100</strong> de <strong>{detailsB.businessName} (B)</strong>. Representa un riesgo comercial notablemente menor para financiamiento.</span>
                                                    ) : (
                                                        <span>La empresa <strong>{detailsB.businessName} (B)</strong> ostenta mayor solvencia con un Índice de Confianza de <strong>{analysisB.score}/100</strong> frente al score de <strong>{analysisA.score}/100</strong> de <strong>{detailsA.businessName} (A)</strong>. Representa un riesgo comercial notablemente menor para financiamiento.</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Side-by-Side Comparison Workspace Matrix */}
                            {detailsA && detailsB && !isCompareLoading && (
                                <div className={`border rounded-2xl overflow-hidden shadow-2xl transition-all duration-200 ${
                                    isModalDarkMode ? 'border-white/10 bg-slate-900/40' : 'border-slate-200 bg-white shadow-xl'
                                }`}>
                                    <table className="w-full text-xs text-left border-collapse">
                                        <thead>
                                            <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${
                                                isModalDarkMode ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                                            }`}>
                                                <th className={`p-4 w-1/3 border-r ${isModalDarkMode ? 'border-white/5' : 'border-slate-200'}`}>Atributo Comparado</th>
                                                <th className={`p-4 w-1/3 border-r text-center text-indigo-400 ${isModalDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
                                                    Empresa A: {detailsA.businessName.split(' ')[0]}
                                                </th>
                                                <th className="p-4 w-1/3 text-center text-teal-400">
                                                    Empresa B: {detailsB.businessName.split(' ')[0]}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* Razón Social */}
                                            <tr className={`border-b ${isModalDarkMode ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50/50'}`}>
                                                <td className={`p-4 font-bold border-r ${isModalDarkMode ? 'border-white/5' : 'border-slate-200'}`}>Razón Social Completa</td>
                                                <td className={`p-4 text-center font-extrabold border-r ${isModalDarkMode ? 'border-white/5' : 'border-slate-200'}`}>{detailsA.businessName}</td>
                                                <td className="p-4 text-center font-extrabold">{detailsB.businessName}</td>
                                            </tr>

                                            {/* RUC */}
                                            <tr className={`border-b ${isModalDarkMode ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50/50'}`}>
                                                <td className={`p-4 font-bold border-r ${isModalDarkMode ? 'border-white/5' : 'border-slate-200'}`}>Número de RUC</td>
                                                <td className={`p-4 text-center font-mono font-bold text-indigo-400 border-r ${isModalDarkMode ? 'border-white/5' : 'border-slate-200'}`}>{detailsA.ruc}</td>
                                                <td className="p-4 text-center font-mono font-bold text-teal-400">{detailsB.ruc}</td>
                                            </tr>

                                            {/* Estado tributario */}
                                            <tr className={`border-b ${isModalDarkMode ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50/50'}`}>
                                                <td className={`p-4 font-bold border-r ${isModalDarkMode ? 'border-white/5' : 'border-slate-200'}`}>Estado de Contribuyente</td>
                                                <td className={`p-4 text-center border-r ${isModalDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
                                                        detailsA.active 
                                                            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                                                            : 'bg-red-500/10 text-red-505 text-red-500 border border-red-500/20'
                                                    }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${detailsA.active ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                                                        {detailsA.active ? 'ACTIVO' : 'BAJA DE OFICIO'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
                                                        detailsB.active 
                                                            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                                                            : 'bg-red-500/10 text-red-505 text-red-500 border border-red-500/20'
                                                    }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${detailsB.active ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                                                        {detailsB.active ? 'ACTIVO' : 'BAJA DE OFICIO'}
                                                    </span>
                                                </td>
                                            </tr>

                                            {/* Domicilio */}
                                            <tr className={`border-b ${isModalDarkMode ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50/50'}`}>
                                                <td className={`p-4 font-bold border-r ${isModalDarkMode ? 'border-white/5' : 'border-slate-200'}`}>Condición Domicilio</td>
                                                <td className={`p-4 text-center border-r ${isModalDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
                                                        detailsA.condition === 'HABIDO' 
                                                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                                                            : 'bg-amber-500/10 text-amber-505 text-amber-500 border border-amber-500/20'
                                                    }`}>
                                                        {detailsA.condition}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
                                                        detailsB.condition === 'HABIDO' 
                                                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                                                            : 'bg-amber-500/10 text-amber-505 text-amber-500 border border-amber-500/20'
                                                    }`}>
                                                        {detailsB.condition}
                                                    </span>
                                                </td>
                                            </tr>

                                            {/* Régimen impositivo */}
                                            <tr className={`border-b ${isModalDarkMode ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50/50'}`}>
                                                <td className={`p-4 font-bold border-r ${isModalDarkMode ? 'border-white/5' : 'border-slate-200'}`}>Régimen Tributario</td>
                                                <td className={`p-4 text-center border-r font-medium ${isModalDarkMode ? 'border-white/5' : 'border-slate-200'}`}>{detailsA.taxRegime}</td>
                                                <td className="p-4 text-center font-medium">{detailsB.taxRegime}</td>
                                            </tr>

                                            {/* Antigüedad */}
                                            <tr className={`border-b ${isModalDarkMode ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50/50'}`}>
                                                <td className={`p-4 font-bold border-r ${isModalDarkMode ? 'border-white/5' : 'border-slate-200'}`}>Fecha de Inscripción</td>
                                                <td className={`p-4 text-center font-mono border-r ${isModalDarkMode ? 'border-white/5' : 'border-slate-200'}`}>{detailsA.registrationDate}</td>
                                                <td className="p-4 text-center font-mono">{detailsB.registrationDate}</td>
                                            </tr>

                                            {/* Credit Limit autorization */}
                                            <tr className={`border-b ${isModalDarkMode ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50/50'}`}>
                                                <td className={`p-4 font-bold border-r ${isModalDarkMode ? 'border-white/5' : 'border-slate-200'}`}>Límite Crédito Autorizado</td>
                                                <td className={`p-4 text-center border-r font-black font-mono text-xs transition-all ${isModalDarkMode ? 'border-white/5' : 'border-slate-200'} ${
                                                    (detailsA.creditLimit || 0) > (detailsB.creditLimit || 0) ? 'text-green-400 bg-green-500/5' : 'text-indigo-400'
                                                }`}>
                                                    S/ {(detailsA.creditLimit || 0).toLocaleString()}
                                                    {(detailsA.creditLimit || 0) > (detailsB.creditLimit || 0) && ' 👑'}
                                                </td>
                                                <td className={`p-4 text-center font-black font-mono text-xs ${
                                                    (detailsB.creditLimit || 0) > (detailsA.creditLimit || 0) ? 'text-green-400 bg-green-500/5' : 'text-teal-400'
                                                }`}>
                                                    S/ {(detailsB.creditLimit || 0).toLocaleString()}
                                                    {(detailsB.creditLimit || 0) > (detailsA.creditLimit || 0) && ' 👑'}
                                                </td>
                                            </tr>

                                            {/* CIIU Activity */}
                                            <tr className={`border-b ${isModalDarkMode ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50/50'}`}>
                                                <td className={`p-4 font-bold border-r ${isModalDarkMode ? 'border-white/5' : 'border-slate-200'}`}>CIIU & Actividad Econímica</td>
                                                <td className={`p-4 text-center border-r text-[10.5px] leading-relaxed max-w-[200px] truncate-2-lines ${isModalDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
                                                    {detailsA.mainActivity}
                                                    <div className="text-[9.5px] text-gray-500 font-mono mt-0.5">{detailsA.ciiu}</div>
                                                </td>
                                                <td className="p-4 text-center text-[10.5px] leading-relaxed max-w-[200px] truncate-2-lines">
                                                    {detailsB.mainActivity}
                                                    <div className="text-[9.5px] text-gray-500 font-mono mt-0.5">{detailsB.ciiu}</div>
                                                </td>
                                            </tr>

                                            {/* Ubicación */}
                                            <tr className={`border-b ${isModalDarkMode ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50/50'}`}>
                                                <td className={`p-4 font-bold border-r ${isModalDarkMode ? 'border-white/5' : 'border-slate-200'}`}>Dirección de Contacto</td>
                                                <td className={`p-4 text-center border-r text-[10px] leading-tight ${isModalDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
                                                    {detailsA.address}
                                                    <div className="font-bold text-gray-405 text-gray-400 mt-0.5">{detailsA.district} - {detailsA.province}</div>
                                                </td>
                                                <td className="p-4 text-center text-[10px] leading-tight">
                                                    {detailsB.address}
                                                    <div className="font-bold text-gray-405 text-gray-400 mt-0.5">{detailsB.district} - {detailsB.province}</div>
                                                </td>
                                            </tr>

                                            {/* Digital Billing and other special agents metrics */}
                                            <tr className={`border-b ${isModalDarkMode ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50/50'}`}>
                                                <td className={`p-4 font-bold border-r ${isModalDarkMode ? 'border-white/5' : 'border-slate-200'}`}>Facturador Electrónico</td>
                                                <td className={`p-4 text-center border-r ${isModalDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
                                                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-black ${
                                                        detailsA.electronicBilling 
                                                            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                                                            : 'bg-red-500/10 text-red-500 border border-red-500/5'
                                                    }`}>
                                                        {detailsA.electronicBilling ? 'SÍ' : 'NO'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-black ${
                                                        detailsB.electronicBilling 
                                                            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                                                            : 'bg-red-500/10 text-red-500 border border-red-500/5'
                                                    }`}>
                                                        {detailsB.electronicBilling ? 'SÍ' : 'NO'}
                                                    </span>
                                                </td>
                                            </tr>

                                            <tr className={`border-b ${isModalDarkMode ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50/50'}`}>
                                                <td className={`p-4 font-bold border-r ${isModalDarkMode ? 'border-white/5' : 'border-slate-200'}`}>Agente de Retención</td>
                                                <td className={`p-4 text-center border-r ${isModalDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
                                                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-black ${
                                                        detailsA.retainingAgent 
                                                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                                                            : 'bg-gray-500/10 text-gray-400 border border-gray-500/5'
                                                    }`}>
                                                        {detailsA.retainingAgent ? 'SÍ' : 'NO'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-black ${
                                                        detailsB.retainingAgent 
                                                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                                                            : 'bg-gray-500/10 text-gray-400 border border-gray-500/5'
                                                    }`}>
                                                        {detailsB.retainingAgent ? 'SÍ' : 'NO'}
                                                    </span>
                                                </td>
                                            </tr>

                                            <tr className={`${isModalDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50/50'}`}>
                                                <td className={`p-4 font-bold border-r ${isModalDarkMode ? 'border-white/5' : 'border-slate-200'}`}>Agente de Percepción</td>
                                                <td className={`p-4 text-center border-r ${isModalDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
                                                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-black ${
                                                        detailsA.agentOfPerception 
                                                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                                                            : 'bg-gray-500/10 text-gray-400 border border-gray-500/5'
                                                    }`}>
                                                        {detailsA.agentOfPerception ? 'SÍ' : 'NO'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-black ${
                                                        detailsB.agentOfPerception 
                                                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                                                            : 'bg-gray-500/10 text-gray-400 border border-gray-500/5'
                                                    }`}>
                                                        {detailsB.agentOfPerception ? 'SÍ' : 'NO'}
                                                    </span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Recent Searches */}
                    {!compareMode && recentSearches.length > 0 && (
                        <div id="ruc-recent-searches" className={`pt-4 border-t space-y-2.5 transition-colors duration-200 ${
                            getThemeClass(modalPalette).borderCol
                        }`}>
                            <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-colors duration-200 ${
                                getThemeClass(modalPalette).textMuted
                            }`}>
                                <History size={12} className={isModalDarkMode ? 'text-gray-400' : 'text-slate-400'} />
                                <span>Búsquedas Recientes</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {recentSearches.map((item) => (
                                    <button
                                        key={item.ruc}
                                        onClick={() => triggerPreset(item.ruc)}
                                        className={`px-3 py-1.5 text-[10.5px] font-bold border rounded-xl transition-all flex items-center gap-1.5 cursor-pointer max-w-xs truncate ${
                                            isModalDarkMode 
                                                ? 'bg-white/5 hover:bg-white/10 active:bg-white/15 border-white/10 text-gray-300 hover:text-white hover:border-indigo-500/30'
                                                : modalPalette === 'warm'
                                                    ? 'bg-white hover:bg-amber-100/40 border-amber-200 text-amber-950 hover:text-amber-900 shadow-sm'
                                                    : 'bg-white hover:bg-indigo-50/70 border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 shadow-sm'
                                        }`}
                                        title={`Consultar ${item.name}`}
                                    >
                                        <span className={`font-mono shrink-0 transition-colors duration-200 ${
                                            getThemeClass(modalPalette).textMuted
                                        }`}>{item.ruc}</span>
                                        <span className="opacity-75 truncate">{item.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className={`px-6 py-4 border-t flex justify-between gap-3 items-center transition-all duration-200 ${
                    modalPalette === 'slate-dark' || modalPalette === 'high-contrast' || modalPalette === 'emerald'
                        ? 'bg-white/5 border-white/10'
                        : modalPalette === 'warm'
                            ? 'bg-amber-100/30 border-amber-200'
                            : 'bg-slate-50 border-slate-200'
                }`}>
                    <div className={`text-[10px] flex items-center gap-1 transition-colors duration-200 ${
                        getThemeClass(modalPalette).textMuted
                    }`}>
                        <Landmark size={12} />
                        <span>Respuesta provista vía pasarela mock-SUNAT homologada.</span>
                    </div>

                    <div className="flex items-center gap-2">
                        {result && onSelectBusiness && (
                            <button
                                onClick={() => {
                                    onSelectBusiness(result);
                                    onClose();
                                }}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-500/10 cursor-pointer"
                            >
                                <Check size={14} />
                                <span>Usar Datos</span>
                            </button>
                        )}
                        {result && (
                            <button
                                type="button"
                                onClick={handleDownloadJson}
                                className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                    isModalDarkMode
                                        ? 'bg-white/5 hover:bg-white/10 border-white/10 text-indigo-400 hover:text-indigo-300'
                                        : modalPalette === 'warm'
                                            ? 'bg-white hover:bg-amber-50 border-amber-300 text-amber-700 hover:text-amber-800 shadow-sm'
                                            : 'bg-white hover:bg-slate-50 border-slate-300 text-indigo-600 hover:text-indigo-750 shadow-sm'
                                }`}
                                title="Download business data as JSON"
                            >
                                <Download size={14} />
                                <span>Download JSON</span>
                            </button>
                        )}
                        {result && (
                            <button
                                id="export-ficha-pdf-btn"
                                type="button"
                                onClick={handleExportPdf}
                                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/10 active:scale-95"
                                title="Generar versión PDF de la Ficha de Inscripción RUC"
                            >
                                <FileText size={14} />
                                <span>Exportar Ficha (PDF)</span>
                            </button>
                        )}
                        {result && (
                            <button
                                id="print-details-btn"
                                type="button"
                                onClick={() => window.print()}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/10 active:scale-95"
                                title="Imprimir Ficha y Detalles del RUC usando la hoja de estilos de impresión"
                            >
                                <Printer size={14} />
                                <span>Imprimir Ficha</span>
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isModalDarkMode
                                    ? 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white'
                                    : modalPalette === 'warm'
                                        ? 'bg-white hover:bg-amber-100/50 border-amber-200 text-amber-900 hover:text-amber-950 shadow-sm'
                                        : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 hover:text-slate-900 shadow-sm'
                            }`}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
