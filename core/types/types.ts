
export enum Sender {
  USER = 'user',
  BOT = 'bot',
}

export type View = 
  | 'dashboard' 
  | 'chat' 
  | 'accounting' 
  | 'credit' 
  | 'education' 
  | 'admin' 
  | 'expenses' 
  | 'notifications' 
  | 'profiling' 
  | 'loyalty' 
  | 'bank-api' 
  | 'tasks' 
  | 'management' 
  | 'glossary';

export interface Message {
  id: string;
  text: string;
  sender: Sender;
}

// --- User & Security Types ---
export enum AppRole {
    // MYPE Roles
    MYPE_ADMIN = 'MYPE_ADMIN',
    MYPE_WORKER = 'MYPE_WORKER',
    
    // Bank Roles
    BANK_ANALYST = 'BANK_ANALYST',
    BANK_SUPERVISOR = 'BANK_SUPERVISOR',
    BANK_ADMIN = 'BANK_ADMIN',
    
    // SAMI Internal (Team)
    SAMI_ANALYST = 'SAMI_ANALYST',
    SAMI_ADMIN = 'SAMI_ADMIN'
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: AppRole;
    businessId: string;
    ruc?: string;
    institutionId?: string; // For Banks
    twoFactorCode?: string;
    mfaVerified?: boolean;
}

// --- Inventory Types (Worker Module) ---
export interface Product {
    id: string;
    name: string;
    sku: string;
    description?: string;
    price: number;
    stock: number;
    category?: string;
}

export interface InventoryLog {
    id: string;
    productId: string;
    change: number; // positive or negative
    reason: string;
    timestamp: string;
    userId: string;
}

export interface AuditLog {
    id: string;
    timestamp: string;
    user: {
        id: string;
        name: string;
    };
    action: string;
}

// --- Bank Integration & OAuth Types ---
export interface BankApiScope {
    id: string;
    name: string;
    description: string;
}

export interface BankAccessToken {
    token: string;
    bankId: string;
    expiresAt: string;
    scopes: string[];
}

export interface TransactionalDataBundle {
    businessRuc: string;
    monthlyAvgSales: number;
    monthlyAvgPurchases: number;
    verifiedInvoicesCount: number;
    taxComplianceStatus: TaxStatus;
    lastYearSales: number;
    totalAssets: number;
}

// --- Accounting Module Types ---

export enum InvoiceType {
  SALE = 'sale',
  PURCHASE = 'purchase',
}

export enum DocumentType {
  FACTURA = 'FACTURA',
  BOLETA = 'BOLETA_DE_VENTA',
  NOTA_DE_CREDITO = 'NOTA_DE_CREDITO',
  NOTA_DE_DEBITO = 'NOTA_DE_DEBITO',
}

export type PaymentMethod = 'EFECTIVO' | 'YAPE' | 'PLIN' | 'TRANSFERENCIA' | 'TARJETA';

export interface Invoice {
  id: string;
  type: InvoiceType;
  documentType: DocumentType;
  series: string;
  correlative: number;
  issueDate: string; // YYYY-MM-DD
  ruc?: string; // Optional for Boletas
  totalAmount: number;
  category?: string;
  description?: string;
  paymentMethod?: PaymentMethod;
  aiCategorizedReason?: string;
  referencedDocumentType?: DocumentType;
  referencedSeries?: string;
  referencedCorrelative?: number;
  noteReason?: string;
  referencedInvoiceId?: string;
  /** Resultado de la emisión electrónica vía PSE (solo ventas). */
  emission?: InvoiceEmission;
}

export interface InvoiceEmission {
  provider: 'NUBEFACT' | 'SUNAT_DIRECTO' | 'SIMULADO';
  /** true = el comprobante NO fue enviado a SUNAT (Modo Demostración). */
  isSimulated: boolean;
  acceptedBySunat?: boolean;
  sunatDescription?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  cdrUrl?: string;
  /** Resumen de la firma digital (envío directo a SUNAT). */
  documentHash?: string;
  emittedAt?: string;
}

export interface TaxSummary {
  totalSales: number;
  totalPurchases: number;
  igvDebit: number; // Débito fiscal (from sales)
  igvCredit: number; // Crédito fiscal (from purchases)
  igvPayable: number; // IGV a pagar
  incomeTaxAdvance: number; // Pago a cuenta de Impuesto a la Renta
  appliedRmtRate: number; // Tasa aplicada para el Pago a Cuenta RMT (e.g., 0.01 o 0.015)
  avgMonthlySales: number;
  avgMonthlyPurchases: number;
  verifiedInvoicesCount: number;
  formalityRatio: number; // e.g. 100%
  complianceStatus: 'Al día' | 'Registro desactualizado' | 'Sin actividad reciente' | 'Pendiente';
  regimeType: TaxRegime;
  fixedQuota?: number; // solo relevante para NRUS
  nrusCategory?: 1 | 2; // solo relevante para NRUS
  exceedsRegimeLimit: boolean;
  regimeLimitMessage?: string; // texto explicando qué límite se excedió, si aplica
  proximoVencimiento?: {
    periodo: string;
    fecha: string;
    diasRestantes: number;
  };
  nonBancarizedAmount: number;
  nonBancarizedMessage?: string;
}

