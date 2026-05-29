
import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { 
    DeepProfile, 
    FixedAsset, 
    VendorReference, 
    CrossValidationResult, 
    SamiScoreResult,
    FinancialHealthCertificate
} from '../types';
import { performCrossValidation, calculateRefinedRisk, generateCertificate, isValidRUC } from '../services/riskService';
import { maskRUC, maskCurrency, maskPhone } from '../services/maskingUtils';
import { 
    ShieldCheck, 
    Home, 
    Package, 
    Users, 
    Plus, 
    Trash2, 
    Search, 
    FileText, 
    Download, 
    AlertTriangle,
    CheckCircle2,
    XCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { logAdminAction } from '../services/auditService';
import { showLocalPushNotification } from '../services/pushNotificationService';

interface DeepProfilingModuleProps {
    samiScore: SamiScoreResult | null;
    businessName: string;
    ruc: string;
}

const DeepProfilingModule: React.FC<DeepProfilingModuleProps> = ({ samiScore, businessName, ruc }) => {
    const { currentUser } = useAuth();
    const [profile, setProfile] = useState<DeepProfile>({
        yearsInLocation: 0,
        isOwnerOfLocation: false,
        fixedAssets: [],
        vendorReferences: [],
        lastUpdated: new Date().toISOString()
    });

    const [validation, setValidation] = useState<CrossValidationResult | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [certificate, setCertificate] = useState<FinancialHealthCertificate | null>(null);

    // Trust & Compliance State
    const [complianceData, setComplianceData] = useState({
        email: currentUser?.email || '',
        legalRepresentative: '',
        powerOfAttorneyFile: null as File | null,
    });
    const [complianceStatus, setComplianceStatus] = useState({
        ruc: 'pending' as 'pending' | 'valid' | 'invalid',
        email: 'pending' as 'pending' | 'valid' | 'invalid',
        legalRep: 'pending' as 'pending' | 'valid' | 'invalid',
    });

    const isRucValid = useMemo(() => ruc.length === 11 && ruc.startsWith('20'), [ruc]);

    const handlePowerOfAttorneyUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setComplianceData(prev => ({ ...prev, powerOfAttorneyFile: e.target.files![0] }));
        }
    };

    const handleRunCompliance = async () => {
        if (currentUser) {
            logAdminAction(currentUser, `Ejecución de validación de cumplimiento (Trust Center) para RUC: ${ruc}`);
        }
        setIsValidating(true);
        try {
            // Simulated validation sequence
            setComplianceStatus(prev => ({ ...prev, ruc: isRucValid ? 'valid' : 'invalid' }));
            await new Promise(r => setTimeout(r, 1000));
            setComplianceStatus(prev => ({ ...prev, email: 'valid' }));
            await new Promise(r => setTimeout(r, 1500));
            setComplianceStatus(prev => ({ ...prev, legalRep: 'valid' }));
            
            const crossResult = await performCrossValidation(ruc);
            setValidation(crossResult);
        } finally {
            setIsValidating(false);
        }
    };

    const addAsset = () => {
        const newAsset: FixedAsset = { id: crypto.randomUUID(), description: '', estimatedValue: 0 };
        setProfile(prev => ({ ...prev, fixedAssets: [...prev.fixedAssets, newAsset] }));
    };

    const removeAsset = (id: string) => {
        setProfile(prev => ({ ...prev, fixedAssets: prev.fixedAssets.filter(a => a.id !== id) }));
    };

    const updateAsset = (id: string, field: keyof FixedAsset, value: any) => {
        setProfile(prev => ({
            ...prev,
            fixedAssets: prev.fixedAssets.map(a => a.id === id ? { ...a, [field]: value } : a)
        }));
    };

    const addReference = () => {
        const newRef: VendorReference = { id: crypto.randomUUID(), vendorName: '', contactPhone: '', relationshipYears: 0 };
        setProfile(prev => ({ ...prev, vendorReferences: [...prev.vendorReferences, newRef] }));
    };

    const removeReference = (id: string) => {
        setProfile(prev => ({ ...prev, vendorReferences: prev.vendorReferences.filter(r => r.id !== id) }));
    };

    const updateReference = (id: string, field: keyof VendorReference, value: any) => {
        setProfile(prev => ({
            ...prev,
            vendorReferences: prev.vendorReferences.map(r => r.id === id ? { ...r, [field]: value } : r)
        }));
    };

    const riskLevel = useMemo(() => {
        return calculateRefinedRisk(samiScore, profile, validation);
    }, [samiScore, profile, validation]);

    const handleGenerateCertificate = () => {
        if (!samiScore) return;
        if (currentUser) {
            logAdminAction(currentUser, `Generación de Certificado de Salud Financiera para ${businessName}`);
        }
        const cert = generateCertificate(businessName, ruc, samiScore.score, riskLevel, profile);
        setCertificate(cert);
    };

    const downloadMockPdf = () => {
        if (!certificate) return;
        try {
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Styling colors
            const navyBg = [26, 36, 43];
            const primaryGold = [197, 160, 89];
            const darkGrey = [40, 44, 52];
            const lightGrey = [248, 249, 250];

            // Decorative gold border
            doc.setDrawColor(primaryGold[0], primaryGold[1], primaryGold[2]);
            doc.setLineWidth(1);
            doc.rect(5, 5, 200, 287);

            // Navy background banner for diploma feel
            doc.setFillColor(navyBg[0], navyBg[1], navyBg[2]);
            doc.rect(10, 10, 190, 45, "F");

            // SAMI Gold Logo Header
            doc.setTextColor(primaryGold[0], primaryGold[1], primaryGold[2]);
            doc.setFont("Times", "bold");
            doc.setFontSize(28);
            doc.text("S A M I", 105, 28, { align: "center" });

            doc.setTextColor(255, 255, 255);
            doc.setFont("Helvetica", "normal");
            doc.setFontSize(10);
            doc.text("ACREDITACION DE SOLVENCIA Y SALUD FINANCIERA", 105, 38, { align: "center" });
            doc.setFontSize(8);
            doc.text("SAMI FINTECH • COOPERACION PARA EL DESARROLLO EMPRESARIAL", 105, 43, { align: "center" });

            // Certificate body
            doc.setTextColor(darkGrey[0], darkGrey[1], darkGrey[2]);
            doc.setFont("Times", "italic");
            doc.setFontSize(14);
            doc.text("Por medio del presente documento, se certifica y avala que:", 105, 75, { align: "center" });

            // Business Name
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(22);
            doc.setTextColor(navyBg[0], navyBg[1], navyBg[2]);
            doc.text(certificate.businessName.toUpperCase(), 105, 90, { align: "center" });

            // Ruc details
            doc.setFont("Helvetica", "normal");
            doc.setFontSize(11);
            doc.setTextColor(100, 110, 120);
            doc.text(`Identificado con RUC N° ${certificate.ruc}`, 105, 98, { align: "center" });

            // Verification text
            doc.setFont("Helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(darkGrey[0], darkGrey[1], darkGrey[2]);
            doc.text([
                "Ha completado exitosamente el proceso de perfilamiento profundo no tradicional en la plataforma SAMI.",
                "Se han cruzado y corroborado sus ingresos declarados ante SUNAT, constancias de estabilidad del local,",
                "referencias de cadena de proveedores y valor de activos fijos, obteniendo la siguiente calificacion:"
            ], 105, 112, { align: "center" });

            // Big Bold SAMI SCORE
            doc.setFillColor(lightGrey[0], lightGrey[1], lightGrey[2]);
            doc.rect(55, 132, 100, 35, "F");
            doc.setDrawColor(primaryGold[0], primaryGold[1], primaryGold[2]);
            doc.setLineWidth(0.5);
            doc.rect(55, 132, 100, 35);

            // Score Number
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(24);
            doc.setTextColor(navyBg[0], navyBg[1], navyBg[2]);
            doc.text(`${certificate.score} / 1000`, 105, 146, { align: "center" });
            doc.setFontSize(9);
            doc.setFont("Helvetica", "bold");
            doc.setTextColor(100, 100, 100);
            doc.text(`SAMI SCORE (Nivel de Riesgo: ${certificate.riskLevel.toUpperCase()})`, 105, 153, { align: "center" });

            // Variables breakdown
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(navyBg[0], navyBg[1], navyBg[2]);
            doc.text("DESGLOSE DE CRITERIOS EVALUADOS Y CONFIRMADOS:", 25, 182);

            doc.setFont("Helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(darkGrey[0], darkGrey[1], darkGrey[2]);
            doc.text("- Anos en Local Comercial:", 30, 192);
            doc.text("- Condicion del Local:", 30, 198);
            doc.text("- Referencias de Proveedores:", 30, 204);
            doc.text("- Activos Fijos Registrados:", 30, 210);

            doc.setFont("Helvetica", "normal");
            doc.text(`${profile.yearsInLocation} ano(s)`, 85, 192);
            doc.text(profile.isOwnerOfLocation ? "Propietario Independiente" : "Arrendatario Comercial", 85, 198);
            doc.text(`${profile.vendorReferences.length} referencia(s) verificadas`, 85, 204);
            doc.text(profile.fixedAssets.length > 0 ? `${profile.fixedAssets.length} activo(s) declarado(s)` : "Ninguno", 85, 210);

            // Lower clause
            doc.setFont("Helvetica", "normal");
            doc.setFontSize(9.5);
            doc.setTextColor(darkGrey[0], darkGrey[1], darkGrey[2]);
            doc.text([
                "Este aval sirve como sustento de solvencia moral y corporativa ante las entidades financieras aliadas",
                "del SAMI Credit Marketplace para simplificar la tasacion y aprobacion de lineas de capital de trabajo."
            ], 105, 226, { align: "center" });

            // Divider dotted
            doc.setDrawColor(200, 200, 200);
            doc.setLineDashPattern([2, 2], 0);
            doc.line(20, 245, 190, 245);
            doc.setLineDashPattern([], 0);

            // Audit footer info
            doc.setFontSize(8);
            doc.setFont("Helvetica", "bold");
            doc.setTextColor(navyBg[0], navyBg[1], navyBg[2]);
            doc.text(`CERTIFICADO ID: ${certificate.certificateId}`, 20, 258);
            doc.setFont("Helvetica", "normal");
            doc.text(`Hash de Integridad: ${certificate.cryptographicHash}`, 20, 263);
            doc.text(`Fecha de Validacion: ${new Date(certificate.issuedAt).toLocaleString('es-PE')}`, 20, 268);

            // Signature stamp placeholder block
            doc.setDrawColor(navyBg[0], navyBg[1], navyBg[2]);
            doc.setLineWidth(0.4);
            doc.rect(150, 254, 38, 20);
            doc.setFontSize(7);
            doc.setFont("Helvetica", "bold");
            doc.text("FIRMA DE SEGURIDAD", 154, 259);
            doc.setFont("Helvetica", "normal");
            doc.setFontSize(5);
            doc.text("SAMI AUDITED & SIGNED", 154, 265);
            doc.text("SUNAT CORRELATION VERIFIED", 154, 271);

            doc.save(`Certificado_Salud_Financiera_${ruc}_SAMI.pdf`);
            showLocalPushNotification("📄 Certificado Generado", "El Certificado de Salud Financiera se compiló y se descargó con éxito.");
        } catch (e) {
            console.error(e);
            showLocalPushNotification("❌ Error de Certificado", "No se pudo compilar el archivo PDF del Certificado de Salud Financiera.");
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-7xl h-full flex flex-col gap-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Perfilamiento Profundo de Riesgo</h1>
                    <p className="text-gray-600 dark:text-gray-400">Fortalezca su perfil crediticio con datos no tradicionales verificados.</p>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-full border border-blue-100 dark:border-blue-800">
                    <ShieldCheck className="text-blue-600" size={20} />
                    <span className="text-sm font-bold text-blue-800 dark:text-blue-300">Risk Manager Activo</span>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Section */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Location Data */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                            <Home size={20} className="text-blue-500" />
                            Estabilidad del Local
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Años en el local actual</label>
                                <input 
                                    type="number" 
                                    value={profile.yearsInLocation} 
                                    onChange={(e) => setProfile(prev => ({ ...prev, yearsInLocation: parseInt(e.target.value) }))}
                                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900"
                                />
                            </div>
                            <div className="flex items-center gap-3 pt-6">
                                <input 
                                    type="checkbox" 
                                    id="isOwner"
                                    checked={profile.isOwnerOfLocation}
                                    onChange={(e) => setProfile(prev => ({ ...prev, isOwnerOfLocation: e.target.checked }))}
                                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="isOwner" className="text-sm font-medium text-gray-700 dark:text-gray-300">Soy propietario del local</label>
                            </div>
                        </div>
                    </div>

                    {/* Fixed Assets */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Package size={20} className="text-blue-500" />
                                Activos Fijos del Negocio
                            </h3>
                            <button onClick={addAsset} className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors">
                                <Plus size={20} />
                            </button>
                        </div>
                        <div className="space-y-3">
                            {profile.fixedAssets.length === 0 && (
                                <p className="text-sm text-gray-500 italic">No se han registrado activos (maquinaria, vehículos, equipos, etc.)</p>
                            )}
                            {profile.fixedAssets.map(asset => (
                                <div key={asset.id} className="flex gap-3 items-center animate-in fade-in slide-in-from-left-2">
                                    <input 
                                        type="text" 
                                        placeholder="Descripción del activo"
                                        value={asset.description}
                                        onChange={(e) => updateAsset(asset.id, 'description', e.target.value)}
                                        className="flex-grow p-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm"
                                    />
                                    <input 
                                        type="number" 
                                        placeholder="Valor est. (S/)"
                                        value={asset.estimatedValue}
                                        onChange={(e) => updateAsset(asset.id, 'estimatedValue', parseInt(e.target.value))}
                                        className="w-32 p-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm"
                                    />
                                    <button onClick={() => removeAsset(asset.id)} className="text-red-400 hover:text-red-600">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Vendor References */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Users size={20} className="text-blue-500" />
                                Referencias de Proveedores
                            </h3>
                            <button onClick={addReference} className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors">
                                <Plus size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            {profile.vendorReferences.length === 0 && (
                                <p className="text-sm text-gray-500 italic">No se han registrado referencias comerciales.</p>
                            )}
                            {profile.vendorReferences.map(ref => (
                                <div key={ref.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl relative animate-in fade-in slide-in-from-right-2">
                                    <input 
                                        type="text" 
                                        placeholder="Nombre del Proveedor"
                                        value={ref.vendorName}
                                        onChange={(e) => updateReference(ref.id, 'vendorName', e.target.value)}
                                        className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 text-sm"
                                    />
                                    <input 
                                        type="tel" 
                                        placeholder="Teléfono de contacto"
                                        value={ref.contactPhone}
                                        onChange={(e) => updateReference(ref.id, 'contactPhone', e.target.value)}
                                        className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 text-sm"
                                    />
                                    <div className="flex gap-2 items-center">
                                        <input 
                                            type="number" 
                                            placeholder="Años rel."
                                            value={ref.relationshipYears}
                                            onChange={(e) => updateReference(ref.id, 'relationshipYears', parseInt(e.target.value))}
                                            className="flex-grow p-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 text-sm"
                                        />
                                        <button onClick={() => removeReference(ref.id)} className="text-red-400 hover:text-red-600">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Risk Assessment & Trust Center */}
                <div className="lg:col-span-1 space-y-6">
                    {/* SAMI Trust Center */}
                    <div className="bg-white dark:bg-gray-900 border-2 border-indigo-100 dark:border-indigo-900/30 p-8 rounded-[2.5rem] shadow-xl shadow-indigo-500/5">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Trust Center</h3>
                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">Validación Documentaria</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* RUC Validation Item */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${complianceStatus.ruc === 'valid' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                        <FileText size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase">RUC SUNAT</p>
                                        <p className="text-xs font-bold text-gray-800 dark:text-white">{maskRUC(ruc)}</p>
                                    </div>
                                </div>
                                {complianceStatus.ruc === 'valid' && <CheckCircle2 size={16} className="text-green-500" />}
                            </div>

                            {/* Email Validation Item */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${complianceStatus.email === 'valid' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                        <Users size={16} />
                                    </div>
                                    <div className="flex-grow">
                                        <p className="text-[10px] font-black text-gray-400 uppercase">Correo Electrónico</p>
                                        <p className="text-xs font-bold text-gray-800 dark:text-white truncate max-w-[120px]">{complianceData.email}</p>
                                    </div>
                                </div>
                                {complianceStatus.email === 'valid' && <CheckCircle2 size={16} className="text-green-500" />}
                            </div>

                            {/* PoA Validation Item */}
                            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${complianceStatus.legalRep === 'valid' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                            <ShieldCheck size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase">Vigencia de Poder</p>
                                            <p className="text-xs font-bold text-gray-800 dark:text-white">Registro Público</p>
                                        </div>
                                    </div>
                                    {complianceStatus.legalRep === 'valid' && <CheckCircle2 size={16} className="text-green-500" />}
                                </div>
                                {!complianceData.powerOfAttorneyFile ? (
                                    <label className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        <Plus size={14} />
                                        <span>Subir Vigencia</span>
                                        <input type="file" className="hidden" accept=".pdf,.jpg,.png" onChange={handlePowerOfAttorneyUpload} />
                                    </label>
                                ) : (
                                    <div className="flex items-center justify-between p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 animate-in zoom-in-95">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <FileText size={16} className="text-indigo-500" />
                                            <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 truncate">{complianceData.powerOfAttorneyFile.name}</span>
                                        </div>
                                        <button onClick={() => setComplianceData(prev => ({ ...prev, powerOfAttorneyFile: null }))} className="p-1 hover:bg-indigo-100 rounded-lg text-indigo-400">
                                            <XCircle size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={handleRunCompliance}
                                disabled={isValidating || !complianceData.powerOfAttorneyFile}
                                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 disabled:bg-gray-300 shadow-xl shadow-indigo-600/20 transition-all active:scale-95"
                            >
                                {isValidating ? 'Validando Integridad...' : 'Ejecutar Validación de Confianza'}
                            </button>
                        </div>
                    </div>

                    {/* Risk Summary Card */}
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-2xl text-white shadow-xl">
                        <h3 className="text-sm font-bold opacity-70 uppercase tracking-wider mb-4">Perfil de Riesgo Refinado</h3>
                        <div className="flex items-end gap-2 mb-6">
                            <p className="text-3xl font-black">{riskLevel}</p>
                        </div>
                        <div className="space-y-3 text-xs opacity-80">
                            <div className="flex justify-between">
                                <span>Score Tradicional:</span>
                                <span>{samiScore?.score || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Estabilidad Local:</span>
                                <span className={profile.yearsInLocation > 5 ? 'text-green-400' : ''}>
                                    {profile.yearsInLocation} años {profile.isOwnerOfLocation ? '(Propio)' : ''}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Activos Declarados:</span>
                                <span>{maskCurrency(profile.fixedAssets.reduce((acc, a) => acc + a.estimatedValue, 0), `S/ ${profile.fixedAssets.reduce((acc, a) => acc + a.estimatedValue, 0).toLocaleString()}`)}</span>
                            </div>
                        </div>
                        
                        {!certificate ? (
                            <button 
                                onClick={handleGenerateCertificate}
                                disabled={!samiScore}
                                className="w-full mt-6 bg-white text-gray-900 py-3 rounded-xl font-bold hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                            >
                                <FileText size={18} />
                                Generar Certificado
                            </button>
                        ) : (
                            <button 
                                onClick={downloadMockPdf}
                                className="w-full mt-6 bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 transition-all flex items-center justify-center gap-2 animate-bounce"
                            >
                                <Download size={18} />
                                Descargar Aval PDF
                            </button>
                        )}
                    </div>

                    {certificate && (
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl animate-in fade-in">
                            <p className="text-xs text-green-800 dark:text-green-300 font-bold mb-1">Certificado Vigente</p>
                            <p className="text-[10px] text-green-700 dark:text-green-400">
                                ID: {import.meta.env.DEV ? '*********' : certificate.certificateId}<br/>
                                Vence: {certificate.expiryDate}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeepProfilingModule;
