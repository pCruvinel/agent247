"use client"

import React, { useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';

const SettingsTab = () => {
    const { settings, updateSettings } = useSettings();
    const [localSettings, setLocalSettings] = useState(settings);
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setLocalSettings(prev => ({
            ...prev,
            [id]: value
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateSettings(localSettings);
            alert("Configurações salvas no banco de dados!");
        } catch (e) {
            console.error(e);
            alert("Falha ao salvar configurações.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <Card className="bg-[#0d0d0d] border-[#262626]">
                <CardHeader>
                    <CardTitle className="text-white">Configuração de Webhooks (n8n)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="webhook_connect_instance_url" className="text-neutral-200">URL de Conexão da Instância</Label>
                            <Input
                                id="webhook_connect_instance_url"
                                placeholder="https://n8n.seu-dominio.com/webhook/connect"
                                value={localSettings.webhook_connect_instance_url}
                                onChange={handleChange}
                                className="bg-[#171717] border-[#262626] text-white placeholder:text-neutral-500 focus-visible:ring-[#00FFA3]"
                            />
                            <p className="text-xs text-neutral-400">Endpoint para gerar QR code ou checar status.</p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="webhook_send_message_url" className="text-neutral-200">URL de Envio de Mensagem</Label>
                            <Input
                                id="webhook_send_message_url"
                                placeholder="https://n8n.seu-dominio.com/webhook/send-message"
                                value={localSettings.webhook_send_message_url}
                                onChange={handleChange}
                                className="bg-[#171717] border-[#262626] text-white placeholder:text-neutral-500 focus-visible:ring-[#00FFA3]"
                            />
                            <p className="text-xs text-neutral-400">Endpoint para enviar mensagens pela interface de chat.</p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="webhook_clear_history_url" className="text-neutral-200">URL de Limpeza de Histórico</Label>
                            <Input
                                id="webhook_clear_history_url"
                                placeholder="https://n8n.seu-dominio.com/webhook/clear-history"
                                value={localSettings.webhook_clear_history_url}
                                onChange={handleChange}
                                className="bg-[#171717] border-[#262626] text-white placeholder:text-neutral-500 focus-visible:ring-[#00FFA3]"
                            />
                            <p className="text-xs text-neutral-400">Endpoint para resetar o contexto na memória da IA.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button
                    onClick={handleSave}
                    loading={isSaving}
                    className="bg-[#00FFA3] text-[#0f172a] hover:bg-[#00e692] font-semibold"
                >
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Configuração
                </Button>
            </div>
        </div>
    );
};

export default SettingsTab;
