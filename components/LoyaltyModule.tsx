
import React, { useState, useMemo } from 'react';
import { 
    SamiCoinTransaction, 
    LoyaltyReward, 
    Referral 
} from '../types';
import { AVAILABLE_REWARDS, createTransaction, sendReferralInvitation } from '../services/loyaltyService';
import { 
    Coins, 
    Gift, 
    UserPlus, 
    History, 
    CheckCircle2, 
    ArrowRight, 
    Share2, 
    Copy, 
    Zap,
    Trophy,
    Plus,
    Search,
    Filter
} from 'lucide-react';

interface LoyaltyModuleProps {
    balance: number;
    transactions: SamiCoinTransaction[];
    referrals: Referral[];
    onRedeem: (reward: LoyaltyReward) => void;
    onInvite: (email: string) => void;
}

const LoyaltyModule: React.FC<LoyaltyModuleProps> = ({ 
    balance, 
    transactions, 
    referrals, 
    onRedeem, 
    onInvite 
}) => {
    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);
    const [showCopySuccess, setShowCopySuccess] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'earn' | 'redeem'>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const matchesSearch = tx.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesType = typeFilter === 'all' || tx.type === typeFilter;
            
            const txDate = new Date(tx.timestamp);
            const matchesStartDate = !startDate || txDate >= new Date(startDate);
            // End date includes the full day
            const matchesEndDate = !endDate || txDate <= new Date(endDate + 'T23:59:59');
            
            return matchesSearch && matchesType && matchesStartDate && matchesEndDate;
        });
    }, [transactions, searchQuery, typeFilter, startDate, endDate]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail) return;
        setIsInviting(true);
        await onInvite(inviteEmail);
        setInviteEmail('');
        setIsInviting(false);
    };

    const copyReferralLink = () => {
        navigator.clipboard.writeText("https://sami.pe/join?ref=USER123");
        setShowCopySuccess(true);
        setTimeout(() => setShowCopySuccess(false), 2000);
    };

    return (
        <div className="container mx-auto p-4 max-w-7xl h-full flex flex-col gap-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <Trophy className="text-yellow-500" size={32} />
                        SAMI Rewards & Referidos
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">Gana SAMI Coins por digitalizar tu negocio y refiere a otros emprendedores.</p>
                </div>
                <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 p-1 rounded-2xl shadow-lg">
                    <div className="bg-white dark:bg-gray-900 px-6 py-3 rounded-xl flex items-center gap-4">
                        <div className="bg-yellow-100 p-2 rounded-full">
                            <Coins className="text-yellow-600" size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tu Balance</p>
                            <p className="text-2xl font-black text-gray-800 dark:text-white">{balance.toLocaleString()} <span className="text-sm font-bold text-yellow-600">Coins</span></p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Referral Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                            <Trophy size={120} />
                        </div>
                        
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-2">Academia SAMI</h3>
                                    <p className="text-gray-500 dark:text-gray-400 max-w-md"> Tu aprendizaje mejora tu crédito. Gana Coins y sube tu Score por cada curso completado.</p>
                                </div>
                                <div className="bg-yellow-100 text-yellow-600 p-4 rounded-2xl">
                                    <Trophy size={32} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4">
                                    <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Impacto Score</p>
                                    <p className="text-xl font-black text-green-500">+45 pts</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4">
                                    <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Cursos</p>
                                    <p className="text-xl font-black text-gray-800 dark:text-white">03/12</p>
                                </div>
                                <div className="md:col-span-2 bg-blue-600 rounded-2xl p-4 text-white flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black uppercase opacity-60 mb-1">Siguiente Logro</p>
                                        <p className="text-sm font-bold">Experto en Costos</p>
                                    </div>
                                    <span className="text-xl font-black">75%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Rewards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Gift className="text-pink-500" size={24} />
                                Canjea tus SAMI Coins
                            </h3>
                        </div>
                        {AVAILABLE_REWARDS.map(reward => (
                            <div key={reward.id} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-2xl ${
                                        reward.type === 'discount' ? 'bg-green-100 text-green-600' : 
                                        reward.type === 'priority' ? 'bg-blue-100 text-blue-600' : 
                                        'bg-purple-100 text-purple-600'
                                    }`}>
                                        {reward.type === 'discount' && <Zap size={24} />}
                                        {reward.type === 'priority' && <Coins size={24} />}
                                        {reward.type === 'feature' && <Gift size={24} />}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-gray-800 dark:text-white">{reward.cost}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Coins</p>
                                    </div>
                                </div>
                                <h4 className="font-bold text-gray-800 dark:text-white mb-1">{reward.name}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">{reward.description}</p>
                                <button 
                                    onClick={() => onRedeem(reward)}
                                    disabled={balance < reward.cost}
                                    className={`w-full py-3 rounded-xl font-bold transition-all ${
                                        balance >= reward.cost 
                                        ? 'bg-gray-900 text-white hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700' 
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    {balance >= reward.cost ? 'Canjear Ahora' : 'Coins Insuficientes'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sidebar: History & Stats */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex flex-col gap-4 mb-6">
                            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <History size={20} className="text-blue-500" />
                                Historial de Actividad
                            </h3>
                            
                            {/* Search and filter controls */}
                            <div className="space-y-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input 
                                        type="text"
                                        placeholder="Buscar por descripción..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-gray-400 px-1">Desde</label>
                                        <input 
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-[10px] focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-gray-400 px-1">Hasta</label>
                                        <input 
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-[10px] focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-900/50 rounded-xl">
                                    <button 
                                        onClick={() => setTypeFilter('all')}
                                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${typeFilter === 'all' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-400'}`}
                                    >
                                        TODOS
                                    </button>
                                    <button 
                                        onClick={() => setTypeFilter('earn')}
                                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${typeFilter === 'earn' ? 'bg-white dark:bg-gray-700 text-green-600 shadow-sm' : 'text-gray-400'}`}
                                    >
                                        GANADOS
                                    </button>
                                    <button 
                                        onClick={() => setTypeFilter('redeem')}
                                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${typeFilter === 'redeem' ? 'bg-white dark:bg-gray-700 text-red-600 shadow-sm' : 'text-gray-400'}`}
                                    >
                                        CANJES
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                            {filteredTransactions.length === 0 && (
                                <div className="text-center py-8">
                                    <div className="bg-gray-50 dark:bg-gray-900 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <History size={20} className="text-gray-300" />
                                    </div>
                                    <p className="text-sm text-gray-500 italic">No se encontraron transacciones.</p>
                                </div>
                            )}
                            {filteredTransactions.map(tx => (
                                <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:ring-1 hover:ring-blue-100 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${tx.type === 'earn' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {tx.type === 'earn' ? <Plus size={14} /> : <ArrowRight size={14} className="rotate-45" />}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-800 dark:text-white line-clamp-1">{tx.description}</p>
                                            <p className="text-[10px] text-gray-400">{new Date(tx.timestamp).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <p className={`text-sm font-black ${tx.type === 'earn' ? 'text-green-600' : 'text-red-600'}`}>
                                        {tx.type === 'earn' ? '+' : '-'}{tx.amount}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                            <UserPlus size={20} className="text-blue-500" />
                            Referidos Pendientes
                        </h3>
                        <div className="space-y-4">
                            {referrals.length === 0 && (
                                <p className="text-sm text-gray-500 italic text-center py-4">No tienes referidos aún.</p>
                            )}
                            {referrals.map(ref => (
                                <div key={ref.id} className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-700 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">
                                            {ref.referredEmail[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-800 dark:text-white truncate w-32">{ref.referredEmail}</p>
                                            <p className="text-[10px] text-blue-500 font-bold uppercase">{ref.status}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-gray-400">Potencial</p>
                                        <p className="text-xs font-black text-yellow-600">+{ref.rewardEarned}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoyaltyModule;
