"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, Phone, Globe, Instagram, Facebook, MessageCircle, Save } from 'lucide-react';
import { AgentCompanyProfile } from '@/types';

interface Props {
    data: AgentCompanyProfile;
    onUpdate: (data: AgentCompanyProfile) => void;
}

const CompanyProfileSection = ({ data, onUpdate }: Props) => {
    const [formData, setFormData] = React.useState(data);

    const handleChange = (field: keyof AgentCompanyProfile, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSocialChange = (platform: 'instagram' | 'facebook' | 'whatsapp', value: string) => {
        setFormData(prev => ({
            ...prev,
            social_media: { ...prev.social_media, [platform]: value }
        }));
    };

    const handleSave = () => {
        onUpdate(formData);
        // TODO: Persist to Supabase
        alert('Perfil salvo com sucesso! (mockado)');
    };

    return (
        <Card className="bg-[#0d0d0d] border-[#262626]">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-white">
                    <Building2 className="h-6 w-6 text-[#00FFA3]" />
                    Perfil da Empresa
                </CardTitle>
                <p className="text-sm text-neutral-400 mt-1">
                    Dados que o agente usa para se identificar e orientar os pacientes.
                </p>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Nome da Clínica */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-300">
                        Nome da Clínica / Empresa
                    </label>
                    <div className="relative">
                        <Building2 className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                        <input
                            type="text"
                            value={formData.company_name}
                            onChange={(e) => handleChange('company_name', e.target.value)}
                            className="w-full h-10 pl-10 pr-4 rounded-lg border border-[#262626] bg-[#171717] text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#00FFA3] transition-all"
                            placeholder="Ex: Clínica Estética Beleza Pura"
                        />
                    </div>
                </div>

                {/* Responsável Técnico */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-300">
                        Responsável Técnico
                    </label>
                    <input
                        type="text"
                        value={formData.owner_name}
                        onChange={(e) => handleChange('owner_name', e.target.value)}
                        className="w-full h-10 px-4 rounded-lg border border-[#262626] bg-[#171717] text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#00FFA3] transition-all"
                        placeholder="Ex: Dr. João Silva"
                    />
                </div>

                {/* Endereço */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-300">
                        Endereço Completo
                    </label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                        <input
                            type="text"
                            value={formData.address}
                            onChange={(e) => handleChange('address', e.target.value)}
                            className="w-full h-10 pl-10 pr-4 rounded-lg border border-[#262626] bg-[#171717] text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#00FFA3] transition-all"
                            placeholder="Rua, número, bairro, cidade - UF"
                        />
                    </div>
                </div>

                {/* Telefone e Website */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-300">
                            Telefone de Contato
                        </label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                            <input
                                type="text"
                                value={formData.phone}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                className="w-full h-10 pl-10 pr-4 rounded-lg border border-[#262626] bg-[#171717] text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#00FFA3] transition-all"
                                placeholder="(11) 99999-9999"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-300">
                            Website
                        </label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                            <input
                                type="text"
                                value={formData.website}
                                onChange={(e) => handleChange('website', e.target.value)}
                                className="w-full h-10 pl-10 pr-4 rounded-lg border border-[#262626] bg-[#171717] text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#00FFA3] transition-all"
                                placeholder="https://seusite.com.br"
                            />
                        </div>
                    </div>
                </div>

                {/* Redes Sociais */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-neutral-300">
                        Redes Sociais
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                            <Instagram className="absolute left-3 top-3 h-4 w-4 text-pink-400" />
                            <input
                                type="text"
                                value={formData.social_media.instagram || ''}
                                onChange={(e) => handleSocialChange('instagram', e.target.value)}
                                className="w-full h-10 pl-10 pr-4 rounded-lg border border-[#262626] bg-[#171717] text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#00FFA3] transition-all"
                                placeholder="@instagram"
                            />
                        </div>
                        <div className="relative">
                            <Facebook className="absolute left-3 top-3 h-4 w-4 text-blue-400" />
                            <input
                                type="text"
                                value={formData.social_media.facebook || ''}
                                onChange={(e) => handleSocialChange('facebook', e.target.value)}
                                className="w-full h-10 pl-10 pr-4 rounded-lg border border-[#262626] bg-[#171717] text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#00FFA3] transition-all"
                                placeholder="Facebook"
                            />
                        </div>
                        <div className="relative">
                            <MessageCircle className="absolute left-3 top-3 h-4 w-4 text-green-400" />
                            <input
                                type="text"
                                value={formData.social_media.whatsapp || ''}
                                onChange={(e) => handleSocialChange('whatsapp', e.target.value)}
                                className="w-full h-10 pl-10 pr-4 rounded-lg border border-[#262626] bg-[#171717] text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#00FFA3] transition-all"
                                placeholder="WhatsApp"
                            />
                        </div>
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

export default CompanyProfileSection;
