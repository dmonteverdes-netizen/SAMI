import React, { useState, useEffect } from 'react';
import { UserNotificationSettings, NotificationChannel } from '../types';
import { Bell, Smartphone, MessageCircle, Mail, Save, CheckCircle, Info, ExternalLink } from 'lucide-react';

interface NotificationSettingsProps {
    settings: UserNotificationSettings;
    onSave: (settings: UserNotificationSettings) => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ settings, onSave }) => {
    const [localSettings, setLocalSettings] = useState<UserNotificationSettings>(settings);
    const [isSaved, setIsSaved] = useState(false);

    // Keep state updated if settings prop changes
    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    const handleSave = () => {
        onSave(localSettings);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
    };

    const toggleChannel = (channel: NotificationChannel) => {
        setLocalSettings(prev => ({
            ...prev,
            channels: {
                ...prev.channels,
                [channel]: !prev.channels[channel]
            }
        }));
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, ''); // Numeric only
        setLocalSettings(prev => ({
            ...prev,
            whatsappPhone: val
        }));
    };

    return (
        <div className="space-y-6 text-left max-w-2xl mx-auto animate-fade-in font-sans">
            <div className="flex items-center gap-2.5 mb-2">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl text-indigo-650 dark:text-indigo-400">
                    <Bell size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Preferencias de Alertas</h2>
                    <p className="text-xs text-slate-400 font-medium">Define los canales para recibir tus avisos de orden fiscal, liquidez y control.</p>
                </div>
            </div>

            {/* Channels Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                    type="button"
                    onClick={() => toggleChannel('push')}
                    className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-3.5 text-center cursor-pointer ${
                        localSettings.channels.push 
                            ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/15 text-indigo-750 dark:text-indigo-400' 
                            : 'border-slate-100 dark:border-slate-800 text-slate-400 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900/30'
                    }`}
                >
                    <Smartphone size={28} />
                    <div className="space-y-0.5">
                        <span className="font-extrabold text-xs block">Mensajes directos</span>
                        <span className="text-[10px] text-slate-400 block font-medium">Alertas rápidas en pantalla</span>
                    </div>
                    <div className={`w-9 h-5 rounded-full relative transition-colors ${localSettings.channels.push ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-755'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${localSettings.channels.push ? 'left-5' : 'left-1'}`}></div>
                    </div>
                </button>

                <button 
                    type="button"
                    onClick={() => toggleChannel('whatsapp')}
                    className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-3.5 text-center cursor-pointer ${
                        localSettings.channels.whatsapp 
                            ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/15 text-emerald-750 dark:text-emerald-400' 
                            : 'border-slate-100 dark:border-slate-800 text-slate-400 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900/30'
                    }`}
                >
                    <MessageCircle size={28} />
                    <div className="space-y-0.5">
                        <span className="font-extrabold text-xs block">WhatsApp</span>
                        <span className="text-[10px] text-slate-400 block font-medium">Notificación directa al móvil</span>
                    </div>
                    <div className={`w-9 h-5 rounded-full relative transition-colors ${localSettings.channels.whatsapp ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-755'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${localSettings.channels.whatsapp ? 'left-5' : 'left-1'}`}></div>
                    </div>
                </button>

                <button 
                    type="button"
                    onClick={() => toggleChannel('email')}
                    className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-3.5 text-center cursor-pointer ${
                        localSettings.channels.email 
                            ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/15 text-blue-750 dark:text-blue-400' 
                            : 'border-slate-100 dark:border-slate-800 text-slate-400 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900/30'
                    }`}
                >
                    <Mail size={28} />
                    <div className="space-y-0.5">
                        <span className="font-extrabold text-xs block">Correo Electrónico</span>
                        <span className="text-[10px] text-slate-400 block font-medium">Reportes semanales en bandeja</span>
                    </div>
                    <div className={`w-9 h-5 rounded-full relative transition-colors ${localSettings.channels.email ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-755'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${localSettings.channels.email ? 'left-5' : 'left-1'}`}></div>
                    </div>
                </button>
            </div>

            {/* Special field for WhatsApp Number if enabled */}
            {localSettings.channels.whatsapp && (
                <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-2 animate-fade-in text-left">
                    <label className="text-[10px] uppercase font-black tracking-wide text-slate-400 block">Número Celular de WhatsApp</label>
                    <div className="flex gap-2.5 max-w-sm">
                        <div className="flex items-center justify-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 font-mono text-xs text-slate-500 shrink-0 select-none">
                            +51
                        </div>
                        <input 
                            type="text" 
                            maxLength={9} 
                            placeholder="Ej. 987654321" 
                            value={localSettings.whatsappPhone || ''} 
                            onChange={handlePhoneChange}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-1">
                        SAMI enviará las alertas de facturación inusual o cobro directo de factoring a este móvil vía WhatsApp oficial.
                    </p>
                </div>
            )}

            {/* IT Integration Redirect Card */}
            <div className="p-4 bg-indigo-50/30 dark:bg-indigo-950/5 border border-indigo-100/40 dark:border-indigo-900/10 rounded-2xl flex items-start gap-3 text-left">
                <Info size={16} className="text-indigo-650 dark:text-indigo-400 mt-0.5 shrink-0" />
                <div className="space-y-1">
                    <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-305">¿Eres del equipo técnico de integración (TI)?</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed md:max-w-xl">
                        Los diagnósticos avanzados del Service Worker, claves de servidor (VAPID), consolas de comunicación interactiva y demonios de background han sido trasladados al <strong>Centro de Transparencia (Consola del Service Worker)</strong>.
                    </p>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 mt-6">
                <div className="h-4">
                    {isSaved && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold animate-fade-in">
                            <CheckCircle size={14} /> Local Settings Saved!
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold text-xs tracking-wide uppercase rounded-xl transition-all shadow-md shadow-indigo-650/10 hover:scale-[1.02] cursor-pointer"
                >
                    <Save size={14} />
                    Guardar Cambios
                </button>
            </div>
        </div>
    );
};

export default NotificationSettings;
