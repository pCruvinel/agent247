'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { evolutionActions, EvolutionError } from '@/services/evolution-api';
import type { EvolutionInstance, UIConnectionStatus } from '@/types';

interface UseEvolutionInstanceReturn {
    /** Dados da instância do banco */
    instance: EvolutionInstance | null;
    /** Status visual para a UI */
    uiStatus: UIConnectionStatus;
    /** QR Code em base64 (se disponível) */
    qrCode: string | null;
    /** Código de pareamento (se disponível) */
    pairingCode: string | null;
    /** Indica se alguma operação está em andamento */
    isLoading: boolean;
    /** Mensagem de erro (se houver) */
    error: string | null;
    /** Código do erro (se houver) */
    errorCode: string | null;
    /** Número conectado formatado */
    connectedNumber: string | null;
    /** Nome do perfil WhatsApp */
    profileName: string | null;
    /** Ações disponíveis */
    actions: {
        /** Cria nova instância e gera QR Code */
        createInstance: () => Promise<void>;
        /** Gera novo QR Code para instância existente */
        requestQRCode: () => Promise<void>;
        /** Desconecta a instância */
        disconnect: () => Promise<void>;
        /** Reconecta instância desconectada */
        reconnect: () => Promise<void>;
        /** Limpa o erro atual */
        clearError: () => void;
        /** Recarrega dados do banco */
        refresh: () => Promise<void>;
    };
}

/**
 * Mapeia o estado do banco para o status visual da UI
 */
function mapToUIStatus(instance: EvolutionInstance | null): UIConnectionStatus {
    if (!instance) {
        return 'sem_instancia';
    }

    // Prioridade: estado de conexão real
    if (instance.estado_conexao === 'open') {
        return 'conectado';
    }

    if (instance.estado_conexao === 'connecting') {
        return 'conectando';
    }

    // Se tem QR code e não está conectado, está aguardando scan
    if (instance.qrcode_base64 && instance.estado_conexao === 'close') {
        return 'aguardando_qr';
    }

    // Verificar status do banco
    if (instance.status === 'erro' || instance.ultimo_erro) {
        return 'erro';
    }

    // Instância existe mas está desconectada
    return 'desconectado';
}

/**
 * Formata número de telefone para exibição
 */
