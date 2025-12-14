'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
    QrCode,
    Wifi,
    WifiOff,
    RefreshCcw,
    Power,
    Smartphone,
    AlertCircle,
    CheckCircle2,
    Loader2,
    User,
    Phone,
} from 'lucide-react';
import { useEvolutionInstance } from '@/hooks/useEvolutionInstance';

// ============================================
// Sub-componentes
// ============================================

interface StatusBadgeProps {
    status: ReturnType<typeof useEvolutionInstance>['uiStatus'];
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const config = {
        sem_instancia: { label: 'Não configurado', variant: 'outline' as const, icon: WifiOff },
        aguardando_qr: { label: 'Aguardando QR', variant: 'outline' as const, icon: QrCode },
        conectando: { label: 'Conectando...', variant: 'outline' as const, icon: Loader2 },
        conectado: { label: 'Conectado', variant: 'default' as const, icon: CheckCircle2 },
        desconectado: { label: 'Desconectado', variant: 'destructive' as const, icon: WifiOff },
        erro: { label: 'Erro', variant: 'destructive' as const, icon: AlertCircle },
    };

    const { label, variant, icon: Icon } = config[status];
    const isAnimated = status === 'conectando';

    // Helper for specific status colors
    const getStatusColor = (s: string) => {
        switch (s) {
            case 'conectado': return 'bg-emerald-950/30 text-emerald-400 hover:bg-emerald-950/40 border-emerald-800/30';
            case 'aguardando_qr': return 'bg-blue-950/30 text-blue-400 hover:bg-blue-950/40 border-blue-800/30';
            case 'conectando': return 'bg-teal-950/30 text-teal-400 hover:bg-teal-950/40 border-teal-800/30';
            case 'sem_instancia': return 'bg-[#171717] text-neutral-400 hover:bg-[#262626] border-[#262626]';
            default: return '';
        }
    };

    return (
        <Badge
            variant={variant}
            className={`gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border shadow-sm transition-all ${getStatusColor(status)}`}
        >
            <Icon className={`h-3 w-3 ${isAnimated ? 'animate-spin' : ''}`} />
            {label}
        </Badge>
    );
};

