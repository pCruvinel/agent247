"use client"

import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { Contact, ChatMessage } from '@/types';
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

interface DBHistoricoMensagem {
    id: number;
    paciente_id: number;
    content: string;
    sender: string;
    status: string;
    created_at: string;
    user_id: string; // Ensure we select this for types, though implied
}

const ChatTab = () => {
    const { settings } = useSettings();
    const { user } = useAuth();
    const [activeContactId, setActiveContactId] = useState<number | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    const [contacts, setContacts] = useState<Contact[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    // Clear context modal state
    const [showClearModal, setShowClearModal] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    // Derived state
    const activeContact = React.useMemo(() =>
        contacts.find(c => Number(c.id) === activeContactId) || null,
        [contacts, activeContactId]);

    // 1. Fetch Contacts (Pacientes)
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
                    id: c.id.toString(), // Frontend expects string ID
                    name: c.nome || c.whatsapp_name || c.telefone, // Fallback
                    phone: c.telefone,
                    lastMessage: c.last_message || '',
                    timestamp: c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
                    unreadCount: c.unread_count || 0
                }));
                setContacts(mappedContacts);
            }
        };

        fetchContacts();

        // Subscribe to new contacts or updates
        const channel = supabase
            .channel('pacientes_chat_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pacientes', filter: `user_id=eq.${user.id}` }, () => {
                fetchContacts();
            })
            .subscribe();

        return () => { supabase?.removeChannel(channel); };
    }, [user]);

    // 2. Fetch Messages for Active Contact (HistoricoMensagens)
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
                    content: m.content || '', // Handle null content if legacy
                    sender: (m.sender as 'user' | 'agent' | 'system') || 'system',
                    timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    status: (m.status as 'sent' | 'delivered' | 'read') || 'sent'
                })));
            }
        }

        fetchMessages();

        // Subscribe to new messages
        const channel = supabase
            .channel(`historico:${activeContactId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'historico_mensagens', filter: `paciente_id=eq.${activeContactId}` }, (payload) => {
                const newMsg = payload.new as unknown as DBHistoricoMensagem;
                setMessages(prev => [...prev, {
                    id: newMsg.id.toString(),
                    content: newMsg.content || '',
                    sender: (newMsg.sender as 'user' | 'agent' | 'system') || 'system',
                    timestamp: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    status: (newMsg.status as 'sent' | 'delivered' | 'read') || 'sent'
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
        setMessageInput(''); // Optimistic clear

        // 1. Insert into DB (Status: 'sending')
        const { data: insertedMsg, error } = await supabase.from('historico_mensagens').insert({
            user_id: user.id,
            paciente_id: activeContactId,
            content: tempContent,
            sender: 'agent',
            status: 'sending',
            telefone: activeContact?.phone, // Required by DB
            direcao: 'saida', // Outgoing
            message_type: 'text'
        }).select('id').single(); // Retrieve the ID

        if (error) {
            alert('Erro ao salvar mensagem: ' + error.message);
            // Revert optimistic update if needed? For now just alert.
            return;
        }

        // 2. Call n8n Webhook to send to WhatsApp
        // Using global environment variable for multi-tenant support
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
                        message_id: insertedMsg.id // Pass ID to n8n
                    })
                });
                if (!res.ok) {
                    console.error("Webhook Failed", res.status, res.statusText);
                    // Silent fail or toast? For now, console error is enough as status is optimized
                }
            } catch (err) {
                console.error("Webhook Fetch Error:", err);
            }
        }

        // Update paciente last message
        await supabase.from('pacientes').update({
            last_message: tempContent,
            last_message_at: new Date().toISOString()
        }).eq('id', activeContactId);
    };

    const handleClearHistory = async () => {
        if (!supabase || !activeContactId || !user) return;

        setIsClearing(true);

        try {
            // Delete all messages (sent and received) for this patient
            const { error } = await supabase
                .from('historico_mensagens')
                .delete()
                .eq('paciente_id', activeContactId)
                .eq('user_id', user.id); // Ensure we only delete user's own messages (RLS)

            if (error) {
                console.error('Erro ao limpar mensagens:', error);
                alert('Erro ao limpar o histórico de mensagens. Por favor, tente novamente.');
                return;
            }

            // Clear local state
            setMessages([]);
            setShowClearModal(false);

            // Show success feedback
            alert('Histórico de mensagens limpo com sucesso!');

        } catch (err) {
            console.error('Erro ao limpar histórico:', err);
            alert('Erro inesperado ao limpar o histórico.');
        } finally {
            setIsClearing(false);
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
                        {/* Chat Header */}
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
                                    title="Limpar Memória de Contexto"
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
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.sender === 'system' ? 'justify-center' : (msg.sender === 'user' ? 'justify-start' : 'justify-end')}`}
                                >
                                    {msg.sender === 'system' ? (
                                        <span className="text-xs text-neutral-400 bg-[#262626] px-3 py-1 rounded-full border border-[#262626]">{msg.content}</span>
                                    ) : (
                                        <div className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${msg.sender === 'agent'
                                            ? 'bg-[#00FFA3] text-[#0f172a] rounded-br-none'
                                            : 'bg-[#171717] border border-[#262626] text-white rounded-bl-none shadow-sm'
                                            }`}>
                                            <p>{msg.content}</p>
                                            <p className={`text-[10px] mt-1 text-right ${msg.sender === 'agent' ? 'text-emerald-900/70' : 'text-neutral-500'}`}>
                                                {msg.timestamp}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-[#171717] border-t border-[#262626]">
                            <div className="flex items-end space-x-2">
                                <textarea
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    // Submit on Enter (without shift)
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
                                    Esta ação irá <span className="text-red-400 font-semibold">excluir permanentemente</span> todas as mensagens enviadas e recebidas deste paciente.
                                    O histórico de conversas será perdido e não poderá ser recuperado.
                                </p>
                                <p className="text-sm text-neutral-400 mb-6">
                                    Paciente: <span className="text-white font-medium">{activeContact?.name}</span>
                                </p>
                                <div className="flex justify-end space-x-3">
                                    <Button
                                        onClick={() => setShowClearModal(false)}
                                        disabled={isClearing}
                                        className="px-4 py-2 bg-[#262626] text-white hover:bg-[#333333] transition-colors"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        onClick={handleClearHistory}
                                        disabled={isClearing}
                                        className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center space-x-2"
                                    >
                                        {isClearing ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>Limpando...</span>
                                            </>
                                        ) : (
                                            <span>Confirmar Exclusão</span>
                                        )}
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
