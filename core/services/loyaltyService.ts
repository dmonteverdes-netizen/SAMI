
import { SamiCoinTransaction, LoyaltyReward, Referral } from '../types/types';

/**
 * Available rewards for SAMI Coins redemption.
 */
export const AVAILABLE_REWARDS: LoyaltyReward[] = [
    {
        id: 'rew_discount_10',
        name: '10% Descuento SaaS',
        description: 'Aplica un 10% de descuento en tu próxima mensualidad de SAMI.',
        cost: 500,
        type: 'discount'
    },
    {
        id: 'rew_priority_credit',
        name: 'Prioridad en Créditos',
        description: 'Tu solicitud de crédito será revisada en menos de 2 horas.',
        cost: 1000,
        type: 'priority'
    },
    {
        id: 'rew_premium_support',
        name: 'Soporte VIP 24/7',
        description: 'Acceso directo a un asesor financiero por WhatsApp.',
        cost: 800,
        type: 'feature'
    }
];

/**
 * Points awarded for different activities.
 */
export const POINTS_CONFIG = {
    INVOICE_UPLOAD: 10,
    COURSE_COMPLETED: 100,
    REFERRAL_JOINED: 250
};

/**
 * Creates a new SAMI Coin transaction.
 */
export const createTransaction = (amount: number, type: 'earn' | 'redeem', description: string): SamiCoinTransaction => {
    return {
        id: `tx_${Math.random().toString(36).substring(7)}`,
        amount,
        type,
        description,
        timestamp: new Date().toISOString()
    };
};

/**
 * Simulates sending a referral invitation.
 */
export const sendReferralInvitation = async (email: string): Promise<Referral> => {
    // In a real app, this would call an API to send an email/WhatsApp
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
        id: `ref_${Math.random().toString(36).substring(7)}`,
        referredEmail: email,
        status: 'pending',
        rewardEarned: POINTS_CONFIG.REFERRAL_JOINED,
        timestamp: new Date().toISOString()
    };
};
