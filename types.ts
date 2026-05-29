
export enum Sender {
  USER = 'user',
  BOT = 'bot',
}

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
    institutionId?: string; // For Banks
    twoFactorCode?: string;
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
    samiScore: number;
    monthlyAvgSales: number;
    taxComplianceStatus: TaxStatus;
    riskLevel: 'Low' | 'Medium' | 'High';
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
}

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
}

export interface TaxSummary {
  totalSales: number;
  totalPurchases: number;
  igvDebit: number; // Débito fiscal (from sales)
  igvCredit: number; // Crédito fiscal (from purchases)
  igvPayable: number; // IGV a pagar
  incomeTaxAdvance: number; // Pago a cuenta de Impuesto a la Renta
  appliedRmtRate: number; // Tasa aplicada para el Pago a Cuenta RMT (e.g., 0.01 o 0.015)
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

export interface SamiScoreResult {
    score: number; // e.g., 300-850
    tier: 'Excelente' | 'Bueno' | 'Regular' | 'Necesita Mejora';
    analysis: {
        stability: number; // 0-100
        growth: number; // 0-100
        formality: number; // 0-100
    };
    avgMonthlySales: number;
}

export interface LoanOffer {
    partner: PartnerFinancialInstitution;
    maxAmount: number;
    monthlyInterestRate: number; // e.g., 0.03 for 3%
    termInMonths: number;
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
    samiScore: SamiScoreResult | null;
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
    samiScore: SamiScoreResult | null;
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
    SCORE_INCREASE = 'SCORE_INCREASE',
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

export type TaxRegime = 'RUS' | 'MYPE_TRIBUTARIO' | 'REGIMEN_GENERAL';

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
    riskLevel: 'Low' | 'Medium' | 'High';
    validationDate: string;
}

export interface FinancialHealthCertificate {
    certificateId: string;
    issueDate: string;
    expiryDate: string;
    businessName: string;
    ruc: string;
    samiScore: number;
    riskLevel: string;
    verifiedAssetsValue: number;
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
