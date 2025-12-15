"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Plus, Trash2, Eye, EyeOff, Clock, X, Save } from 'lucide-react';
import { AgentBusinessRules, Procedure } from '@/types';

interface Props {
    data: AgentBusinessRules;
    onUpdate: (data: AgentBusinessRules) => void;
}

const BusinessRulesSection = ({ data, onUpdate }: Props) => {
    const [formData, setFormData] = React.useState(data);
    const [newInsurance, setNewInsurance] = React.useState('');

    // Procedure handlers
    const addProcedure = () => {
        const newProc: Procedure = {
            id: Date.now().toString(),
            name: '',
            price: 0,
            price_visible: true,
            duration_minutes: 30
        };
        setFormData(prev => ({
            ...prev,
            procedures: [...prev.procedures, newProc]
        }));
    };

    const updateProcedure = (id: string, field: keyof Procedure, value: string | number | boolean) => {
        setFormData(prev => ({
            ...prev,
            procedures: prev.procedures.map(proc =>
                proc.id === id ? { ...proc, [field]: value } : proc
            )
        }));
    };

    const removeProcedure = (id: string) => {
        setFormData(prev => ({
            ...prev,
            procedures: prev.procedures.filter(proc => proc.id !== id)
        }));
    };

    // Insurance handlers
    const addInsurance = () => {
        if (newInsurance.trim() && !formData.insurance_accepted.includes(newInsurance.trim())) {
            setFormData(prev => ({
                ...prev,
                insurance_accepted: [...prev.insurance_accepted, newInsurance.trim()]
            }));
            setNewInsurance('');
        }
    };

    const removeInsurance = (insurance: string) => {
        setFormData(prev => ({
            ...prev,
            insurance_accepted: prev.insurance_accepted.filter(i => i !== insurance)
        }));
    };

    const handleChange = <K extends keyof AgentBusinessRules>(field: K, value: AgentBusinessRules[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        onUpdate(formData);
        alert('Regras de Negócio salvas! (mockado)');
    };

    return (
        <Card className="bg-[#0d0d0d] border-[#262626]">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-white">
                    <DollarSign className="h-6 w-6 text-[#00FFA3]" />
                    Serviços e Regras de Negócio
                </CardTitle>
                <p className="text-sm text-neutral-400 mt-1">
                    Procedimentos, preços e políticas que o agente pode consultar.
                </p>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Procedimentos */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-neutral-300">
                            Tabela de Procedimentos
                        </label>
                        <Button
                            onClick={addProcedure}
                            variant="outline"
                            size="sm"
                            className="border-[#262626] bg-[#171717] text-white hover:bg-[#262626]"
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Adicionar
                        </Button>
                    </div>

                    {formData.procedures.length === 0 ? (
                        <div className="text-center py-6 text-neutral-500 border border-dashed border-[#262626] rounded-lg">
                            <p className="text-sm">Nenhum procedimento cadastrado</p>
                        </div>
                    ) : (
                        <div className="border border-[#262626] rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-[#171717] border-b border-[#262626]">
                                    <tr>
                                        <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider px-4 py-3">
                                            Procedimento
                                        </th>
                                        <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider px-4 py-3 w-28">
                                            Preço
                                        </th>
                                        <th className="text-center text-xs font-medium text-neutral-500 uppercase tracking-wider px-4 py-3 w-20">
                                            Visível
                                        </th>
                                        <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider px-4 py-3 w-24">
                                            Duração
                                        </th>
                                        <th className="w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#262626]">
                                    {formData.procedures.map((proc) => (
                                        <tr key={proc.id} className="bg-[#0d0d0d] hover:bg-[#171717] transition-colors">
                                            <td className="px-4 py-3">
                                                <input
                                                    type="text"
                                                    value={proc.name}
                                                    onChange={(e) => updateProcedure(proc.id, 'name', e.target.value)}
                                                    placeholder="Nome do procedimento..."
                                                    className="w-full h-8 px-3 rounded border border-[#262626] bg-[#171717] text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#00FFA3] text-sm"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">
                                                        R$
                                                    </span>
                                                    <input
                                                        type="number"
                                                        value={proc.price}
                                                        onChange={(e) => updateProcedure(proc.id, 'price', parseFloat(e.target.value) || 0)}
                                                        className="w-full h-8 pl-9 pr-3 rounded border border-[#262626] bg-[#171717] text-white focus:outline-none focus:ring-1 focus:ring-[#00FFA3] text-sm"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => updateProcedure(proc.id, 'price_visible', !proc.price_visible)}
                                                    className={`p-2 rounded transition-colors ${proc.price_visible
                                                            ? 'text-emerald-400 hover:bg-emerald-500/10'
                                                            : 'text-neutral-500 hover:bg-neutral-500/10'
                                                        }`}
                                                    title={proc.price_visible ? 'Preço visível' : 'Preço oculto'}
                                                >
                                                    {proc.price_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        value={proc.duration_minutes}
                                                        onChange={(e) => updateProcedure(proc.id, 'duration_minutes', parseInt(e.target.value) || 0)}
                                                        className="w-16 h-8 px-2 rounded border border-[#262626] bg-[#171717] text-white focus:outline-none focus:ring-1 focus:ring-[#00FFA3] text-sm text-center"
                                                    />
                                                    <Clock className="h-3 w-3 text-neutral-500" />
                                                </div>
                                            </td>
                                            <td className="px-2 py-3">
                                                <button
                                                    onClick={() => removeProcedure(proc.id)}
                                                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Convênios */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-neutral-300">
                        Convênios Aceitos
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {formData.insurance_accepted.map((insurance) => (
                            <span
                                key={insurance}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm"
                            >
                                {insurance}
                                <button
                                    onClick={() => removeInsurance(insurance)}
                                    className="hover:text-blue-300 transition-colors"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newInsurance}
                            onChange={(e) => setNewInsurance(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addInsurance()}
                            className="flex-1 h-10 px-4 rounded-lg border border-[#262626] bg-[#171717] text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#00FFA3] transition-all"
                            placeholder="Adicionar convênio..."
                        />
                        <Button
                            onClick={addInsurance}
                            variant="outline"
                            className="border-[#262626] bg-[#171717] text-white hover:bg-[#262626]"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Políticas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-300">
                            Política de Pagamento
                        </label>
                        <textarea
                            value={formData.payment_policy}
                            onChange={(e) => handleChange('payment_policy', e.target.value)}
                            rows={3}
                            className="w-full p-3 rounded-lg border border-[#262626] bg-[#171717] text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#00FFA3] resize-none text-sm"
                            placeholder="Ex: Parcelamos em até 12x no cartão..."
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-300">
                            Política de Cancelamento
                        </label>
                        <textarea
                            value={formData.cancellation_policy}
                            onChange={(e) => handleChange('cancellation_policy', e.target.value)}
                            rows={3}
                            className="w-full p-3 rounded-lg border border-[#262626] bg-[#171717] text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#00FFA3] resize-none text-sm"
                            placeholder="Ex: Cancelamentos com 24h de antecedência..."
                        />
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

export default BusinessRulesSection;
