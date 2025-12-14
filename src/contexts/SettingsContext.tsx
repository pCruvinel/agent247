"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WebhookSettings } from '@/types';
import { supabase } from '@/lib/supabase';

import { useAuth } from '@/contexts/AuthContext';

interface SettingsContextType {
    settings: WebhookSettings;
    updateSettings: (newSettings: WebhookSettings) => Promise<void>;
    isConfigured: boolean;
}

const defaultSettings: WebhookSettings = {
    webhook_metrics_url: '',
    webhook_send_message_url: '',
    webhook_connect_instance_url: '',
    webhook_clear_history_url: '',
    google_api_key: '',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children?: ReactNode }) => {
    const { user, loading: authLoading } = useAuth();
    const [settings, setSettings] = useState<WebhookSettings>(defaultSettings);
    const [isConfigured, setIsConfigured] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            if (authLoading) return; // Wait for auth to settle

            if (user && supabase) {
                const { data, error } = await supabase
                    .from('user_settings')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (data) {
                    setSettings(prev => ({ ...prev, ...data }));
                    setIsConfigured(true);
                }
            } else {
                // Fallback to local storage if no user (e.g. before login completed or dev mode)
                if (typeof window !== 'undefined') {
                    const stored = localStorage.getItem('agent_dashboard_settings');
                    if (stored) {
                        try {
                            setSettings({ ...defaultSettings, ...JSON.parse(stored) });
                        } catch (e) { }
                    }
                }
            }
        };

        loadSettings();
    }, [user, authLoading]);

    const updateSettings = async (newSettings: WebhookSettings) => {
        setSettings(newSettings);
        setIsConfigured(Object.values(newSettings).some(val => val !== ''));

        // Save to Supabase
        if (supabase && user) {
            const { error } = await supabase
                .from('user_settings')
                .upsert({
                    user_id: user.id,
                    ...newSettings,
                    updated_at: new Date().toISOString()
                });

            if (error) {
                console.error("Failed to save settings to Supabase", error);
            }
        }

        // Keep local storage as backup/cache
        localStorage.setItem('agent_dashboard_settings', JSON.stringify(newSettings));
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, isConfigured }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
