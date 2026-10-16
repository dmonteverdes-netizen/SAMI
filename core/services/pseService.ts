import axios from 'axios';
import type { Invoice } from '../types/types';
import { api } from './api';

/**
 * Cliente frontend de emisión electrónica y consulta de RUC.
 *
 * Reglas (AGENTS.md §3): todo dato que no provenga de una fuente oficial se marca con
 * `isSimulated: true` y una etiqueta visible. Ningún secreto (token del PSE) vive aquí:
 * la emisión real se hace en el backend (`POST /api/v1/einvoice/emit`), que usa Nubefact
 * cuando hay credenciales configuradas y responde en Modo Demostración cuando no.
 */

// ─── Tipos e Interfaces ───

export type RucDataSource = 'PADRON_SUNAT' | 'SIMULADO';

export const SIMULATED_LABEL = 'Modo Demostración — datos simulados, no provienen de SUNAT';

export interface PseResponse {
    success: boolean;
    /** true cuando el comprobante NO fue enviado a SUNAT (sin credenciales de PSE). */
    isSimulated: boolean;
    provider: 'NUBEFACT' | 'SIMULADO';
    environmentLabel: string;
    acceptedBySunat?: boolean;
    sunatCode?: string;
    sunatMessage?: string;
    externalId?: string;
    pdfUrl?: string;
    xmlUrl?: string;
    cdrUrl?: string;
    errors?: string[];
}

export interface RucValidationResult {
    active: boolean;
    condition: string;
    isSimulated: boolean;
    sourceLabel: string;
}

export interface RucBusinessDetails {
    ruc: string;
    businessName: string;
    tradeName?: string;
    active: boolean;
    condition: string;
    address: string;
    department: string;
    province: string;
    district: string;
    taxRegime: string;
    ciiu: string;
    mainActivity: string;
    registrationDate: string;
    phone: string;
    email: string;
    electronicBilling: boolean;
    retainingAgent: boolean;
    agentOfPerception: boolean;
    creditLimit?: number;
    /** true si la ficha fue generada en Modo Demostración. */
    isSimulated: boolean;
    dataSource: RucDataSource;
    /** Texto para mostrar al usuario sobre el origen del dato. */
    dataSourceLabel: string;
    /** Fecha de carga del padrón reducido SUNAT usado (solo dataSource PADRON_SUNAT). */
    padronDate?: string;
}

type DemoRucRecord = Omit<RucBusinessDetails, 'ruc' | 'isSimulated' | 'dataSource' | 'dataSourceLabel' | 'padronDate'>;

/** Respuesta de `GET /api/v1/ruc/:ruc` (ver server/routes/ruc.ts). */
interface RucApiResponse {
    found: boolean;
    padronLoaded: boolean;
    padronDate?: string;
    data?: {
        ruc: string;
        businessName: string;
        status: string;
        condition: string;
        ubigeo: string;
        department: string;
        address: string;
    };
}

const NOT_IN_PADRON = 'No disponible en padrón reducido SUNAT';

// ─── Emisión de comprobantes ───

export interface EmissionCustomer {
    name?: string;
    address?: string;
    email?: string;
}

/** Emite una venta ya registrada en SAMI (el backend decide si va a Nubefact o es simulada). */
export const submitInvoiceToPse = async (invoice: Invoice, customer?: EmissionCustomer): Promise<PseResponse> => {
    try {
        const { data } = await api.post<PseResponse>('/einvoice/emit', { invoiceId: invoice.id, customer });
        return data;
    } catch (error: unknown) {
        const backendData = axios.isAxiosError<Partial<PseResponse>>(error) ? error.response?.data : undefined;
        if (backendData && typeof backendData.isSimulated === 'boolean') return backendData as PseResponse;
        const backendErrors = backendData?.errors;
        return {
            success: false,
            isSimulated: true,
            provider: 'SIMULADO',
            environmentLabel: 'Sin conexión con el servicio de emisión',
            errors: Array.isArray(backendErrors) ? backendErrors : [error instanceof Error ? error.message : 'Error desconocido al emitir'],
        };
    }
};

// ─── Consulta de RUC ───

/**
 * Consulta el RUC en el backend. Devuelve:
 * - `undefined` si el padrón SUNAT no está cargado o el backend no responde (usar demo).
 * - `null` si el padrón está cargado y el RUC no existe en él.
 * - la ficha real si existe.
 */