function formatPhoneNumber(phone: string | null): string | null {
    if (!phone) return null;

    // Remove caracteres não numéricos
    const cleaned = phone.replace(/\D/g, '');

    // Formato brasileiro: +55 (XX) XXXXX-XXXX
    if (cleaned.length === 13 && cleaned.startsWith('55')) {
        const ddd = cleaned.slice(2, 4);
        const part1 = cleaned.slice(4, 9);
        const part2 = cleaned.slice(9);
        return `+55 (${ddd}) ${part1}-${part2}`;
    }

    // Formato genérico
    if (cleaned.length >= 10) {
        return `+${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
    }

    return phone;
}

/**
 * Hook para gerenciar instância do Evolution API
 *
 * Fornece:
 * - Estado da instância com atualização em tempo real
 * - Ações para criar, conectar e desconectar
 * - Tratamento de erros robusto
 * - Mapeamento automático de status para UI
 *
 * @example
 * ```tsx
 * const {
 *   instance,
 *   uiStatus,
 *   qrCode,
 *   isLoading,
 *   error,
 *   actions
 * } = useEvolutionInstance();
 *
 * if (uiStatus === 'sem_instancia') {
 *   return <button onClick={actions.createInstance}>Criar</button>;
 * }
 * ```
 */
export function useEvolutionInstance(): UseEvolutionInstanceReturn {
    const { user } = useAuth();
    const [instance, setInstance] = useState<EvolutionInstance | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorCode, setErrorCode] = useState<string | null>(null);
    const [initialLoadDone, setInitialLoadDone] = useState(false);

    // QR Code temporário da resposta do webhook (antes do Realtime atualizar)
    const [immediateQrCode, setImmediateQrCode] = useState<string | null>(null);

    // Ref para evitar chamadas duplicadas
    const isLoadingRef = useRef(false);

    const managerUrl = process.env.NEXT_PUBLIC_N8N_MANAGER_URL;

    /**
     * Busca instância do banco de dados
     */
    const fetchInstance = useCallback(async () => {
        if (!user?.id || !supabase || isLoadingRef.current) return;

        isLoadingRef.current = true;

        try {
            const { data, error: fetchError } = await supabase
                .from('evolution_instances')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (fetchError) {
                console.error('[useEvolutionInstance] Erro ao buscar instância:', fetchError);
                // Não mostrar erro se é apenas "não encontrado"
                if (fetchError.code !== 'PGRST116') {
                    setError('Erro ao carregar dados da instância');
                    setErrorCode('FETCH_ERROR');
                }
                return;
            }

            setInstance(data as EvolutionInstance | null);
            setError(null);
            setErrorCode(null);
        } catch (err) {
            console.error('[useEvolutionInstance] Erro inesperado:', err);
            setError('Erro inesperado ao carregar dados');
            setErrorCode('UNEXPECTED_ERROR');
        } finally {
            isLoadingRef.current = false;
            setInitialLoadDone(true);
        }
    }, [user?.id]);

    /**
     * Cria nova instância
     */
    const createInstance = useCallback(async () => {
        if (!user?.id) {
            setError('Usuário não autenticado');
            setErrorCode('AUTH_ERROR');
            return;
        }

        setIsLoading(true);
        setError(null);
        setErrorCode(null);

        try {
            const response = await evolutionActions.create(user.id, managerUrl);
            // Captura QR Code imediato da resposta (antes do Realtime)
            if (response.qr_code_base64) {
                setImmediateQrCode(response.qr_code_base64);
            }
        } catch (err) {
            if (err instanceof EvolutionError) {
                setError(err.message);
                setErrorCode(err.code);
            } else {
                setError('Erro ao criar instância');
                setErrorCode('CREATE_ERROR');
            }
            console.error('[useEvolutionInstance] Erro ao criar:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user?.id, managerUrl]);

    /**
     * Solicita novo QR Code
     */
    const requestQRCode = useCallback(async () => {
        if (!user?.id) {
            setError('Usuário não autenticado');
            setErrorCode('AUTH_ERROR');
            return;
        }

        setIsLoading(true);
        setError(null);
        setErrorCode(null);

        try {
            const response = await evolutionActions.connect(user.id, managerUrl);
            // Captura QR Code imediato da resposta
            if (response.qr_code_base64) {
                setImmediateQrCode(response.qr_code_base64);
            }
        } catch (err) {
            if (err instanceof EvolutionError) {
                setError(err.message);
                setErrorCode(err.code);
            } else {
                setError('Erro ao gerar QR Code');
                setErrorCode('QRCODE_ERROR');
            }
            console.error('[useEvolutionInstance] Erro ao gerar QR:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user?.id, managerUrl]);

    /**
     * Desconecta a instância
     */
    const disconnect = useCallback(async () => {
        if (!user?.id || !instance?.instance_name) {
            setError('Instância não encontrada');
            setErrorCode('NO_INSTANCE');
            return;
        }

        setIsLoading(true);
        setError(null);
        setErrorCode(null);

        try {
            await evolutionActions.disconnect(user.id, instance.instance_name, managerUrl);
        } catch (err) {
            if (err instanceof EvolutionError) {
                setError(err.message);
                setErrorCode(err.code);
            } else {
                setError('Erro ao desconectar');
                setErrorCode('DISCONNECT_ERROR');
            }
            console.error('[useEvolutionInstance] Erro ao desconectar:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user?.id, instance?.instance_name, managerUrl]);

    /**
     * Reconecta instância desconectada
     */
    const reconnect = useCallback(async () => {
        if (!user?.id) {
            setError('Usuário não autenticado');
            setErrorCode('AUTH_ERROR');
            return;
        }

        setIsLoading(true);
        setError(null);
        setErrorCode(null);

        try {
            const response = await evolutionActions.reconnect(user.id, managerUrl);
            // Captura QR Code imediato da resposta
            if (response.qr_code_base64) {
                setImmediateQrCode(response.qr_code_base64);
            }
        } catch (err) {
            if (err instanceof EvolutionError) {
                setError(err.message);
                setErrorCode(err.code);
            } else {
                setError('Erro ao reconectar');
                setErrorCode('RECONNECT_ERROR');
            }
            console.error('[useEvolutionInstance] Erro ao reconectar:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user?.id, managerUrl]);

    /**
     * Limpa erro atual
     */
    const clearError = useCallback(() => {
        setError(null);
        setErrorCode(null);
    }, []);

    /**
     * Load inicial e Realtime subscription
     */
    useEffect(() => {
        if (!user?.id || !supabase) return;

        // Busca inicial
        fetchInstance();

        // Configura Realtime
        const channel = supabase
            .channel(`evolution-instance-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'evolution_instances',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('[useEvolutionInstance] Realtime update:', payload.eventType);

                    if (payload.eventType === 'DELETE') {
                        setInstance(null);
                        setImmediateQrCode(null);
                    } else {
                        const newInstance = payload.new as EvolutionInstance;
                        setInstance(newInstance);

                        // Limpa QR imediato quando o banco tiver um QR ou conexão estabelecida
                        if (newInstance.qrcode_base64 || newInstance.estado_conexao === 'open') {
                            setImmediateQrCode(null);
                        }
                    }

                    // Limpa erro em caso de atualização bem-sucedida
                    setError(null);
                    setErrorCode(null);
                }
            )
            .subscribe((status) => {
                console.log('[useEvolutionInstance] Subscription status:', status);
            });

        return () => {
            supabase?.removeChannel(channel);
        };
    }, [user?.id, fetchInstance]);

    // Calcula valores derivados
    // Prioriza QR Code imediato da resposta do webhook
    const qrCode = immediateQrCode || instance?.qrcode_base64 || null;

    // Calcula UI status considerando QR Code imediato
    const uiStatus = qrCode && instance?.estado_conexao !== 'open'
        ? 'aguardando_qr'
        : mapToUIStatus(instance);
    const pairingCode = instance?.qrcode_pairing_code || null;
    const connectedNumber = formatPhoneNumber(instance?.numero_conectado || null);
    const profileName = instance?.nome_perfil || null;

    return {
        instance,
        uiStatus,
        qrCode,
        pairingCode,
        isLoading: isLoading || !initialLoadDone,
        error,
        errorCode,
        connectedNumber,
        profileName,
        actions: {
            createInstance,
            requestQRCode,
            disconnect,
            reconnect,
            clearError,
            refresh: fetchInstance,
        },
    };
}

export default useEvolutionInstance;
