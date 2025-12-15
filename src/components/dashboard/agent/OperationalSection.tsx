"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Palmtree, Save } from 'lucide-react';
import { AgentOperational, OperationalHours } from '@/types';

interface Props {
    data: AgentOperational;
    onUpdate: (data: AgentOperational) => void;
}

const dayLabels: Record<OperationalHours['day'], string> = {
    seg: 'Segunda',
    ter: 'Terça',
    qua: 'Quarta',
    qui: 'Quinta',
    sex: 'Sexta',
    sab: 'Sábado',
    dom: 'Domingo',
};

const timezones = [
    { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
    { value: 'America/Manaus', label: 'Manaus (AMT)' },
    { value: 'America/Recife', label: 'Recife (BRT)' },
    { value: 'America/Fortaleza', label: 'Fortaleza (BRT)' },
    { value: 'America/Cuiaba', label: 'Cuiabá (AMT)' },
];

const OperationalSection = ({ data, onUpdate }: Props) => {
    const [formData, setFormData] = React.useState(data);

    const updateHours = (dayIndex: number, field: keyof OperationalHours, value: string | boolean) => {
        const newHours = [...formData.hours];
        newHours[dayIndex] = { ...newHours[dayIndex], [field]: value };
        setFormData(prev => ({ ...prev, hours: newHours }));
    };

    const handleChange = <K extends keyof AgentOperational>(field: K, value: AgentOperational[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        onUpdate(formData);
        alert('Configurações Operacionais salvas! (mockado)');
    };

    return (
        <Card className="bg-[#0d0d0d] border-[#262626]">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-white">
                    <Clock className="h-6 w-6 text-[#00FFA3]" />
                    Configurações Operacionais
                </CardTitle>
                <p className="text-sm text-neutral-400 mt-1">
                    Defina os horários de funcionamento e regras de disponibilidade.
                </p>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Fuso Horário */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-300">
                        Fuso Horário
                    </label>
                    <select
                        value={formData.timezone}
                        onChange={(e) => handleChange('timezone', e.target.value)}
                        className="w-full h-10 px-4 rounded-lg border border-[#262626] bg-[#171717] text-white focus:outline-none focus:ring-2 focus:ring-[#00FFA3] transition-all"
                    >
                        {timezones.map((tz) => (
                            <option key={tz.value} value={tz.value}>
                                {tz.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Horários por dia */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-neutral-300">
                        Dias e Horários de Funcionamento
                    </label>
                    <div className="space-y-2">
                        {formData.hours.map((hour, index) => (
                            <div
                                key={hour.day}
                                className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${hour.enabled
                                        ? 'border-[#262626] bg-[#171717]'
                                        : 'border-[#1a1a1a] bg-[#0d0d0d] opacity-50'
                                    }`}
                            >
                                <label className="flex items-center gap-3 min-w-[120px]">
                                    <input
                                        type="checkbox"
                                        checked={hour.enabled}
                                        onChange={(e) => updateHours(index, 'enabled', e.target.checked)}
                                        className="h-4 w-4 rounded border-[#262626] bg-[#171717] text-[#00FFA3] focus:ring-[#00FFA3]"
                                    />
                                    <span className={`text-sm font-medium ${hour.enabled ? 'text-white' : 'text-neutral-500'}`}>
                                        {dayLabels[hour.day]}
                                    </span>
                                </label>
                                {hour.enabled && (
                                    <div className="flex items-center gap-2 flex-1">
                                        <input
                                            type="time"
                                            value={hour.open}
                                            onChange={(e) => updateHours(index, 'open', e.target.value)}
                                            className="h-8 px-3 rounded border border-[#262626] bg-[#0d0d0d] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#00FFA3]"
                                        />
                                        <span className="text-neutral-500">às</span>
                                        <input
                                            type="time"
                                            value={hour.close}
                                            onChange={(e) => updateHours(index, 'close', e.target.value)}
                                            className="h-8 px-3 rounded border border-[#262626] bg-[#0d0d0d] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#00FFA3]"
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Intervalo de Almoço */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-neutral-300">
                        Intervalo de Almoço
                    </label>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-neutral-500">Das</span>
                            <input
                                type="time"
                                value={formData.lunch_start}
                                onChange={(e) => handleChange('lunch_start', e.target.value)}
                                className="h-10 px-3 rounded-lg border border-[#262626] bg-[#171717] text-white focus:outline-none focus:ring-2 focus:ring-[#00FFA3]"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-neutral-500">às</span>
                            <input
                                type="time"
                                value={formData.lunch_end}
                                onChange={(e) => handleChange('lunch_end', e.target.value)}
                                className="h-10 px-3 rounded-lg border border-[#262626] bg-[#171717] text-white focus:outline-none focus:ring-2 focus:ring-[#00FFA3]"
                            />
                        </div>
                    </div>
                </div>

                {/* Modo Férias */}
                <div className="space-y-3 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Palmtree className="h-5 w-5 text-amber-400" />
                            <div>
                                <p className="text-sm font-medium text-white">Modo Férias / Feriado</p>
                                <p className="text-xs text-neutral-500">
                                    Quando ativado, o bot informará que a clínica está fechada.
                                </p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.vacation_mode}
                                onChange={(e) => handleChange('vacation_mode', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-[#262626] rounded-full peer peer-checked:bg-amber-500 peer-focus:ring-2 peer-focus:ring-amber-500/50 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                        </label>
                    </div>
                    {formData.vacation_mode && (
                        <textarea
                            value={formData.vacation_message || ''}
                            onChange={(e) => handleChange('vacation_message', e.target.value)}
                            placeholder="Mensagem para exibir (opcional)..."
                            rows={2}
                            className="w-full p-3 rounded-lg border border-[#262626] bg-[#171717] text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none text-sm"
                        />
                    )}
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

export default OperationalSection;
