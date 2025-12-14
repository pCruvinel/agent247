import {
    EvolutionAction,
    EvolutionManagerRequest,
    EvolutionManagerResponse,
} from '@/types';

// Re-export types for backwards compatibility
export type { EvolutionAction, EvolutionManagerRequest, EvolutionManagerResponse };

/** Deprecated: Use EvolutionManagerRequest instead */
export type EvolutionRequest = EvolutionManagerRequest;
/** Deprecated: Use EvolutionManagerResponse instead */
export type EvolutionResponse = EvolutionManagerResponse;

/**
 * Classe de erro customizada para erros do Evolution Manager
 */
export class EvolutionError extends Error {
    public code: string;
    public statusCode?: number;

    constructor(message: string, code: string = 'UNKNOWN_ERROR', statusCode?: number) {
        super(message);
        this.name = 'EvolutionError';
        this.code = code;
        this.statusCode = statusCode;
    }
}

/**
 * Valida se a URL do manager está configurada
 */
function validateManagerUrl(url: string | undefined): asserts url is string {
    if (!url || url.trim() === '') {
        throw new EvolutionError(
            'URL do Evolution Manager não configurada. Verifique NEXT_PUBLIC_N8N_MANAGER_URL.',
            'CONFIG_ERROR'
        );
    }
}

/**
 * Valida o payload da requisição
 */
function validatePayload(payload: EvolutionManagerRequest): void {
    if (!payload.user_id || payload.user_id.trim() === '') {
        throw new EvolutionError('user_id é obrigatório', 'INVALID_PAYLOAD');
    }

    if (!payload.acao) {
        throw new EvolutionError('ação é obrigatória', 'INVALID_PAYLOAD');
    }

    const validActions: EvolutionAction[] = ['criar', 'conectar', 'reconectar', 'deletar', 'status'];
    if (!validActions.includes(payload.acao)) {
        throw new EvolutionError(
            `Ação inválida: ${payload.acao}. Ações válidas: ${validActions.join(', ')}`,
            'INVALID_ACTION'
        );
    }
}

/**
 * Processa a resposta da API e trata erros
 */
async function processResponse(response: Response): Promise<EvolutionManagerResponse> {
    const responseText = await response.text();

    // Tenta parsear o JSON
    let data: EvolutionManagerResponse;
    try {
        data = JSON.parse(responseText);
    } catch {
        // Se não é JSON válido, cria um objeto de erro
        if (!response.ok) {
            throw new EvolutionError(
                `Erro ${response.status}: ${responseText.slice(0, 200)}`,
                'API_ERROR',
                response.status
            );
        }
        throw new EvolutionError(
            'Resposta inválida do servidor (não é JSON)',
            'INVALID_RESPONSE'
        );
    }

    // Verifica se a resposta indica erro
    if (!response.ok) {
        throw new EvolutionError(
            data.message || `Erro ${response.status}`,
            data.code || 'API_ERROR',
            response.status
        );
    }

    // Verifica se o success é false na resposta
    if (data.success === false) {
        throw new EvolutionError(
            data.message || 'Operação falhou',
            data.code || 'OPERATION_FAILED'
        );
    }

    return data;
}

/**
 * Envia requisição para o Evolution Manager (n8n)
 *
 * @param payload - Dados da requisição
 * @param managerUrl - URL do webhook n8n
 * @returns Promise com a resposta do manager
 * @throws EvolutionError em caso de falha
 *
 * @example
 * ```typescript
 * // Criar instância
 * const result = await evolutionManager(
 *   { user_id: 'uuid', acao: 'criar' },
 *   process.env.NEXT_PUBLIC_N8N_MANAGER_URL
 * );
 *
 * // Gerar novo QR Code
 * const result = await evolutionManager(
 *   { user_id: 'uuid', acao: 'conectar' },
 *   managerUrl
 * );
 * ```
 */
export async function evolutionManager(
    payload: EvolutionManagerRequest,
    managerUrl: string | undefined
): Promise<EvolutionManagerResponse> {
    // Validações
    validateManagerUrl(managerUrl);
    validatePayload(payload);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        const response = await fetch(managerUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return await processResponse(response);
    } catch (error: unknown) {
        // Erro de timeout
        if (error instanceof Error && error.name === 'AbortError') {
            throw new EvolutionError(
                'Timeout: O servidor demorou muito para responder',
                'TIMEOUT_ERROR'
            );
        }

        // Erro de rede
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new EvolutionError(
                'Erro de conexão. Verifique sua internet.',
                'NETWORK_ERROR'
            );
        }

        // Re-throw EvolutionError
        if (error instanceof EvolutionError) {
            throw error;
        }

        // Erro genérico
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        throw new EvolutionError(message, 'UNKNOWN_ERROR');
    }
}

/**
 * Funções helper para ações específicas
 */
export const evolutionActions = {
    /**
     * Cria uma nova instância e gera QR Code
     */
    async create(userId: string, managerUrl: string | undefined) {
        return evolutionManager({ user_id: userId, acao: 'criar' }, managerUrl);
    },

    /**
     * Gera novo QR Code para instância existente
     */
    async connect(userId: string, managerUrl: string | undefined) {
        return evolutionManager({ user_id: userId, acao: 'conectar' }, managerUrl);
    },

    /**
     * Reconecta instância desconectada
     */
    async reconnect(userId: string, managerUrl: string | undefined) {
        return evolutionManager({ user_id: userId, acao: 'reconectar' }, managerUrl);
    },

    /**
     * Desconecta/deleta instância
     */
    async disconnect(userId: string, instanceId: string, managerUrl: string | undefined) {
        return evolutionManager(
            { user_id: userId, acao: 'deletar', instance_id: instanceId },
            managerUrl
        );
    },

    /**
     * Verifica status da instância
     */
    async getStatus(userId: string, managerUrl: string | undefined) {
        return evolutionManager({ user_id: userId, acao: 'status' }, managerUrl);
    },
};
