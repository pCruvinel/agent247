"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Sparkles, X, Plus, Save } from 'lucide-react';
import { AgentBrain, AgentTone } from '@/types';

interface Props {
    data: AgentBrain;
    onUpdate: (data: AgentBrain) => void;
}

const toneOptions: { value: AgentTone; label: string; description: string }[] = [
    { value: 'formal', label: 'Formal', description: 'Comunicação profissional e respeitosa' },
    { value: 'acolhedor', label: 'Acolhedor', description: 'Tom amigável e empático' },
    { value: 'energetico', label: 'Energético', description: 'Comunicação animada e entusiasmada' },
    { value: 'vendedor', label: 'Vendedor', description: 'Foco em conversão e vendas' },
];

const AgentBrainSection = ({ data, onUpdate }: Props) => {
    const [formData, setFormData] = React.useState(data);
    const [newTrigger, setNewTrigger] = React.useState('');

    const handleChange = <K extends keyof AgentBrain>(field: K, value: AgentBrain[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const addTrigger = () => {
        if (newTrigger.trim() && !formData.handoff_triggers.includes(newTrigger.trim())) {
            handleChange('handoff_triggers', [...formData.handoff_triggers, newTrigger.trim()]);
            setNewTrigger('');
        }
    };

    const removeTrigger = (trigger: string) => {
        handleChange('handoff_triggers', formData.handoff_triggers.filter(t => t !== trigger));
    };

    const handleSave = () => {
        onUpdate(formData);
        alert('Configurações do Cérebro salvas! (mockado)');
    };

    return (
        <Card className="bg-[#0d0d0d] border-[#262626]">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-white">
                    <Brain className="h-6 w-6 text-[#00FFA3]" />
                    Cérebro do Agente
                </CardTitle>
                <p className="text-sm text-neutral-400 mt-1">
                    Define a personalidade e comportamento do agente. Isso alimenta o System Prompt.
                </p>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Nome do Bot */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-300">
                        Nome do Bot
                    </label>
                    <input
                        type="text"
                        value={formData.bot_name}
                        onChange={(e) => handleChange('bot_name', e.target.value)}
                        className="w-full h-10 px-4 rounded-lg border border-[#262626] bg-[#171717] text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#00FFA3] transition-all"
                        placeholder="Ex: Ana, Sofia, Lucas..."
                    />
                    <p className="text-xs text-neutral-500">
                        O nome que o bot usará para se identificar nas conversas.
                    </p>
                </div>

                {/* Tom de Voz */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-neutral-300">
                        Tom de Voz
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {toneOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => handleChange('tone', option.value)}
                                className={`p-4 rounded-lg border text-left transition-all ${formData.tone === option.value
                                        ? 'border-[#00FFA3] bg-[#00FFA3]/10'
                                        : 'border-[#262626] bg-[#171717] hover:border-[#333]'
                                    }`}
                            >
                                <p className={`font-medium ${formData.tone === option.value ? 'text-[#00FFA3]' : 'text-white'}`}>
                                    {option.label}
                                </p>
                                <p className="text-xs text-neutral-500 mt-1">
                                    {option.description}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Temperatura/Criatividade */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-neutral-300">
                            Criatividade (Temperatura)
                        </label>
                        <span className="text-sm text-[#00FFA3] font-mono">
                            {formData.temperature.toFixed(1)}
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-neutral-500">Preciso</span>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={formData.temperature}
                            onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                            className="flex-1 h-2 bg-[#262626] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#00FFA3] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                        />
                        <span className="text-xs text-neutral-500">Criativo</span>
                    </div>
                    <p className="text-xs text-neutral-500">
                        Valores baixos = respostas mais previsíveis. Valores altos = respostas mais criativas.
                    </p>
                </div>

                {/* Instruções Personalizadas */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-400" />
                        Instruções Personalizadas
                    </label>
                    <textarea
                        value={formData.custom_instructions}
                        onChange={(e) => handleChange('custom_instructions', e.target.value)}
                        rows={4}
                        className="w-full p-4 rounded-lg border border-[#262626] bg-[#171717] text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#00FFA3] transition-all resize-none"
                        placeholder="Ex: Sempre cumprimente o paciente pelo nome. Use emojis com moderação..."
                    />
                    <p className="text-xs text-neutral-500">
                        Regras específicas adicionadas ao prompt do sistema.
                    </p>
                </div>

                {/* Gatilhos de Transbordo */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-neutral-300">
                        Gatilhos de Transbordo (Handoff)
                    </label>
                    <p className="text-xs text-neutral-500">
                        Palavras-chave que transferem automaticamente para atendimento humano.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {formData.handoff_triggers.map((trigger) => (
                            <span
                                key={trigger}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
                            >
                                {trigger}
                                <button
                                    onClick={() => removeTrigger(trigger)}
                                    className="hover:text-red-300 transition-colors"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newTrigger}
                            onChange={(e) => setNewTrigger(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addTrigger()}
                            className="flex-1 h-10 px-4 rounded-lg border border-[#262626] bg-[#171717] text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#00FFA3] transition-all"
                            placeholder="Adicionar gatilho..."
                        />
                        <Button
                            onClick={addTrigger}
                            variant="outline"
                            className="border-[#262626] bg-[#171717] text-white hover:bg-[#262626]"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Botão Salvar */}
                <div className="flex justify-end pt-4 border-t border-[#262626]">
                    <Button
                        onClick={handleSave}
                        className="bg-[#00FFA3] text-[#0d0d0d] hover:bg-[#00e692] font-medium px-6"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        Salvar Alterações
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default AgentBrainSection;