const fetchFromPadron = async (ruc: string): Promise<RucBusinessDetails | null | undefined> => {
    try {
        const { data } = await api.get<RucApiResponse>(`/ruc/${ruc}`, { validateStatus: s => s === 200 || s === 404 });
        if (!data?.padronLoaded) return undefined;
        if (!data.found || !data.data) return null;
        const d = data.data;
        return {
            ruc: d.ruc,
            businessName: d.businessName,
            active: d.status === 'ACTIVO',
            condition: d.condition,
            address: d.address || NOT_IN_PADRON,
            department: d.department || NOT_IN_PADRON,
            province: NOT_IN_PADRON,
            district: `Ubigeo ${d.ubigeo}`,
            taxRegime: NOT_IN_PADRON,
            ciiu: NOT_IN_PADRON,
            mainActivity: NOT_IN_PADRON,
            registrationDate: NOT_IN_PADRON,
            phone: NOT_IN_PADRON,
            email: NOT_IN_PADRON,
            electronicBilling: false,
            retainingAgent: false,
            agentOfPerception: false,
            isSimulated: false,
            dataSource: 'PADRON_SUNAT',
            dataSourceLabel: `Padrón reducido SUNAT${data.padronDate ? ` (cargado el ${data.padronDate})` : ''}`,
            padronDate: data.padronDate,
        };
    } catch {
        return undefined;
    }
};

export const validateRucWithSunat = async (ruc: string): Promise<RucValidationResult> => {
    const real = await fetchFromPadron(ruc);
    if (real) {
        return { active: real.active, condition: real.condition, isSimulated: false, sourceLabel: real.dataSourceLabel };
    }
    if (real === null) {
        return { active: false, condition: 'NO ENCONTRADO', isSimulated: false, sourceLabel: 'Padrón reducido SUNAT' };
    }
    return { active: true, condition: 'HABIDO', isSimulated: true, sourceLabel: SIMULATED_LABEL };
};

// DEMO_RUCS: fichas de demostración (Modo Demostración). Se reemplazan por datos reales cuando el
// padrón reducido SUNAT está importado en PostgreSQL (npm run padron:import). Para datos que el padrón
// no trae (teléfono, régimen, CIIU) se requiere un convenio PIDE/SUNAT o una API de consulta RUC de un PSE.
const DEMO_RUCS: Record<string, DemoRucRecord> = {
    "20123456789": {
        businessName: "Corporación Textil Gamarra S.A.C.",
        active: true,
        condition: "HABIDO",
        address: "Av. Aviación 1280, Urb. Balconcillo",
        department: "Lima",
        province: "Lima",
        district: "La Victoria",
        taxRegime: "MYPE Tributario (RMT)",
        ciiu: "1410 - Fabricación de prendas de vestir",
        mainActivity: "Venta Mayorista y Minorista de Prendas de Algodón Pima",
        registrationDate: "2018-04-12",
        phone: "+51 987 654 321",
        email: "contacto@textilgamarra.pe",
        electronicBilling: true,
        retainingAgent: false,
        agentOfPerception: false
    },
    "20601234567": {
        businessName: "SAMI Finanzas y Tecnología S.A.C.",
        active: true,
        condition: "HABIDO",
        address: "Av. Manuel Olguín 335, Of. 1205",
        department: "Lima",
        province: "Lima",
        district: "Santiago de Surco",
        taxRegime: "Régimen General (RG)",
        ciiu: "6201 - Actividades de programación informática",
        mainActivity: "Sistemas de Automatización Contable y Gestión Tributaria para MYPEs",
        registrationDate: "2023-01-15",
        phone: "+51 912 345 678",
        email: "legal@sami.pe",
        electronicBilling: true,
        retainingAgent: true,
        agentOfPerception: false
    },
    "20543210987": {
        businessName: "Inversiones Alimentos del Perú S.A.",
        active: true,
        condition: "HABIDO",
        address: "Jr. Los Libertadores 450",
        department: "Lima",
        province: "Lima",
        district: "San Isidro",
        taxRegime: "Régimen General (RG)",
        ciiu: "5610 - Actividades de restaurantes y de servicio móvil de comidas",
        mainActivity: "Distribución de insumos alimentarios y cadena de restaurantes",
        registrationDate: "2015-09-30",
        phone: "+51 999 888 777",
        email: "proveedores@alimentosperu.com",
        electronicBilling: true,
        retainingAgent: false,
        agentOfPerception: true
    },
    "20489218291": {
        businessName: "MYPE Metalúrgica Lima Norte E.I.R.L.",
        active: true,
        condition: "HABIDO",
        address: "Av. Alfredo Mendiola 4521",
        department: "Lima",
        province: "Lima",
        district: "Los Olivos",
        taxRegime: "Régimen Especial de Renta (RER)",
        ciiu: "2511 - Fabricación de productos metálicos para uso estructural",
        mainActivity: "Carpintería metálica y estructuras para almacenes",
        registrationDate: "2020-07-22",
        phone: "+51 955 444 333",
        email: "ventas@metalurgicanorte.pe",
        electronicBilling: true,
        retainingAgent: false,
        agentOfPerception: false
    },
    "10456782912": {
        businessName: "Gómez Huamán, Juan Carlos",
        active: true,
        condition: "HABIDO",
        address: "Calle Los Pinos 321, Urb. Limatambo",
        department: "Lima",
        province: "Lima",
        district: "San Borja",
        taxRegime: "Régimen Único Simplificado (RUS)",
        ciiu: "4711 - Comercio al por menor en comercios no especializados",
        mainActivity: "Bodega de abarrotes y servicios de librería",
        registrationDate: "2012-05-18",
        phone: "+51 944 321 098",
        email: "juan.gomez@gmail.com",
        electronicBilling: false,
        retainingAgent: false,
        agentOfPerception: false
    }
};


