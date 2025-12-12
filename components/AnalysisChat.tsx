import React, { useState, useRef, useEffect } from 'react';
import { fetchSimpleAI, formatAIResponse } from '../utils';

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
}

interface AnalysisChatProps {
    initialAnalysis: string;
    contextData: string;
    lang: 'fr' | 'en';
}

const AnalysisChat: React.FC<AnalysisChatProps> = ({ initialAnalysis, contextData, lang }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Debug mount
        console.log("AnalysisChat mounted.", {
            hasInitialAnalysis: !!initialAnalysis,
            contextDataLength: contextData ? contextData.length : 0
        });
    }, [initialAnalysis, contextData]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            // Build context-aware prompt
            const conversationHistory = messages.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`).join('\n');

            const systemPrompt = lang === 'fr'
                ? `Tu es un expert en analyse de données sportives. Tu as déjà fourni une analyse initiale (voir ci-dessous) basée sur des données (voir ci-dessous). L'utilisateur a une nouvelle question. Réponds de manière concise et utile.`
                : `You are a sports data expert. You have already provided an initial analysis (see below) based on data (see below). The user has a new question. Answer concisely and helpfully.`;

            const fullPrompt = `${systemPrompt}

=== CONTEXT DATA ===
${contextData}

=== INITIAL ANALYSIS ===
${initialAnalysis}

=== CONVERSATION HISTORY ===
${conversationHistory}
User: ${userMsg.text}

=== INSTRUCTIONS ===
Réponds à la dernière question de l'utilisateur.`

            const responseText = await fetchSimpleAI(fullPrompt, 'gemini-2.5-flash');

            const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: responseText };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error("Chat error", error);
            const errorMsg: Message = { id: Date.now().toString(), role: 'model', text: "Error: Desolé, je n'ai pas pu répondre." };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!initialAnalysis) {
        console.warn("AnalysisChat: missing initialAnalysis, rendering nothing.");
        return null;
    }

    return (
        <div className="mt-8 border-t border-gray-200 dark:border-white/10 pt-6">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-brand-500 text-black px-4 py-2 rounded-lg font-bold shadow-md hover:bg-brand-400 transition mb-4 animate-bounce-slight"
            >
                <i className="fa-regular fa-comment-dots text-lg"></i>
                {lang === 'fr' ? 'Discuter avec l\'IA' : 'Chat with AI'}
            </button>

            {isOpen && (
                <div className="bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden animate-fade-in">
                    <div className="h-64 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                        <div className="text-xs text-center text-gray-400 mb-4">
                            {lang === 'fr' ? 'Discussion basée sur l\'analyse ci-dessus' : 'Chat based on the analysis above'}
                        </div>

                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-brand-100 text-brand-600' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                    }`}>
                                    {msg.role === 'user' ? <i className="fa-solid fa-user text-xs"></i> : <i className="fa-solid fa-robot text-xs"></i>}
                                </div>
                                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.role === 'user'
                                        ? 'bg-brand-600 text-white rounded-br-none'
                                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-bl-none'
                                    }`}>
                                    {msg.role === 'model' ? (
                                        <div dangerouslySetInnerHTML={{ __html: formatAIResponse(msg.text) }} />
                                    ) : (
                                        msg.text
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                                    <i className="fa-solid fa-robot text-xs"></i>
                                </div>
                                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-none px-4 py-3 flex items-center">
                                    <i className="fa-solid fa-circle-notch fa-spin text-brand-600"></i>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={lang === 'fr' ? "Posez une question sur ces données..." : "Ask a question about this data..."}
                            className="flex-1 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-brand-500 dark:text-white"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            className="p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <i className="fa-solid fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalysisChat;
