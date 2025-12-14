"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Users, Clock, ArrowUpRight, ArrowDownRight, Activity, Brain, Smile, Target, TrendingUp, Send, Inbox, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface AnalysisMetrics {
    avg_score: number;
    total_analyses: number;
    avg_cerebro: number;
    avg_voz: number;
    avg_resultado: number;
    sentiment_positive: number;
    sentiment_negative: number;
    sentiment_neutral: number;
}

interface EvolutionStats {
    mensagens_enviadas_hoje: number;
    mensagens_recebidas_hoje: number;
    total_mensagens_enviadas: number;
    total_mensagens_recebidas: number;
    status: string;
}

interface TrendData {
    value: string;
    direction: 'up' | 'down' | 'neutral';
}

interface MetricsTrends {
    messages_total: TrendData;
    messages_today: TrendData;
    response_rate: TrendData;
    ai_score: TrendData;
    cerebro: TrendData;
    voz: TrendData;
    resultado: TrendData;
}

const MetricsTab = () => {
    const { settings } = useSettings();
    const { user } = useAuth();
    const [timeRange, setTimeRange] = useState('7d');
    const [analysisMetrics, setAnalysisMetrics] = useState<AnalysisMetrics | null>(null);
    const [evolutionStats, setEvolutionStats] = useState<EvolutionStats | null>(null);
    const [trends, setTrends] = useState<MetricsTrends | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.id) {
            fetchMetrics();
        }
    }, [user, timeRange]);

    const fetchMetrics = async () => {
        if (!supabase || !user?.id) {
            console.log('Supabase ou user.id não disponível');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            // Calcular data de início baseado no timeRange
            const daysAgo = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - daysAgo);
            const startDateStr = startDate.toISOString().split('T')[0];

            console.log('Buscando métricas para user:', user.id, 'desde:', startDateStr);

            // Buscar métricas de análise de qualidade
            const { data: analysisData, error: analysisError } = await supabase
                .from('analise_qualidade_ia')
                .select('score_geral, metricas_detalhadas, sentimento_usuario')
                .eq('user_id', user.id)
                .gte('data_analise', startDateStr);

            if (analysisError) {
                console.error('Erro na query de análise:', analysisError);
            } else {
                console.log('Dados de análise encontrados:', analysisData?.length || 0);
            }

            // Calcular métricas
            if (analysisData && analysisData.length > 0) {
                const totalScore = analysisData.reduce((acc, curr) => acc + (curr.score_geral || 0), 0);
                let totalCerebro = 0, totalVoz = 0, totalResultado = 0;
                let countPositive = 0, countNegative = 0, countNeutral = 0;

                analysisData.forEach(item => {
                    const metricas = item.metricas_detalhadas;
                    if (metricas) {
                        totalCerebro += metricas.cerebro?.score_categoria || 0;
                        totalVoz += metricas.voz?.score_categoria || 0;
                        totalResultado += metricas.resultado?.score_categoria || 0;
                    }

                    const sentiment = item.sentimento_usuario?.toLowerCase();
                    if (sentiment === 'positivo') countPositive++;
                    else if (sentiment === 'negativo') countNegative++;
                    else countNeutral++;
                });

                setAnalysisMetrics({
                    avg_score: Math.round(totalScore / analysisData.length),
                    total_analyses: analysisData.length,
                    avg_cerebro: Math.round(totalCerebro / analysisData.length),
                    avg_voz: Math.round(totalVoz / analysisData.length),
                    avg_resultado: Math.round(totalResultado / analysisData.length),
                    sentiment_positive: Math.round((countPositive / analysisData.length) * 100),
                    sentiment_negative: Math.round((countNegative / analysisData.length) * 100),
                    sentiment_neutral: Math.round((countNeutral / analysisData.length) * 100),
                });
            } else {
                console.log('Nenhum dado de análise encontrado');
            }

            // Buscar estatísticas do Evolution API
            const { data: evolutionData, error: evolutionError } = await supabase
                .from('evolution_instances')
                .select('mensagens_enviadas_hoje, mensagens_recebidas_hoje, total_mensagens_enviadas, total_mensagens_recebidas, status')
                .eq('user_id', user.id)
                .single();

            if (evolutionError) {
                console.error('Erro na query de evolution:', evolutionError);
            } else {
                console.log('Dados de evolution encontrados:', evolutionData);
                if (evolutionData) {
                    setEvolutionStats(evolutionData);
                }
            }


            // -------------------------------------------------------------
            // CALCULAR TENDÊNCIAS (TRENDS)
            // -------------------------------------------------------------

            // Datas para comparação (Período Anterior)
            const prevStartDate = new Date(startDate);
            prevStartDate.setDate(prevStartDate.getDate() - daysAgo); // Ex: 7 dias antes do início do período atual
            const prevStartDateStr = prevStartDate.toISOString().split('T')[0];

            // 1. Fetch AI Analysis for Previous Period to calculate AI Trends
            // We already fetched >= startDate. Now we need [prevStart, startDate)
            // Optimization: We could have fetched everything >= prevStart in one go, but keeping logic clean for now.
            const { data: prevAnalysisData } = await supabase
                .from('analise_qualidade_ia')
                .select('score_geral, metricas_detalhadas')
                .eq('user_id', user.id)
                .gte('data_analise', prevStartDateStr)
                .lt('data_analise', startDateStr);

            // Helper to calc avg
            const calcAvg = (items: any[], extractor: (i: any) => number) => {
                if (!items || items.length === 0) return 0;
                return items.reduce((acc, curr) => acc + (extractor(curr) || 0), 0) / items.length;
            };

            // Helper for % change
            const calcChange = (current: number, previous: number): TrendData => {
                if (previous === 0) return { value: '+0%', direction: 'neutral' };
                const diff = current - previous;
                const percent = (diff / previous) * 100;
                return {
                    value: `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`,
                    direction: percent >= 0 ? 'up' : 'down'
                };
            };

            // Calculate AI Score Trends
            const currAvgScore = calcAvg(analysisData || [], i => i.score_geral);
            const prevAvgScore = calcAvg(prevAnalysisData || [], i => i.score_geral);

            const currAvgCerebro = calcAvg(analysisData || [], i => i.metricas_detalhadas?.cerebro?.score_categoria);
            const prevAvgCerebro = calcAvg(prevAnalysisData || [], i => i.metricas_detalhadas?.cerebro?.score_categoria);

            const currAvgVoz = calcAvg(analysisData || [], i => i.metricas_detalhadas?.voz?.score_categoria);
            const prevAvgVoz = calcAvg(prevAnalysisData || [], i => i.metricas_detalhadas?.voz?.score_categoria);

            const currAvgResultado = calcAvg(analysisData || [], i => i.metricas_detalhadas?.resultado?.score_categoria);
            const prevAvgResultado = calcAvg(prevAnalysisData || [], i => i.metricas_detalhadas?.resultado?.score_categoria);


            // 2. Fetch Message History Counts for Trends
            // Messages Today Trend vs Yesterday
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const yesterdayStart = new Date(todayStart);
            yesterdayStart.setDate(yesterdayStart.getDate() - 1);

            // Count Msgs Yesterday
            const { count: msgsYesterday } = await supabase
                .from('historico_mensagens')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .gte('created_at', yesterdayStart.toISOString())
                .lt('created_at', todayStart.toISOString());

            const msgsTodayCount = (evolutionData?.mensagens_enviadas_hoje || 0) + (evolutionData?.mensagens_recebidas_hoje || 0);

            // Count Msgs Current Period
            const { count: msgsCurrPeriod } = await supabase
                .from('historico_mensagens')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .gte('created_at', startDateStr);

            // Count Msgs Prev Period
            const { count: msgsPrevPeriod } = await supabase
                .from('historico_mensagens')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .gte('created_at', prevStartDateStr)
                .lt('created_at', startDateStr);

            setTrends({
                messages_total: calcChange(msgsCurrPeriod || 0, msgsPrevPeriod || 0),
                messages_today: calcChange(msgsTodayCount, msgsYesterday || 0),
                response_rate: { value: '+0%', direction: 'neutral' }, // Difícil calcular histórico sem snapshot
                ai_score: calcChange(currAvgScore, prevAvgScore),
                cerebro: calcChange(currAvgCerebro, prevAvgCerebro),
                voz: calcChange(currAvgVoz, prevAvgVoz),
                resultado: calcChange(currAvgResultado, prevAvgResultado)
            });


        } catch (error) {
            console.error('Erro ao buscar métricas:', error);
        } finally {
            setLoading(false);
        }
    };

    // Placeholder data para métricas gerais
    const generalStats = [
        {
            title: 'Total de Mensagens',
            value: evolutionStats ? (evolutionStats.total_mensagens_enviadas + evolutionStats.total_mensagens_recebidas).toLocaleString() : '-',
            change: trends?.messages_total.value || '-',
            trend: trends?.messages_total.direction || 'neutral',
            icon: MessageSquare
        },
        {
            title: 'Mensagens Hoje',
            value: evolutionStats ? (evolutionStats.mensagens_enviadas_hoje + evolutionStats.mensagens_recebidas_hoje).toString() : '-',
            change: trends?.messages_today.value || '-',
            trend: trends?.messages_today.direction || 'neutral',
            icon: Users
        },
        {
            title: 'Taxa de Resposta',
            value: evolutionStats && evolutionStats.total_mensagens_recebidas > 0
                ? `${Math.round((evolutionStats.total_mensagens_enviadas / evolutionStats.total_mensagens_recebidas) * 100)}%`
                : '-',
            change: trends?.response_rate.value || '-',
            trend: trends?.response_rate.direction || 'neutral',
            icon: Clock
        },
        {
            title: 'Score Qualidade IA',
            value: analysisMetrics ? `${analysisMetrics.avg_score}%` : '-',
            change: trends?.ai_score.value || '-',
            trend: trends?.ai_score.direction || 'neutral',
            icon: Activity
        },
    ];

    // Verificar se supabase está configurado
    if (!supabase) {
        return (
            <div className="space-y-6">
                <Card className="bg-[#171717] border border-amber-900/50">
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">Configuração Necessária</h3>
                        <p className="text-neutral-400">
                            As variáveis de ambiente do Supabase não foram configuradas.
                            Verifique o arquivo .env.local
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-white">Visão Geral de Performance</h2>
                <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="h-9 rounded-md border border-[#262626] bg-[#171717] text-sm px-3 text-white focus:outline-none focus:ring-2 focus:ring-[#00FFA3]"
                >
                    <option value="24h">Últimas 24 Horas</option>
                    <option value="7d">Últimos 7 Dias</option>
                    <option value="30d">Últimos 30 Dias</option>
                </select>
            </div>

            {/* Métricas Gerais */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {generalStats.map((stat, i) => (
                    <Card key={i} className="bg-[#0d0d0d] border-[#262626]">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-neutral-400">
                                {stat.title}
                            </CardTitle>
                            <stat.icon className="h-4 w-4 text-neutral-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">{loading ? '...' : stat.value}</div>
                            <p className={`text-xs flex items-center mt-1 ${stat.trend === 'up'
                                ? (stat.title.includes('Resposta') ? 'text-red-400' : 'text-emerald-400')
                                : (stat.title.includes('Resposta') ? 'text-emerald-400' : 'text-red-400')
                                }`}>
                                {stat.trend === 'up' ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <ArrowDownRight className="mr-1 h-3 w-3" />}
                                <span className="font-medium">{stat.change}</span>
                                <span className="text-neutral-500 ml-1">vs último período</span>
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* KPIs de Análise de IA */}
            {analysisMetrics ? (
                <div className="space-y-4">
                    <h2 className="text-lg font-medium text-white">Análise de Qualidade da IA</h2>

                    <div className="grid gap-4 md:grid-cols-3">
                        <Card className="bg-[#0d0d0d] border-[#262626]">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-neutral-400">
                                    Cérebro (Precisão)
                                </CardTitle>
                                <Brain className="h-4 w-4 text-blue-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">{analysisMetrics.avg_cerebro}%</div>
                                <p className={`text-xs flex items-center mt-1 ${trends?.cerebro.direction === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {trends?.cerebro.direction === 'up' ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <ArrowDownRight className="mr-1 h-3 w-3" />}
                                    <span className="font-medium">{trends?.cerebro.value}</span>
                                    <span className="text-neutral-500 ml-1">vs último período</span>
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#0d0d0d] border-[#262626]">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-neutral-400">
                                    Voz (Estilo)
                                </CardTitle>
                                <Smile className="h-4 w-4 text-teal-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">{analysisMetrics.avg_voz}%</div>
                                <p className={`text-xs flex items-center mt-1 ${trends?.voz.direction === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {trends?.voz.direction === 'up' ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <ArrowDownRight className="mr-1 h-3 w-3" />}
                                    <span className="font-medium">{trends?.voz.value}</span>
                                    <span className="text-neutral-500 ml-1">vs último período</span>
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#0d0d0d] border-[#262626]">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-neutral-400">
                                    Resultado (Negócio)
                                </CardTitle>
                                <Target className="h-4 w-4 text-emerald-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">{analysisMetrics.avg_resultado}%</div>
                                <p className={`text-xs flex items-center mt-1 ${trends?.resultado.direction === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {trends?.resultado.direction === 'up' ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <ArrowDownRight className="mr-1 h-3 w-3" />}
                                    <span className="font-medium">{trends?.resultado.value}</span>
                                    <span className="text-neutral-500 ml-1">vs último período</span>
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                        <Card className="md:col-span-1 bg-[#0d0d0d] border-[#262626]">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-neutral-400">Total Análises</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">{analysisMetrics.total_analyses}</div>
                            </CardContent>
                        </Card>

                        <Card className="bg-emerald-950/20 border-emerald-900/30 border">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-emerald-400">
                                    Sentimento Positivo
                                </CardTitle>
                                <Smile className="h-4 w-4 text-emerald-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-emerald-400">{analysisMetrics.sentiment_positive}%</div>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#171717] border-[#262626] border">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-neutral-400">
                                    Sentimento Neutro
                                </CardTitle>
                                <CheckCircle2 className="h-4 w-4 text-neutral-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-neutral-400">{analysisMetrics.sentiment_neutral}%</div>
                            </CardContent>
                        </Card>

                        <Card className="bg-red-950/20 border-red-900/30 border">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-red-400">
                                    Sentimento Negativo
                                </CardTitle>
                                <XCircle className="h-4 w-4 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-400">{analysisMetrics.sentiment_negative}%</div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : !loading && (
                <Card className="bg-[#0d0d0d] border-[#262626]">
                    <CardContent className="p-8 text-center">
                        <Brain className="h-12 w-12 text-[#262626] mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">Análise de IA em Progresso</h3>
                        <p className="text-neutral-400 mb-4">
                            O sistema de análise automática está configurado e será executado a cada 12 horas.
                        </p>
                        <p className="text-sm text-neutral-500">
                            As primeiras métricas aparecerão após a primeira execução do workflow de análise.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Evolution API Stats */}
            {evolutionStats && (
                <div className="space-y-4">
                    <h2 className="text-lg font-medium text-white">Estatísticas do WhatsApp</h2>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card className="bg-[#0d0d0d] border-[#262626]">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-neutral-400">
                                    Enviadas Hoje
                                </CardTitle>
                                <Send className="h-4 w-4 text-blue-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">{evolutionStats.mensagens_enviadas_hoje}</div>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#0d0d0d] border-[#262626]">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-neutral-400">
                                    Recebidas Hoje
                                </CardTitle>
                                <Inbox className="h-4 w-4 text-teal-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">{evolutionStats.mensagens_recebidas_hoje}</div>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#0d0d0d] border-[#262626]">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-neutral-400">
                                    Total Enviadas
                                </CardTitle>
                                <TrendingUp className="h-4 w-4 text-emerald-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">{evolutionStats.total_mensagens_enviadas.toLocaleString()}</div>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#0d0d0d] border-[#262626]">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-neutral-400">
                                    Status da Conexão
                                </CardTitle>
                                <Activity className={`h-4 w-4 ${['connected', 'conectada'].includes(evolutionStats.status?.toLowerCase()) ? 'text-emerald-500' : 'text-red-500'}`} />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-lg font-bold ${['connected', 'conectada'].includes(evolutionStats.status?.toLowerCase()) ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {['connected', 'conectada'].includes(evolutionStats.status?.toLowerCase()) ? 'Conectado' : 'Desconectado'}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

        </div>
    );
};

export default MetricsTab;
