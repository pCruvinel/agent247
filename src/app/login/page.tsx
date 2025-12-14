"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!supabase) {
            setError("Supabase client is not initialized. Please checking env vars.");
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setError(error.message);
            } else if (data.session) {
                // Determine if we need to set cookies manually or if middleware handles it.
                // For this simple migration, Supabase JS handles the session in local storage.
                // But the Dashboard might check a specific cookie "auth-token".
                // We will set it to match legacy behavior for now.
                document.cookie = `auth-token=${data.session.access_token}; path=/`;
                router.push('/dashboard');
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#0d0d0d] p-4 text-neutral-200">
            <Card className="w-full max-w-md border-[#262626] bg-[#0d0d0d] shadow-none">
                <CardHeader className="space-y-1 flex flex-col items-center text-center">
                    <div className="relative h-12 w-48 mb-6">
                        <Image
                            src="/logo.png"
                            alt="Agent Control Panel"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <CardTitle className="text-2xl font-bold text-white">Bem-vindo de volta</CardTitle>
                    <p className="text-sm text-neutral-400">Entre com suas credenciais para acessar o painel</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-neutral-200">E-mail</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@empresa.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                className="bg-[#171717] border-[#262626] text-white placeholder:text-neutral-500 focus-visible:ring-[#00FFA3]"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-neutral-200">Senha</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                                className="bg-[#171717] border-[#262626] text-white focus-visible:ring-[#00FFA3]"
                            />
                        </div>
                        {error && (
                            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-900/10 border border-red-900/20 p-3 rounded-md">
                                <AlertCircle className="h-4 w-4" />
                                <span>{error}</span>
                            </div>
                        )}
                        <Button
                            type="submit"
                            className="w-full bg-[#00FFA3] text-[#0f172a] hover:bg-[#00e692] font-semibold"
                            loading={loading}
                        >
                            Entrar
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