// --- Credit Marketplace Module Types ---

export type CreditApplicationStatus = 'pending' | 'reviewing' | 'approved' | 'rejected' | 'disbursed';

export interface CreditApplication {
    id: string;
    userId: string;
    type: 'loan' | 'factoring';
    amount: number;
    partner: PartnerFinancialInstitution;
    status: CreditApplicationStatus;
    timestamp: string;
    details?: string;
}

export interface LoanOffer {
    partner: PartnerFinancialInstitution;
    maxAmount: number;
    monthlyInterestRate: number; // e.g., 0.03 for 3%
    termInMonths: number;
}

export interface LoanInstallment {
    id: string;
    loanId: string;
    installmentNumber: number;
    totalInstallments: number;
    dueDate: string;
    principalAmount: number;
    interestAmount: number;
    totalAmount: number;
    status: 'paid' | 'pending' | 'overdue';
    paidDate?: string;
    receiptNumber?: string;
}

export interface ActiveLoan {
    id: string;
    partner: PartnerFinancialInstitution;
    loanType: 'Capital de Trabajo' | 'Factoring' | 'Equipamiento';
    originalAmount: number;
    remainingAmount: number;
    monthlyInterestRate: number;
    termMonths: number;
    disbursedDate: string;
    nextDueDate: string;
    nextDueAmount: number;
    installmentsPaidCount: number;
    totalInstallmentsCount: number;
    status: 'active' | 'completed';
    installments: LoanInstallment[];
}

export interface PartnerFinancialInstitution {
    id: string;
    name: string;
    logoUrl: string;
    contactEmail?: string;
    contactPhone?: string;
}

// --- Education Module (SAMI Academy) Types ---

