"use client"

import React, { useState } from 'react';
import { Building2, Brain, Clock, BookOpen, DollarSign } from 'lucide-react';
import {
    AgentConfig, AgentCompanyProfile, AgentBrain, AgentOperational,
    AgentKnowledge, AgentBusinessRules
} from '@/types';

// Import section components
import CompanyProfileSection from './agent/CompanyProfileSection';
import AgentBrainSection from './agent/AgentBrainSection';
import OperationalSection from './agent/OperationalSection';
import KnowledgeSection from './agent/KnowledgeSection';
import BusinessRulesSection from './agent/BusinessRulesSection';

type AgentSection = 'company' | 'brain' | 'operational' | 'knowledge' | 'business';

const sectionConfig: Record<AgentSection, { label: string; icon: React.ElementType }> = {
    company: { label: 'Perfil da Empresa', icon: Building2 },
    brain: { label: 'Cérebro do Agente', icon: Brain },
    operational: { label: 'Operacional', icon: Clock },
    knowledge: { label: 'Base de Conhecimento', icon: BookOpen },
    business: { label: 'Serviços e Regras', icon: DollarSign },
};

// Mock data inicial
const mockAgentConfig: AgentConfig = {
    company: {
        company_name: 'Clínica Estética Beleza Pura',
        owner_name: 'Dra. Marina Santos',
        address: 'Rua das Flores, 123 - Centro, São Paulo - SP',
        phone: '(11) 99999-8888',
        website: 'https://belezapura.com.br',
        social_media: {
            instagram: '@belezapura',
            facebook: 'BelezaPuraClinica',
            whatsapp: '11999998888'
        }
    },
    brain: {
        bot_name: 'Ana',
        tone: 'acolhedor',
        temperature: 0.7,
        custom_instructions: 'Sempre cumprimente o paciente pelo nome quando disponível. Use emojis com moderação. Nunca discuta política ou religião.',
        handoff_triggers: ['falar com humano', 'atendente', 'reclamação', 'problema grave']
    },
    operational: {
        hours: [
            { day: 'seg', enabled: true, open: '08:00', close: '18:00' },
            { day: 'ter', enabled: true, open: '08:00', close: '18:00' },
            { day: 'qua', enabled: true, open: '08:00', close: '18:00' },
            { day: 'qui', enabled: true, open: '08:00', close: '18:00' },
            { day: 'sex', enabled: true, open: '08:00', close: '18:00' },
            { day: 'sab', enabled: true, open: '09:00', close: '13:00' },
            { day: 'dom', enabled: false, open: '00:00', close: '00:00' },
        ],
        lunch_start: '12:00',
        lunch_end: '13:00',
        timezone: 'America/Sao_Paulo',
        vacation_mode: false,
        vacation_message: ''
    },
    knowledge: {
        faq_items: [
            { id: '1', question: 'Qual a senha do Wi-Fi?', answer: 'BelezaPura2024' },
            { id: '2', question: 'Aceita Pix?', answer: 'Sim! Aceitamos Pix, cartão de crédito e débito.' },
            { id: '3', question: 'Tem estacionamento?', answer: 'Sim, estacionamento gratuito no subsolo.' }
        ],
        links: [
            { id: '1', url: 'https://belezapura.com.br/servicos', title: 'Página de Serviços' },
            { id: '2', url: 'https://belezapura.com.br/sobre', title: 'Sobre a Clínica' }
        ]
    },
    business: {
        procedures: [
            { id: '1', name: 'Limpeza de Pele', price: 150, price_visible: true, duration_minutes: 60 },
            { id: '2', name: 'Botox', price: 800, price_visible: false, duration_minutes: 30 },
            { id: '3', name: 'Peeling Químico', price: 350, price_visible: true, duration_minutes: 45 },
            { id: '4', name: 'Harmonização Facial', price: 2500, price_visible: false, duration_minutes: 90 }
        ],
        insurance_accepted: ['Unimed', 'Bradesco Saúde', 'SulAmérica', 'Amil'],
        payment_policy: 'Parcelamos em até 12x no cartão. 5% de desconto no Pix à vista.',
        cancellation_policy: 'Cancelamentos devem ser feitos com 24h de antecedência. Cancelamentos tardios estão sujeitos a cobrança de 50% do valor.'
    }
};

const SidebarItem = ({
    section,
    isActive,
    onClick
}: {
    section: AgentSection;
    isActive: boolean;
    onClick: () => void;
}) => {
    const { label, icon: Icon } = sectionConfig[section];

    return (
        <button
            onClick={onClick}
            className={`flex w-full items-center space-x-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                    ? 'bg-[#00FFA3] text-[#0d0d0d]'
                    : 'text-neutral-400 hover:bg-[#1a1a1a] hover:text-white'
                }`}
        >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
        </button>
    );
};

const AgentTab = () => {
    const [activeSection, setActiveSection] = useState<AgentSection>('company');
    const [config, setConfig] = useState<AgentConfig>(mockAgentConfig);

    const updateCompany = (data: AgentCompanyProfile) => {
        setConfig(prev => ({ ...prev, company: data }));
    };

    const updateBrain = (data: AgentBrain) => {
        setConfig(prev => ({ ...prev, brain: data }));
    };

    const updateOperational = (data: AgentOperational) => {
        setConfig(prev => ({ ...prev, operational: data }));
    };

    const updateKnowledge = (data: AgentKnowledge) => {
        setConfig(prev => ({ ...prev, knowledge: data }));
    };

    const updateBusiness = (data: AgentBusinessRules) => {
        setConfig(prev => ({ ...prev, business: data }));
    };

    const renderSection = () => {
        switch (activeSection) {
            case 'company':
                return <CompanyProfileSection data={config.company} onUpdate={updateCompany} />;
            case 'brain':
                return <AgentBrainSection data={config.brain} onUpdate={updateBrain} />;
            case 'operational':
                return <OperationalSection data={config.operational} onUpdate={updateOperational} />;
            case 'knowledge':
                return <KnowledgeSection data={config.knowledge} onUpdate={updateKnowledge} />;
            case 'business':
                return <BusinessRulesSection data={config.business} onUpdate={updateBusiness} />;
            default:
                return null;
        }
    };

    return (
        <div className="flex h-full min-h-[600px] gap-6">
            {/* Internal Sidebar */}
            <aside className="w-64 flex-shrink-0 rounded-xl border border-[#262626] bg-[#0d0d0d] p-4">
                <div className="mb-4 px-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                        Configurações
                    </h2>
                </div>
                <nav className="space-y-1">
                    {(Object.keys(sectionConfig) as AgentSection[]).map((section) => (
                        <SidebarItem
                            key={section}
                            section={section}
                            isActive={activeSection === section}
                            onClick={() => setActiveSection(section)}
                        />
                    ))}
                </nav>
            </aside>

            {/* Content Area */}
            <div className="flex-1 overflow-auto">
                {renderSection()}
            </div>
        </div>
    );
};

export default AgentTab;
