export interface WebhookSettings {
    webhook_metrics_url: string;
    webhook_send_message_url: string;
    webhook_connect_instance_url: string;
    webhook_clear_history_url: string;
    google_api_key: string;
}

export interface Contact {
    id: string;
    name: string;
    phone: string;
    lastMessage: string;
    timestamp: string;
    unreadCount: number;
}

export interface ChatMessage {
    id: string;
    content: string;
    sender: 'user' | 'agent' | 'system';
    timestamp: string;
    status: 'sent' | 'delivered' | 'read';
}

// ============================================
// Evolution API / WhatsApp Instance Types
// ============================================

/** Status da instância no banco de dados */
export type InstanceStatus = 'criada' | 'conectando' | 'conectada' | 'desconectada' | 'erro' | 'deletada';

/** Estado de conexão do WhatsApp */
export type ConnectionState = 'open' | 'close' | 'connecting';

/** Ações disponíveis para o Evolution Manager */
export type EvolutionAction = 'criar' | 'conectar' | 'reconectar' | 'deletar' | 'status';

/** Instância do Evolution API armazenada no Supabase */
export interface EvolutionInstance {
    id: number;
    instance_name: string;
    instance_id: string | null;
    user_id: string;
    status: InstanceStatus;
    estado_conexao: ConnectionState;
    numero_conectado: string | null;
    nome_perfil: string | null;
    foto_perfil_url: string | null;
    qrcode_base64: string | null;
    qrcode_pairing_code: string | null;
    qrcode_gerado_em: string | null;
    qrcode_expira_em: string | null;
    webhook_url: string | null;
    ativo: boolean;
    conectado_em: string | null;
    desconectado_em: string | null;
    ultimo_erro: string | null;
    ultimo_erro_em: string | null;
    created_at: string;
    updated_at: string;
}

/** Estado visual da UI de conexão */
export type UIConnectionStatus =
    | 'sem_instancia'      // Nenhuma instância criada
    | 'aguardando_qr'      // QR Code disponível para scan
    | 'conectando'         // Usuário escaneando QR
    | 'conectado'          // WhatsApp conectado
    | 'desconectado'       // Instância existe mas desconectada
    | 'erro';              // Erro na conexão

/** Request para o Evolution Manager (n8n) */
export interface EvolutionManagerRequest {
    user_id: string;
    acao: EvolutionAction;
    instance_id?: string;
    webhook_url?: string;
}

/** Response do Evolution Manager (n8n) */
export interface EvolutionManagerResponse {
    success: boolean;
    message: string;
    instance_name?: string;
    qr_code_base64?: string;
    qr_code?: string;
    data?: {
        instance_name: string;
        phone_number?: string;
        action?: string;
        timestamp?: string;
    };
    code?: string; // Código de erro
}