/** PRNG determinista: el mismo RUC siempre produce la misma ficha demo. */
const seededRandom = (seedText: string) => {
    let seed = 0;
    for (let i = 0; i < seedText.length; i++) seed = (seed * 31 + seedText.charCodeAt(i)) >>> 0;
    return () => {
        seed = (seed + 0x6D2B79F5) >>> 0;
        let t = seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

const buildDemoRecord = (ruc: string): DemoRucRecord => {
    const rand = seededRandom(ruc);
    const pick = <T,>(list: T[]): T => list[Math.floor(rand() * list.length)];
    const isPerson = ruc.startsWith('10') || ruc.startsWith('15') || ruc.startsWith('17');

    let businessName: string;
    let ciiu: string;
    let mainActivity: string;
    if (isPerson) {
        const firstNames = ["Roberto", "Maria", "Ana", "Carlos", "Luis", "Elena", "José", "Sofía"];
        const lastNames = ["Quispe", "Flores", "Sánchez", "Rojas", "Díaz", "Chávez", "Torres", "Ramírez"];
        businessName = `${pick(lastNames)} ${pick(lastNames)}, ${pick(firstNames)}`;
        ciiu = "4771 - Comercio al por menor de prendas de vestir, calzado y artículos de cuero";
        mainActivity = "Comercio de vestimenta y calzado por menor";
    } else {
        const prefixes = ["Corporación", "Servicios Integrales", "Distribuidora", "Inversiones", "Comercial"];
        const midNames = ["Andina", "Pacífico", "Gamarra", "Nacional", "Horizonte", "Continental"];
        const suffixes = ["S.A.C.", "S.A.", "E.I.R.L.", "S.R.L."];
        businessName = `${pick(prefixes)} ${pick(midNames)} ${pick(suffixes)}`;
        ciiu = "4690 - Venta al por mayor no especializada";
        mainActivity = "Distribución y comercio general al por mayor";
    }

    const districts = [
        { name: "Santiago de Surco", province: "Lima", department: "Lima" },
        { name: "La Victoria", province: "Lima", department: "Lima" },
        { name: "San Martín de Porres", province: "Lima", department: "Lima" },
        { name: "Chiclayo", province: "Chiclayo", department: "Lambayeque" },
        { name: "Arequipa", province: "Arequipa", department: "Arequipa" },
        { name: "Trujillo", province: "Trujillo", department: "La Libertad" }
    ];
    const dist = pick(districts);
    const registerYear = 2010 + Math.floor(rand() * 15);

    return {
        // El nombre lleva el sufijo para que nunca se confunda con una empresa real.
        businessName: `${businessName} (DEMO)`,
        active: true,
        condition: "HABIDO",
        address: `Av. Principal ${100 + Math.floor(rand() * 900)}, Urb. El Sol`,
        department: dist.department,
        province: dist.province,
        district: dist.name,
        taxRegime: pick(["MYPE Tributario (RMT)", "Régimen General (RG)", "Régimen Especial (RER)"]),
        ciiu,
        mainActivity,
        registrationDate: `${registerYear}-06-${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}`,
        phone: "No disponible (Modo Demostración)",
        email: "No disponible (Modo Demostración)",
        electronicBilling: rand() > 0.1,
        retainingAgent: rand() > 0.8,
        agentOfPerception: rand() > 0.9
    };
};

export const fetchRucDetails = async (ruc: string): Promise<RucBusinessDetails | null> => {
    if (!ruc || ruc.length !== 11 || !/^\d+$/.test(ruc)) return null;

    const real = await fetchFromPadron(ruc);
    if (real !== undefined) return real;

    // Padrón SUNAT no cargado: Modo Demostración, rotulado como tal.
    const demo = DEMO_RUCS[ruc] ?? buildDemoRecord(ruc);
    return {
        ruc,
        ...demo,
        isSimulated: true,
        dataSource: 'SIMULADO',
        dataSourceLabel: SIMULATED_LABEL,
    };
};
