"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Contact, ChatMessage, DirecaoMensagem, TipoMensagem, TipoRemetente } from '@/types';
import { Send, Search, User, MoreVertical, Eraser, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

import { supabase } from '@/lib/supabase';

interface DBPaciente {
    id: number;
    user_id: string;
    nome: string | null;
    telefone: string;
    whatsapp_name: string | null;
    last_message: string | null;
    last_message_at: string | null;
    unread_count: number | null;
}

// Interface atualizada para o novo schema do banco
interface DBHistoricoMensagem {
    id: number;
    paciente_id: number | null;
    telefone: string;
    conteudo: string | null;
    papel: TipoRemetente;
    status: string | null;
    created_at: string;
    user_id: string | null;
    instance_id: string | null;
    tipo_conteudo: TipoMensagem | null;  // Mudou de tipo_mensagem para tipo_conteudo
    direcao: DirecaoMensagem;  // Novo campo: 'recebido' | 'enviado'
    media_url: string | null;
    metadados: Record<string, unknown> | null;
    session_id: string | null;
}

const ChatTab = () => {
    const { user } = useAuth();
    const [activeContactId, setActiveContactId] = useState<number | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    const [contacts, setContacts] = useState<Contact[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    const [showClearModal, setShowClearModal] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    const activeContact = React.useMemo(() =>
        contacts.find(c => Number(c.id) === activeContactId) || null,
        [contacts, activeContactId]);

    // 1. Fetch Contacts
    useEffect(() => {
        if (!user || !supabase) return;

        const fetchContacts = async () => {
            if (!supabase) return;
            const { data } = await supabase
                .from('pacientes')
                .select('*')
                .eq('user_id', user.id)
                .order('last_message_at', { ascending: false });

            if (data) {
                const dbContacts = data as unknown as DBPaciente[];
                const mappedContacts: Contact[] = dbContacts.map((c) => ({
                    id: c.id.toString(),
                    name: c.nome || c.whatsapp_name || c.telefone,
                    phone: c.telefone,
                    lastMessage: c.last_message || '',
                    timestamp: c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
                    unreadCount: c.unread_count || 0
                }));
                setContacts(mappedContacts);
            }
        };

        fetchContacts();

        const channel = supabase
            .channel('pacientes_chat_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pacientes', filter: `user_id=eq.${user.id}` }, () => {
                fetchContacts();
            })
            .subscribe();

        return () => { supabase?.removeChannel(channel); };
    }, [user]);

    // 2. Fetch Messages (Com novos campos)
    useEffect(() => {
        if (!activeContactId || !user || !supabase) return;

        const fetchMessages = async () => {
            if (!supabase) return;
            const { data } = await supabase
                .from('historico_mensagens')
                .select('*')
                .eq('paciente_id', activeContactId)
                .order('created_at', { ascending: true });

            if (data) {
                const dbMessages = data as unknown as DBHistoricoMensagem[];
                setMessages(dbMessages.map((m) => ({
                    id: m.id.toString(),
                    conteudo: m.conteudo || '',
                    papel: m.papel || 'sistema',
                    timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    status: m.status || 'sent',
                    tipo_conteudo: m.tipo_conteudo || 'text',
                    direcao: m.direcao || 'recebido',
                    media_url: m.media_url,
                    metadados: m.metadados || {}
                })));
            }
        }

        fetchMessages();

        const channel = supabase
            .channel(`historico:${activeContactId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'historico_mensagens', filter: `paciente_id=eq.${activeContactId}` }, (payload) => {
                const newMsg = payload.new as unknown as DBHistoricoMensagem;
                setMessages(prev => [...prev, {
                    id: newMsg.id.toString(),
                    conteudo: newMsg.conteudo || '',
                    papel: newMsg.papel || 'sistema',
                    timestamp: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    status: newMsg.status || 'sent',
                    tipo_conteudo: newMsg.tipo_conteudo || 'text',
                    direcao: newMsg.direcao || 'recebido',
                    media_url: newMsg.media_url,
                    metadados: newMsg.metadados || {}
                }]);
            })
            .subscribe();

        return () => { supabase?.removeChannel(channel); };
    }, [activeContactId, user]);

    // Scroll to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!messageInput.trim() || !user || !activeContactId || !supabase) return;

        const tempContent = messageInput;
        setMessageInput('');

        // 1. Insert into DB (Usando Schema Novo)
        const { data: insertedMsg, error } = await supabase.from('historico_mensagens').insert({
            user_id: user.id,
            paciente_id: activeContactId,
            conteudo: tempContent,
            papel: 'agente_humano', // Assumindo que quem manda pelo painel é um humano
            status: 'sending',
            telefone: activeContact?.phone,
            tipo_conteudo: 'text',  // Mudou de tipo_mensagem para tipo_conteudo
            direcao: 'enviado'      // Novo campo: mensagens do painel são sempre 'enviado'
        }).select('id').single();

        if (error) {
            alert('Erro ao salvar mensagem: ' + error.message);
            return;
        }

        // 2. Call Webhook (Envia para o n8n distribuir no WhatsApp)
        const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'https://n8n.webhook.url/webhook/send-message';

        if (activeContact && insertedMsg) {
            try {
                const res = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: user.id,
                        phone: activeContact.phone,
                        message: tempContent,
                        message_id: insertedMsg.id
                    })
                });
                if (!res.ok) {
                    console.error("Webhook Failed", res.status, res.statusText);
                }
            } catch (err) {
                console.error("Webhook Fetch Error:", err);
            }
        }

        await supabase.from('pacientes').update({
            last_message: tempContent,
            last_message_at: new Date().toISOString()
        }).eq('id', activeContactId);
    };

    const handleClearHistory = async () => {
        if (!supabase || !activeContactId || !user) return;
        setIsClearing(true);
        try {
            const { error } = await supabase
                .from('historico_mensagens')
                .delete()
                .eq('paciente_id', activeContactId)
                .eq('user_id', user.id);

            if (error) {
                alert('Erro ao limpar o histórico.');
                return;
            }
            setMessages([]);
            setShowClearModal(false);
        } catch (err) {
            console.error(err);
        } finally {
            setIsClearing(false);
        }
    };

    // Helper para renderizar bolhas baseado no 'papel'
    const getBubbleStyles = (papel: string) => {
        switch (papel) {
            case 'agente': // Bot (IA)
                return {
                    container: 'justify-start',
                    bubble: 'bg-[#171717] border border-[#00FFA3]/30 text-white rounded-bl-none',
                    meta: 'text-[#00FFA3]/70 text-left'
                };
            case 'agente_humano': // Humano (Você/Atendente)
                return {
                    container: 'justify-end',
                    bubble: 'bg-[#00FFA3] text-[#0f172a] rounded-br-none',
                    meta: 'text-emerald-900/70 text-right'
                };
            case 'paciente': // Usuário do WhatsApp
                return {
                    container: 'justify-start',
                    bubble: 'bg-[#262626] border border-[#333] text-white rounded-tl-none',
                    meta: 'text-neutral-500 text-left'
                };
            default: // Sistema
                return {
                    container: 'justify-center',
                    bubble: 'bg-transparent border border-[#262626] text-neutral-400 text-xs px-3 py-1 rounded-full',
                    meta: 'hidden'
                };
        }
    };

    return (
        <div className="flex h-[calc(100vh-12rem)] min-h-[500px] overflow-hidden rounded-xl border border-[#262626] bg-[#0d0d0d] shadow-sm">
            {/* Sidebar - Contacts */}
            <div className="w-1/3 min-w-[250px] border-r border-[#262626] flex flex-col">
                <div className="p-4 border-b border-[#262626] bg-[#171717]">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-500" />
                        <input
                            type="text"
                            placeholder="Buscar conversas..."
                            className="w-full h-9 pl-9 pr-4 rounded-md border border-[#262626] bg-[#0d0d0d] text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#00FFA3] transition-shadow"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#0d0d0d]">
                    {contacts.map(contact => (
                        <div
                            key={contact.id}
                            onClick={() => setActiveContactId(Number(contact.id))}
                            className={`flex items-start p-3 cursor-pointer rounded-xl border border-[#262626] bg-[#171717] shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1 hover:border-[#00FFA3]/50 ${activeContactId === Number(contact.id) ? 'ring-1 ring-[#00FFA3] border-[#00FFA3]' : ''}`}
                        >
                            <div className="h-10 w-10 rounded-full bg-[#0d0d0d] flex items-center justify-center flex-shrink-0 text-[#00FFA3] font-semibold border border-[#262626]">
                                {contact.name.charAt(0)}
                            </div>
                            <div className="ml-3 flex-1 overflow-hidden">
                                <div className="flex justify-between items-baseline">
                                    <span className="font-medium text-sm text-white">{contact.name}</span>
                                    <span className="text-xs text-neutral-500">{contact.timestamp}</span>
                                </div>
                                <p className="text-xs text-neutral-400 truncate mt-1">{contact.lastMessage}</p>
                            </div>
                            {contact.unreadCount > 0 && (
                                <span className="ml-2 bg-[#00FFA3] text-[#0f172a] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                    {contact.unreadCount}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-[#0d0d0d]">
                {activeContact ? (
                    <>
                        <div className="h-16 border-b border-[#262626] bg-[#171717] flex items-center justify-between px-6">
                            <div className="flex items-center">
                                <div className="h-8 w-8 rounded-full bg-[#0d0d0d] border border-[#262626] flex items-center justify-center text-[#00FFA3] text-xs font-bold">
                                    {activeContact.name.charAt(0)}
                                </div>
                                <div className="ml-3">
                                    <p className="font-medium text-sm text-white">{activeContact.name}</p>
                                    <p className="text-xs text-neutral-400">{activeContact.phone}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => setShowClearModal(true)}
                                    className="p-2 hover:bg-[#262626] text-neutral-500 hover:text-red-400 rounded-md transition-colors"
                                    title="Limpar Memória"
                                >
                                    <Eraser className="h-5 w-5" />
                                </button>
                                <button className="p-2 hover:bg-[#262626] text-neutral-500 hover:text-white rounded-md transition-colors">
                                    <MoreVertical className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {messages.map((msg) => {
                                const style = getBubbleStyles(msg.papel);
                                return (
                                    <div key={msg.id} className={`flex ${style.container}`}>
                                        {msg.papel === 'sistema' ? (
                                            <span className={style.bubble}>{msg.conteudo}</span>
                                        ) : (
                                            <div className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${style.bubble} shadow-sm`}>
                                                {/* Exibe nome do remetente se não for 'agente_humano' (eu) */}
                                                {msg.papel !== 'agente_humano' && (
                                                    <p className="text-[10px] font-bold opacity-50 mb-1 uppercase tracking-wider">
                                                        {msg.papel === 'agente' ? 'Ana (IA)' : 'Paciente'}
                                                    </p>
                                                )}

                                                <p className="whitespace-pre-wrap">{msg.conteudo}</p>

                                                <div className={`flex items-center justify-end space-x-1 mt-1 ${style.meta}`}>
                                                    <span className="text-[10px]">{msg.timestamp}</span>
                                                    {/* Checks de leitura apenas para mensagens enviadas por humanos/bots */}
                                                    {(msg.papel === 'agente' || msg.papel === 'agente_humano') && (
                                                        <span className="text-[10px]">
                                                            {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            <div ref={chatEndRef} />
                        </div>

                        <div className="p-4 bg-[#171717] border-t border-[#262626]">
                            <div className="flex items-end space-x-2">
                                <textarea
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder="Digite uma mensagem..."
                                    className="flex-1 min-h-[44px] max-h-[120px] p-3 rounded-md border border-[#262626] bg-[#0d0d0d] text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#00FFA3] resize-none transition-shadow"
                                />
                                <Button
                                    onClick={handleSendMessage}
                                    disabled={!messageInput.trim()}
                                    className="h-11 w-11 p-0 rounded-md bg-[#00FFA3] text-[#0f172a] hover:bg-[#00e692] transition-colors"
                                >
                                    <Send className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-neutral-500">
                        <User className="h-16 w-16 mb-4 opacity-20" />
                        <p>Selecione um contato para começar a conversar</p>
                    </div>
                )}
            </div>

            {/* Clear Context Modal */}
            {showClearModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-[#171717] border border-[#262626] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
                        <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                                    <AlertTriangle className="h-6 w-6 text-red-400" />
                                </div>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-white mb-2">
                                    Limpar Memória de Contexto
                                </h3>
                                <p className="text-sm text-neutral-400 mb-4">
                                    Esta ação irá excluir permanentemente o histórico.
                                </p>
                                <div className="flex justify-end space-x-3">
                                    <Button onClick={() => setShowClearModal(false)} className="px-4 py-2 bg-[#262626]">Cancelar</Button>
                                    <Button onClick={handleClearHistory} disabled={isClearing} className="px-4 py-2 bg-red-600 text-white">
                                        {isClearing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatTab;
