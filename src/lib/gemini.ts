import { GoogleAIFileManager } from "@google/generative-ai/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const storeId = process.env.GOOGLE_STORE_ID;

if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set in environment variables.");
}

if (!storeId) {
    console.warn("GOOGLE_STORE_ID is not set in environment variables.");
}

export const fileManager = apiKey ? new GoogleAIFileManager(apiKey) : null;
export const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
export const fileSearchStoreId = storeId || null;

// Helper para fazer requisições à API do FileSearchStore
export async function listDocumentsFromStore(tenantId?: string) {
    if (!apiKey || !storeId) {
        throw new Error("Missing GEMINI_API_KEY or GOOGLE_STORE_ID");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/${storeId}/documents?key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to list documents: ${response.statusText}`);
    }

    const data = await response.json();

    // Filtrar por tenant_id se fornecido
    if (tenantId && data.documents) {
        data.documents = data.documents.filter((doc: any) => {
            return doc.customMetadata?.some((meta: any) =>
                meta.key === "tenant_id" && meta.stringValue === tenantId
            );
        });
    }

    return data;
}

export async function deleteDocumentFromStore(documentName: string) {
    if (!apiKey) {
        throw new Error("Missing GEMINI_API_KEY");
    }

    // Adicionar force=true para deletar chunks relacionados
    const url = `https://generativelanguage.googleapis.com/v1beta/${documentName}?force=true&key=${apiKey}`;
    const response = await fetch(url, {
        method: 'DELETE',
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete document (${response.status}): ${errorText}`);
    }

    // A resposta é um JSON vazio em caso de sucesso
    try {
        return await response.json();
    } catch {
        return { success: true };
    }
}
