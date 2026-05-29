import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    Bell, 
    Smartphone, 
    MessageCircle, 
    Mail, 
    Save, 
    ShieldCheck, 
    CheckCircle, 
    ShieldAlert, 
    Info, 
    Cpu, 
    RefreshCw, 
    Radio, 
    Trash2, 
    Send, 
    Database, 
    Activity, 
    Wrench 
} from 'lucide-react';
import { 
    getNotificationPermissionStatus, 
    requestNotificationPermission,
    getPersistentPermissionPreference,
    setPersistentPermissionPreference,
    showLocalPushNotification,
    registerServiceWorker,
    subscribeUserToPush,
    unsubscribeUserFromPush
} from '../services/pushNotificationService';

const TechnicalConsole: React.FC = () => {
    const { currentUser } = useAuth();
    const userId = currentUser?.id || 'default';

    // Browser push notification states
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(getNotificationPermissionStatus());
    const [persistentPref, setPersistentPref] = useState<'granted' | 'denied' | 'prompt'>(getPersistentPermissionPreference());
    const [isTesting, setIsTesting] = useState(false);

    // Service Worker states
    const [swSupported, setSwSupported] = useState<boolean>(false);
    const [swStatus, setSwStatus] = useState<string>('checking');
    const [swScope, setSwScope] = useState<string>('');
    const [isRefreshingSW, setIsRefreshingSW] = useState(false);
    const [isControlled, setIsControlled] = useState<boolean>(false);

    // postMessage Debug SandBox states
    const [testTitle, setTestTitle] = useState('📡 SAMI Alerta de Depuración');
    const [testBody, setTestBody] = useState('Este es un mensaje interactivo enviado a través de postMessage del hilo principal.');
    const [pingPayload, setPingPayload] = useState('SAMI_OAUTH_INTEGRITY_CHECK');
    const [commLogs, setCommLogs] = useState<{id: string, time: string, direction: 'out' | 'in', message: string, raw: string}[]>([]);

    // Backend VAPID & Subscribed Tokens diagnostic states
    const [serverVapidKey, setServerVapidKey] = useState<string>('');
    const [vapidPersistence, setVapidPersistence] = useState<string>('cargando...');
    const [isRegeneratingVapid, setIsRegeneratingVapid] = useState(false);
    const [backendSubscribers, setBackendSubscribers] = useState<{userId: string, endpoint: string, device: string, subscribedAt: string}[]>([]);
    const [isDispatchingServerPush, setIsDispatchingServerPush] = useState(false);

    // SAMI Background Daemon Monitor state variables
    const [daemonStatus, setDaemonStatus] = useState<{
        daemonActive: boolean;
        runsCompleted: number;
        lastRunAt: string;
        totalPurchasesTracked: number;
        totalAnomaliesDetected: number;
        activeSubscriptionsCount: number;
    } | null>(null);
    const [purchasesDB, setPurchasesDB] = useState<any[]>([]);
    const [isSimulatingSpike, setIsSimulatingSpike] = useState(false);
    const [isRefreshingDaemon, setIsRefreshingDaemon] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
        
        const handleIncomingSWMessage = (event: MessageEvent) => {
            console.log('[SAMI main thread] Received message from SW:', event.data);
            const timeStr = new Date().toLocaleTimeString();
            if (event.data && event.data.type === 'NOTIFICATION_ACK') {
                setCommLogs(prev => [
                    {
                        id: Math.random().toString(),
                        time: timeStr,
                        direction: 'in',
                        message: `Notificación Confirmada (ACK): "${event.data.title}"`,
                        raw: JSON.stringify(event.data)
                    },
                    ...prev
                ]);
            } else if (event.data && event.data.type === 'PONG') {
                setCommLogs(prev => [
                    {
                        id: Math.random().toString(),
                        time: timeStr,
                        direction: 'in',
                        message: `Respuesta PONG Recibida. Payload: "${event.data.payload}"`,
                        raw: JSON.stringify(event.data)
                    },
                    ...prev
                ]);
            }
        };

        navigator.serviceWorker.addEventListener('message', handleIncomingSWMessage);
        return () => {
            navigator.serviceWorker.removeEventListener('message', handleIncomingSWMessage);
        };
    }, []);

    const checkSWStatus = async () => {
        if (typeof window === 'undefined') return;
        const supported = 'serviceWorker' in navigator;
        setSwSupported(supported);
        if (!supported) {
            setSwStatus('not_supported');
            setIsControlled(false);
            return;
        }

        try {
            setIsControlled(!!navigator.serviceWorker.controller);
            const regs = await navigator.serviceWorker.getRegistrations();
            if (regs.length > 0) {
                const reg = regs[0];
                setSwScope(reg.scope || '/');
                if (reg.active) {
                    setSwStatus('active');
                } else if (reg.installing) {
                    setSwStatus('installing');
                } else if (reg.waiting) {
                    setSwStatus('waiting');
                } else {
                    setSwStatus('registered');
                }
            } else {
                setSwStatus('unregistered');
                setSwScope('');
            }
        } catch (err) {
            console.error('[SAMI] Error checking Service Worker:', err);
            setSwStatus('error');
        }
    };

    const fetchDaemonStatus = async () => {
        try {
            const res = await fetch('/api/v1/expenses/monitoring-status');
            if (res.ok) {
                const data = await res.json();
                setDaemonStatus(data);
            }
        } catch (err) {
            console.error('[SAMI Daemon] Error fetching status:', err);
        }
    };

    const fetchPurchasesDB = async () => {
        try {
            const res = await fetch('/api/v1/expenses/purchases');
            if (res.ok) {
                const data = await res.json();
                setPurchasesDB(data.purchases || []);
            }
        } catch (err) {
            console.error('[SAMI Daemon] Error fetching purchases database:', err);
        }
    };

    const handleSimulateSpike = async (customAmount?: number) => {
        setIsSimulatingSpike(true);
        try {
            const res = await fetch('/api/v1/expenses/purchases/simulate-spike', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ amount: customAmount })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                await fetchDaemonStatus();
                await fetchPurchasesDB();
            } else {
                showLocalPushNotification('❌ Error de Simulación', 'No se pudo simular el pico: ' + (data.error || 'Respuesta inesperada.'));
            }
        } catch (err) {
            console.error('[SAMI Daemon] Error simulating purchase spike:', err);
            showLocalPushNotification('❌ Error de Red', 'Error al intentar invocar el modulador de simulación del servidor.');
        } finally {
            setIsSimulatingSpike(false);
        }
    };

    const handleRefreshAllDaemonMetrics = async () => {
        setIsRefreshingDaemon(true);
        try {
            await Promise.all([
                fetchDaemonStatus(),
                fetchPurchasesDB(),
                fetchBackendSubscribers(),
                fetchVapidKey()
            ]);
        } finally {
            setIsRefreshingDaemon(false);
        }
    };

    const fetchBackendSubscribers = async () => {
        try {
            const res = await fetch('/api/v1/notifications/subscriptions');
            if (res.ok) {
                const data = await res.json();
                setBackendSubscribers(data.subscriptions || []);
            }
        } catch (err) {
            console.error('[SAMI] Error fetching backend subscribers:', err);
        }
    };

    const fetchVapidKey = async () => {
        try {
            const res = await fetch('/api/v1/notifications/vapid-keys/status');
            if (res.ok) {
                const data = await res.json();
                setServerVapidKey(data.publicKey || '');
                setVapidPersistence(data.persistence || 'file');
            } else {
                const fallbackRes = await fetch('/api/v1/notifications/vapid-key');
                if (fallbackRes.ok) {
                    const fallbackData = await fallbackRes.json();
                    setServerVapidKey(fallbackData.publicKey || '');
                    setVapidPersistence('dynamic');
                }
            }
        } catch (err) {
            console.error('[SAMI] Error fetching server VAPID key details:', err);
        }
    };

    const handleRegenerateVapidKeys = async () => {
        if (!confirm('¿Estás seguro de que deseas regenerar las llaves de seguridad VAPID? Esto invalidará todas las suscripciones actuales del navegador y los usuarios deberán volverse a suscribir para recibir notificaciones.')) {
            return;
        }
        setIsRegeneratingVapid(true);
        try {
            const res = await fetch('/api/v1/notifications/vapid-keys/regenerate', {
                method: 'POST'
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setServerVapidKey(data.publicKey);
                showLocalPushNotification('🔑 Reconfiguración VAPID', '¡Éxito! Las llaves de seguridad VAPID se han regenerado y guardado. El backend ha sido reconfigurado en tiempo real.');
                await fetchVapidKey();
                await fetchBackendSubscribers();
            } else {
                showLocalPushNotification('❌ Error de Certificado', 'No se pudieron regenerar las llaves: ' + (data.error || 'Respuesta inesperada.'));
            }
        } catch (err) {
            console.error('[SAMI] Error regenerating VAPID keys:', err);
            showLocalPushNotification('❌ Error de Comunicación', 'Error de red al intentar comunicarse con el backend de seguridad.');
        } finally {
            setIsRegeneratingVapid(false);
        }
    };

    useEffect(() => {
        checkSWStatus();
        fetchVapidKey();
        fetchBackendSubscribers();
        fetchDaemonStatus();
        fetchPurchasesDB();

        const daemonPollInterval = setInterval(() => {
            fetchDaemonStatus();
            fetchPurchasesDB();
        }, 4000);

        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            const handleControllerChange = () => {
                console.log('[SAMI] Service Worker controller changed.');
                setIsControlled(!!navigator.serviceWorker.controller);
                checkSWStatus();
            };

            navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
            setIsControlled(!!navigator.serviceWorker.controller);

            const intervalId = setInterval(() => {
                setIsControlled(!!navigator.serviceWorker.controller);
                checkSWStatus();
            }, 3500);

            return () => {
                navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
                clearInterval(intervalId);
                clearInterval(daemonPollInterval);
            };
        }

        return () => {
            clearInterval(daemonPollInterval);
        };
    }, []);

    const handleRegisterSW = async () => {
        setIsRefreshingSW(true);
        const reg = await registerServiceWorker();
        if (reg) {
            await checkSWStatus();
            await showLocalPushNotification('Service Worker Registrado', 'Se ha registrado y activado el Service Worker de SAMI.');
        } else {
            alert('No se pudo registrar el Service Worker.');
        }
        setIsRefreshingSW(false);
    };

    const handleUnregisterSW = async () => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
        setIsRefreshingSW(true);
        try {
            const regs = await navigator.serviceWorker.getRegistrations();
            let count = 0;
            for (const reg of regs) {
                await reg.unregister();
                count++;
            }
            alert(`Se desregistraron ${count} Service Workers de SAMI con éxito.`);
            await checkSWStatus();
        } catch (err) {
            console.error('[SAMI] Error unregistering service worker:', err);
            alert('Error al desregistrar el Service Worker.');
        }
        setIsRefreshingSW(false);
    };

    const handlePostMessageTest = async () => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
        try {
            const regs = await navigator.serviceWorker.getRegistrations();
            if (regs.length > 0 && regs[0].active) {
                const messageData = {
                    type: 'SHOW_NOTIFICATION',
                    title: '📡 Mensaje Directo SW',
                    body: 'Esta notificación fue disparada enviando un mensaje directo (postMessage) del hilo principal al Service Worker de SAMI.'
                };
                regs[0].active.postMessage(messageData);
                setCommLogs(prev => [
                    {
                        id: Math.random().toString(),
                        time: new Date().toLocaleTimeString(),
                        direction: 'out',
                        message: `Enviado SHOW_NOTIFICATION básico: "${messageData.title}"`,
                        raw: JSON.stringify(messageData)
                    },
                    ...prev
                ]);
            } else {
                alert('No hay un Service Worker activo al cual enviarle mensajes. Por favor, regístralo primero.');
            }
        } catch (err) {
            console.error('[SAMI] Error posting message:', err);
            alert('No se pudo enviar el mensaje directo al Service Worker.');
        }
    };

    const handleSendCustomMessage = async () => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
        try {
            const regs = await navigator.serviceWorker.getRegistrations();
            if (regs.length > 0 && regs[0].active) {
                const messageData = {
                    type: 'SHOW_NOTIFICATION',
                    title: testTitle || 'Mensaje de Pruebas',
                    body: testBody || 'Cuerpo del mensaje'
                };
                
                regs[0].active.postMessage(messageData);
                
                setCommLogs(prev => [
                    {
                        id: Math.random().toString(),
                        time: new Date().toLocaleTimeString(),
                        direction: 'out',
                        message: `Enviado SHOW_NOTIFICATION personalizado: "${messageData.title}"`,
                        raw: JSON.stringify(messageData)
                    },
                    ...prev
                ]);
            } else {
                alert('No hay un Service Worker activo al cual enviarle mensajes. Por favor, regístralo primero.');
            }
        } catch (err) {
            console.error('[SAMI] Error sending custom message:', err);
            alert('No se pudo enviar el mensaje.');
        }
    };

    const handleSendPing = async () => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
        try {
            const regs = await navigator.serviceWorker.getRegistrations();
            if (regs.length > 0 && regs[0].active) {
                const messageData = {
                    type: 'PING',
                    payload: pingPayload || 'CHECK'
                };
                
                regs[0].active.postMessage(messageData);
                
                setCommLogs(prev => [
                    {
                        id: Math.random().toString(),
                        time: new Date().toLocaleTimeString(),
                        direction: 'out',
                        message: `Enviado PING al Service Worker`,
                        raw: JSON.stringify(messageData)
                    },
                    ...prev
                ]);
            } else {
                alert('No hay un Service Worker activo al cual enviarle mensajes. Por favor, regístralo primero.');
            }
        } catch (err) {
            console.error('[SAMI] Error sending ping message:', err);
            alert('No se pudo enviar el PING.');
        }
    };

    const handleClearLogs = () => {
        setCommLogs([]);
    };

    const handleDenyPermissionPersistently = async () => {
        setPersistentPermissionPreference('denied');
        setPersistentPref('denied');
        try {
            await unsubscribeUserFromPush(userId);
            await fetchBackendSubscribers();
        } catch (err) {
            console.error('[SAMI] Error during unsubscription wire-up:', err);
        }
        alert('Has marcado las notificaciones como DENEGADAS persistentemente. No se enviarán avisos a tu pantalla.');
    };

    const handleAllowPermissionPersistently = async () => {
        setPersistentPermissionPreference('granted');
        setPersistentPref('granted');
        
        const result = await requestNotificationPermission();
        setPermissionStatus(result);
        
        if (result === 'granted') {
            try {
                const subSuccess = await subscribeUserToPush(userId);
                if (subSuccess) {
                    await fetchBackendSubscribers();
                    showLocalPushNotification('SAMI Persistente', 'Dispositivo enlazado con éxito. Las alertas push de servidor se despacharán de forma directa.');
                } else {
                    showLocalPushNotification('SAMI Persistente', 'Permiso concedido localmente. No se pudo registrar en la base de datos del servidor por ahora.');
                }
            } catch (err) {
                console.error('[SAMI] VAPID subscribe error:', err);
            }
        } else if (result === 'denied') {
            alert('Has habilitado la preferencia, pero el navegador tiene bloqueadas las notificaciones para esta web. Habilítalas en el icono del candado.');
        }
    };

    const handleTestNotification = async () => {
        setIsTesting(true);
        await showLocalPushNotification(
            '🔔 Alerta de Prueba SAMI', 
            'Excelente: El Service Worker está configurado y respondiendo correctamente a las alertas push.'
        );
        setTimeout(() => setIsTesting(false), 1000);
    };

    const handleTriggerServerPush = async () => {
        setIsDispatchingServerPush(true);
        try {
            const res = await fetch('/api/v1/notifications/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    title: '🔔 Alerta Remota del Servidor (VAPID)',
                    body: 'Esta notificación fue disparada desde el servidor utilizando tokens de suscripción e interceptada por tu Service Worker.',
                    tag: 'sami-remote-dispatch'
                })
            });
            const result = await res.json();
            if (result.success && result.dispatched > 0) {
                alert(`¡Éxito! Notificación enviada. Se despachó a ${result.dispatched} dispositivo(s) activo(s).`);
                await fetchBackendSubscribers();
            } else {
                alert(`No se pudo enviar la notificación remota: ${result.message || 'Ningún suscriptor enlazado con el servidor para este usuario por ahora.'}`);
            }
        } catch (err) {
            console.error('[SAMI] Error triggering server push:', err);
            alert('Error enviando la notificación remota.');
        } finally {
            setIsDispatchingServerPush(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in text-left max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-650">
                    <Wrench size={24} />
                </div>
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Consola de Integración Tecnológica (SW & Daemon)</h2>
                    <p className="text-xs text-slate-400 font-medium">Inspecciona, depura y diagnostica la mensajería asíncrona bidireccional, VAPID de servidor y demonios de background de SAMI.</p>
                </div>
            </div>

            {/* Service Worker Auto-Pilot Status Widget */}
            <div id="sw-status-autopilot-card-tech" className={`p-5 rounded-2xl border transition-all ${
                isControlled 
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30' 
                    : swStatus === 'error' || swStatus === 'not_supported'
                    ? 'bg-rose-50/45 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/30'
                    : 'bg-amber-50/40 dark:bg-amber-950/10 border-amber-150 dark:border-amber-900/30'
            } space-y-4`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-xl shrink-0 ${
                            isControlled 
                                ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' 
                                : swStatus === 'error' || swStatus === 'not_supported'
                                ? 'bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
                                : 'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                        }`}>
                            <Cpu size={24} className={swStatus === 'installing' || isRefreshingSW ? "animate-spin" : ""} />
                        </div>
                        <div className="space-y-1 block text-left">
                            <h3 className="font-bold text-gray-800 dark:text-white text-base flex flex-wrap items-center gap-2">
                                Estado del Service Worker (Motor SAMI)
                                <span className={`text-[10px] uppercase px-2 py-0.5 rounded font-black tracking-wider ${
                                    isControlled 
                                        ? 'bg-emerald-500 text-white animate-pulse' 
                                        : swStatus === 'error' || swStatus === 'not_supported'
                                        ? 'bg-rose-500 text-white'
                                        : 'bg-amber-500 text-slate-900'
                                }`}>
                                    {isControlled ? 'Controlando Pestaña' : 'Sin Controlador Activo'}
                                </span>
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed md:max-w-xl">
                                El Service Worker de SAMI permite interceptar avisos push y mantener la integridad del hilo de notificaciones con la central de alertas.
                            </p>
                        </div>
                    </div>

                    {!isControlled && swStatus !== 'not_supported' && (
                        <button
                            id="btn-register-sw-autopilot-tech"
                            type="button"
                            onClick={handleRegisterSW}
                            disabled={isRefreshingSW}
                            className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all focus:outline-none flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                                swStatus === 'error' || swStatus === 'not_supported'
                                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                : 'bg-amber-600 hover:bg-amber-700 text-white'
                            }`}
                        >
                            <RefreshCw size={12} className={isRefreshingSW ? "animate-spin" : ""} />
                            {isRefreshingSW ? 'Registrando...' : 'Registrar Service Worker'}
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200/50 dark:border-gray-700/50 text-xs text-gray-600 dark:text-gray-300 text-left">
                    <div className="flex items-center gap-2 bg-white/50 dark:bg-gray-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-gray-700/30">
                        <span className="font-bold text-[10px] uppercase text-gray-400 dark:text-gray-500 font-mono">Instalación:</span>
                        {swStatus === 'active' || swStatus === 'registered' || swStatus === 'waiting' ? (
                            <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle size={12} /> Instalado
                            </span>
                        ) : swStatus === 'checking' ? (
                            <span className="text-gray-400 animate-pulse font-bold">Verificando...</span>
                        ) : swStatus === 'installing' ? (
                            <span className="text-indigo-505 font-bold animate-pulse">Instalando...</span>
                        ) : swStatus === 'error' ? (
                            <span className="flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400">
                                <ShieldAlert size={12} /> Fallando (Error)
                            </span>
                        ) : (
                            <span className="text-amber-500 font-bold">No Instalado</span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 bg-white/50 dark:bg-gray-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-gray-700/30">
                        <span className="font-bold text-[10px] uppercase text-gray-400 dark:text-gray-500 font-mono">Controlador:</span>
                        {isControlled ? (
                            <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                                <Radio size={12} className="animate-pulse" /> Activo (navigator.controller)
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 font-bold text-amber-500">
                                <ShieldAlert size={12} /> Desconectado
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 bg-white/50 dark:bg-gray-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-gray-700/30 overflow-hidden">
                        <span className="font-bold text-[10px] uppercase text-gray-400 dark:text-gray-500 font-mono shrink-0">Scope:</span>
                        <span className="font-mono text-gray-500 dark:text-gray-400 truncate select-all">{swScope || '/'}</span>
                    </div>
                </div>
            </div>

            {/* Browser Push Persistent Configuration Card */}
            <div className="p-5 bg-slate-50 dark:bg-gray-750/30 rounded-2xl border border-slate-150 dark:border-gray-800 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 text-left">
                        <h3 className="font-bold text-gray-800 dark:text-white text-base flex items-center gap-2">
                            <Smartphone size={18} className="text-indigo-600 dark:text-indigo-400" />
                            Soporte Push & Permisos del Navegador
                        </h3>
                        <p className="text-xs text-slate-400">
                            Establece permisos de forma persistente para recibir alertas rápidas usando el Service Worker de SAMI.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {permissionStatus === 'granted' && (
                            <button
                                type="button"
                                onClick={handleTestNotification}
                                disabled={isTesting}
                                className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-gray-800 text-gray-750 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors border border-gray-200 dark:border-gray-700 cursor-pointer"
                            >
                                {isTesting ? 'Enviando...' : 'Probar Alerta'}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleAllowPermissionPersistently}
                            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                persistentPref === 'granted' && permissionStatus === 'granted'
                                    ? 'bg-emerald-100 dark:bg-emerald-950/45 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                    : 'bg-white dark:bg-gray-800 text-gray-705 dark:text-gray-300 border border-gray-200 dark:border-gray-705 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                        >
                            Permitir persistentemente
                        </button>
                        <button
                            type="button"
                            onClick={handleDenyPermissionPersistently}
                            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                persistentPref === 'denied'
                                    ? 'bg-rose-100 dark:bg-rose-950/45 text-rose-800 dark:text-rose-450 border border-rose-200 dark:border-rose-800'
                                    : 'bg-white dark:bg-gray-800 text-gray-705 dark:text-gray-300 border border-gray-200 dark:border-gray-705 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                        >
                            Denegar persistentemente
                        </button>
                    </div>
                </div>

                <div className="pt-3 border-t border-slate-200/60 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <span className="font-semibold text-[11px] uppercase tracking-wider text-gray-450">Permiso Navegador:</span>
                        {permissionStatus === 'granted' ? (
                            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white rounded">AUTORIZADO</span>
                        ) : permissionStatus === 'denied' ? (
                            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white rounded">BLOQUEADO</span>
                        ) : (
                            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-900 rounded">PENDIENTE</span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <span className="font-semibold text-[11px] uppercase tracking-wider text-gray-450">Preferencia SAMI:</span>
                        {persistentPref === 'granted' ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Permitido persistentemente</span>
                        ) : persistentPref === 'denied' ? (
                            <span className="text-rose-600 dark:text-rose-450 font-bold">Denegado persistentemente</span>
                        ) : (
                            <span className="text-gray-500 dark:text-gray-400 font-bold">Por solicitar</span>
                        )}
                    </div>
                </div>

                {permissionStatus === 'denied' && (
                    <div className="flex gap-2 items-start bg-rose-50 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30 text-xs text-rose-700 dark:text-rose-400 animate-in fade-in slide-in-from-top-1">
                        <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                        <div>
                            <span className="font-bold">Acceso Bloqueado:</span> El navegador tiene desactivadas las notificaciones para SAMI. Para activarlas, Haz clic en el icono del candado 🔒 al costado de la URL y activa las "Notificaciones".
                        </div>
                    </div>
                )}
            </div>

            {/* postMessage Interactive Communication Debug Sandbox */}
            <div className="p-5 bg-slate-50 dark:bg-gray-750/30 rounded-2xl border border-dashed border-indigo-250 dark:border-gray-800 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 text-left">
                        <h3 className="font-bold text-gray-800 dark:text-white text-base flex items-center gap-2">
                            <Radio size={18} className="text-indigo-650 dark:text-indigo-400 animate-pulse" />
                            Consola de Comunicación Directa (postMessage)
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Prueba y valida la mensajería entre la ventana actual y el Service Worker. Envía eventos y observa confirmaciones bidireccionales en tiempo real.
                        </p>
                    </div>
                </div>

                {swStatus !== 'active' ? (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-xs text-amber-850 dark:text-amber-400 rounded-xl border border-amber-200/50 flex gap-2 items-center">
                        <Info size={16} />
                        <span>El Service Worker no está actualmente <strong>ACTIVO</strong>. Por favor regístralo arriba antes de realizar pruebas de mensajería asíncrona.</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <div className="space-y-3.5 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-150/85 dark:border-gray-800 flex flex-col justify-between">
                            <h4 className="text-xs font-bold text-indigo-750 dark:text-indigo-400 uppercase tracking-wider border-b border-slate-100 dark:border-gray-800 pb-2">Despacho de Eventos</h4>
                            
                            <div className="space-y-2 border border-slate-100 dark:border-gray-800 p-3 rounded-lg bg-slate-50/40 dark:bg-slate-950/30 pb-3">
                                <span className="block text-[11px] font-bold text-gray-400 uppercase">Mensaje de Notificación</span>
                                <div className="space-y-2">
                                    <div>
                                        <label className="block text-[10px] text-gray-550 font-bold mb-0.5">Título del Mensaje:</label>
                                        <input 
                                            type="text" 
                                            value={testTitle} 
                                            onChange={(e) => setTestTitle(e.target.value)}
                                            placeholder="Título del Push..."
                                            className="w-full text-xs p-2 rounded border border-gray-250 dark:border-gray-700 dark:bg-gray-800 text-gray-800 dark:text-white font-semibold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-550 font-bold mb-0.5">Cuerpo del Mensaje:</label>
                                        <textarea
                                            value={testBody} 
                                            onChange={(e) => setTestBody(e.target.value)}
                                            placeholder="Cuerpo de la Alerta..."
                                            rows={2}
                                            className="w-full text-xs p-2 rounded border border-gray-250 dark:border-gray-700 dark:bg-gray-800 text-gray-800 dark:text-white"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSendCustomMessage}
                                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors mt-2 cursor-pointer"
                                >
                                    <Send size={12} />
                                    Enviar SHOW_NOTIFICATION
                                </button>
                            </div>

                            <div className="space-y-2 border border-slate-100 dark:border-gray-800 p-3 rounded-lg bg-slate-50/40 dark:bg-slate-950/30">
                                <span className="block text-[11px] font-bold text-gray-400 uppercase">Verificación de Integridad</span>
                                <div className="flex gap-2 items-end">
                                    <div className="flex-grow text-left">
                                        <label className="block text-[10px] text-gray-550 font-bold mb-0.5 font-mono">Payload de Prueba (Ping):</label>
                                        <input 
                                            type="text" 
                                            value={pingPayload} 
                                            onChange={(e) => setPingPayload(e.target.value)}
                                            placeholder="Carga de seguridad..."
                                            className="w-full text-xs p-2 rounded border border-gray-250 dark:border-gray-700 dark:bg-gray-800 text-gray-800 dark:text-white font-mono"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleSendPing}
                                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-lg transition-colors cursor-pointer self-end h-[34px]"
                                    >
                                        PING
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3.5 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-150/85 dark:border-gray-800 flex flex-col h-[344px] text-left">
                            <div className="flex justify-between items-center border-b border-slate-100 dark:border-gray-800 pb-2">
                                <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping"></span>
                                    Log de Mensajería Bidireccional
                                </h4>
                                {commLogs.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleClearLogs}
                                        className="text-[10px] uppercase font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400"
                                    >
                                        Limpiar Consola
                                    </button>
                                )}
                            </div>

                            <div className="flex-grow overflow-y-auto space-y-2.5 pr-1 font-mono text-[10px] leading-tight custom-scrollbar">
                                {commLogs.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-2 select-none">
                                        <Database size={24} className="opacity-40 animate-pulse text-indigo-500" />
                                        <p>Ningún evento registrado aún.<br />Interactúa a la izquierda para despachar eventos.</p>
                                    </div>
                                ) : (
                                    commLogs.map((log) => (
                                        <div 
                                            key={log.id} 
                                            className={`p-2 rounded-lg border text-xs ${
                                                log.direction === 'out' 
                                                    ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-100/40 dark:border-blue-900/20 text-blue-800 dark:text-blue-300' 
                                                    : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100/40 dark:border-emerald-900/20 text-emerald-800 dark:text-emerald-300'
                                            }`}
                                        >
                                            <div className="flex justify-between items-center mb-1 text-[9px] opacity-70 font-bold">
                                                <span>{log.direction === 'out' ? '🚀 CLIENTE ➔ WORKER' : '📥 WORKER ➔ CLIENTE (RESPUESTA)'}</span>
                                                <span>{log.time}</span>
                                            </div>
                                            <p className="font-semibold text-slate-800 dark:text-slate-100 mb-1 leading-normal">{log.message}</p>
                                            <details className="mt-1">
                                                <summary className="cursor-pointer text-[8px] font-bold text-gray-400 uppercase select-none">Ver JSON Raw</summary>
                                                <pre className="mt-1 p-1.5 bg-gray-950 text-[9px] text-emerald-450 dark:text-emerald-400 rounded overflow-x-auto whitespace-pre-wrap max-h-24 leading-normal select-text">
                                                    {log.raw}
                                                </pre>
                                            </details>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* VAPID & Server-Side Push Subscription Dashboard */}
            <div className="p-5 bg-gradient-to-br from-indigo-50/50 to-blue-50/30 dark:from-indigo-950/10 dark:to-blue-950/5 rounded-2xl border border-indigo-100 dark:border-gray-800 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 text-left">
                        <h3 className="font-bold text-indigo-900 dark:text-indigo-300 text-base flex items-center gap-2">
                            <Cpu size={18} className="text-indigo-600 dark:text-indigo-400" />
                            Servidor Push SAMI (VAPID Keys & Push Dispatcher)
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            Gestión y despacho de notificaciones automáticas directamente desde el servidor backend Express utilizando tokens de suscripción VAPID reales.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleRefreshAllDaemonMetrics}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-indigo-700 dark:text-indigo-400 bg-white dark:bg-gray-800 rounded-lg border border-indigo-100 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        >
                            <RefreshCw size={12} className={isRefreshingDaemon ? "animate-spin" : "animate-pulse"} />
                            Refrescar Servidor
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-left">
                    <div className="lg:col-span-12 space-y-4">
                        <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-150/85 dark:border-gray-800">
                            <div className="flex justify-between items-center border-b border-slate-100 dark:border-gray-800 pb-2">
                                <h3 className="text-xs font-bold text-indigo-750 dark:text-indigo-400 uppercase tracking-wider">Claves de Servidor (VAPID)</h3>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[8px] uppercase px-1.5 py-0.5 font-bold tracking-wider rounded ${
                                        vapidPersistence === 'file' 
                                            ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-200/20' 
                                            : 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-400 border border-blue-200/20'
                                    }`}>
                                        Almacén: {vapidPersistence.toUpperCase()}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleRegenerateVapidKeys}
                                        disabled={isRegeneratingVapid}
                                        className="px-2 py-0.5 text-[8px] font-black tracking-widest uppercase bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 rounded-md border border-rose-200/30 dark:border-rose-900/60 transition-colors cursor-pointer"
                                    >
                                        {isRegeneratingVapid ? 'Regenerando...' : 'Regenerar Llaves'}
                                    </button>
                                </div>
                            </div>
                            
                            <div className="space-y-1.5">
                                <label className="block text-[9px] font-bold text-gray-400 font-mono uppercase">Key Pública Activa (VAPID Subject Base-64):</label>
                                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[9px] text-indigo-400 select-all overflow-x-auto break-all font-semibold leading-relaxed">
                                    {serverVapidKey || 'No disponible o error al recuperar llave del servidor.'}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleTriggerServerPush}
                                disabled={isDispatchingServerPush}
                                className="w-full flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-md shadow-indigo-650/15 cursor-pointer hover:shadow-indigo-650/25 active:scale-98 disabled:opacity-50 mt-1"
                            >
                                <Radio size={13} className={isDispatchingServerPush ? "animate-ping" : ""} />
                                {isDispatchingServerPush ? 'Despachando...' : 'Forzar Alerta Remota desde Servidor (VAPID Push Dispatch)'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-1 text-left">
                    <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider border-b border-indigo-50 dark:border-gray-800 pb-2">Navegadores Suscritos en Servidor (Active Registries)</h4>
                    <div className="mt-3 overflow-x-auto rounded-xl border border-slate-150 dark:border-gray-800 bg-white dark:bg-slate-900 max-h-48 overflow-y-auto font-mono text-[10px]">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-950 p-2 text-gray-400 uppercase font-black tracking-wider text-[8px] border-b border-slate-100 dark:border-gray-800">
                                    <th className="p-2.5">User ID</th>
                                    <th className="p-2.5">Dispositivo / Agente</th>
                                    <th className="p-2.5">Endpoint Registrado (Omitido)</th>
                                    <th className="p-2.5">Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {backendSubscribers.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-6 text-center text-gray-400 italic">
                                            Ningún navegador registrado para push en la base de datos de servidor actual.
                                        </td>
                                    </tr>
                                ) : (
                                    backendSubscribers.map((sub, i) => (
                                        <tr key={i} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/55 dark:hover:bg-slate-950/20 font-medium">
                                            <td className="p-2.5 font-extrabold text-indigo-650">{sub.userId}</td>
                                            <td className="p-2.5 text-gray-650 dark:text-gray-300 truncate max-w-xs" title={sub.device}>{sub.device}</td>
                                            <td className="p-2.5 text-gray-400 select-all truncate max-w-xs">{sub.endpoint}</td>
                                            <td className="p-2.5 text-gray-500 font-mono text-[9px]">{sub.subscribedAt}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Background Daemon Metrics Simulator Section */}
            <div className="p-5 bg-gradient-to-br from-indigo-50/50 to-blue-50/30 dark:from-indigo-950/10 dark:to-blue-950/5 rounded-2xl border border-indigo-100 dark:border-gray-800 space-y-4 text-left">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 block text-left">
                        <h3 className="font-bold text-indigo-900 dark:text-indigo-300 text-base flex items-center gap-2">
                            <Activity size={18} className="text-emerald-500 animate-pulse" />
                            Demonio de Tráfico & Control Simulado (Daemon Ledger Scan)
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Audita las métricas de monitoreo de gastos inusuales y desencadena simulaciones de picos financieros para testear alertas tempranas de riesgo.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    <div className="lg:col-span-5 space-y-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-150/85 dark:border-gray-800">
                        <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-indigo-50 dark:border-gray-800 pb-2">Simulador para Demostraciones</h4>
                        <p className="text-[11px] text-gray-400 leading-normal">Provoca anomalías de compra ficticias para alertar al Service Worker mediante postMessage o Websocket de manera inmediata:</p>
                        
                        <div className="space-y-3 pt-2">
                            <button
                                type="button"
                                onClick={() => handleSimulateSpike(8500)}
                                disabled={isSimulatingSpike}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors font-bold cursor-pointer disabled:opacity-50"
                            >
                                <Radio size={12} className={isSimulatingSpike ? "animate-ping" : ""} />
                                Simular Compra de S/ 8,500 (Anomalía Crítica!)
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSimulateSpike(450)}
                                disabled={isSimulatingSpike}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-emerald-650 hover:bg-emerald-700 text-white rounded-lg transition-colors font-bold cursor-pointer disabled:opacity-50"
                            >
                                Simular Compra de S/ 450 (Normal)
                            </button>
                        </div>

                        {daemonStatus && (
                            <div className="mt-3.5 space-y-2 border-t border-slate-100 dark:border-gray-800 pt-3 text-[11px]">
                                <span className="block text-[8px] font-black uppercase text-gray-400 font-mono tracking-wider">Métricas Activas del Demonio:</span>
                                <div className="grid grid-cols-2 gap-2 text-gray-500 dark:text-gray-300 font-medium">
                                    <div>Runs completados: <strong className="text-gray-700 dark:text-white">{daemonStatus.runsCompleted}</strong></div>
                                    <div>Monitoreados: <strong className="text-gray-700 dark:text-white">{daemonStatus.totalPurchasesTracked}</strong></div>
                                    <div>Anomalías: <strong className="text-rose-600 dark:text-rose-400">{daemonStatus.totalAnomaliesDetected}</strong></div>
                                    <div>Estado daemon: <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">{daemonStatus.daemonActive ? 'LIVE' : 'IDLE'}</strong></div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-7 space-y-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-150/85 dark:border-gray-800 flex flex-col justify-between">
                        <div className="w-full text-left">
                            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-indigo-50 dark:border-gray-800 pb-2 text-left">Base de Datos de Historial</h4>
                            
                            {purchasesDB.length === 0 ? (
                                <p className="text-2xs text-gray-400 italic p-6 text-center select-none">No hay transacciones registradas en el ledger de auditoría por ahora.</p>
                            ) : (
                                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1 text-[11px] custom-scrollbar">
                                    {purchasesDB.map((purchase: any) => (
                                        <div 
                                            key={purchase.id} 
                                            className={`p-2.5 rounded-lg border flex justify-between items-center ${
                                                purchase.anomalyDetected 
                                                    ? 'bg-rose-50/70 dark:bg-rose-950/10 border-rose-200/60 dark:border-rose-900/40 text-rose-900 dark:text-rose-300 font-semibold animate-pulse' 
                                                    : 'bg-slate-50 dark:bg-slate-950/40 border-slate-150/50 dark:border-gray-800'
                                            }`}
                                        >
                                            <div className="space-y-0.5 max-w-[65%] text-left">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-gray-700 dark:text-gray-300">{purchase.series}-{purchase.correlative}</span>
                                                    {purchase.anomalyDetected ? (
                                                        <span className="text-[8px] uppercase px-1.5 py-0.5 font-black tracking-widest bg-rose-500 text-white rounded">ANOMALÍA</span>
                                                    ) : purchase.analyzed ? (
                                                        <span className="text-[8px] uppercase px-1 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-400 rounded font-bold">NORMAL</span>
                                                    ) : (
                                                        <span className="text-[8px] uppercase px-1 bg-amber-100 text-amber-800 rounded font-bold">PENDIENTE</span>
                                                    )}
                                                </div>
                                                <p className="text-gray-500 dark:text-gray-400">Fecha: {purchase.issueDate} | RUC: {purchase.ruc || 'Boleta General'}</p>
                                                {purchase.calculatedAverage && (
                                                    <p className="text-gray-550 dark:text-gray-500">
                                                        Promedio Histórico: S/ {purchase.calculatedAverage.toLocaleString('es-PE')} 
                                                        {purchase.anomalyDetected && ` (Superado x${(purchase.totalAmount/purchase.calculatedAverage).toFixed(1)})`}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className={`text-sm font-black tracking-tight ${purchase.anomalyDetected ? "text-rose-600 dark:text-rose-400 font-black" : "text-slate-800 dark:text-slate-200"}`}>
                                                    S/ {purchase.totalAmount.toLocaleString('es-PE')}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default TechnicalConsole;
