
import React from 'react';
import { Language } from '../types';
import { t } from '../translations';

interface HelpPageProps {
    onBack: () => void;
    lang: Language;
}

export const HelpPage: React.FC<HelpPageProps> = ({ onBack, lang }) => {
    const text = t(lang).help;

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-12 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
                <button 
                    onClick={onBack} 
                    className="mb-8 flex items-center gap-2 text-gray-400 hover:text-white transition group"
                >
                    <i className="fa-solid fa-arrow-left group-hover:-translate-x-1 transition-transform"></i> {text.back}
                </button>

                <div className="animate-fade-in">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-brand-500 to-white">
                        {text.title}
                    </h1>
                    <p className="text-xl text-gray-400 mb-12">
                        {text.subtitle}
                    </p>

                    <div className="grid gap-12">
                        {/* Concept */}
                        <div className="bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-sm">
                            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 text-blue-400">
                                <i className="fa-solid fa-scale-balanced text-2xl"></i>
                            </div>
                            <h2 className="text-2xl font-bold mb-4">{text.conceptTitle}</h2>
                            <p className="text-gray-300 leading-relaxed">
                                {text.conceptDesc}
                            </p>
                        </div>

                        {/* Steps */}
                        <div>
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <i className="fa-solid fa-list-check text-brand-500"></i> {text.howTitle}
                            </h2>
                            <div className="space-y-6 relative border-l-2 border-white/10 ml-3 pl-8 pb-2">
                                {[text.step1, text.step2, text.step3, text.step4, text.step5].map((step, idx) => (
                                    <div key={idx} className="relative">
                                        <div className="absolute -left-[41px] top-0 w-6 h-6 rounded-full bg-brand-500 text-black flex items-center justify-center font-bold text-xs">
                                            {idx + 1}
                                        </div>
                                        <p className="text-gray-300">{step}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