interface QRCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    qrCode: string | null;
    pairingCode: string | null;
    isLoading: boolean;
    onRefresh: () => void;
    status: ReturnType<typeof useEvolutionInstance>['uiStatus'];
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({
    isOpen,
    onClose,
    qrCode,
    pairingCode,
    isLoading,
    onRefresh,
    status,
}) => {
    // Auto-fecha quando conectar
    useEffect(() => {
        if (status === 'conectado' && isOpen) {
            const timer = setTimeout(onClose, 1500);
            return () => clearTimeout(timer);
        }
    }, [status, isOpen, onClose]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-[#0d0d0d] border-[#262626] text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Smartphone className="h-5 w-5" />
                        Conectar WhatsApp
                    </DialogTitle>
                    <DialogDescription className="text-neutral-400">
                        {status === 'conectado' ? (
                            <span className="text-emerald-400 font-medium">
                                WhatsApp conectado com sucesso!
                            </span>
                        ) : (
                            <>
                                Abra o WhatsApp no celular &rarr; Ajustes &rarr; Aparelhos Conectados
                                &rarr; Conectar Aparelho
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center p-4 space-y-4">
                    {status === 'conectado' ? (
                        <div className="flex flex-col items-center gap-3 py-8">
                            <div className="h-20 w-20 bg-emerald-950/30 rounded-full flex items-center justify-center mb-2 border border-emerald-900/30">
                                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                            </div>
                            <p className="text-lg font-medium text-emerald-400">Conexão Estabelecida!</p>
                            <p className="text-sm text-neutral-400 text-center max-w-[250px]">
                                Sua instância está pronta para enviar e receber mensagens.
                            </p>
                        </div>
                    ) : qrCode ? (
                        <>
                            <div className="relative aspect-square w-64 overflow-hidden rounded-lg border-2 border-[#262626] bg-white shadow-sm">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={qrCode}
                                    alt="QR Code para conectar WhatsApp"
                                    className="h-full w-full object-contain p-2"
                                />
                            </div>

                            {pairingCode && (
                                <div className="text-center">
                                    <p className="text-xs text-neutral-400 mb-1">
                                        Ou use o código de pareamento:
                                    </p>
                                    <code className="px-3 py-1 bg-[#171717] rounded-md font-mono text-lg tracking-widest text-[#00FFA3] border border-[#262626]">
                                        {pairingCode}
                                    </code>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-4 py-8">
                            {isLoading ? (
                                <>
                                    <Skeleton className="h-64 w-64 rounded-lg bg-[#262626]" />
                                    <p className="text-sm text-neutral-400 animate-pulse">
                                        Gerando QR Code...
                                    </p>
                                </>
                            ) : (
                                <>
                                    <QrCode className="h-16 w-16 text-[#262626]" />
                                    <p className="text-sm text-neutral-400">
                                        Clique em &quot;Gerar QR Code&quot; para continuar
                                    </p>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    {status !== 'conectado' && (
                        <Button
                            variant="outline"
                            onClick={onRefresh}
                            disabled={isLoading}
                            className="w-full sm:w-auto"
                        >
                            <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                            {qrCode ? 'Novo QR Code' : 'Gerar QR Code'}
                        </Button>
                    )}
                    <Button
                        variant={status === 'conectado' ? 'default' : 'ghost'}
                        onClick={onClose}
                        className="w-full sm:w-auto"
                    >
                        {status === 'conectado' ? 'Concluído' : 'Fechar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

interface ConnectedInfoProps {
    phoneNumber: string | null;
    profileName: string | null;
    connectedAt: string | null;
}

const ConnectedInfo: React.FC<ConnectedInfoProps> = ({ phoneNumber, profileName, connectedAt }) => {
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return null;
        try {
            return new Date(dateStr).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return null;
        }
    };

    return (
        <div className="flex flex-col gap-2 p-5 bg-[#171717] rounded-xl border border-[#262626] shadow-sm">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-[#0d0d0d] flex items-center justify-center border border-[#262626]">
                    <User className="h-6 w-6 text-[#00FFA3]" />
                </div>
                <div>
                    <p className="font-medium text-white">{profileName || 'WhatsApp'}</p>
                    {phoneNumber && (
                        <p className="text-sm text-neutral-400 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {phoneNumber}
                        </p>
                    )}
                </div>
            </div>
            {connectedAt && (
                <p className="text-xs text-neutral-500">
                    Conectado desde {formatDate(connectedAt)}
                </p>
            )}
        </div>
    );
};

interface ErrorAlertProps {
    message: string;
    onDismiss: () => void;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ message, onDismiss }) => (
    <div className="flex items-start gap-3 p-4 bg-red-950/20 border border-red-900/30 rounded-lg">
        <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
            <p className="text-sm text-red-300">{message}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onDismiss} className="h-auto p-1 text-red-400 hover:text-red-300 hover:bg-red-900/20">
            &times;
        </Button>
    </div>
);

// ============================================
// Componente Principal
// ============================================

const ConnectionTab: React.FC = () => {
    const {
        instance,
        uiStatus,
        qrCode,
        pairingCode,
        isLoading,
        error,
        connectedNumber,
        profileName,
        actions,
    } = useEvolutionInstance();

    const [isQRModalOpen, setIsQRModalOpen] = useState(false);
    const [confirmDisconnect, setConfirmDisconnect] = useState(false);

    /**
     * Handler para criar instância
     */
    const handleCreate = useCallback(async () => {
        await actions.createInstance();
        setIsQRModalOpen(true);
    }, [actions]);

    /**
     * Handler para gerar QR Code
     */
    const handleRequestQR = useCallback(async () => {
        setIsQRModalOpen(true);
        await actions.requestQRCode();
    }, [actions]);

    /**
     * Handler para desconectar
     */
    const handleDisconnect = useCallback(async () => {
        setConfirmDisconnect(false);
        await actions.disconnect();
    }, [actions]);

    /**
     * Handler para refresh do QR no modal
     */
    const handleModalRefresh = useCallback(async () => {
        await actions.requestQRCode();
    }, [actions]);

    // Loading inicial
    if (isLoading && uiStatus === 'sem_instancia' && !instance) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-10 w-32" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Card principal */}
            <Card className="border-[#262626] shadow-sm rounded-xl overflow-hidden bg-[#0d0d0d]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 bg-[#0d0d0d] border-b border-[#262626] pt-6">
                    <CardTitle className="flex items-center gap-2 text-white">
                        <div className="p-2 bg-[#171717] rounded-lg border border-[#262626]">
                            <Wifi className="h-5 w-5 text-[#00FFA3]" />
                        </div>
                        Conexão WhatsApp
                    </CardTitle>
                    <StatusBadge status={uiStatus} />
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Alerta de erro */}
                    {error && <ErrorAlert message={error} onDismiss={actions.clearError} />}

                    {/* Conteúdo baseado no status */}
                    {uiStatus === 'sem_instancia' && (
                        <div className="text-center py-8 space-y-4">
                            <div className="mx-auto h-16 w-16 rounded-full bg-[#171717] flex items-center justify-center border border-[#262626]">
                                <Smartphone className="h-8 w-8 text-neutral-500" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white text-lg">
                                    Nenhuma instância configurada
                                </h3>
                                <p className="text-sm text-neutral-400 mt-2 max-w-md mx-auto">
                                    Crie uma instância para conectar seu WhatsApp e começar a usar as funcionalidades de automação.
                                </p>
                            </div>
                            <Button onClick={handleCreate} disabled={isLoading} size="lg" className="bg-[#00FFA3] hover:bg-[#00e692] text-[#0f172a] shadow-lg shadow-[#00FFA3]/10 transaction-all duration-200">
                                {isLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <QrCode className="mr-2 h-4 w-4" />
                                )}
                                Criar e Conectar WhatsApp
                            </Button>
                        </div>
                    )}

                    {uiStatus === 'conectado' && (
                        <div className="space-y-4">
                            <ConnectedInfo
                                phoneNumber={connectedNumber}
                                profileName={profileName}
                                connectedAt={instance?.conectado_em || null}
                            />

                            <div className="flex justify-between items-center pt-6 border-t border-[#262626]">
                                <p className="text-sm text-neutral-400 flex items-center gap-2">
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/75 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                    </span>
                                    O sistema está ativo e sincronizado.
                                </p>
                                <Button
                                    variant="ghost"
                                    onClick={() => setConfirmDisconnect(true)}
                                    disabled={isLoading}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-950/20"
                                >
                                    <Power className="mr-2 h-4 w-4" />
                                    Desconectar
                                </Button>
                            </div>
                        </div>
                    )}

                    {(uiStatus === 'aguardando_qr' ||
                        uiStatus === 'conectando' ||
                        uiStatus === 'desconectado') && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-[#171717] border border-[#262626] rounded-lg">
                                    <div>
                                        <h3 className="font-medium text-white">
                                            {uiStatus === 'desconectado'
                                                ? 'Instância desconectada'
                                                : 'Aguardando conexão'}
                                        </h3>
                                        <p className="text-sm text-neutral-400">
                                            {uiStatus === 'desconectado'
                                                ? 'Gere um novo QR Code para reconectar'
                                                : 'Escaneie o QR Code com seu WhatsApp'}
                                        </p>
                                    </div>
                                    <Button onClick={handleRequestQR} disabled={isLoading} className="bg-[#00FFA3] hover:bg-[#00e692] text-[#0f172a]">
                                        {isLoading ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <QrCode className="mr-2 h-4 w-4" />
                                        )}
                                        {qrCode ? 'Ver QR Code' : 'Gerar QR Code'}
                                    </Button>
                                </div>
                            </div>
                        )}

                    {uiStatus === 'erro' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                                <div>
                                    <h3 className="font-medium text-red-800">Erro na conexão</h3>
                                    <p className="text-sm text-red-600">
                                        {instance?.ultimo_erro || 'Ocorreu um erro inesperado'}
                                    </p>
                                </div>
                                <Button onClick={handleRequestQR} disabled={isLoading}>
                                    <RefreshCcw className="mr-2 h-4 w-4" />
                                    Tentar novamente
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Footer com refresh */}
                    <div className="flex items-center justify-between pt-4 border-t border-[#262626] text-sm text-neutral-500">
                        <span>
                            {instance?.updated_at &&
                                `Última atualização: ${new Date(instance.updated_at).toLocaleString(
                                    'pt-BR'
                                )}`}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={actions.refresh}
                            disabled={isLoading}
                            className="text-neutral-400 hover:text-white"
                        >
                            <RefreshCcw
                                className={`mr-1 h-3 w-3 ${isLoading ? 'animate-spin' : ''}`}
                            />
                            Atualizar
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Modal de QR Code */}
            <QRCodeModal
                isOpen={isQRModalOpen}
                onClose={() => setIsQRModalOpen(false)}
                qrCode={qrCode}
                pairingCode={pairingCode}
                isLoading={isLoading}
                onRefresh={handleModalRefresh}
                status={uiStatus}
            />

            {/* Dialog de confirmação de desconexão */}
            <Dialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="h-5 w-5" />
                            Confirmar desconexão
                        </DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja desconectar o WhatsApp? O bot será desativado e
                            você precisará escanear um novo QR Code para reconectar.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setConfirmDisconnect(false)}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={handleDisconnect} disabled={isLoading}>
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Power className="mr-2 h-4 w-4" />
                            )}
                            Sim, desconectar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ConnectionTab;
