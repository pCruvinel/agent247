"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus, Trash2, ExternalLink, Save, HelpCircle, Link as LinkIcon } from 'lucide-react';
import { AgentKnowledge, FAQItem, KnowledgeLink } from '@/types';

interface Props {
    data: AgentKnowledge;
    onUpdate: (data: AgentKnowledge) => void;
}

const KnowledgeSection = ({ data, onUpdate }: Props) => {
    const [formData, setFormData] = React.useState(data);
    const [activeTab, setActiveTab] = React.useState<'faq' | 'links'>('faq');

    // FAQ handlers
    const addFAQ = () => {
        const newFAQ: FAQItem = {
            id: Date.now().toString(),
            question: '',
            answer: ''
        };
        setFormData(prev => ({
            ...prev,
            faq_items: [...prev.faq_items, newFAQ]
        }));
    };

    const updateFAQ = (id: string, field: 'question' | 'answer', value: string) => {
        setFormData(prev => ({
            ...prev,
            faq_items: prev.faq_items.map(item =>
                item.id === id ? { ...item, [field]: value } : item
            )
        }));
    };

    const removeFAQ = (id: string) => {
        setFormData(prev => ({
            ...prev,
            faq_items: prev.faq_items.filter(item => item.id !== id)
        }));
    };

    // Links handlers
    const addLink = () => {
        const newLink: KnowledgeLink = {
            id: Date.now().toString(),
            url: '',
            title: ''
        };
        setFormData(prev => ({
            ...prev,
            links: [...prev.links, newLink]
        }));
    };

    const updateLink = (id: string, field: 'url' | 'title', value: string) => {
        setFormData(prev => ({
            ...prev,
            links: prev.links.map(link =>
                link.id === id ? { ...link, [field]: value } : link
            )
        }));
    };

    const removeLink = (id: string) => {
        setFormData(prev => ({
            ...prev,
            links: prev.links.filter(link => link.id !== id)
        }));
    };

    const handleSave = () => {
        onUpdate(formData);
        alert('Base de Conhecimento salva! (mockado)');
    };

    return (
        <Card className="bg-[#0d0d0d] border-[#262626]">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-white">
                    <BookOpen className="h-6 w-6 text-[#00FFA3]" />
                    Base de Conhecimento
                </CardTitle>
                <p className="text-sm text-neutral-400 mt-1">
                    FAQs e links que o agente pode consultar para responder perguntas.
                </p>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Tabs */}
                <div className="flex gap-2 border-b border-[#262626] pb-3">
                    <button
                        onClick={() => setActiveTab('faq')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'faq'
                                ? 'bg-[#00FFA3] text-[#0d0d0d]'
                                : 'text-neutral-400 hover:bg-[#171717] hover:text-white'
                            }`}
                    >
                        <HelpCircle className="h-4 w-4" />
                        FAQ Rápido
                    </button>
                    <button
                        onClick={() => setActiveTab('links')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'links'
                                ? 'bg-[#00FFA3] text-[#0d0d0d]'
                                : 'text-neutral-400 hover:bg-[#171717] hover:text-white'
                            }`}
                    >
                        <LinkIcon className="h-4 w-4" />
                        Links
                    </button>
                </div>

                {/* FAQ Tab */}
                {activeTab === 'faq' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-neutral-400">
                                Perguntas frequentes que não precisam de documento.
                            </p>
                            <Button
                                onClick={addFAQ}
                                variant="outline"
                                size="sm"
                                className="border-[#262626] bg-[#171717] text-white hover:bg-[#262626]"
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                Adicionar
                            </Button>
                        </div>

                        {formData.faq_items.length === 0 ? (
                            <div className="text-center py-8 text-neutral-500">
                                <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Nenhuma FAQ cadastrada</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {formData.faq_items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="p-4 rounded-lg border border-[#262626] bg-[#171717] space-y-3"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex-1 space-y-3">
                                                <input
                                                    type="text"
                                                    value={item.question}
                                                    onChange={(e) => updateFAQ(item.id, 'question', e.target.value)}
                                                    placeholder="Pergunta..."
                                                    className="w-full h-9 px-3 rounded border border-[#262626] bg-[#0d0d0d] text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#00FFA3] text-sm"
                                                />
                                                <textarea
                                                    value={item.answer}
                                                    onChange={(e) => updateFAQ(item.id, 'answer', e.target.value)}
                                                    placeholder="Resposta..."
                                                    rows={2}
                                                    className="w-full p-3 rounded border border-[#262626] bg-[#0d0d0d] text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#00FFA3] text-sm resize-none"
                                                />
                                            </div>
                                            <button
                                                onClick={() => removeFAQ(item.id)}
                                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Links Tab */}
                {activeTab === 'links' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-neutral-400">
                                URLs que o agente pode consultar (site institucional, etc).
                            </p>
                            <Button
                                onClick={addLink}
                                variant="outline"
                                size="sm"
                                className="border-[#262626] bg-[#171717] text-white hover:bg-[#262626]"
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                Adicionar
                            </Button>
                        </div>

                        {formData.links.length === 0 ? (
                            <div className="text-center py-8 text-neutral-500">
                                <LinkIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Nenhum link cadastrado</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {formData.links.map((link) => (
                                    <div
                                        key={link.id}
                                        className="flex items-center gap-3 p-3 rounded-lg border border-[#262626] bg-[#171717]"
                                    >
                                        <input
                                            type="text"
                                            value={link.title}
                                            onChange={(e) => updateLink(link.id, 'title', e.target.value)}
                                            placeholder="Título..."
                                            className="w-40 h-9 px-3 rounded border border-[#262626] bg-[#0d0d0d] text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#00FFA3] text-sm"
                                        />
                                        <input
                                            type="url"
                                            value={link.url}
                                            onChange={(e) => updateLink(link.id, 'url', e.target.value)}
                                            placeholder="https://..."
                                            className="flex-1 h-9 px-3 rounded border border-[#262626] bg-[#0d0d0d] text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#00FFA3] text-sm"
                                        />
                                        {link.url && (
                                            <a
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        )}
                                        <button
                                            onClick={() => removeLink(link.id)}
                                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

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

export default KnowledgeSection;