export type LessonType = 'video' | 'text';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface Lesson {
  id: string;
  title: string;
  type: LessonType;
  content: string; // Markdown content
  quiz: QuizQuestion[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  badgeUrl: string;
  lessons: Lesson[];
  category?: 'finance' | 'growth' | 'operations' | 'accounting';
  recommendationReason?: string;
  level?: string;
  scoreReward?: string;
  format?: string;
}

export interface UserProgress {
  [lessonId: string]: boolean;
}

export interface FinancialHealthIndicators {
    taxSummary: TaxSummary | null;
}

// --- Dashboard Types ---
export interface NetCashFlow {
    income: number;
    expenses: number;
}

export interface ProactiveInsight {
    id:string;
    text: string;
    type: 'warning' | 'info' | 'success';
}

export type TaxStatus = 'Al día' | 'Pendiente' | 'Por Vencer';

export interface DashboardData {
    netCashFlow: NetCashFlow;
    taxStatus: TaxStatus;
    nextDueDate: {
        date: string;
        description: string;
    } | null;
    taxSummary: TaxSummary | null;
    maxLoanAmount: number;
    insights: ProactiveInsight[];
}

// --- Admin Dashboard Types ---
interface Kpi {
    value: number;
    trend: number; // e.g., 0.05 for +5%
}

export interface MypeGrowthPipeline {
    totalGoal: number;
    activeCount: number;
    inQueueCount: number;
    onboardingCount: number;
    graduatedCount: number;
}

export interface AdminDashboardData {
    mrr: Kpi;
    mrrHistory: { month: string; value: number }[];
    creditConversionRate: Kpi;
    churnRate: Kpi;
    portfolioRisk: Kpi;
    growthPipeline: MypeGrowthPipeline;
}

export interface PartnerPerformance {
    partner: PartnerFinancialInstitution;
    offersSent: number;
    loansDisbursed: number;
    conversionRate: number; // loans / offers
    historicalCredits?: { month: string; value: number }[];
    lastActive?: string;
    isOnline?: boolean;
}

// --- Expense & Vendor Management Types ---

export interface Vendor {
    id: string;
    name: string;
    ruc: string;
    category: string;
    isKeyVendor: boolean;
}

export interface PaymentAlert {
    id: string;
    vendorId: string;
    serviceName: string;
    dueDate: string;
    amount: number;
    status: 'pending' | 'paid' | 'overdue';
    frequency: 'once' | 'monthly' | 'quarterly';
}

export interface CostOptimizationItem {
    vendorName: string;
    recurringAmount: number;
    frequency: string;
    suggestedDiscount: number; // e.g., 0.02 for 2%
    potentialSavings: number;
    reason: string;
}

export interface CostOptimizationReport {
    items: CostOptimizationItem[];
    totalPotentialSavings: number;
    cashFlowStatus: 'healthy' | 'tight' | 'critical';
}

export interface FactoringOffer {
    id: string;
    invoiceId: string;
    partner: PartnerFinancialInstitution;
    advancePercentage: number; // e.g., 0.90 for 90%
    feePercentage: number; // e.g., 0.02 for 2%
    netAmount: number;
}

// --- Notification & Alert Types ---

export type NotificationChannel = 'push' | 'whatsapp' | 'email';

export enum NotificationType {
    UNUSUAL_EXPENSE = 'UNUSUAL_EXPENSE',
    SUNAT_DEADLINE = 'SUNAT_DEADLINE',
    CREDIT_ELIGIBILITY = 'CREDIT_ELIGIBILITY',
    PAYMENT_REMINDER = 'PAYMENT_REMINDER',
    TASK_REMINDER = 'TASK_REMINDER'
}

export interface NotificationTemplate {
    id: string;
    type: NotificationType;
    channel: NotificationChannel;
    title: string;
    body: string; // Handle placeholders like {{name}}, {{amount}}
}

export interface UserNotificationSettings {
    userId: string;
    channels: {
        push: boolean;
        whatsapp: boolean;
        email: boolean;
    };
    phoneNumber?: string;
    whatsappPhone?: string;
}

export interface NotificationLog {
    id: string;
    userId: string;
    type: NotificationType;
    channel: NotificationChannel;
    timestamp: string;
    status: 'sent' | 'delivered' | 'failed';
    messageId?: string; // External ID from Twilio/Meta
}

// --- Financial Simulation Types ---

export type TaxRegime = 'NRUS' | 'RER' | 'RMT' | 'RG';

export interface SimulationScenario {
    name: string;
    description: string;
    monthlyIncome: number;
    monthlyExpenses: number;
    taxRegime: TaxRegime;
    employeeCount: number;
    avgSalary: number;
}

export interface SimulationResult {
    scenarioName: string;
    netProfit: number;
    totalTaxes: number;
    payrollCosts: number;
    liquidity: number;
}

export interface ComparativeSimulation {
    current: SimulationResult;
    projected: SimulationResult;
    difference: {
        netProfit: number;
        totalTaxes: number;
        liquidity: number;
    };
}

// --- Risk Management & Deep Profiling Types ---

export interface FixedAsset {
    id: string;
    description: string;
    estimatedValue: number;
}

export interface VendorReference {
    id: string;
    vendorName: string;
    contactPhone: string;
    relationshipYears: number;
}

export interface DeepProfile {
    yearsInLocation: number;
    isOwnerOfLocation: boolean;
    fixedAssets: FixedAsset[];
    vendorReferences: VendorReference[];
    lastUpdated: string;
}

export interface CrossValidationResult {
    ruc: string;
    isBlacklisted: boolean;
    hasThirdPartyDebts: boolean;
    debtAmount?: number;
    riskLevel: 'Low' | 'Medium' | 'High' | 'NotConsulted';
    status?: 'NOT_CONSULTED' | 'VERIFIED_DEMO';
    message?: string;
    validationDate: string;
}

export interface FinancialHealthCertificate {
    certificateId: string;
    issueDate: string;
    expiryDate: string;
    businessName: string;
    ruc: string;
    avgMonthlySales: number;
    verifiedInvoicesCount: number;
    complianceStatus: string;
    verifiedAssetsValue: number;
    cryptographicHash: string;
    issuedAt: string;
}

// --- Loyalty & Referral Types (Growth Hacker) ---

export interface SamiCoinTransaction {
    id: string;
    amount: number;
    type: 'earn' | 'redeem';
    description: string;
    timestamp: string;
}

export interface LoyaltyReward {
    id: string;
    name: string;
    description: string;
    cost: number;
    type: 'discount' | 'priority' | 'feature';
}

export interface Referral {
    id: string;
    referredEmail: string;
    status: 'pending' | 'joined' | 'active';
    rewardEarned: number;
    timestamp: string;
}

// --- Task Management Types ---
export enum TaskStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  OVERDUE = 'overdue',
  IN_PROGRESS = 'in_progress'
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
  category?: string;
  reminderDaysBefore?: number;
  assignedTo?: string;
}
