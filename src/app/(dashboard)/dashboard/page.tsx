"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

import Image from 'next/image';
import { LayoutDashboard, MessageSquare, Database, Settings, LogOut, Link2, Megaphone, Lock, Bot } from 'lucide-react';

// Tabs
import MetricsTab from '@/components/dashboard/MetricsTab';
import ConnectionTab from '@/components/dashboard/ConnectionTab';
import KnowledgeBaseTab from '@/components/dashboard/KnowledgeBaseTab';
import ChatTab from '@/components/dashboard/ChatTab';
import SettingsTab from '@/components/dashboard/SettingsTab';
import AgentTab from '@/components/dashboard/AgentTab';

type Tab = 'overview' | 'connection' | 'knowledge' | 'chat' | 'settings' | 'agent';

const tabTitles: Record<Tab, string> = {
    overview: 'Visão Geral',
    connection: 'Conexão',
    knowledge: 'Conhecimento',
    chat: 'Live Chat',
    settings: 'Configurações',
    agent: 'Gestor do Agente'
};

const NavItem = ({ tab, icon: Icon, label, isActive, onClick, disabled = false }: { tab: Tab | 'campaigns'; icon: React.ElementType; label: string; isActive: boolean; onClick: (t: Tab | 'campaigns') => void, disabled?: boolean }) => (
    <button
        onClick={() => !disabled && onClick(tab)}
        disabled={disabled}
        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive
            ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
            : disabled
                ? 'text-neutral-500 cursor-not-allowed opacity-50'
                : 'text-neutral-400 hover:bg-[#262626] hover:text-white'
            }`}
    >
        <div className="flex items-center space-x-3">
            <Icon className="h-5 w-5" />
            <span>{label}</span>
        </div>
        {disabled && <Lock className="h-4 w-4" />}
    </button>
);

export default function DashboardPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('overview');


    const handleLogout = () => {
        // Clear cookies/tokens
        document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
        router.push('/login');
    };



    const renderContent = () => {
        switch (activeTab) {
            case 'overview': return <MetricsTab />;
            case 'connection': return <ConnectionTab />;
            case 'knowledge': return <KnowledgeBaseTab />;
            case 'chat': return <ChatTab />;
            case 'settings': return <SettingsTab />;
            case 'agent': return <AgentTab />;
            default: return <MetricsTab />;
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-[#0d0d0d]">
            {/* Sidebar - Desktop */}
            <aside className="w-64 flex-col border-r border-[#262626] bg-[#0d0d0d] hidden md:flex">
                <div className="flex h-16 items-center justify-center border-b border-[#262626] px-6">
                    <div className="relative h-10 w-40">
                        <Image
                            src="/logo.png"
                            alt="Agent Control Panel"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                </div>

                <nav className="flex-1 space-y-1 px-3 py-4">
                    <NavItem tab="overview" icon={LayoutDashboard} label="Visão Geral" isActive={activeTab === 'overview'} onClick={(t) => setActiveTab(t as Tab)} />
                    <NavItem tab="agent" icon={Bot} label="Agente" isActive={false} onClick={() => { }} disabled={true} />
                    <NavItem tab="chat" icon={MessageSquare} label="Live Chat" isActive={activeTab === 'chat'} onClick={(t) => setActiveTab(t as Tab)} />
                    <NavItem tab="campaigns" icon={Megaphone} label="Campanhas" isActive={false} onClick={() => { }} disabled={true} />
                    <NavItem tab="connection" icon={Link2} label="Conexão" isActive={activeTab === 'connection'} onClick={(t) => setActiveTab(t as Tab)} />
                    <NavItem tab="knowledge" icon={Database} label="Conhecimento" isActive={activeTab === 'knowledge'} onClick={(t) => setActiveTab(t as Tab)} />
                    <div className="pt-4 mt-4 border-t border-[#262626]">
                        <NavItem tab="settings" icon={Settings} label="Configurações" isActive={false} onClick={() => { }} disabled={true} />
                    </div>
                </nav>

                <div className="border-t border-[#262626] p-4">
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium text-red-400 hover:bg-[#262626] hover:text-red-300 transition-colors"
                    >
                        <LogOut className="h-5 w-5" />
                        <span>Sair</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Mobile Header */}
                <div className="md:hidden flex h-16 items-center justify-between border-b border-[#262626] bg-[#0d0d0d] px-4">
                    <span className="font-bold text-white">AgentPanel</span>
                    <button onClick={() => setActiveTab('settings')} className="text-neutral-400">
                        <Settings className="h-6 w-6" />
                    </button>
                </div>

                {/* Dynamic Title */}
                <header className="hidden md:flex h-16 items-center justify-between border-b border-[#262626] bg-[#0d0d0d] px-8">
                    <h1 className="text-xl font-semibold text-white capitalize">
                        {tabTitles[activeTab]}
                    </h1>

                </header>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-auto p-4 md:p-8">
                    {renderContent()}
                </div>

                {/* Mobile Bottom Nav */}
                <div className="md:hidden border-t border-[#262626] bg-[#0d0d0d] flex justify-around p-2">
                    <button onClick={() => setActiveTab('overview')} className={`p-2 rounded ${activeTab === 'overview' ? 'text-[#00FFA3]' : 'text-neutral-400'}`}><LayoutDashboard className="h-6 w-6" /></button>
                    <button onClick={() => setActiveTab('chat')} className={`p-2 rounded ${activeTab === 'chat' ? 'text-[#00FFA3]' : 'text-neutral-400'}`}><MessageSquare className="h-6 w-6" /></button>
                    <button onClick={() => setActiveTab('connection')} className={`p-2 rounded ${activeTab === 'connection' ? 'text-[#00FFA3]' : 'text-neutral-400'}`}><Link2 className="h-6 w-6" /></button>
                    <button onClick={() => setActiveTab('knowledge')} className={`p-2 rounded ${activeTab === 'knowledge' ? 'text-[#00FFA3]' : 'text-neutral-400'}`}><Database className="h-6 w-6" /></button>
                </div>
            </main>
        </div>
    );
}
