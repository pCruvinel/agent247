"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Document {
    name: string;
    displayName: string;
    createTime: string;
    updateTime: string;
    customMetadata?: Array<{
        key: string;
        stringValue?: string;
    }>;
}

const KnowledgeBaseTab = () => {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const { session } = useAuth();

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const token = session?.access_token;
            const res = await fetch('/api/knowledge', {
                headers: token ? {
                    'Authorization': `Bearer ${token}`
                } : {}
            });
            const data = await res.json();
            if (data.documents) {
                setDocuments(data.documents);
            }
        } catch (error) {
            console.error("Failed to fetch documents", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session) {
            fetchDocuments();
        }
    }, [session]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const formData = new FormData();
        formData.append("file", file);

        setUploading(true);
        try {
            const token = session?.access_token;
            const res = await fetch('/api/knowledge', {
                method: 'POST',
                headers: token ? {
                    'Authorization': `Bearer ${token}`
                } : {},
                body: formData,
            });

            if (res.ok) {
                await fetchDocuments();
            } else {
                const data = await res.json();
                alert(`Upload failed: ${data.error}`);
            }
        } catch (error) {
            console.error("Upload error", error);
            alert("Upload failed.");
        } finally {
            setUploading(false);
            // Reset input
            e.target.value = "";
        }
    };

    const handleDelete = async (documentName: string) => {
        if (!confirm("Tem certeza que deseja deletar este documento?")) return;

        try {
            const token = session?.access_token;
            const res = await fetch(`/api/knowledge?name=${encodeURIComponent(documentName)}`, {
                method: 'DELETE',
                headers: token ? {
                    'Authorization': `Bearer ${token}`
                } : {},
            });

            if (res.ok) {
                setDocuments(prev => prev.filter(doc => doc.name !== documentName));
            } else {
                alert("Falha ao deletar");
            }
        } catch (error) {
            console.error("Delete error", error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-medium text-white">Base de Conhecimento</h2>
                    <p className="text-sm text-neutral-400">Gerencie documentos usados pelo Agent247 para contexto, memória e conhecimento.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={fetchDocuments} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    <div className="relative">
                        <input
                            type="file"
                            id="file-upload"
                            className="hidden"
                            onChange={handleUpload}
                            disabled={uploading}
                        />
                        <Button disabled={uploading} asChild className="bg-[#00FFA3] text-[#0f172a] hover:bg-[#00e692]">
                            <label htmlFor="file-upload" className="cursor-pointer">
                                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                {uploading ? "Enviando..." : "Enviar Documento"}
                            </label>
                        </Button>
                    </div>
                </div>
            </div>

            <Card className="bg-[#0d0d0d] border-[#262626]">
                <CardHeader>
                    <CardTitle className="text-white">Documentos Ativos</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading && documents.length === 0 ? (
                        <div className="text-center py-8 text-slate-600">Carregando documentos...</div>
                    ) : documents.length === 0 ? (
                        <div className="text-center py-8 text-slate-600">Nenhum documento encontrado. Envie um para começar.</div>
                    ) : (
                        <div className="space-y-2">
                            {documents.map(doc => (
                                <div key={doc.name} className="flex items-center justify-between p-3 bg-[#171717] rounded-lg border border-[#262626] group hover:border-[#00FFA3]/50 transition-colors">
                                    <div className="flex items-center space-x-3 overflow-hidden">
                                        <div className="h-10 w-10 bg-[#0d0d0d] rounded flex-shrink-0 flex items-center justify-center border border-[#262626] text-[#00FFA3]">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium text-sm text-white truncate">{doc.displayName}</p>
                                            <p className="text-xs text-neutral-400">
                                                Criado: {new Date(doc.createTime).toLocaleDateString()}
                                                {doc.updateTime && ` • Atualizado: ${new Date(doc.updateTime).toLocaleDateString()}`}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-neutral-500 hover:text-red-400 hover:bg-[#262626] flex-shrink-0"
                                        onClick={() => handleDelete(doc.name)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default KnowledgeBaseTab;
