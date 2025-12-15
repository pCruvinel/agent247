"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ArrowUpRight, ArrowDownRight, Activity, Brain, Smile, Target, Send, Inbox, CheckCircle2, XCircle, AlertCircle, DollarSign, Zap, TrendingDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { CostMetrics } from '@/types';

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
    messages_sent: TrendData;
    messages_received: TrendData;
    handoffs: TrendData;
    ai_score: TrendData;
    cerebro: TrendData;
    voz: TrendData;
    resultado: TrendData;
}

interface MessageStats {
    sent_current: number;
    sent_previous: number;
    received_current: number;
    received_previous: number;
}

interface HandoffStats {
    total_current: number;
    total_previous: number;
}

const MetricsTab = () => {
    const { user } = useAuth();
    const [timeRange, setTimeRange] = useState('7d');
    const [analysisMetrics, setAnalysisMetrics] = useState<AnalysisMetrics | null>(null);
    const [evolutionStats, setEvolutionStats] = useState<EvolutionStats | null>(null);
    const [trends, setTrends] = useState<MetricsTrends | null>(null);
    const [costMetrics, setCostMetrics] = useState<CostMetrics | null>(null);
    const [messageStats, setMessageStats] = useState<MessageStats | null>(null);
    const [handoffStats, setHandoffStats] = useState<HandoffStats | null>(null);
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

            // Buscar apenas status da instância Evolution (contagens de mensagens vêm de historico_mensagens agora)
            const { data: evolutionData, error: evolutionError } = await supabase
                .from('evolution_instances')
                .select('status')
                .eq('user_id', user.id)
                .maybeSingle();

            if (evolutionError) {
                if (evolutionError.code !== 'PGRST116') {
                    console.error('Erro na query de evolution:', evolutionError);
                }
            } else if (evolutionData) {
                // Adaptamos para a interface EvolutionStats existente mantendo compatibilidade
                setEvolutionStats({
                    mensagens_enviadas_hoje: 0,
                    mensagens_recebidas_hoje: 0,
                    total_mensagens_enviadas: 0,
                    total_mensagens_recebidas: 0,
                    status: evolutionData.status
                });
            }

            // Buscar métricas de custo do histórico de mensagens
            const { data: messagesWithCost, error: costError } = await supabase
                .from('historico_mensagens')
                .select('metadados')
                .eq('user_id', user.id)
                .gte('created_at', startDateStr)
                .not('metadados', 'is', null);

            if (costError) {
                console.error('Erro na query de custo:', costError);
            } else if (messagesWithCost && messagesWithCost.length > 0) {
                console.log('Mensagens com custo encontradas:', messagesWithCost.length);

                const USD_TO_BRL = 5.5; // Taxa de conversão USD para BRL

                let totalCost = 0;
                let totalInputCost = 0;
                let totalOutputCost = 0;
                let totalInputTokens = 0;
                let totalOutputTokens = 0;
                let totalTokens = 0;
                const modelsMap: { [key: string]: { count: number; total_cost: number } } = {};

                messagesWithCost.forEach(msg => {
                    const meta = msg.metadados as any;
                    if (meta?.custos) {
                        totalCost += (meta.custos.total_usd || 0) * USD_TO_BRL;
                        totalInputCost += (meta.custos.input_usd || 0) * USD_TO_BRL;
                        totalOutputCost += (meta.custos.output_usd || 0) * USD_TO_BRL;
                    }
                    if (meta?.uso) {
                        totalInputTokens += meta.uso.estimativa_input || 0;
                        totalOutputTokens += meta.uso.estimativa_output || 0;
                        totalTokens += meta.uso.estimativa_total || 0;
                    }
                    if (meta?.modelo) {
                        const modelo = meta.modelo;
                        if (!modelsMap[modelo]) {
                            modelsMap[modelo] = { count: 0, total_cost: 0 };
                        }
                        modelsMap[modelo].count += 1;
                        modelsMap[modelo].total_cost += (meta.custos?.total_usd || 0) * USD_TO_BRL;
                    }
                });

                setCostMetrics({
                    total_brl: totalCost,
                    total_input_brl: totalInputCost,
                    total_output_brl: totalOutputCost,
                    avg_cost_per_message: messagesWithCost.length > 0 ? totalCost / messagesWithCost.length : 0,
                    total_messages_with_cost: messagesWithCost.length,
                    total_input_tokens: totalInputTokens,
                    total_output_tokens: totalOutputTokens,
                    total_tokens: totalTokens,
                    models_usage: modelsMap
                });
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


            // 2. Fetch Message Counts by Direction (Current Period)
            const { count: sentCurrPeriod } = await supabase
                .from('historico_mensagens')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('direcao', 'enviado')
                .gte('created_at', startDateStr);

            const { count: receivedCurrPeriod } = await supabase
                .from('historico_mensagens')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('direcao', 'recebido')
                .gte('created_at', startDateStr);

            // Fetch Message Counts by Direction (Previous Period)
            const { count: sentPrevPeriod } = await supabase
                .from('historico_mensagens')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('direcao', 'enviado')
                .gte('created_at', prevStartDateStr)
                .lt('created_at', startDateStr);

            const { count: receivedPrevPeriod } = await supabase
                .from('historico_mensagens')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('direcao', 'recebido')
                .gte('created_at', prevStartDateStr)
                .lt('created_at', startDateStr);

            setMessageStats({
                sent_current: sentCurrPeriod || 0,
                sent_previous: sentPrevPeriod || 0,
                received_current: receivedCurrPeriod || 0,
                received_previous: receivedPrevPeriod || 0
            });

            // 3. Fetch Handoff Counts
            const { count: handoffsCurrPeriod } = await supabase
                .from('handoffs')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .gte('created_at', startDateStr);

            const { count: handoffsPrevPeriod } = await supabase
                .from('handoffs')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .gte('created_at', prevStartDateStr)
                .lt('created_at', startDateStr);

            setHandoffStats({
                total_current: handoffsCurrPeriod || 0,
                total_previous: handoffsPrevPeriod || 0
            });

            setTrends({
                messages_sent: calcChange(sentCurrPeriod || 0, sentPrevPeriod || 0),
                messages_received: calcChange(receivedCurrPeriod || 0, receivedPrevPeriod || 0),
                handoffs: calcChange(handoffsCurrPeriod || 0, handoffsPrevPeriod || 0),
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

    // Indicadores principais no topo
    const isConnected = evolutionStats && ['connected', 'conectada'].includes(evolutionStats.status?.toLowerCase());

    const mainIndicators = [
        {
            title: 'Mensagens Enviadas',
            value: messageStats ? messageStats.sent_current.toLocaleString() : '-',
            change: trends?.messages_sent.value || '-',
            trend: trends?.messages_sent.direction || 'neutral',
            icon: Send
        },
        {
            title: 'Mensagens Recebidas',
            value: messageStats ? messageStats.received_current.toLocaleString() : '-',
            change: trends?.messages_received.value || '-',
            trend: trends?.messages_received.direction || 'neutral',
            icon: Inbox
        },
        {
            title: 'Handoffs',
            value: handoffStats ? handoffStats.total_current.toLocaleString() : '-',
            change: trends?.handoffs.value || '-',
            trend: trends?.handoffs.direction || 'neutral',
            icon: Users
        },
        {
            title: 'Status da Conexão',
            value: isConnected ? 'Conectado' : (evolutionStats ? 'Desconectado' : '-'),
            change: '',
            trend: 'neutral' as const,
            icon: Activity,
            isStatus: true,
            statusColor: isConnected ? 'emerald' : 'red'
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

            {/* Indicadores Principais */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {mainIndicators.map((stat, i) => (
                    <Card key={i} className="bg-[#0d0d0d] border-[#262626]">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-neutral-400">
                                {stat.title}
                            </CardTitle>
                            <stat.icon className={`h-4 w-4 ${stat.isStatus
                                ? (stat.statusColor === 'emerald' ? 'text-emerald-500' : 'text-red-500')
                                : 'text-neutral-500'
                                }`} />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${stat.isStatus
                                ? (stat.statusColor === 'emerald' ? 'text-emerald-400' : 'text-red-400')
                                : 'text-white'
                                }`}>
                                {loading ? '...' : stat.value}
                            </div>
                            {stat.change && (
                                <p className={`text-xs flex items-center mt-1 ${stat.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {stat.trend === 'up' ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <ArrowDownRight className="mr-1 h-3 w-3" />}
                                    <span className="font-medium">{stat.change}</span>
                                    <span className="text-neutral-500 ml-1">vs último período</span>
                                </p>
                            )}
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


            {/* Custos da IA */}
            {costMetrics && (
                <div className="space-y-4">
                    <h2 className="text-lg font-medium text-white">Custos da IA</h2>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card className="bg-emerald-950/20 border-emerald-900/30 border">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-emerald-400">
                                    Custo Total
                                </CardTitle>
                                <DollarSign className="h-4 w-4 text-emerald-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-emerald-400">
                                    R$ {costMetrics.total_brl.toFixed(4)}
                                </div>
                                <p className="text-xs text-neutral-500 mt-1">
                                    {costMetrics.total_messages_with_cost} mensagens
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#0d0d0d] border-[#262626]">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-neutral-400">
                                    Custo Médio/Mensagem
                                </CardTitle>
                                <TrendingDown className="h-4 w-4 text-blue-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">
                                    R$ {costMetrics.avg_cost_per_message.toFixed(6)}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#0d0d0d] border-[#262626]">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-neutral-400">
                                    Tokens Totais
                                </CardTitle>
                                <Zap className="h-4 w-4 text-amber-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">
                                    {costMetrics.total_tokens.toLocaleString()}
                                </div>
                                <p className="text-xs text-neutral-500 mt-1">
                                    {costMetrics.total_input_tokens.toLocaleString()} in / {costMetrics.total_output_tokens.toLocaleString()} out
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#0d0d0d] border-[#262626]">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-neutral-400">
                                    Modelo Principal
                                </CardTitle>
                                <Brain className="h-4 w-4 text-purple-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-lg font-bold text-white">
                                    {Object.entries(costMetrics.models_usage).length > 0
                                        ? Object.entries(costMetrics.models_usage).sort((a, b) => b[1].count - a[1].count)[0][0]
                                        : 'N/A'}
                                </div>
                                <p className="text-xs text-neutral-500 mt-1">
                                    {Object.entries(costMetrics.models_usage).length > 0
                                        ? `${Object.entries(costMetrics.models_usage).sort((a, b) => b[1].count - a[1].count)[0][1].count} mensagens`
                                        : ''}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Breakdown de custos por modelo */}
                    {Object.entries(costMetrics.models_usage).length > 1 && (
                        <Card className="bg-[#0d0d0d] border-[#262626]">
                            <CardHeader>
                                <CardTitle className="text-sm font-medium text-neutral-400">
                                    Distribuição por Modelo
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {Object.entries(costMetrics.models_usage)
                                        .sort((a, b) => b[1].total_cost - a[1].total_cost)
                                        .map(([model, data]) => (
                                            <div key={model} className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium text-white">{model}</div>
                                                    <div className="text-xs text-neutral-500">{data.count} mensagens</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-bold text-emerald-400">R$ {data.total_cost.toFixed(4)}</div>
                                                    <div className="text-xs text-neutral-500">
                                                        {((data.total_cost / costMetrics.total_brl) * 100).toFixed(1)}%
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

        </div>
    );
};

export default MetricsTab;
